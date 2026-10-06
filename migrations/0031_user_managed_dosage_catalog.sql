alter table public.dosage_catalog
  add column if not exists user_id text,
  add column if not exists archived_at timestamptz;

update public.dosage_catalog
set user_id = (select user_id from private.app_owners limit 1)
where user_id is null;

alter table public.dosage_catalog
  alter column user_id set default private.current_user_id(),
  alter column user_id set not null;

create index if not exists dosage_catalog_user_name_idx
  on public.dosage_catalog(user_id, archived_at, display_name);

drop policy if exists "dosage_catalog_read" on public.dosage_catalog;
create policy "dosage_catalog_owner" on public.dosage_catalog
to authenticated
using (private.is_studyos_owner() and private.current_user_id() = user_id)
with check (private.is_studyos_owner() and private.current_user_id() = user_id);

drop policy if exists "dosage_pk_profiles_read" on public.dosage_pk_profiles;
create policy "dosage_pk_profiles_owner" on public.dosage_pk_profiles
to authenticated
using (exists (
  select 1 from public.dosage_catalog catalog
  where catalog.key = dosage_pk_profiles.catalog_key
    and catalog.user_id = private.current_user_id()
    and private.is_studyos_owner()
))
with check (exists (
  select 1 from public.dosage_catalog catalog
  where catalog.key = dosage_pk_profiles.catalog_key
    and catalog.user_id = private.current_user_id()
    and private.is_studyos_owner()
));

grant select, insert, update, delete on public.dosage_catalog to authenticated;
grant select, insert, update, delete on public.dosage_pk_profiles to authenticated;

create or replace function public.import_dosage_catalog(payload jsonb, import_mode text default 'merge')
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  owner_id text := private.current_user_id();
  medication jsonb;
  profile jsonb;
  medication_key text;
  existing public.dosage_catalog%rowtype;
  inserted_count integer := 0;
  updated_count integer := 0;
  unchanged_count integer := 0;
  should_write boolean;
begin
  if not private.is_studyos_owner() then raise exception 'Not authorized'; end if;
  if import_mode not in ('merge', 'update') then raise exception 'Unsupported import mode'; end if;
  if coalesce(payload->>'format', '') <> 'studyos-medication-catalog'
     or coalesce((payload->>'version')::integer, 0) <> 1
     or coalesce(jsonb_typeof(payload->'medications'), '') <> 'array' then
    raise exception 'Unsupported medication catalog file';
  end if;
  if jsonb_array_length(payload->'medications') < 1 or jsonb_array_length(payload->'medications') > 500 then
    raise exception 'Medication count must be between 1 and 500';
  end if;
  if (select count(*) from jsonb_array_elements(payload->'medications')) <>
     (select count(distinct value->>'key') from jsonb_array_elements(payload->'medications')) then
    raise exception 'Duplicate medication keys';
  end if;

  for medication in select value from jsonb_array_elements(payload->'medications') loop
    medication_key := trim(medication->>'key');
    if medication_key !~ '^[a-z0-9][a-z0-9-]{0,79}$'
       or char_length(trim(coalesce(medication->>'displayName', ''))) not between 1 and 160
       or char_length(trim(coalesce(medication->>'ingredientName', ''))) not between 1 and 240
       or medication->>'category' not in ('medication', 'supplement', 'other')
       or coalesce(jsonb_typeof(medication->'aliases'), '') <> 'array'
       or coalesce(jsonb_typeof(medication->'pkProfiles'), '') <> 'array'
       or jsonb_array_length(medication->'aliases') > 50
       or jsonb_array_length(medication->'pkProfiles') > 20
       or coalesce(jsonb_typeof(medication->'strength'), '') <> 'object'
       or (medication->'strength'->>'value')::numeric <= 0
       or (medication->>'defaultDoseQuantity')::numeric <= 0 then
      raise exception 'Invalid medication: %', medication_key;
    end if;

    select * into existing from public.dosage_catalog
    where key = medication_key and user_id = owner_id;
    should_write := not found or import_mode = 'update';

    if not found then
      insert into public.dosage_catalog (
        key, user_id, display_name, aliases, ingredient_name, category,
        strength_value, strength_unit, default_dose_quantity, dose_form,
        route, manufacturer, archived_at
      ) values (
        medication_key, owner_id, trim(medication->>'displayName'),
        array(select jsonb_array_elements_text(medication->'aliases')),
        trim(medication->>'ingredientName'), medication->>'category',
        (medication->'strength'->>'value')::numeric, trim(medication->'strength'->>'unit'),
        (medication->>'defaultDoseQuantity')::numeric, trim(medication->>'doseForm'),
        trim(medication->>'route'), nullif(trim(medication->>'manufacturer'), ''), null
      );
      inserted_count := inserted_count + 1;
    elsif import_mode = 'update' then
      update public.dosage_catalog set
        display_name = trim(medication->>'displayName'),
        aliases = array(select jsonb_array_elements_text(medication->'aliases')),
        ingredient_name = trim(medication->>'ingredientName'),
        category = medication->>'category',
        strength_value = (medication->'strength'->>'value')::numeric,
        strength_unit = trim(medication->'strength'->>'unit'),
        default_dose_quantity = (medication->>'defaultDoseQuantity')::numeric,
        dose_form = trim(medication->>'doseForm'), route = trim(medication->>'route'),
        manufacturer = nullif(trim(medication->>'manufacturer'), ''), archived_at = null,
        updated_at = now()
      where key = medication_key and user_id = owner_id;
      delete from public.dosage_pk_profiles where catalog_key = medication_key;
      updated_count := updated_count + 1;
    else
      unchanged_count := unchanged_count + 1;
    end if;

    if should_write then
      for profile in select value from jsonb_array_elements(medication->'pkProfiles') loop
        if char_length(trim(coalesce(profile->>'analyte', ''))) not between 1 and 160
           or profile->>'modelStatus' not in ('reference_only', 'validated')
           or coalesce(jsonb_typeof(profile->'source'), '') <> 'object'
           or char_length(trim(coalesce(profile->'source'->>'title', ''))) < 1
           or trim(coalesce(profile->'source'->>'url', '')) !~ '^https?://'
           or trim(coalesce(profile->'source'->>'retrievedAt', '')) !~ '^\d{4}-\d{2}-\d{2}$' then
          raise exception 'Invalid PK profile for %', medication_key;
        end if;
        insert into public.dosage_pk_profiles (
          catalog_key, analyte, tmax_min_minutes, tmax_max_minutes,
          half_life_min_minutes, half_life_max_minutes,
          bioavailability_min_percent, bioavailability_max_percent,
          absorption_notes, model_status, source_title, source_url, source_retrieved_at
        ) values (
          medication_key, trim(profile->>'analyte'),
          (profile->'tmaxMinutes'->>'min')::integer, (profile->'tmaxMinutes'->>'max')::integer,
          (profile->'halfLifeMinutes'->>'min')::integer, (profile->'halfLifeMinutes'->>'max')::integer,
          (profile->'bioavailabilityPercent'->>'min')::numeric, (profile->'bioavailabilityPercent'->>'max')::numeric,
          trim(profile->>'absorptionNotes'), profile->>'modelStatus',
          trim(profile->'source'->>'title'), trim(profile->'source'->>'url'),
          (profile->'source'->>'retrievedAt')::date
        );
      end loop;
    end if;
  end loop;

  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count, 'unchanged', unchanged_count);
end;
$$;

revoke all on function public.import_dosage_catalog(jsonb, text) from public;
grant execute on function public.import_dosage_catalog(jsonb, text) to authenticated;

notify pgrst, 'reload schema';
