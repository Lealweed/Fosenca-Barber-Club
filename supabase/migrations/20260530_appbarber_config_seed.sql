alter table if exists public.settings add column if not exists updated_at timestamptz not null default now();

insert into public.appbarber_config (establishment_code, api_base_url, active)
values (8233076, 'https://api.appbarber.com', true)
on conflict (establishment_code)
do update set
  api_base_url = excluded.api_base_url,
  active = excluded.active,
  updated_at = now();

insert into public.settings (key, value)
values
  ('appbarber_establishment_code', '8233076'),
  ('appbarber_api_base_url', 'https://api.appbarber.com')
on conflict (key)
do update set
  value = excluded.value,
  updated_at = now();
