create table public.dosage_catalog (
  key text primary key,
  display_name text not null,
  aliases text[] not null default '{}',
  ingredient_name text not null,
  category text not null check (category in ('medication', 'supplement', 'other')),
  strength_value numeric(9, 2) not null check (strength_value > 0),
  strength_unit text not null,
  dose_form text not null,
  route text not null,
  manufacturer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dosage_pk_profiles (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null references public.dosage_catalog(key) on delete cascade,
  analyte text not null,
  tmax_min_minutes integer check (tmax_min_minutes >= 0),
  tmax_max_minutes integer check (tmax_max_minutes >= tmax_min_minutes),
  half_life_min_minutes integer check (half_life_min_minutes > 0),
  half_life_max_minutes integer check (half_life_max_minutes >= half_life_min_minutes),
  bioavailability_min_percent numeric(5, 2) check (bioavailability_min_percent between 0 and 100),
  bioavailability_max_percent numeric(5, 2) check (bioavailability_max_percent between bioavailability_min_percent and 100),
  absorption_notes text not null,
  model_status text not null default 'reference_only' check (model_status in ('reference_only', 'validated')),
  source_title text not null,
  source_url text not null,
  source_retrieved_at date not null,
  unique (catalog_key, analyte, source_url)
);

create table public.dosage_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  catalog_key text not null references public.dosage_catalog(key) on delete restrict,
  product_name text not null,
  ingredient_name text not null,
  dose_quantity numeric(9, 2) not null check (dose_quantity > 0 and dose_quantity <= 1000),
  dose_unit text not null,
  ingredient_amount numeric(9, 2) not null check (ingredient_amount > 0),
  ingredient_unit text not null,
  route text not null,
  taken_at timestamptz not null,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index dosage_intakes_user_taken_idx
  on public.dosage_intakes(user_id, taken_at desc);

alter table public.dosage_catalog enable row level security;
alter table public.dosage_catalog force row level security;
alter table public.dosage_pk_profiles enable row level security;
alter table public.dosage_pk_profiles force row level security;
alter table public.dosage_intakes enable row level security;
alter table public.dosage_intakes force row level security;

grant select on public.dosage_catalog, public.dosage_pk_profiles to authenticated;
grant select, insert, update, delete on public.dosage_intakes to authenticated;

create policy "dosage_catalog_read" on public.dosage_catalog
for select to authenticated using (true);
create policy "dosage_pk_profiles_read" on public.dosage_pk_profiles
for select to authenticated using (true);
create policy "dosage_intakes_owner" on public.dosage_intakes
to authenticated using (private.is_studyos_owner() and private.current_user_id() = user_id)
with check (private.is_studyos_owner() and private.current_user_id() = user_id);

insert into public.dosage_catalog (
  key, display_name, aliases, ingredient_name, category, strength_value,
  strength_unit, dose_form, route, manufacturer
) values
  ('tylenol-500-ir', 'Tylenol 500mg', array['타이레놀정500mg', '타이레놀 500'], 'Acetaminophen', 'medication', 500, 'mg', 'Immediate-release tablet', 'Oral', 'Kenvue'),
  ('turant-200', '튜란트캡슐200mg', array['듀란트캡슐', 'Turant 200mg'], 'Acetylcysteine', 'medication', 200, 'mg', 'Capsule', 'Oral', '코오롱제약')
on conflict (key) do update set
  display_name = excluded.display_name,
  aliases = excluded.aliases,
  ingredient_name = excluded.ingredient_name,
  category = excluded.category,
  strength_value = excluded.strength_value,
  strength_unit = excluded.strength_unit,
  dose_form = excluded.dose_form,
  route = excluded.route,
  manufacturer = excluded.manufacturer,
  updated_at = now();

insert into public.dosage_pk_profiles (
  catalog_key, analyte, tmax_min_minutes, tmax_max_minutes,
  half_life_min_minutes, half_life_max_minutes,
  bioavailability_min_percent, bioavailability_max_percent,
  absorption_notes, model_status, source_title, source_url, source_retrieved_at
) values
  ('tylenol-500-ir', 'Acetaminophen', 24, 60, 120, 180, null, null,
   'Rapidly and almost completely absorbed from the gastrointestinal tract. High-fat food can delay peak concentration by up to one hour.',
   'reference_only', 'TYLENOL Product Monograph', 'https://pdf.hres.ca/dpd_pm/00062135.PDF', '2026-09-14'),
  ('turant-200', 'Parent acetylcysteine', 60, 180, 60, 60, 10, 10,
   'Rapid oral absorption with extensive intestinal-wall and hepatic first-pass metabolism. The approximately 10% bioavailability refers to parent acetylcysteine.',
   'reference_only', 'Acetylcysteine 200 mg oral product SmPC', 'https://www.medicines.org.uk/emc/product/2488/smpc', '2026-09-14'),
  ('turant-200', 'Total acetylcysteine', 60, 180, 275, 636, 10, 10,
   'Terminal half-life range represents total acetylcysteine after oral administration and must not be treated as interchangeable with parent-drug half-life.',
   'reference_only', 'ACTEINSAPH-200 Product Information', 'https://verification.fda.gov.ph/files/DRP-10617_PI.pdf', '2026-09-14')
on conflict (catalog_key, analyte, source_url) do update set
  tmax_min_minutes = excluded.tmax_min_minutes,
  tmax_max_minutes = excluded.tmax_max_minutes,
  half_life_min_minutes = excluded.half_life_min_minutes,
  half_life_max_minutes = excluded.half_life_max_minutes,
  bioavailability_min_percent = excluded.bioavailability_min_percent,
  bioavailability_max_percent = excluded.bioavailability_max_percent,
  absorption_notes = excluded.absorption_notes,
  model_status = excluded.model_status,
  source_title = excluded.source_title,
  source_retrieved_at = excluded.source_retrieved_at;

notify pgrst, 'reload schema';
