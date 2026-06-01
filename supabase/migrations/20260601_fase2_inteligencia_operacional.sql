-- =============================================================================
-- FASE 2 — CENTRAL DE INTELIGÊNCIA FONSECA BARBER CLUB
-- Migration: 20260601_fase2_inteligencia_operacional.sql
-- Criado em: 2026-06-01
-- Escopo: Tabelas novas + seed barbeiros + regras de negócio versionadas
-- Idempotente: sim (use IF NOT EXISTS / ON CONFLICT)
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. CATEGORIAS DE SERVIÇO
-- Resolve lacuna L6: classificação BASE/EXTRA/PRODUTO no banco (não só no front)
-- =============================================================================

create table if not exists public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,        -- 'BASE', 'EXTRA', 'PRODUTO'
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Seed de categorias
insert into public.service_categories (name, description, sort_order)
values
  ('BASE',    'Serviços de base puro: Cabelo, Barba, Barboterapia, Barba Express, Pezinho', 1),
  ('EXTRA',   'Adicionais e complementos: Sobrancelha, Pigmentação, Selagem, Hidratação, combos com extra', 2),
  ('PRODUTO', 'Venda de produto avulso: Leave-in, pomada, finalizadores', 3)
on conflict (name) do nothing;

-- =============================================================================
-- 2. MAPEAMENTO SERVIÇO → CATEGORIA
-- Rastreabilidade: origem, regra aplicada, status legado
-- =============================================================================

create table if not exists public.service_category_map (
  id            uuid primary key default gen_random_uuid(),
  service_name  text not null unique,        -- nome exato do AppBarber
  category_id   uuid not null references public.service_categories(id),
  is_legacy     boolean not null default false,  -- registro legado de sistemas anteriores
  rule_applied  text not null,                    -- rastreabilidade obrigatória
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Trigger de updated_at
drop trigger if exists trg_service_category_map_updated_at on public.service_category_map;
create trigger trg_service_category_map_updated_at
before update on public.service_category_map
for each row execute function public.set_updated_at();

-- Seed: mapeamento completo BASE
insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Cabelo', id, false, 'RULE_BASE_PURE_LIST'
from public.service_categories where name = 'BASE'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Barba', id, false, 'RULE_BASE_PURE_LIST'
from public.service_categories where name = 'BASE'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Barboterapia', id, false, 'RULE_BASE_PURE_LIST'
from public.service_categories where name = 'BASE'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Barba Express', id, false, 'RULE_BASE_PURE_LIST'
from public.service_categories where name = 'BASE'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Pezinho', id, false, 'RULE_BASE_PURE_LIST'
from public.service_categories where name = 'BASE'
on conflict (service_name) do nothing;

-- Seed: mapeamento EXTRA
insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Sobrancelha Adicional', id, false, 'RULE_EXTRA_LIST'
from public.service_categories where name = 'EXTRA'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied, notes)
select 'Não informado', id, true, 'RULE_LEGACY_NAO_INFORMADO_IS_SOBRANCELHA',
       'Legado: "Não informado" representa antigo SOBRANCELHA ADICIONAL. Classificar como EXTRA.'
from public.service_categories where name = 'EXTRA'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Pigmentação', id, false, 'RULE_EXTRA_LIST'
from public.service_categories where name = 'EXTRA'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Selagem', id, false, 'RULE_EXTRA_COMBO_NAME'
from public.service_categories where name = 'EXTRA'
on conflict (service_name) do nothing;

insert into public.service_category_map (service_name, category_id, is_legacy, rule_applied)
select 'Hidratação', id, false, 'RULE_EXTRA_LIST'
from public.service_categories where name = 'EXTRA'
on conflict (service_name) do nothing;

-- =============================================================================
-- 3. RESUMO MENSAL CONSOLIDADO POR BARBEIRO
-- Resolve lacuna L7: base para dashboards históricos, metas e comissões retroativas
-- =============================================================================

create table if not exists public.barber_monthly_summary (
  id                     uuid primary key default gen_random_uuid(),
  office_id              uuid not null,
  barber_user_id         uuid not null,
  barber_name            text not null,
  month_ref              date not null,               -- sempre 1º do mês

  -- Receita por categoria
  base_revenue           numeric(12,2) not null default 0,
  extra_revenue          numeric(12,2) not null default 0,
  products_revenue       numeric(12,2) not null default 0,
  total_revenue          numeric(12,2) not null default 0,

  -- Assinaturas (separação obrigatória — regra de negócio)
  assinatura_garantida   numeric(12,2) not null default 0,  -- competência: mês anterior (defasagem)
  assinatura_produzida   numeric(12,2) not null default 0,  -- gerada neste mês (paga no próximo)

  -- Comissão
  commission_rate        numeric(6,4)  not null default 0.45, -- 45% para cortes (regra confirmada)
  commission_earned      numeric(12,2) not null default 0,

  -- Metas e progresso
  target_total           numeric(12,2) not null default 0,
  production_target      numeric(12,2) not null default 0,  -- target_total - assinatura_garantida
  gap_remaining          numeric(12,2) not null default 0,
  progress_pct           numeric(6,2)  not null default 0,
  working_days           integer       not null default 24,

  -- Volume de atendimentos
  total_appointments     integer not null default 0,
  base_appointments      integer not null default 0,
  extra_appointments     integer not null default 0,
  subscription_appointments integer not null default 0,

  -- Ticket médio
  avg_ticket             numeric(12,2) not null default 0,

  -- Rastreabilidade da migração
  data_source            text not null default 'appbarber',
  migration_batch        text,                             -- ex: '2026-01-pilot'
  migrated_at            timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint barber_monthly_summary_unique unique (office_id, barber_user_id, month_ref)
);

-- Índices
create index if not exists idx_barber_monthly_summary_month on public.barber_monthly_summary (office_id, month_ref);
create index if not exists idx_barber_monthly_summary_barber on public.barber_monthly_summary (barber_user_id, month_ref);
create index if not exists idx_barber_monthly_summary_batch on public.barber_monthly_summary (migration_batch);

-- Trigger
drop trigger if exists trg_barber_monthly_summary_updated_at on public.barber_monthly_summary;
create trigger trg_barber_monthly_summary_updated_at
before update on public.barber_monthly_summary
for each row execute function public.set_updated_at();

-- RLS
alter table public.barber_monthly_summary enable row level security;

drop policy if exists barber_monthly_summary_admin_policy on public.barber_monthly_summary;
create policy barber_monthly_summary_admin_policy on public.barber_monthly_summary
for all
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
)
with check (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
);

drop policy if exists barber_monthly_summary_barber_policy on public.barber_monthly_summary;
create policy barber_monthly_summary_barber_policy on public.barber_monthly_summary
for select
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and auth.uid() = barber_user_id
);

drop policy if exists barber_monthly_summary_service_role on public.barber_monthly_summary;
create policy barber_monthly_summary_service_role on public.barber_monthly_summary
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =============================================================================
-- 4. HISTÓRICO DE ASSINATURAS POR BARBEIRO
-- Resolve lacuna L8: separar assinatura_garantida vs assinatura_produzida
-- Regra: usar "valor_a_receber" (NUNCA o valor descontado) como base de comissão
-- =============================================================================

create table if not exists public.barber_subscriptions_history (
  id                uuid primary key default gen_random_uuid(),
  office_id         uuid not null,
  barber_user_id    uuid not null,
  barber_name       text not null,

  -- Competência e pagamento (defasagem mensal)
  month_ref         date not null,            -- mês em que a assinatura foi PRODUZIDA
  payment_month_ref date not null,            -- mês em que será RECEBIDA (= month_ref + 1 mês)

  -- Valores (regra crítica: usar valor_a_receber, não descontado)
  plan_name         text not null,            -- ex: 'Plano Cabelo e Barba'
  valor_a_receber   numeric(12,2) not null,   -- BASE DE COMISSÃO — nunca usar valor_descontado
  valor_descontado  numeric(12,2),            -- informativo apenas — não usar para cálculo

  -- Cliente e referências
  client_name       text,
  appbarber_ref     text,                     -- código de referência no AppBarber
  appbarber_invoice text,                     -- invoice_code se disponível

  -- Rastreabilidade
  data_source       text not null default 'appbarber',
  migration_batch   text,
  notes             text,

  created_at        timestamptz not null default now(),

  constraint barber_subscriptions_history_unique
    unique (office_id, barber_user_id, month_ref, appbarber_ref)
);

-- Índices
create index if not exists idx_barber_subs_history_barber_month on public.barber_subscriptions_history (barber_user_id, month_ref);
create index if not exists idx_barber_subs_history_payment_month on public.barber_subscriptions_history (barber_user_id, payment_month_ref);
create index if not exists idx_barber_subs_history_office on public.barber_subscriptions_history (office_id, month_ref);

-- RLS
alter table public.barber_subscriptions_history enable row level security;

drop policy if exists barber_subs_history_service_role on public.barber_subscriptions_history;
create policy barber_subs_history_service_role on public.barber_subscriptions_history
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists barber_subs_history_admin_policy on public.barber_subscriptions_history;
create policy barber_subs_history_admin_policy on public.barber_subscriptions_history
for all
using (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
)
with check (
  (auth.jwt() ->> 'office_id')::uuid = office_id
  and coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager')
);

-- =============================================================================
-- 5. LOG DE ANOMALIAS DA MIGRAÇÃO
-- Princípio de qualidade: toda anomalia deve ser rastreável
-- =============================================================================

create table if not exists public.migration_anomaly_log (
  id              uuid primary key default gen_random_uuid(),
  batch_id        text not null,
  anomaly_type    text not null check (anomaly_type in (
                    'DUPLICATE', 'MISSING_FIELD', 'CONFLICT',
                    'AMBIGUOUS', 'LEGACY_REMAP', 'VALUE_MISMATCH',
                    'CLASSIFICATION_ERROR', 'COMMISSION_DIVERGENCE'
                  )),
  severity        text not null check (severity in ('HIGH', 'MEDIUM', 'LOW')),
  source_table    text,
  source_id       text,
  field_name      text,
  original_value  text,
  resolved_value  text,
  rule_applied    text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_migration_anomaly_batch on public.migration_anomaly_log (batch_id, severity);
create index if not exists idx_migration_anomaly_type on public.migration_anomaly_log (anomaly_type, severity);

alter table public.migration_anomaly_log enable row level security;

drop policy if exists migration_anomaly_log_service_role on public.migration_anomaly_log;
create policy migration_anomaly_log_service_role on public.migration_anomaly_log
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists migration_anomaly_log_admin_policy on public.migration_anomaly_log;
create policy migration_anomaly_log_admin_policy on public.migration_anomaly_log
for all
using (coalesce(auth.jwt() ->> 'role', '') in ('admin', 'manager'));

-- =============================================================================
-- 6. VERSIONAMENTO DE REGRAS DE NEGÓCIO
-- Controle de mudanças: saber qual regra estava ativa em qual período
-- =============================================================================

create table if not exists public.business_rule_versions (
  id            uuid primary key default gen_random_uuid(),
  rule_name     text not null,
  version       integer not null,
  description   text not null,
  rule_json     jsonb not null,
  active        boolean not null default true,
  valid_from    date not null,
  valid_until   date,               -- null = regra ainda ativa
  created_by    text,
  created_at    timestamptz not null default now(),
  constraint business_rule_versions_unique unique (rule_name, version)
);

alter table public.business_rule_versions enable row level security;

drop policy if exists business_rule_versions_public_read on public.business_rule_versions;
create policy business_rule_versions_public_read on public.business_rule_versions
for select using (active = true or auth.role() = 'service_role');

drop policy if exists business_rule_versions_service_role on public.business_rule_versions;
create policy business_rule_versions_service_role on public.business_rule_versions
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Seed: regras de negócio confirmadas
insert into public.business_rule_versions (rule_name, version, description, rule_json, active, valid_from, created_by)
values
  (
    'COMMISSION_RATE_CUTS',
    1,
    'Taxa de comissão para cortes e serviços base: 45% do valor produzido. Confirmado pelo gestor em 2026-06-01.',
    '{"rate": 0.45, "applies_to": ["BASE", "EXTRA", "PRODUTO"], "exception": "assinatura usa valor_a_receber, não descontado"}',
    true,
    '2026-01-01',
    'admin'
  ),
  (
    'SUBSCRIPTION_DEFASAGEM',
    1,
    'Assinatura produzida no mês X é recebida no mês X+1 (defasagem mensal). Usar "valor_a_receber" como base de comissão.',
    '{"lag_months": 1, "commission_base": "valor_a_receber", "never_use": "valor_descontado"}',
    true,
    '2026-01-01',
    'admin'
  ),
  (
    'SERVICE_CLASSIFICATION_LEGACY',
    1,
    'Campo "Não informado" no AppBarber representa antigo SOBRANCELHA ADICIONAL. Classificar como EXTRA.',
    '{"original": "Não informado", "maps_to": "Sobrancelha Adicional", "category": "EXTRA", "is_legacy": true}',
    true,
    '2026-01-01',
    'admin'
  ),
  (
    'WORKING_DAYS_DEFAULT',
    1,
    'Dias úteis padrão por mês: 24. Ajustável por barbeiro conforme acordado.',
    '{"default_days": 24, "min": 1, "max": 31}',
    true,
    '2026-01-01',
    'admin'
  )
on conflict (rule_name, version) do nothing;

-- =============================================================================
-- 7. SEED DOS BARBEIROS — METAS DO MÊS ATUAL (junho/2026)
-- IDs confirmados pelo gestor em 2026-06-01
-- Comissão: 45% (confirmado)
-- office_id: 11111111-1111-1111-1111-111111111111 (padrão)
-- =============================================================================

do $$
declare
  v_office_id  uuid := '11111111-1111-1111-1111-111111111111';
  v_month_ref  date := date_trunc('month', current_date)::date;
  v_commission numeric := 0.45;
  v_working_days integer := 24;
begin
  -- Eduardo Oliveira
  insert into public.barber_goals (
    office_id, barber_user_id, barber_name, month_ref,
    target_total, guaranteed_subscription, production_target,
    daily_commission_target, daily_revenue_target,
    commission_rate, working_days
  )
  values (
    v_office_id,
    'cdd96a15-d2e1-5ed7-95ba-e67e5da3ab39',
    'Eduardo Oliveira',
    v_month_ref,
    0, 0, 0,
    0, 0,
    v_commission, v_working_days
  )
  on conflict (office_id, barber_user_id, month_ref) do update
    set barber_name     = excluded.barber_name,
        commission_rate = v_commission,
        working_days    = v_working_days,
        updated_at      = now();

  -- Elisvaldo Martins
  insert into public.barber_goals (
    office_id, barber_user_id, barber_name, month_ref,
    target_total, guaranteed_subscription, production_target,
    daily_commission_target, daily_revenue_target,
    commission_rate, working_days
  )
  values (
    v_office_id,
    'bbc42048-c7cf-54ae-9612-820213b68c40',
    'Elisvaldo Martins',
    v_month_ref,
    0, 0, 0,
    0, 0,
    v_commission, v_working_days
  )
  on conflict (office_id, barber_user_id, month_ref) do update
    set barber_name     = excluded.barber_name,
        commission_rate = v_commission,
        working_days    = v_working_days,
        updated_at      = now();

  -- Joandson Marcos
  insert into public.barber_goals (
    office_id, barber_user_id, barber_name, month_ref,
    target_total, guaranteed_subscription, production_target,
    daily_commission_target, daily_revenue_target,
    commission_rate, working_days
  )
  values (
    v_office_id,
    'd17f9450-7f93-5b72-b91d-abe57282b92c',
    'Joandson Marcos',
    v_month_ref,
    0, 0, 0,
    0, 0,
    v_commission, v_working_days
  )
  on conflict (office_id, barber_user_id, month_ref) do update
    set barber_name     = excluded.barber_name,
        commission_rate = v_commission,
        working_days    = v_working_days,
        updated_at      = now();

  -- Matheus Fonseca
  insert into public.barber_goals (
    office_id, barber_user_id, barber_name, month_ref,
    target_total, guaranteed_subscription, production_target,
    daily_commission_target, daily_revenue_target,
    commission_rate, working_days
  )
  values (
    v_office_id,
    'ff1d6ed6-a638-5b47-aaf2-4e7577f65c8e',
    'Matheus Fonseca',
    v_month_ref,
    0, 0, 0,
    0, 0,
    v_commission, v_working_days
  )
  on conflict (office_id, barber_user_id, month_ref) do update
    set barber_name     = excluded.barber_name,
        commission_rate = v_commission,
        working_days    = v_working_days,
        updated_at      = now();

  -- Wathilla Arraujo
  insert into public.barber_goals (
    office_id, barber_user_id, barber_name, month_ref,
    target_total, guaranteed_subscription, production_target,
    daily_commission_target, daily_revenue_target,
    commission_rate, working_days
  )
  values (
    v_office_id,
    'e3a043dd-7d22-506e-bf09-9254fb2ebf10',
    'Wathilla Arraujo',
    v_month_ref,
    0, 0, 0,
    0, 0,
    v_commission, v_working_days
  )
  on conflict (office_id, barber_user_id, month_ref) do update
    set barber_name     = excluded.barber_name,
        commission_rate = v_commission,
        working_days    = v_working_days,
        updated_at      = now();

  -- Weslei Ferreira
  insert into public.barber_goals (
    office_id, barber_user_id, barber_name, month_ref,
    target_total, guaranteed_subscription, production_target,
    daily_commission_target, daily_revenue_target,
    commission_rate, working_days
  )
  values (
    v_office_id,
    '0d9be910-ddc8-58c3-beb4-8beec773c9cc',
    'Weslei Ferreira',
    v_month_ref,
    0, 0, 0,
    0, 0,
    v_commission, v_working_days
  )
  on conflict (office_id, barber_user_id, month_ref) do update
    set barber_name     = excluded.barber_name,
        commission_rate = v_commission,
        working_days    = v_working_days,
        updated_at      = now();

end $$;

-- =============================================================================
-- 8. ATUALIZAR COMISSÃO DEFAULT NO CÓDIGO (garantia)
-- Corrige o default de 0.40 para 0.45 nos registros existentes sem comissão setada
-- =============================================================================

update public.barber_goals
set commission_rate = 0.45, updated_at = now()
where commission_rate = 0.40
  and barber_user_id in (
    'cdd96a15-d2e1-5ed7-95ba-e67e5da3ab39',
    'bbc42048-c7cf-54ae-9612-820213b68c40',
    'd17f9450-7f93-5b72-b91d-abe57282b92c',
    'ff1d6ed6-a638-5b47-aaf2-4e7577f65c8e',
    'e3a043dd-7d22-506e-bf09-9254fb2ebf10',
    '0d9be910-ddc8-58c3-beb4-8beec773c9cc'
  );

-- =============================================================================
-- 9. VIEW OPERACIONAL — RESUMO DE METAS DO MÊS ATUAL
-- Usada pelos dashboards admin e barbeiro
-- =============================================================================

create or replace view public.v_barber_goals_current_month as
select
  bg.id,
  bg.office_id,
  bg.barber_user_id,
  bg.barber_name,
  bg.month_ref,
  bg.target_total,
  bg.guaranteed_subscription,
  bg.production_target,
  bg.daily_commission_target,
  bg.daily_revenue_target,
  bg.commission_rate,
  bg.working_days,
  bg.created_at,
  bg.updated_at,
  -- Status calculado
  case
    when bg.target_total = 0 then 'SEM_META'
    else 'COM_META'
  end as goal_status
from public.barber_goals bg
where bg.month_ref = date_trunc('month', current_date)::date
order by bg.barber_name;

-- =============================================================================
-- FIM DA MIGRATION
-- Verificação: SELECT * FROM v_barber_goals_current_month;
-- Verificação: SELECT name, description FROM service_categories ORDER BY sort_order;
-- Verificação: SELECT service_name, c.name as category, rule_applied FROM service_category_map m JOIN service_categories c ON c.id = m.category_id ORDER BY c.name, m.service_name;
-- =============================================================================
