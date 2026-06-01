create extension if not exists pgcrypto;

create table if not exists public.settings (
  key text primary key,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id bigserial primary key,
  name text not null,
  price text,
  "desc" text,
  description text,
  appbarber_service_code integer,
  appbarber_item_type integer not null default 1,
  duration_minutes integer,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id bigserial primary key,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_gallery (
  id bigserial primary key,
  url text not null,
  title text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text,
  service_name text,
  service_code integer,
  professional_name text,
  professional_code integer,
  date date,
  time text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'Pendente',
  source text not null default 'site',
  appbarber_appointment_code integer,
  appbarber_payload jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appbarber_config (
  id uuid primary key default gen_random_uuid(),
  office_id uuid,
  establishment_code integer not null,
  api_base_url text not null default 'https://api.appbarber.com',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appbarber_config_one_active unique (establishment_code)
);

create table if not exists public.appbarber_sync_log (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  status text not null check (status in ('success', 'failed', 'skipped')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  correlation_id text,
  created_at timestamptz not null default now()
);

alter table if exists public.services add column if not exists name text;
alter table if exists public.services add column if not exists price text;
alter table if exists public.services add column if not exists "desc" text;
alter table if exists public.services add column if not exists description text;
alter table if exists public.services add column if not exists appbarber_service_code integer;
alter table if exists public.services add column if not exists appbarber_item_type integer not null default 1;
alter table if exists public.services add column if not exists duration_minutes integer;
alter table if exists public.services add column if not exists sort_order integer not null default 0;
alter table if exists public.services add column if not exists active boolean not null default true;
alter table if exists public.services add column if not exists created_at timestamptz not null default now();
alter table if exists public.services add column if not exists updated_at timestamptz not null default now();

alter table if exists public.gallery add column if not exists url text;
alter table if exists public.gallery add column if not exists alt text;
alter table if exists public.gallery add column if not exists sort_order integer not null default 0;
alter table if exists public.gallery add column if not exists active boolean not null default true;
alter table if exists public.gallery add column if not exists created_at timestamptz not null default now();
alter table if exists public.gallery add column if not exists updated_at timestamptz not null default now();

alter table if exists public.video_gallery add column if not exists url text;
alter table if exists public.video_gallery add column if not exists title text;
alter table if exists public.video_gallery add column if not exists sort_order integer not null default 0;
alter table if exists public.video_gallery add column if not exists active boolean not null default true;
alter table if exists public.video_gallery add column if not exists created_at timestamptz not null default now();
alter table if exists public.video_gallery add column if not exists updated_at timestamptz not null default now();

alter table if exists public.appointments add column if not exists client_name text;
alter table if exists public.appointments add column if not exists client_phone text;
alter table if exists public.appointments add column if not exists service_name text;
alter table if exists public.appointments add column if not exists service_code integer;
alter table if exists public.appointments add column if not exists professional_name text;
alter table if exists public.appointments add column if not exists professional_code integer;
alter table if exists public.appointments add column if not exists date date;
alter table if exists public.appointments add column if not exists time text;
alter table if exists public.appointments add column if not exists starts_at timestamptz;
alter table if exists public.appointments add column if not exists ends_at timestamptz;
alter table if exists public.appointments add column if not exists status text not null default 'Pendente';
alter table if exists public.appointments add column if not exists source text not null default 'site';
alter table if exists public.appointments add column if not exists appbarber_appointment_code integer;
alter table if exists public.appointments add column if not exists appbarber_payload jsonb not null default '{}'::jsonb;
alter table if exists public.appointments add column if not exists notes text;
alter table if exists public.appointments add column if not exists created_at timestamptz not null default now();
alter table if exists public.appointments add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_services_appbarber_code on public.services (appbarber_service_code);
create index if not exists idx_services_active_order on public.services (active, sort_order, id);
create index if not exists idx_gallery_active_order on public.gallery (active, sort_order, id);
create index if not exists idx_video_gallery_active_order on public.video_gallery (active, sort_order, id);
create index if not exists idx_appointments_client_phone on public.appointments (client_phone);
create index if not exists idx_appointments_starts_at on public.appointments (starts_at);
create index if not exists idx_appointments_appbarber_code on public.appointments (appbarber_appointment_code);
create index if not exists idx_appbarber_sync_log_created_at on public.appbarber_sync_log (created_at desc);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists trg_gallery_updated_at on public.gallery;
create trigger trg_gallery_updated_at
before update on public.gallery
for each row execute function public.set_updated_at();

drop trigger if exists trg_video_gallery_updated_at on public.video_gallery;
create trigger trg_video_gallery_updated_at
before update on public.video_gallery
for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists trg_appbarber_config_updated_at on public.appbarber_config;
create trigger trg_appbarber_config_updated_at
before update on public.appbarber_config
for each row execute function public.set_updated_at();

alter table public.settings enable row level security;
alter table public.services enable row level security;
alter table public.gallery enable row level security;
alter table public.video_gallery enable row level security;
alter table public.appointments enable row level security;
alter table public.appbarber_config enable row level security;
alter table public.appbarber_sync_log enable row level security;

drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
for select using (true);

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
for select using (active = true or auth.role() = 'service_role');

drop policy if exists gallery_public_read on public.gallery;
create policy gallery_public_read on public.gallery
for select using (active = true or auth.role() = 'service_role');

drop policy if exists video_gallery_public_read on public.video_gallery;
create policy video_gallery_public_read on public.video_gallery
for select using (active = true or auth.role() = 'service_role');

drop policy if exists appointments_service_role_all on public.appointments;
create policy appointments_service_role_all on public.appointments
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists appbarber_config_service_role_all on public.appbarber_config;
create policy appbarber_config_service_role_all on public.appbarber_config
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists appbarber_sync_log_service_role_all on public.appbarber_sync_log;
create policy appbarber_sync_log_service_role_all on public.appbarber_sync_log
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists settings_service_role_all on public.settings;
create policy settings_service_role_all on public.settings
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists services_service_role_all on public.services;
create policy services_service_role_all on public.services
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists gallery_service_role_all on public.gallery;
create policy gallery_service_role_all on public.gallery
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists video_gallery_service_role_all on public.video_gallery;
create policy video_gallery_service_role_all on public.video_gallery
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
