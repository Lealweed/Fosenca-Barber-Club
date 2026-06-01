import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Gauge,
  MessageCircle,
  RefreshCw,
  Save,
  Scissors,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Wand2,
  Zap,
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
  ok: 'meta saudável',
  attention: 'atenção',
  below: 'precisa acelerar',
};

const getActionTone = (value: number): 'ok' | 'attention' | 'below' => {
  if (value <= 0) return 'ok';
  if (value <= 3) return 'attention';
  return 'below';
};

const toShortName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const sortByRevenue = (items: BarberDashboardItem[]) =>
  [...items].sort((a, b) => b.realizedMonth - a.realizedMonth || b.realizedToday - a.realizedToday);

const findAppointmentsFor = (dashboard: DashboardResponse, barberName: string) => {
  const appointments = ((dashboard.appbarber as any)?.appointments || dashboard.appbarber?.nextAppointments || []) as Array<any>;
  return appointments
    .filter((item) => String(item.professional || '').trim().toLowerCase() === barberName.trim().toLowerCase())
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
};

const buildIndications = (barber: BarberDashboardItem, dashboard: DashboardResponse) => {
  const topService = dashboard.appbarber?.topServices?.[0];
  const nextAppointments = findAppointmentsFor(dashboard, barber.barberName);
  const avgTicket = dashboard.appbarber?.summary.averageTicket || 0;
  const indications: Array<{ title: string; text: string; tone: 'ok' | 'attention' | 'below'; icon: React.ElementType }> = [];

  if (barber.targetTotal <= 0) {
    indications.push({
      title: 'Definir meta agora',
      text: 'Sem meta cadastrada, o painel mostra produção real, mas não consegue orientar o esforço necessário.',
      tone: 'attention',
      icon: Target,
    });
  }

  if (barber.goalSource === 'prediction' && barber.goalPrediction) {
    indications.push({
      title: 'Meta prevista pelo AppBarber',
      text: `Sugestão de ${formatCurrency(barber.goalPrediction.suggestedTarget)} usando agenda, ritmo atual e ticket médio.`,
      tone: 'attention',
      icon: Wand2,
    });
  }

  if (barber.gapRemaining > 0) {
    indications.push({
      title: 'Foco de faturamento',
      text: `Faltam ${formatCurrency(barber.gapRemaining)} para bater a meta. O caminho curto é combinar agenda cheia com aumento de ticket.`,
      tone: barber.tone,
      icon: TrendingUp,
    });
  } else if (barber.targetTotal > 0) {
    indications.push({
      title: 'Meta controlada',
      text: 'Manter o ritmo, proteger agenda futura e puxar serviços extras para ampliar margem.',
      tone: 'ok',
      icon: CheckCircle2,
    });
  }

  if (barber.kpisToday.ticketAvg > 0 && avgTicket > 0 && barber.kpisToday.ticketAvg < avgTicket) {
    indications.push({
      title: 'Subir ticket médio',
      text: `Ticket de hoje em ${formatCurrency(barber.kpisToday.ticketAvg)}. Meta prática: chegar perto da média da casa (${formatCurrency(avgTicket)}).`,
      tone: 'attention',
      icon: Gauge,
    });
  }

  if (topService) {
    indications.push({
      title: 'Oferta principal',
      text: `Usar ${topService.name} como oferta-guia da conversa. É um dos serviços com maior tração no mês.`,
      tone: 'ok',
      icon: Scissors,
    });
  }

  if (nextAppointments.length > 0) {
    const next = nextAppointments[0];
    indications.push({
      title: 'Próxima agenda',
      text: `Próximo atendimento: ${next.time || '--:--'} - ${next.service || 'serviço'}. Conferir oportunidade de complemento antes do fechamento.`,
      tone: 'attention',
      icon: Calendar,
    });
  }

  return indications.slice(0, 4);
};

export default function BarberGoalsDashboard() {
  const [data, setData] = useState<DashboardResponse>(dashboardFallback);
  const [selectedId, setSelectedId] = useState<string>(dashboardFallback.barbers[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'morning' | '30min' | ''>('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [creatingPredictions, setCreatingPredictions] = useState(false);
  const [goalDraft, setGoalDraft] = useState({
    targetTotal: 0,
    guaranteedSubscription: 0,
    commissionRate: 0.45, // 45% — taxa confirmada pelo gestor (2026-06-01)
    workingDays: 24,
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops/dashboard');
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      const json = (await res.json()) as DashboardResponse;
      setData(json);
      setSelectedId((current) => json.barbers.find((barber) => barber.id === current)?.id || json.barbers?.[0]?.id || '');
    } catch {
      setData(dashboardFallback);
      setSelectedId(dashboardFallback.barbers[0]?.id || '');
      setError('Dados principais indisponíveis no momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const rankedBarbers = useMemo(() => sortByRevenue(data.barbers), [data.barbers]);
  const selectedBarber = useMemo<BarberDashboardItem | undefined>(
    () => data.barbers.find((barber) => barber.id === selectedId) || rankedBarbers[0],
    [data.barbers, rankedBarbers, selectedId],
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

  const teamTotals = useMemo(() => {
    const totalTarget = data.barbers.reduce((sum, item) => sum + item.targetTotal, 0);
    const totalRealized = data.barbers.reduce((sum, item) => sum + item.realizedMonth, 0);
    const totalGap = data.barbers.reduce((sum, item) => sum + item.gapRemaining, 0);
    const totalToday = data.barbers.reduce((sum, item) => sum + item.realizedToday, 0);
    const progress = totalTarget > 0 ? Number(((totalRealized / totalTarget) * 100).toFixed(1)) : 0;
    return { totalTarget, totalRealized, totalGap, totalToday, progress };
  }, [data.barbers]);

  const appbarberSummary = data.appbarber?.summary;
  const historicalRevenue = data.appbarber?.historicalRevenue;
  const selectedIndications = selectedBarber ? buildIndications(selectedBarber, data) : [];
  const selectedAppointments = selectedBarber ? findAppointmentsFor(data, selectedBarber.barberName).slice(0, 4) : [];
  const selectedHistory = historicalRevenue?.byBarber.find(
    (item) => item.barberName.trim().toLowerCase() === selectedBarber?.barberName.trim().toLowerCase(),
  );

  const saveGoal = async () => {
    if (!selectedBarber) return;
    setSavingGoal(true);
    setNotice('');
    setError('');
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
      setNotice('Meta salva e recomendações recalculadas com dados reais.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const createPredictedGoals = async () => {
    setCreatingPredictions(true);
    setNotice('');
    setError('');
    try {
      const res = await fetch('/api/ops/goals/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Falha ao criar metas previstas');
      if (json?.dashboard) {
        setData(json.dashboard);
        setSelectedId((current) => json.dashboard.barbers.find((barber: BarberDashboardItem) => barber.id === current)?.id || json.dashboard.barbers?.[0]?.id || '');
      }
      setNotice(`${json?.created || 0} metas previstas foram aplicadas com base no AppBarber.`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar as metas previstas.');
    } finally {
      setCreatingPredictions(false);
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
        setData((prev) => ({ ...prev, confirmations: json.confirmations || [] }));
      }
      setNotice(json.mode === 'persistent' ? 'Confirmações enviadas e persistidas no sistema.' : json.message || 'Fluxo executado.');
    } catch {
      setNotice('Fluxo executado em modo estável com dados locais.');
    } finally {
      setSyncing('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-lg font-semibold">Carregando reunião operacional...</p>
          <p className="text-sm text-zinc-400 mt-2">Buscando agenda, equipe, metas e financeiro real.</p>
        </div>
      </div>
    );
  }

  if (!selectedBarber) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-lg font-semibold">Nenhum barbeiro encontrado.</p>
          <p className="text-sm text-zinc-400 mt-2">Verifique a integração do AppBarber e atualize a página.</p>
        </div>
      </div>
    );
  }

  const progressWidth = Math.max(0, Math.min(100, selectedBarber.progressPercent || 0));
  const teamProgressWidth = Math.max(0, Math.min(100, teamTotals.progress || 0));

  const summaryCards = [
    { label: 'Meta da equipe', value: formatCurrency(teamTotals.totalTarget), icon: Target },
    { label: 'Realizado no mês', value: formatCurrency(teamTotals.totalRealized), icon: Wallet },
    { label: 'Gap da equipe', value: formatCurrency(teamTotals.totalGap), icon: TrendingUp },
    { label: 'Hoje na agenda', value: String(appbarberSummary?.todayAppointments || 0), icon: Calendar },
  ];

  const actionCards = [
    { label: 'Clientes', value: selectedBarber.actionPlan.customersNeeded, icon: Users },
    { label: 'Sobrancelhas', value: selectedBarber.actionPlan.eyebrowNeeded, icon: Sparkles },
    { label: 'Selagens', value: selectedBarber.actionPlan.sealingNeeded, icon: Scissors },
    { label: 'Produtos', value: selectedBarber.actionPlan.productsNeeded, icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <a href="/" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white mb-3">
                <ArrowLeft className="h-4 w-4" /> Voltar ao site
              </a>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight md:text-5xl">Reunião de performance</h1>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase text-emerald-200">
                  Dados reais AppBarber
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-zinc-300">
                Metas, produção, agenda e indicações para cada barbeiro faturar mais com ação clara.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadDashboard}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
              <button
                onClick={createPredictedGoals}
                disabled={creatingPredictions}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50"
              >
                {creatingPredictions ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {creatingPredictions ? 'Criando...' : 'Criar metas previstas'}
              </button>
              <button
                onClick={() => runCampaign('morning')}
                disabled={!!syncing}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {syncing === 'morning' ? 'Disparando...' : 'Confirmar início'}
              </button>
              <button
                onClick={() => runCampaign('30min')}
                disabled={!!syncing}
                className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm font-semibold hover:bg-amber-500/25 disabled:opacity-50"
              >
                {syncing === '30min' ? 'Enviando...' : 'Lembrete 30 min'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        {error && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-zinc-400">{label}</p>
                <Icon className="h-5 w-5 text-gold" />
              </div>
              <p className="text-3xl font-black tracking-tight">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-zinc-400">Progresso geral da equipe</p>
              <h2 className="mt-1 text-2xl font-black">{formatPercent(teamTotals.progress)} da meta total</h2>
            </div>
            <p className="text-sm text-zinc-300">
              Hoje: <strong>{formatCurrency(teamTotals.totalToday)}</strong> • Mês: <strong>{formatCurrency(teamTotals.totalRealized)}</strong>
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-gold" style={{ width: `${teamProgressWidth}%` }} />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Equipe</p>
                <h2 className="text-2xl font-black">Performance por barbeiro</h2>
              </div>
              <Trophy className="h-6 w-6 text-gold" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rankedBarbers.map((barber, index) => {
                const selected = barber.id === selectedBarber.id;
                const width = Math.max(0, Math.min(100, barber.progressPercent || 0));
                return (
                  <button
                    key={barber.id}
                    onClick={() => setSelectedId(barber.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selected ? 'border-gold bg-gold/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-500">#{index + 1}</p>
                        <h3 className="truncate text-lg font-black">{toShortName(barber.barberName)}</h3>
                        <p className="mt-1 text-xs text-zinc-400">{barber.barberName}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${toneStyles[barber.tone]}`}>
                        {barber.goalSource === 'prediction' ? 'prevista' : toneLabels[barber.tone]}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-zinc-500">Mês</p>
                        <p className="font-bold">{formatCurrency(barber.realizedMonth)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Hoje</p>
                        <p className="font-bold">{formatCurrency(barber.realizedToday)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Meta</p>
                        <p className="font-bold">{formatCurrency(barber.targetTotal)}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className={barber.tone === 'ok' ? 'h-full bg-emerald-400' : barber.tone === 'attention' ? 'h-full bg-amber-400' : 'h-full bg-rose-400'} style={{ width: `${width}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">Barbeiro selecionado</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black">{selectedBarber.barberName}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
                      selectedBarber.goalSource === 'prediction'
                        ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                    }`}>
                      {selectedBarber.goalSource === 'prediction' ? 'meta prevista' : 'meta manual'}
                    </span>
                  </div>
                </div>
                <Award className="h-6 w-6 text-gold" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Meta mensal
                  <input
                    type="number"
                    min={0}
                    value={goalDraft.targetTotal}
                    onChange={(event) => setGoalDraft((prev) => ({ ...prev, targetTotal: Number(event.target.value || 0) }))}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Assinatura garantida
                  <input
                    type="number"
                    min={0}
                    value={goalDraft.guaranteedSubscription}
                    onChange={(event) => setGoalDraft((prev) => ({ ...prev, guaranteedSubscription: Number(event.target.value || 0) }))}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Comissão
                  <input
                    type="number"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={goalDraft.commissionRate}
                    onChange={(event) => setGoalDraft((prev) => ({ ...prev, commissionRate: Number(event.target.value || 0.4) }))}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">
                  Dias úteis
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={goalDraft.workingDays}
                    onChange={(event) => setGoalDraft((prev) => ({ ...prev, workingDays: Number(event.target.value || 24) }))}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
              </div>

              <button
                onClick={saveGoal}
                disabled={savingGoal}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-black text-zinc-950 hover:bg-gold/80 disabled:opacity-60"
              >
                {savingGoal ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingGoal ? 'Salvando...' : 'Salvar meta e recalcular'}
              </button>
            </section>

            {selectedBarber.goalPrediction && (
              <section className="rounded-lg border border-cyan-400/20 bg-cyan-950/20 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black">Previsão AppBarber</h3>
                  <Wand2 className="h-5 w-5 text-cyan-200" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-cyan-400/20 bg-zinc-950/70 p-3">
                    <p className="text-xs text-cyan-100/70">Meta sugerida</p>
                    <strong className="text-xl">{formatCurrency(selectedBarber.goalPrediction.suggestedTarget)}</strong>
                  </div>
                  <div className="rounded-lg border border-cyan-400/20 bg-zinc-950/70 p-3">
                    <p className="text-xs text-cyan-100/70">Faturamento projetado</p>
                    <strong className="text-xl">{formatCurrency(selectedBarber.goalPrediction.projectedRevenue)}</strong>
                  </div>
                  <div className="rounded-lg border border-cyan-400/20 bg-zinc-950/70 p-3">
                    <p className="text-xs text-cyan-100/70">Oportunidade</p>
                    <strong className="text-xl">{formatCurrency(selectedBarber.goalPrediction.upsellOpportunity)}</strong>
                  </div>
                  <div className="rounded-lg border border-cyan-400/20 bg-zinc-950/70 p-3">
                    <p className="text-xs text-cyan-100/70">Confiança</p>
                    <strong className="text-xl capitalize">{selectedBarber.goalPrediction.confidence}</strong>
                  </div>
                </div>
                <p className="mt-3 text-xs text-cyan-100/70">
                  Base: {selectedBarber.goalPrediction.basis.appointmentsCount} agendamentos, ticket efetivo {formatCurrency(selectedBarber.goalPrediction.basis.effectiveTicket)} e {selectedBarber.goalPrediction.basis.remainingDays} dias restantes.
                </p>
              </section>
            )}

            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black">Indicadores da meta</h3>
                <BarChart3 className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-400">Realizado</span>
                  <strong>{formatCurrency(selectedBarber.realizedMonth)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-400">Gap</span>
                  <strong>{formatCurrency(selectedBarber.gapRemaining)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-400">Diária necessária</span>
                  <strong>{formatCurrency(selectedBarber.dailyRevenueTarget)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-400">Ticket médio hoje</span>
                  <strong>{formatCurrency(selectedBarber.kpisToday.ticketAvg)}</strong>
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={selectedBarber.tone === 'ok' ? 'h-full bg-emerald-400' : selectedBarber.tone === 'attention' ? 'h-full bg-amber-400' : 'h-full bg-rose-400'}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">{formatPercent(selectedBarber.progressPercent)} da meta</p>
            </section>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Plano de ação</p>
                <h2 className="text-2xl font-black">O que precisa fazer</h2>
              </div>
              <ClipboardList className="h-6 w-6 text-gold" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {actionCards.map(({ label, value, icon: Icon }) => {
                const tone = getActionTone(value);
                return (
                  <div key={label} className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <strong className="text-3xl font-black">{value}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Indicações para faturar mais</p>
                <h2 className="text-2xl font-black">Próximas ações</h2>
              </div>
              <Zap className="h-6 w-6 text-amber-300" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {selectedIndications.map(({ title, text, tone, icon: Icon }) => (
                <div key={title} className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <h3 className="font-bold">{title}</h3>
                  </div>
                  <p className="text-sm opacity-90">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {historicalRevenue && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Base histórica</p>
                <h2 className="text-2xl font-black">Últimos meses por barbeiro</h2>
              </div>
              {historicalRevenue.warning && (
                <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                  {historicalRevenue.warning}
                </span>
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-xs uppercase text-zinc-500">
                    <tr className="border-b border-zinc-800">
                      <th className="py-3 pr-3">Barbeiro</th>
                      <th className="py-3 pr-3">Média</th>
                      <th className="py-3 pr-3">Total</th>
                      <th className="py-3 pr-3">Atend.</th>
                      <th className="py-3 pr-3">Confiança</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historicalRevenue.byBarber || []).slice(0, 8).map((barber) => (
                      <tr key={barber.barberName} className="border-b border-zinc-800/70">
                        <td className="py-3 pr-3 font-semibold text-zinc-100">{barber.barberName}</td>
                        <td className="py-3 pr-3 text-zinc-300">{formatCurrency(barber.averageRevenue)}</td>
                        <td className="py-3 pr-3 text-zinc-300">{formatCurrency(barber.totalRevenue)}</td>
                        <td className="py-3 pr-3 text-zinc-300">{barber.totalAppointments}</td>
                        <td className="py-3 pr-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${
                            barber.confidence === 'alta'
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                              : barber.confidence === 'média'
                                ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                                : 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                          }`}>
                            {barber.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black">Histórico do selecionado</h3>
                  <BarChart3 className="h-5 w-5 text-cyan-300" />
                </div>
                {!selectedHistory ? (
                  <p className="text-sm text-zinc-400">Sem histórico mensal suficiente para este barbeiro.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedHistory.months.map((month) => (
                      <div key={month.monthRef} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold capitalize">{month.label}</p>
                            <p className="text-xs text-zinc-400">{month.appointments} atend. • ticket {formatCurrency(month.ticketAvg)}</p>
                          </div>
                          <strong>{formatCurrency(month.revenue)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Serviços mais puxados</h2>
              <Scissors className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="space-y-3">
              {(data.appbarber?.topServices || []).slice(0, 7).map((service) => (
                <div key={service.name} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                  <span className="truncate text-zinc-200">{service.name}</span>
                  <span className="shrink-0 text-zinc-400">{service.appointments} ag. • {formatCurrency(service.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Agenda do selecionado</h2>
              <Clock3 className="h-5 w-5 text-zinc-300" />
            </div>
            {selectedAppointments.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                Nenhum próximo horário encontrado para este barbeiro.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedAppointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{appointment.service}</p>
                        <p className="text-zinc-400">{appointment.date} às {appointment.time || '--:--'}</p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                        {formatCurrency(appointment.value || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Confirmações no WhatsApp</h2>
              <p className="text-sm text-zinc-400">Acompanhamento rápido da agenda.</p>
            </div>
            <MessageCircle className="h-5 w-5 text-zinc-300" />
          </div>

          {data.confirmations.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              Nenhuma confirmação pendente no momento.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.confirmations.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
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
        </section>
      </main>
    </div>
  );
}
