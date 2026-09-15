alter table public.dosage_catalog
  add column default_dose_quantity numeric(5, 2) not null default 1
  check (default_dose_quantity > 0 and default_dose_quantity <= 1000);

delete from public.dosage_pk_profiles
where catalog_key = 'turant-200'
  and analyte = 'Total acetylcysteine';

insert into public.dosage_catalog (
  key, display_name, aliases, ingredient_name, category, strength_value,
  strength_unit, dose_form, route, manufacturer, default_dose_quantity
) values
  ('cosue-60', '코슈정 60mg', array['코슈정', 'Cosue Tab. 60mg'], 'Pseudoephedrine hydrochloride', 'medication', 60, 'mg', 'Tablet', 'Oral', '코오롱제약', 0.5),
  ('peniramin-2', '페니라민정 2mg', array['페니라민정', 'Peniramin Tab.'], 'Chlorpheniramine maleate', 'medication', 2, 'mg', 'Tablet', 'Oral', '유한양행', 1)
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
  default_dose_quantity = excluded.default_dose_quantity,
  updated_at = now();

insert into public.dosage_pk_profiles (
  catalog_key, analyte, tmax_min_minutes, tmax_max_minutes,
  half_life_min_minutes, half_life_max_minutes,
  bioavailability_min_percent, bioavailability_max_percent,
  absorption_notes, model_status, source_title, source_url, source_retrieved_at
) values
  ('cosue-60', 'Pseudoephedrine', 120, 120, 330, 330, null, null,
   'Rapidly and completely absorbed after oral administration. Urinary pH can materially change renal elimination and therefore the observed half-life.',
   'reference_only', 'Benylin Day & Night Tablets SmPC', 'https://www.medicines.org.uk/emc/product/1711/smpc', '2026-09-16'),
  ('peniramin-2', 'Chlorpheniramine', 60, 120, 720, 900, null, null,
   'Well absorbed from the gastrointestinal tract. Effects develop within about 30 minutes, are maximal within 1 to 2 hours, and the estimated plasma half-life is 12 to 15 hours.',
   'reference_only', 'Chlorphenamine 4mg tablets SmPC', 'https://www.medicines.org.uk/emc/product/14298/smpc', '2026-09-16')
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
