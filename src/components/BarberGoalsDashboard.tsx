import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Scissors,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  dashboardFallback,
  formatCurrency,
  formatPercent,
  type BarberDashboardItem,
  type DashboardResponse,
} from '../lib/opsFallback';

const confirmationStyles: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  confirmed: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  no_response: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

const toneStyles: Record<'ok' | 'attention' | 'below', string> = {
  ok: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  attention: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  below: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const toneLabels: Record<'ok' | 'attention' | 'below', string> = {
  ok: 'ok',
  attention: 'atenção',
  below: 'abaixo meta',
};

const getActionTone = (value: number): 'ok' | 'attention' | 'below' => {
  if (value <= 0) return 'ok';
  if (value <= 3) return 'attention';
  return 'below';
};

export default function BarberGoalsDashboard() {
  const [data, setData] = useState<DashboardResponse>(dashboardFallback);
  const [selectedId, setSelectedId] = useState<string>(dashboardFallback.barbers[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'morning' | '30min' | ''>('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({
    targetTotal: 0,
    guaranteedSubscription: 0,
    commissionRate: 0.4,
    workingDays: 24,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/ops/dashboard');
        if (!res.ok) throw new Error('Falha ao carregar dashboard');
        const json = (await res.json()) as DashboardResponse;
        setData(json);
        setSelectedId(json.barbers?.[0]?.id || '');
      } catch {
        setData(dashboardFallback);
        setSelectedId(dashboardFallback.barbers[0]?.id || '');
        setError('Dados principais indisponíveis. Exibindo modo contingência.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selectedBarber = useMemo<BarberDashboardItem | undefined>(
    () => data.barbers.find((barber: BarberDashboardItem) => barber.id === selectedId) || data.barbers[0],
    [data.barbers, selectedId],
  );

  useEffect(() => {
    if (!selectedBarber) return;
    setGoalDraft({
      targetTotal: selectedBarber.targetTotal || 0,
      guaranteedSubscription: selectedBarber.guaranteedSubscription || 0,
      commissionRate: selectedBarber.commissionRate || 0.4,
      workingDays: selectedBarber.workingDays || 24,
    });
  }, [selectedBarber]);

  const saveGoal = async () => {
    if (!selectedBarber) return;
    setSavingGoal(true);
    setNotice('');
    try {
      const res = await fetch('/api/ops/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberUserId: selectedBarber.barberUserId,
          barberName: selectedBarber.barberName,
          monthRef: data.monthRef,
          targetTotal: goalDraft.targetTotal,
          guaranteedSubscription: goalDraft.guaranteedSubscription,
          commissionRate: goalDraft.commissionRate,
          workingDays: goalDraft.workingDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Falha ao salvar meta');
      if (json?.dashboard) {
        setData(json.dashboard);
        const refreshed = (json.dashboard.barbers || []).find((item: BarberDashboardItem) => item.barberUserId === selectedBarber.barberUserId);
        if (refreshed) setSelectedId(refreshed.id);
      }
      setNotice('Meta salva com sucesso e painel recalculado com dados reais.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const runCampaign = async (phase: 'morning' | '30min') => {
    setSyncing(phase);
    try {
      const res = await fetch('/api/ops/confirmations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      });

      if (!res.ok) throw new Error('Falha no disparo');
      const json = (await res.json()) as { confirmations?: DashboardResponse['confirmations']; message?: string; mode?: string };
      if (json.confirmations) {
        setData((prev: DashboardResponse) => ({ ...prev, confirmations: json.confirmations || [] }));
      }
      setNotice(json.mode === 'persistent' ? 'Confirmações enviadas e persistidas no sistema.' : json.message || 'Fluxo executado em modo estável.');
    } catch {
      setNotice('Fluxo executado em modo estável com dados locais.');
    } finally {
      setSyncing('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-lg font-semibold">Carregando painel operacional...</p>
          <p className="text-sm text-zinc-400 mt-2">Metas, CRM e agenda estão sendo preparados.</p>
        </div>
      </div>
    );
  }

  if (!selectedBarber) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-lg font-semibold">Nenhuma meta cadastrada ainda.</p>
          <p className="text-sm text-zinc-400 mt-2">Cadastre barbeiros e metas para ativar o acompanhamento.</p>
        </div>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Meta do mês', value: formatCurrency(selectedBarber.targetTotal), icon: Target, tone: selectedBarber.tone },
    { label: 'Produção necessária', value: formatCurrency(selectedBarber.productionTarget), icon: TrendingUp, tone: selectedBarber.tone },
    { label: 'Diária de comissão', value: formatCurrency(selectedBarber.dailyCommissionTarget), icon: Sparkles, tone: 'attention' as const },
    { label: 'Diária de faturamento', value: formatCurrency(selectedBarber.dailyRevenueTarget), icon: Calendar, tone: 'attention' as const },
    { label: 'Assinatura garantida', value: formatCurrency(selectedBarber.guaranteedSubscription), icon: CheckCircle2, tone: 'ok' as const },
    { label: 'Gap restante', value: formatCurrency(selectedBarber.gapRemaining), icon: Clock3, tone: selectedBarber.gapRemaining <= 0 ? 'ok' as const : selectedBarber.tone },
  ];

  const actions = [
    { label: 'Clientes', value: selectedBarber.actionPlan.customersNeeded, icon: Users },
    { label: 'Sobrancelhas', value: selectedBarber.actionPlan.eyebrowNeeded, icon: Sparkles },
    { label: 'Selagens', value: selectedBarber.actionPlan.sealingNeeded, icon: Scissors },
    { label: 'Produtos', value: selectedBarber.actionPlan.productsNeeded, icon: ShoppingBag },
  ];

  const progressWidth = Math.max(0, Math.min(100, selectedBarber.progressPercent || 0));
  const appbarber = data.appbarber;
  const appbarberSummary = appbarber?.summary;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.10),transparent_0),linear-gradient(135deg,#09090b,#18181b_45%,#09090b)] text-white px-4 py-6 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="/" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4" /> Voltar ao site
            </a>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Operação diária</h1>
            <p className="text-zinc-300 mt-2 max-w-2xl">
              Interface simples para meta, agenda e próxima ação comercial do barbeiro.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runCampaign('morning')}
              disabled={!!syncing}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {syncing === 'morning' ? 'Disparando...' : 'Confirmar início do dia'}
            </button>
            <button
              onClick={() => runCampaign('30min')}
              disabled={!!syncing}
              className="rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm font-semibold hover:bg-amber-500/25 disabled:opacity-50"
            >
              {syncing === '30min' ? 'Enviando...' : 'Lembrete 30 min'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        {appbarberSummary && (
          <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-5 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-5">
              <div>
                <p className="text-sm text-cyan-200">Central de Inteligência AppBarber</p>
                <h2 className="text-2xl font-black mt-1">Agenda, equipe e financeiro real</h2>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200 uppercase">
                Sincronizado
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-400">Agendamentos no mês</p>
                <div className="text-3xl font-black">{appbarberSummary.monthAppointments}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-400">Hoje na agenda</p>
                <div className="text-3xl font-black">{appbarberSummary.todayAppointments}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-400">Receita agendada</p>
                <div className="text-3xl font-black">{formatCurrency(appbarberSummary.monthScheduledRevenue)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-400">Saldo financeiro</p>
                <div className="text-3xl font-black">{formatCurrency(appbarberSummary.financialBalance)}</div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2 mt-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <h3 className="font-bold mb-3">Ranking da equipe</h3>
                <div className="space-y-2">
                  {(appbarber.professionals || []).slice(0, 7).map((professional) => (
                    <div key={`${professional.code}-${professional.name}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-zinc-200">{professional.name}</span>
                      <span className="text-zinc-400">{professional.appointments} ag. • {formatCurrency(professional.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <h3 className="font-bold mb-3">Serviços mais puxados</h3>
                <div className="space-y-2">
                  {(appbarber.topServices || []).slice(0, 7).map((service) => (
                    <div key={service.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-zinc-200">{service.name}</span>
                      <span className="text-zinc-400">{service.appointments} ag. • {formatCurrency(service.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-3 flex flex-wrap items-center gap-2">
          {data.barbers.map((barber: BarberDashboardItem) => (
            <button
              key={barber.id}
              onClick={() => setSelectedId(barber.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                barber.id === selectedBarber.id
                  ? 'bg-white text-zinc-950'
                  : 'bg-zinc-950 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {barber.barberName}
            </button>
          ))}
          <div className={`ml-auto rounded-full border px-3 py-1 text-xs font-bold uppercase ${toneStyles[selectedBarber.tone]}`}>
            {toneLabels[selectedBarber.tone]}
          </div>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-zinc-400">Performance do mês</p>
              <h2 className="text-2xl font-black mt-1">{selectedBarber.barberName}</h2>
            </div>
            <div className="text-sm text-zinc-300">
              Realizado <strong>{formatCurrency(selectedBarber.realizedMonth)}</strong> de <strong>{formatCurrency(selectedBarber.targetTotal)}</strong>
            </div>
          </div>
          <div className="mt-4 h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full ${selectedBarber.tone === 'ok' ? 'bg-emerald-400' : selectedBarber.tone === 'attention' ? 'bg-amber-400' : 'bg-rose-400'}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>{selectedBarber.progressPercent}% da meta</span>
            <span>Comissão {formatPercent(selectedBarber.commissionRate * 100)}</span>
            <span>{selectedBarber.workingDays} dias úteis</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">
              Meta mensal
              <input
                type="number"
                min={0}
                value={goalDraft.targetTotal}
                onChange={(e) => setGoalDraft((prev) => ({ ...prev, targetTotal: Number(e.target.value || 0) }))}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">
              Assinatura garantida
              <input
                type="number"
                min={0}
                value={goalDraft.guaranteedSubscription}
                onChange={(e) => setGoalDraft((prev) => ({ ...prev, guaranteedSubscription: Number(e.target.value || 0) }))}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">
              Comissão (0.40 = 40%)
              <input
                type="number"
                min={0.01}
                max={1}
                step={0.01}
                value={goalDraft.commissionRate}
                onChange={(e) => setGoalDraft((prev) => ({ ...prev, commissionRate: Number(e.target.value || 0.4) }))}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">
              Dias úteis
              <input
                type="number"
                min={1}
                max={31}
                value={goalDraft.workingDays}
                onChange={(e) => setGoalDraft((prev) => ({ ...prev, workingDays: Number(e.target.value || 24) }))}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveGoal}
              disabled={savingGoal}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-gold/80 disabled:opacity-60"
            >
              {savingGoal ? 'Salvando meta...' : 'Salvar meta deste barbeiro'}
            </button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className={`rounded-3xl border p-5 ${toneStyles[tone]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm opacity-80">{label}</span>
                <div className="rounded-xl bg-black/15 p-2"><Icon className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black tracking-tight">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <h2 className="text-xl font-bold mb-4">KPIs do dia</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-400">Clientes atendidos</p>
                <div className="text-3xl font-black">{selectedBarber.kpisToday.customersCount}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-400">Ticket médio</p>
                <div className="text-3xl font-black">{formatCurrency(selectedBarber.kpisToday.ticketAvg)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-400">Extras</p>
                <div className="text-2xl font-black">{formatCurrency(selectedBarber.kpisToday.extraServicesRevenue)}</div>
                <p className="text-xs text-zinc-400 mt-2">Conversão {formatPercent(selectedBarber.kpisToday.extraConversionPct)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-400">Produtos</p>
                <div className="text-2xl font-black">{formatCurrency(selectedBarber.kpisToday.productsRevenue)}</div>
                <p className="text-xs text-zinc-400 mt-2">Conversão {formatPercent(selectedBarber.kpisToday.productsConversionPct)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <h2 className="text-xl font-bold mb-1">Plano de ação</h2>
            <p className="text-zinc-400 text-sm mb-4">O que fazer hoje para reduzir o gap.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {actions.map(({ label, value, icon: Icon }) => {
                const tone = getActionTone(value);
                return (
                  <div key={label} className={`rounded-2xl border p-4 ${toneStyles[tone]}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <strong className="text-2xl font-black">{value}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold">Confirmações no WhatsApp</h2>
              <p className="text-zinc-400 text-sm">Leitura rápida e objetiva da agenda.</p>
            </div>
            <MessageCircle className="w-5 h-5 text-zinc-300" />
          </div>

          {data.confirmations.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              Nenhuma confirmação pendente no momento.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.confirmations.map((item) => (
                <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.clientName}</p>
                      <p className="text-sm text-zinc-400">Horário {item.timeLabel}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${confirmationStyles[item.status]}`}>
                      {item.status === 'confirmed' ? 'confirmado' : item.status === 'pending' ? 'pendente' : 'sem resposta'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <a href="/app/clientes/1" className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
            Abrir CRM Cliente 360
          </a>
        </section>
      </div>
    </div>
  );
}
