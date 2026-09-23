insert into public.dosage_catalog (
  key,
  display_name,
  aliases,
  ingredient_name,
  category,
  strength_value,
  strength_unit,
  dose_form,
  route,
  manufacturer,
  default_dose_quantity
) values (
  'allegra-120',
  '알레그라정 120mg',
  array[
    '알레그라정120mg',
    '알레그라 120mg',
    'Allegra 120mg'
  ],
  'Fexofenadine hydrochloride',
  'medication',
  120,
  'mg',
  'Tablet',
  'Oral',
  '한독',
  1
)
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
  catalog_key,
  analyte,
  tmax_min_minutes,
  tmax_max_minutes,
  half_life_min_minutes,
  half_life_max_minutes,
  bioavailability_min_percent,
  bioavailability_max_percent,
  absorption_notes,
  model_status,
  source_title,
  source_url,
  source_retrieved_at
) values (
  'allegra-120',
  'Fexofenadine',
  60,
  180,
  660,
  900,
  null,
  null,
  'Rapidly absorbed after oral administration. Tmax is approximately 1–3 hours. Fexofenadine undergoes negligible metabolism and has a terminal elimination half-life of approximately 11–15 hours.',
  'reference_only',
  'Fexofenadine Hydrochloride 120 mg Film-coated Tablets SmPC',
  'https://www.medicines.org.uk/emc/product/102555/smpc',
  '2026-09-23'
)
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
