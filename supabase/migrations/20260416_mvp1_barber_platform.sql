create extension if not exists pgcrypto;

create table if not exists public.barber_goals (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  barber_user_id uuid not null,
  month_ref date not null,
  target_total numeric(12,2) not null default 0,
  guaranteed_subscription numeric(12,2) not null default 0,
  production_target numeric(12,2) not null default 0,
  daily_commission_target numeric(12,2) not null default 0,
  daily_revenue_target numeric(12,2) not null default 0,
  commission_rate numeric(6,4) not null default 0.40,
  working_days integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barber_goals_unique unique (office_id, barber_user_id, month_ref)
);

create table if not exists public.barber_kpis_daily (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  barber_user_id uuid not null,
  date_ref date not null,
  customers_count integer not null default 0,
  base_services_revenue numeric(12,2) not null default 0,
  extra_services_revenue numeric(12,2) not null default 0,
  products_revenue numeric(12,2) not null default 0,
  extra_conversion_pct numeric(6,2) not null default 0,
  products_conversion_pct numeric(6,2) not null default 0,
  ticket_avg numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint barber_kpis_daily_unique unique (office_id, barber_user_id, date_ref)
);

create table if not exists public.client_profiles_ext (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  client_id uuid not null,
  preferences jsonb not null default '[]'::jsonb,
  notes text,
  last_visit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profiles_ext_unique unique (office_id, client_id)
);

create table if not exists public.recommendation_cycles (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  item_type text not null check (item_type in ('service', 'product')),
  item_name text not null,
  cycle_days integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_repurchase_signals (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  client_id uuid not null,
  item_type text not null check (item_type in ('service', 'product')),
  item_name text not null,
  last_done_at timestamptz,
  next_recommended_at timestamptz,
  status text not null default 'due' check (status in ('due', 'overdue', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_confirmations (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  appointment_id uuid not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'app')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'no_response')),
  sent_at timestamptz,
  confirmed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_confirmations_unique unique (office_id, appointment_id, channel)
);

alter table if exists public.barber_goals add column if not exists barber_name text;
alter table if exists public.client_profiles_ext add column if not exists client_name text;
alter table if exists public.client_profiles_ext add column if not exists phone text;
alter table if exists public.client_profiles_ext add column if not exists average_frequency_days integer not null default 30;
alter table if exists public.client_profiles_ext add column if not exists next_visit_suggestion text;
alter table if exists public.client_repurchase_signals add column if not exists cycle_days integer not null default 30;
alter table if exists public.client_repurchase_signals add column if not exists offer_text text;
alter table if exists public.appointment_confirmations add column if not exists client_name text;

create index if not exists idx_barber_goals_office_month on public.barber_goals (office_id, month_ref);
create index if not exists idx_barber_kpis_daily_office_date on public.barber_kpis_daily (office_id, date_ref);
create index if not exists idx_client_profiles_ext_client on public.client_profiles_ext (office_id, client_id);
create index if not exists idx_recommendation_cycles_office on public.recommendation_cycles (office_id, active);
create index if not exists idx_client_repurchase_signals_client on public.client_repurchase_signals (office_id, client_id, status);
create index if not exists idx_appointment_confirmations_appointment on public.appointment_confirmations (office_id, appointment_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_barber_goals_updated_at on public.barber_goals;
create trigger trg_barber_goals_updated_at
before update on public.barber_goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_client_profiles_ext_updated_at on public.client_profiles_ext;
create trigger trg_client_profiles_ext_updated_at
before update on public.client_profiles_ext
for each row execute function public.set_updated_at();

drop trigger if exists trg_recommendation_cycles_updated_at on public.recommendation_cycles;
create trigger trg_recommendation_cycles_updated_at
before update on public.recommendation_cycles
for each row execute function public.set_updated_at();

drop trigger if exists trg_client_repurchase_signals_updated_at on public.client_repurchase_signals;
create trigger trg_client_repurchase_signals_updated_at
before update on public.client_repurchase_signals
for each row execute function public.set_updated_at();

drop trigger if exists trg_appointment_confirmations_updated_at on public.appointment_confirmations;
create trigger trg_appointment_confirmations_updated_at
before update on public.appointment_confirmations
for each row execute function public.set_updated_at();

alter table public.barber_goals enable row level security;
alter table public.barber_kpis_daily enable row level security;
alter table public.client_profiles_ext enable row level security;
alter table public.recommendation_cycles enable row level security;
alter table public.client_repurchase_signals enable row level security;
alter table public.appointment_confirmations enable row level security;

drop policy if exists barber_goals_admin_policy on public.barber_goals;
create policy barber_goals_admin_policy on public.barber_goals
for all
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
)
with check (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
);

drop policy if exists barber_goals_barber_policy on public.barber_goals;
create policy barber_goals_barber_policy on public.barber_goals
for select
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and auth.uid() = barber_user_id
);

drop policy if exists barber_kpis_daily_admin_policy on public.barber_kpis_daily;
create policy barber_kpis_daily_admin_policy on public.barber_kpis_daily
for all
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
)
with check (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
);

drop policy if exists barber_kpis_daily_barber_policy on public.barber_kpis_daily;
create policy barber_kpis_daily_barber_policy on public.barber_kpis_daily
for select
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and auth.uid() = barber_user_id
);

drop policy if exists client_profiles_ext_office_policy on public.client_profiles_ext;
create policy client_profiles_ext_office_policy on public.client_profiles_ext
for all
using ((auth.jwt() ->> 'office_id')::uuid = office_id)
with check ((auth.jwt() ->> 'office_id')::uuid = office_id);

drop policy if exists recommendation_cycles_office_policy on public.recommendation_cycles;
create policy recommendation_cycles_office_policy on public.recommendation_cycles
for all
using ((auth.jwt() ->> 'office_id')::uuid = office_id)
with check ((auth.jwt() ->> 'office_id')::uuid = office_id);

drop policy if exists client_repurchase_signals_office_policy on public.client_repurchase_signals;
create policy client_repurchase_signals_office_policy on public.client_repurchase_signals
for all
using ((auth.jwt() ->> 'office_id')::uuid = office_id)
with check ((auth.jwt() ->> 'office_id')::uuid = office_id);

drop policy if exists appointment_confirmations_office_policy on public.appointment_confirmations;
create policy appointment_confirmations_office_policy on public.appointment_confirmations
for all
using ((auth.jwt() ->> 'office_id')::uuid = office_id)
with check ((auth.jwt() ->> 'office_id')::uuid = office_id);

insert into public.recommendation_cycles (office_id, item_type, item_name, cycle_days, active)
select '11111111-1111-1111-1111-111111111111'::uuid, 'service', 'Selagem', 30, true
where not exists (
  select 1 from public.recommendation_cycles
  where office_id = '11111111-1111-1111-1111-111111111111'::uuid
    and item_type = 'service'
    and item_name = 'Selagem'
);

insert into public.recommendation_cycles (office_id, item_type, item_name, cycle_days, active)
select '11111111-1111-1111-1111-111111111111'::uuid, 'product', 'Leave-in', 60, true
where not exists (
  select 1 from public.recommendation_cycles
  where office_id = '11111111-1111-1111-1111-111111111111'::uuid
    and item_type = 'product'
    and item_name = 'Leave-in'
);
