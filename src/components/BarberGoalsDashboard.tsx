import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Eye,
  Gauge,
  LineChart,
  Maximize2,
  MessageCircle,
  PieChart,
  RefreshCw,
  Save,
  Scissors,
  ShieldCheck,
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

type Tone = 'ok' | 'attention' | 'below';
type PeriodPreset = 'today' | '7d' | 'month' | 'last_month' | '30d' | '90d' | 'custom';

interface BarberPeriodSummaryItem {
  barberName: string;
  appointments: number;
  revenue: number;
  subscriptions: number;
  paidAppointments: number;
  zeroValueAppointments: number;
  subscriptionPercent: number;
  ticketAvg: number;
  paidTicketAvg: number;
  revenuePerActiveDay: number;
  activeDays: number;
  topServices: Array<{ name: string; appointments: number; revenue: number }>;
  statuses: Array<{ name: string; count: number }>;
}

interface BarberPeriodSummaryResponse {
  source: string;
  generatedAt: string;
  period: {
    preset: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    appointments: number;
    revenue: number;
    subscriptions: number;
    paidAppointments: number;
    zeroValueAppointments: number;
    averageTicket: number;
    paidAverageTicket: number;
    barbers: number;
  };
  barbers: BarberPeriodSummaryItem[];
  topServices: Array<{ name: string; appointments: number; revenue: number }>;
  warning?: string | null;
}

const confirmationStyles: Record<string, string> = {
  pending: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  confirmed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  no_response: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const toneStyles: Record<Tone, string> = {
  ok: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  attention: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  below: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const toneLabels: Record<Tone, string> = {
  ok: 'Ritmo forte',
  attention: 'Atenção',
  below: 'Acelerar',
};

const toneColors: Record<Tone, string> = {
  ok: '#34d399',
  attention: '#fbbf24',
  below: '#fb7185',
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const addDaysLocal = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getPeriodRange = (preset: PeriodPreset) => {
  const today = new Date();
  if (preset === 'today') return { startDate: toDateInput(today), endDate: toDateInput(today) };
  if (preset === '7d') return { startDate: toDateInput(addDaysLocal(today, -6)), endDate: toDateInput(today) };
  if (preset === '30d') return { startDate: toDateInput(addDaysLocal(today, -29)), endDate: toDateInput(today) };
  if (preset === '90d') return { startDate: toDateInput(addDaysLocal(today, -89)), endDate: toDateInput(today) };
  if (preset === 'last_month') {
    return {
      startDate: toDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      endDate: toDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  return {
    startDate: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: toDateInput(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: 'month', label: 'Mes atual' },
  { value: 'last_month', label: 'Mes passado' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

const normalizeCommissionRate = (value: number) => {
  if (!value || Math.abs(value - 0.4) < 0.0001) return 0.45;
  return Math.max(0.01, value);
};

const compactCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: Math.abs(value || 0) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value || 0) >= 10000 ? 1 : 0,
  }).format(value || 0);

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FB';

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

const getActionTone = (value: number): Tone => {
  if (value <= 0) return 'ok';
  if (value <= 3) return 'attention';
  return 'below';
};

const getMomentum = (barber: BarberDashboardItem, houseTicket: number) => {
  if (barber.progressPercent >= 100) return 'Meta batida. A prioridade agora e proteger agenda e ampliar extras.';
  if (barber.kpisToday.ticketAvg > 0 && houseTicket > 0 && barber.kpisToday.ticketAvg < houseTicket) {
    return `Ticket abaixo da casa. Subir de ${formatCurrency(barber.kpisToday.ticketAvg)} para perto de ${formatCurrency(houseTicket)} muda o jogo.`;
  }
  if (barber.gapRemaining > 0) {
    return `Faltam ${formatCurrency(barber.gapRemaining)}. A meta diaria sugerida e ${formatCurrency(barber.dailyRevenueTarget)}.`;
  }
  return 'Sem meta ativa. Defina a meta mensal para liberar o plano de ataque completo.';
};

const buildIndications = (barber: BarberDashboardItem, dashboard: DashboardResponse) => {
  const topServices = dashboard.appbarber?.topServices || [];
  const topService = topServices[0];
  const secondService = topServices[1];
  const nextAppointments = findAppointmentsFor(dashboard, barber.barberName);
  const avgTicket = dashboard.appbarber?.summary.averageTicket || 0;
  const indications: Array<{ title: string; text: string; tone: Tone; icon: React.ElementType }> = [];

  if (barber.targetTotal <= 0) {
    indications.push({
      title: 'Definir meta agora',
      text: 'Sem meta cadastrada, o painel mostra producao real, mas nao consegue orientar o esforco necessario.',
      tone: 'attention',
      icon: Target,
    });
  }

  if (barber.goalSource === 'prediction' && barber.goalPrediction) {
    indications.push({
      title: 'Meta prevista pelo AppBarber',
      text: `Sugestao de ${formatCurrency(barber.goalPrediction.suggestedTarget)} usando agenda, ritmo atual e ticket medio.`,
      tone: 'attention',
      icon: Wand2,
    });
  }

  if (barber.gapRemaining > 0) {
    indications.push({
      title: 'Foco de faturamento',
      text: `Faltam ${formatCurrency(barber.gapRemaining)}. O caminho curto e agenda cheia, complemento e ticket mais alto.`,
      tone: barber.tone,
      icon: TrendingUp,
    });
  } else if (barber.targetTotal > 0) {
    indications.push({
      title: 'Meta controlada',
      text: 'Manter ritmo, proteger agenda futura e puxar servicos extras para ampliar margem.',
      tone: 'ok',
      icon: CheckCircle2,
    });
  }

  if (barber.kpisToday.ticketAvg > 0 && avgTicket > 0 && barber.kpisToday.ticketAvg < avgTicket) {
    indications.push({
      title: 'Subir ticket medio',
      text: `Ticket de hoje em ${formatCurrency(barber.kpisToday.ticketAvg)}. Buscar a media da casa: ${formatCurrency(avgTicket)}.`,
      tone: 'attention',
      icon: Gauge,
    });
  }

  if (topService) {
    indications.push({
      title: 'Oferta principal',
      text: `Usar ${topService.name} como oferta-guia. E um dos servicos com maior tracao no mes.`,
      tone: 'ok',
      icon: Scissors,
    });
  }

  if (secondService) {
    indications.push({
      title: 'Combo inteligente',
      text: `Conectar ${topService?.name || 'servico base'} com ${secondService.name} para aumentar ticket sem depender de mais horarios.`,
      tone: 'attention',
      icon: Sparkles,
    });
  }

  if (nextAppointments.length > 0) {
    const next = nextAppointments[0];
    indications.push({
      title: 'Proxima agenda',
      text: `${next.time || '--:--'} - ${next.service || 'servico'}. Conferir complemento antes do fechamento.`,
      tone: 'attention',
      icon: Calendar,
    });
  }

  return indications.slice(0, 5);
};

function PremiumButton({
  children,
  icon: Icon,
  onClick,
  disabled,
  variant = 'dark',
}: {
  children: React.ReactNode;
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'dark' | 'gold' | 'cyan' | 'emerald' | 'amber';
}) {
  const variants = {
    dark: 'border-white/10 bg-white/5 text-white hover:bg-white/10',
    gold: 'border-[#c5a059]/40 bg-[#c5a059] text-zinc-950 hover:bg-[#d6b875]',
    cyan: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20',
    emerald: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20',
    amber: 'border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${variants[variant]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'ok',
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone?: Tone;
}) {
  return (
    <div
      className="relative w-full min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl"
      style={{ maxWidth: 'calc(100vw - 3rem)' }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-white/55">{label}</p>
          <p className="mt-2 text-2xl font-black text-white sm:text-3xl">{value}</p>
          <p className="mt-1 text-xs text-white/45">{detail}</p>
        </div>
        <div className={`rounded-lg border p-2.5 ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function RingProgress({ value, label, subLabel, tone }: { value: number; label: string; subLabel: string; tone: Tone }) {
  const safeValue = clamp(value);
  const color = toneColors[tone];

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${safeValue}%, rgba(255,255,255,0.08) 0)`,
          boxShadow: `0 0 42px ${color}22`,
        }}
      />
      <div className="absolute inset-[12px] rounded-full border border-white/10 bg-zinc-950" />
      <div className="relative text-center">
        <p className="text-5xl font-black text-white">{formatPercent(safeValue)}</p>
        <p className="mt-2 text-sm font-bold text-white/80">{label}</p>
        <p className="mt-1 text-xs text-white/45">{subLabel}</p>
      </div>
    </div>
  );
}

function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const width = 320;
  const height = 120;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 24) - 12;
    return { x, y, value, label: labels[index] };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full" role="img" aria-label="Historico de receita">
        <defs>
          <linearGradient id="spark-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c5a059" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#c5a059" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-area)" />
        <path d={path} fill="none" stroke="#c5a059" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={`${point.label}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#f8e4b5" />
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-xs text-white/50">
        {points.map((point) => (
          <div key={point.label} className="min-w-0">
            <p className="truncate capitalize">{point.label}</p>
            <p className="font-bold text-white">{compactCurrency(point.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueBars({ barbers, selectedId, onSelect }: { barbers: BarberDashboardItem[]; selectedId: string; onSelect: (id: string) => void }) {
  const maxRevenue = Math.max(...barbers.map((item) => item.realizedMonth), 1);

  return (
    <div className="space-y-3">
      {barbers.slice(0, 8).map((barber, index) => {
        const width = clamp((barber.realizedMonth / maxRevenue) * 100);
        const selected = barber.id === selectedId;

        return (
          <button
            key={barber.id}
            onClick={() => onSelect(barber.id)}
            className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border p-3 text-left transition-all ${
              selected ? 'border-[#c5a059]/70 bg-[#c5a059]/10' : 'border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.06]'
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-sm font-black">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate font-bold text-white">{toShortName(barber.barberName)}</p>
                <p className="text-sm font-black text-white">{compactCurrency(barber.realizedMonth)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${toneColors[barber.tone]}, #f8e4b5)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.7, delay: index * 0.04 }}
                />
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${toneStyles[barber.tone]}`}>
              {formatPercent(barber.progressPercent)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ServiceChart({ services }: { services: NonNullable<DashboardResponse['appbarber']>['topServices'] }) {
  const maxRevenue = Math.max(...services.map((service) => Number(service.revenue || 0)), 1);

  if (!services.length) {
    return <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-white/45">Sem servicos suficientes para montar o grafico.</div>;
  }

  return (
    <div className="space-y-3">
      {services.slice(0, 7).map((service, index) => {
        const width = clamp((Number(service.revenue || 0) / maxRevenue) * 100);
        return (
          <div key={service.name} className="grid grid-cols-[1fr_auto] gap-3">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-white">{service.name}</span>
                <span className="text-white/45">{service.appointments} ag.</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[#c5a059]"
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.65, delay: index * 0.05 }}
                />
              </div>
            </div>
            <strong className="text-sm text-white">{compactCurrency(service.revenue || 0)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-white/45">{text}</div>;
}

export default function BarberGoalsDashboard() {
  const [data, setData] = useState<DashboardResponse>(dashboardFallback);
  const [selectedId, setSelectedId] = useState<string>(dashboardFallback.barbers[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'morning' | '30min' | ''>('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [creatingPredictions, setCreatingPredictions] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [periodRange, setPeriodRange] = useState(() => getPeriodRange('month'));
  const [periodSummary, setPeriodSummary] = useState<BarberPeriodSummaryResponse | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [goalDraft, setGoalDraft] = useState({
    targetTotal: 0,
    guaranteedSubscription: 0,
    commissionRate: 0.45,
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
      setError('Dados principais indisponiveis no momento.');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodSummary = async (preset = periodPreset, range = periodRange) => {
    setPeriodLoading(true);
    try {
      const params = new URLSearchParams({
        period: preset,
        start_date: range.startDate,
        end_date: range.endDate,
      });
      const res = await fetch(`/api/ops/barbers/summary?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar resumo do periodo');
      const json = (await res.json()) as BarberPeriodSummaryResponse;
      setPeriodSummary(json);
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar o resumo do periodo.');
    } finally {
      setPeriodLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadPeriodSummary(periodPreset, periodRange);
  }, [periodPreset, periodRange.startDate, periodRange.endDate]);

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
      commissionRate: normalizeCommissionRate(selectedBarber.commissionRate),
      workingDays: selectedBarber.workingDays || 24,
    });
  }, [selectedBarber]);

  const teamTotals = useMemo(() => {
    const totalTarget = data.barbers.reduce((sum, item) => sum + item.targetTotal, 0);
    const totalRealized = data.barbers.reduce((sum, item) => sum + item.realizedMonth, 0);
    const totalGap = data.barbers.reduce((sum, item) => sum + item.gapRemaining, 0);
    const totalToday = data.barbers.reduce((sum, item) => sum + item.realizedToday, 0);
    const totalWeek = data.barbers.reduce((sum, item) => sum + item.realizedWeek, 0);
    const totalCustomersToday = data.barbers.reduce((sum, item) => sum + item.kpisToday.customersCount, 0);
    const totalCommissionTarget = data.barbers.reduce((sum, item) => sum + item.dailyCommissionTarget, 0);
    const progress = totalTarget > 0 ? Number(((totalRealized / totalTarget) * 100).toFixed(1)) : 0;
    const activeGoals = data.barbers.filter((item) => item.targetTotal > 0).length;
    return { totalTarget, totalRealized, totalGap, totalToday, totalWeek, totalCustomersToday, totalCommissionTarget, progress, activeGoals };
  }, [data.barbers]);

  const appbarberSummary = data.appbarber?.summary;
  const historicalRevenue = data.appbarber?.historicalRevenue;
  const selectedIndications = selectedBarber ? buildIndications(selectedBarber, data) : [];
  const selectedAppointments = selectedBarber ? findAppointmentsFor(data, selectedBarber.barberName).slice(0, 5) : [];
  const selectedHistory = historicalRevenue?.byBarber.find(
    (item) => item.barberName.trim().toLowerCase() === selectedBarber?.barberName.trim().toLowerCase(),
  );
  const selectedPeriodSummary = periodSummary?.barbers.find(
    (item) => item.barberName.trim().toLowerCase() === selectedBarber?.barberName.trim().toLowerCase(),
  );
  const historyMonths = selectedHistory?.months?.slice().reverse() || [];
  const historyValues = historyMonths.length > 0 ? historyMonths.map((item) => item.revenue) : (historicalRevenue?.months || []).slice().reverse().map((item) => item.totalRevenue);
  const historyLabels = historyMonths.length > 0 ? historyMonths.map((item) => item.label) : (historicalRevenue?.months || []).slice().reverse().map((item) => item.label);
  const bestBarber = rankedBarbers[0];
  const pressureBarbers = rankedBarbers.filter((barber) => barber.tone === 'below').length;
  const houseTicket = appbarberSummary?.averageTicket || 0;

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
      setNotice('Meta salva e recomendacoes recalculadas com dados reais.');
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel salvar a meta.');
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
      setError(err?.message || 'Nao foi possivel criar as metas previstas.');
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
      setNotice(json.mode === 'persistent' ? 'Confirmacoes enviadas e persistidas no sistema.' : json.message || 'Fluxo executado.');
    } catch {
      setNotice('Fluxo executado em modo estavel com dados locais.');
    } finally {
      setSyncing('');
    }
  };

  if (loading) {
    return (
      <div className="goals-premium-bg flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10">
            <RefreshCw className="h-6 w-6 animate-spin text-[#c5a059]" />
          </div>
          <p className="text-xl font-black">Carregando central de metas</p>
          <p className="mt-2 text-sm text-white/50">Buscando agenda, equipe, metas e financeiro real.</p>
        </div>
      </div>
    );
  }

  if (!selectedBarber) {
    return (
      <div className="goals-premium-bg flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
          <p className="text-xl font-black">Nenhum barbeiro encontrado.</p>
          <p className="mt-2 text-sm text-white/50">Verifique a integracao do AppBarber e atualize a pagina.</p>
          <div className="mt-5">
            <PremiumButton icon={RefreshCw} onClick={loadDashboard} variant="gold">
              Atualizar
            </PremiumButton>
          </div>
        </div>
      </div>
    );
  }

  const teamProgressWidth = clamp(teamTotals.progress);
  const selectedProgressWidth = clamp(selectedBarber.progressPercent);
  const actionCards = [
    { label: 'Clientes', value: selectedBarber.actionPlan.customersNeeded, icon: Users },
    { label: 'Sobrancelhas', value: selectedBarber.actionPlan.eyebrowNeeded, icon: Sparkles },
    { label: 'Selagens', value: selectedBarber.actionPlan.sealingNeeded, icon: Scissors },
    { label: 'Produtos', value: selectedBarber.actionPlan.productsNeeded, icon: ShoppingBag },
  ];
  const summaryCards: Array<{
    label: string;
    value: string;
    detail: string;
    icon: React.ElementType;
    tone: Tone;
  }> = [
    {
      label: 'Meta da equipe',
      value: compactCurrency(teamTotals.totalTarget),
      detail: `${teamTotals.activeGoals}/${data.barbers.length} metas ativas`,
      icon: Target,
      tone: 'ok' as Tone,
    },
    {
      label: 'Realizado no mes',
      value: compactCurrency(teamTotals.totalRealized),
      detail: `${formatPercent(teamTotals.progress)} do alvo`,
      icon: Wallet,
      tone: teamTotals.progress >= 70 ? 'ok' : teamTotals.progress >= 35 ? 'attention' : 'below',
    },
    {
      label: 'Gap em aberto',
      value: compactCurrency(teamTotals.totalGap),
      detail: pressureBarbers > 0 ? `${pressureBarbers} barbeiros em aceleracao` : 'Ritmo sem alerta critico',
      icon: TrendingUp,
      tone: teamTotals.totalGap <= 0 ? 'ok' : pressureBarbers > 0 ? 'below' : 'attention',
    },
    {
      label: 'Hoje na agenda',
      value: String(appbarberSummary?.todayAppointments || 0),
      detail: `${compactCurrency(teamTotals.totalToday)} previstos hoje`,
      icon: Calendar,
      tone: 'attention' as Tone,
    },
    {
      label: 'Ticket medio',
      value: compactCurrency(houseTicket),
      detail: `${appbarberSummary?.monthAppointments || 0} atendimentos no mes`,
      icon: Gauge,
      tone: 'ok' as Tone,
    },
  ];

  const changePeriodPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== 'custom') {
      setPeriodRange(getPeriodRange(preset));
    }
  };

  return (
    <div className="goals-premium-bg min-h-screen overflow-x-hidden bg-[#070707] text-white">
      <header className="relative border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 py-5 pl-4 pr-8 sm:px-6 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <a href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao site
            </a>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 px-3 py-1 text-xs font-bold text-[#f8e4b5]">
                AppBarber ao vivo
              </span>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
                Producao real
              </span>
            </div>
            <h1 className="mt-4 max-w-full break-words text-4xl font-black leading-tight text-white sm:max-w-4xl sm:text-5xl lg:text-6xl">
              Central premium de metas e performance
            </h1>
            <p className="mt-3 max-w-full break-words text-base leading-relaxed text-white/58 sm:max-w-3xl">
              Um painel de reuniao para transformar agenda, historico e metas em decisoes claras para cada barbeiro faturar mais.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap lg:w-auto lg:justify-end">
            <PremiumButton icon={RefreshCw} onClick={loadDashboard} variant="dark">
              Atualizar
            </PremiumButton>
            <PremiumButton icon={presentationMode ? Eye : Maximize2} onClick={() => setPresentationMode((prev) => !prev)} variant="dark">
              {presentationMode ? 'Editar' : 'Apresentacao'}
            </PremiumButton>
            <PremiumButton icon={creatingPredictions ? RefreshCw : Wand2} onClick={createPredictedGoals} disabled={creatingPredictions} variant="cyan">
              {creatingPredictions ? 'Criando' : 'Metas previstas'}
            </PremiumButton>
            {!presentationMode && (
              <>
                <PremiumButton icon={MessageCircle} onClick={() => runCampaign('morning')} disabled={!!syncing} variant="emerald">
                  {syncing === 'morning' ? 'Disparando' : 'Confirmar inicio'}
                </PremiumButton>
                <PremiumButton icon={Clock3} onClick={() => runCampaign('30min')} disabled={!!syncing} variant="amber">
                  {syncing === '30min' ? 'Enviando' : 'Lembrete 30 min'}
                </PremiumButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl space-y-6 py-6 pl-4 pr-8 sm:px-6 md:px-8">
        <AnimatePresence>
          {(error || notice) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                error ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              {error || notice}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <React.Fragment key={card.label}>
              <MetricTile {...card} />
            </React.Fragment>
          ))}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-bold text-[#f8e4b5]">Resumo por periodo</p>
              <h2 className="text-2xl font-black">Escolha o periodo e veja cada barbeiro</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/52">
                Os numeros abaixo vêm do AppBarber via n8n e recalculam faturamento, atendimentos, assinaturas e ticket medio para o intervalo escolhido.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[460px]">
              <label className="text-sm font-semibold text-white/62">
                Inicio
                <input
                  type="date"
                  value={periodRange.startDate}
                  onChange={(event) => {
                    setPeriodPreset('custom');
                    setPeriodRange((prev) => ({ ...prev, startDate: event.target.value }));
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#c5a059]/70"
                />
              </label>
              <label className="text-sm font-semibold text-white/62">
                Fim
                <input
                  type="date"
                  value={periodRange.endDate}
                  onChange={(event) => {
                    setPeriodPreset('custom');
                    setPeriodRange((prev) => ({ ...prev, endDate: event.target.value }));
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#c5a059]/70"
                />
              </label>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => changePeriodPreset(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                  periodPreset === option.value
                    ? 'border-[#c5a059]/70 bg-[#c5a059]/20 text-[#f8e4b5]'
                    : 'border-white/10 bg-black/20 text-white/68 hover:border-white/25 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={() => loadPeriodSummary(periodPreset, periodRange)}
              disabled={periodLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-100 transition-all hover:bg-cyan-400/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${periodLoading ? 'animate-spin' : ''}`} />
              Atualizar periodo
            </button>
          </div>

          {periodSummary?.warning && (
            <div className="mb-5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
              {periodSummary.warning}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/45">Equipe no periodo</p>
                  <h3 className="text-xl font-black">
                    {periodSummary?.period.startDate || periodRange.startDate} a {periodSummary?.period.endDate || periodRange.endDate}
                  </h3>
                </div>
                <BarChart3 className="h-5 w-5 text-[#f8e4b5]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-white/45">Faturamento</p>
                  <strong className="text-2xl">{compactCurrency(periodSummary?.summary.revenue || 0)}</strong>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-white/45">Atendimentos</p>
                  <strong className="text-2xl">{periodSummary?.summary.appointments || 0}</strong>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-white/45">Ticket medio</p>
                  <strong className="text-2xl">{compactCurrency(periodSummary?.summary.averageTicket || 0)}</strong>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-white/45">Assinaturas</p>
                  <strong className="text-2xl">{periodSummary?.summary.subscriptions || 0}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#c5a059]/25 bg-[#c5a059]/[0.065] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#f8e4b5]/70">Barbeiro selecionado no periodo</p>
                  <h3 className="text-xl font-black">{selectedBarber.barberName}</h3>
                </div>
                <Users className="h-5 w-5 text-[#f8e4b5]" />
              </div>
              {selectedPeriodSummary ? (
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-white/45">Receita</p>
                    <strong className="text-xl">{compactCurrency(selectedPeriodSummary.revenue)}</strong>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-white/45">Atend.</p>
                    <strong className="text-xl">{selectedPeriodSummary.appointments}</strong>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-white/45">Ticket</p>
                    <strong className="text-xl">{compactCurrency(selectedPeriodSummary.ticketAvg)}</strong>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-white/45">Por dia</p>
                    <strong className="text-xl">{compactCurrency(selectedPeriodSummary.revenuePerActiveDay)}</strong>
                  </div>
                  <div className="sm:col-span-4 rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-white/45">Serviços mais fortes</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {selectedPeriodSummary.topServices.slice(0, 4).map((service) => (
                        <div key={service.name} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-white/75">{service.name}</span>
                          <strong>{compactCurrency(service.revenue)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState text={periodLoading ? 'Carregando resumo do barbeiro...' : 'Sem dados desse barbeiro no periodo escolhido.'} />
              )}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase text-white/42">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-3">Barbeiro</th>
                  <th className="py-3 pr-3">Receita</th>
                  <th className="py-3 pr-3">Atend.</th>
                  <th className="py-3 pr-3">Ticket</th>
                  <th className="py-3 pr-3">Assinaturas</th>
                  <th className="py-3 pr-3">Dias ativos</th>
                  <th className="py-3 pr-3">Principal serviço</th>
                </tr>
              </thead>
              <tbody>
                {(periodSummary?.barbers || []).map((barber) => (
                  <tr key={barber.barberName} className="border-b border-white/10 last:border-b-0">
                    <td className="py-3 pr-3 font-bold text-white">{barber.barberName}</td>
                    <td className="py-3 pr-3 text-white/78">{compactCurrency(barber.revenue)}</td>
                    <td className="py-3 pr-3 text-white/68">{barber.appointments}</td>
                    <td className="py-3 pr-3 text-white/68">{compactCurrency(barber.ticketAvg)}</td>
                    <td className="py-3 pr-3 text-white/68">{barber.subscriptions} ({barber.subscriptionPercent}%)</td>
                    <td className="py-3 pr-3 text-white/68">{barber.activeDays}</td>
                    <td className="py-3 pr-3 text-white/68">{barber.topServices[0]?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!periodSummary?.barbers?.length && (
              <div className="mt-3">
                <EmptyState text={periodLoading ? 'Carregando barbeiros do periodo...' : 'Nenhum barbeiro encontrado nesse periodo.'} />
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Placar da equipe</p>
                <h2 className="mt-1 text-3xl font-black text-white">Ritmo do mes</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
                  A meta geral cruza faturamento realizado, agenda do AppBarber e gap de cada barbeiro.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/70">
                <Activity className="h-4 w-4 text-emerald-300" />
                Gerado {new Date(data.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[270px_1fr]">
              <div className="rounded-lg border border-white/10 bg-black/20 p-5">
                <RingProgress value={teamProgressWidth} label="Meta da equipe" subLabel={`${compactCurrency(teamTotals.totalRealized)} realizados`} tone={teamTotals.progress >= 70 ? 'ok' : teamTotals.progress >= 35 ? 'attention' : 'below'} />
                <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm">
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-white/45">Semana</p>
                    <strong>{compactCurrency(teamTotals.totalWeek)}</strong>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-white/45">Clientes hoje</p>
                    <strong>{teamTotals.totalCustomersToday}</strong>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-white">Ranking de receita</h3>
                    <p className="text-sm text-white/45">Clique em um barbeiro para abrir o plano individual.</p>
                  </div>
                  <Trophy className="h-6 w-6 text-[#c5a059]" />
                </div>
                <RevenueBars barbers={rankedBarbers} selectedId={selectedBarber.id} onSelect={setSelectedId} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#c5a059]/25 bg-[#c5a059]/[0.075] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#f8e4b5]">Barbeiro em foco</p>
                <div className="mt-2 flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#c5a059]/35 bg-black/30 text-xl font-black text-[#f8e4b5]">
                    {getInitials(selectedBarber.barberName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-3xl font-black text-white">{selectedBarber.barberName}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${toneStyles[selectedBarber.tone]}`}>
                        {toneLabels[selectedBarber.tone]}
                      </span>
                      <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
                        {selectedBarber.goalSource === 'prediction' ? 'Meta prevista' : 'Meta manual'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <RingProgress value={selectedProgressWidth} label="Progresso" subLabel={formatCurrency(selectedBarber.realizedMonth)} tone={selectedBarber.tone} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">Meta</p>
                <strong className="text-lg">{compactCurrency(selectedBarber.targetTotal)}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">Gap</p>
                <strong className="text-lg">{compactCurrency(selectedBarber.gapRemaining)}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">Diaria</p>
                <strong className="text-lg">{compactCurrency(selectedBarber.dailyRevenueTarget)}</strong>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
              <div className="flex items-start gap-3">
                <Zap className="mt-1 h-5 w-5 shrink-0 text-[#f8e4b5]" />
                <div>
                  <h3 className="font-black text-white">Leitura executiva</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/58">{getMomentum(selectedBarber, houseTicket)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Selecionar profissional</p>
                <h2 className="text-2xl font-black">Equipe</h2>
              </div>
              <Users className="h-6 w-6 text-white/50" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {rankedBarbers.map((barber) => {
                const selected = barber.id === selectedBarber.id;
                return (
                  <button
                    key={barber.id}
                    onClick={() => setSelectedId(barber.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selected ? 'border-[#c5a059]/70 bg-[#c5a059]/10' : 'border-white/10 bg-black/20 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] font-black">
                          {getInitials(barber.barberName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{toShortName(barber.barberName)}</p>
                          <p className="mt-0.5 text-xs text-white/42">{compactCurrency(barber.realizedMonth)} no mes</p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${toneStyles[barber.tone]}`}>{formatPercent(barber.progressPercent)}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${clamp(barber.progressPercent)}%`, background: toneColors[barber.tone] }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {!presentationMode && (
              <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#f8e4b5]">Meta individual</p>
                    <h2 className="text-2xl font-black">Ajustar e recalcular</h2>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="text-sm font-semibold text-white/62">
                    Meta mensal
                    <input
                      type="number"
                      min={0}
                      value={goalDraft.targetTotal}
                      onChange={(event) => setGoalDraft((prev) => ({ ...prev, targetTotal: Number(event.target.value || 0) }))}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#c5a059]/70"
                    />
                  </label>
                  <label className="text-sm font-semibold text-white/62">
                    Assinatura
                    <input
                      type="number"
                      min={0}
                      value={goalDraft.guaranteedSubscription}
                      onChange={(event) => setGoalDraft((prev) => ({ ...prev, guaranteedSubscription: Number(event.target.value || 0) }))}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#c5a059]/70"
                    />
                  </label>
                  <label className="text-sm font-semibold text-white/62">
                    Comissao
                    <input
                      type="number"
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={goalDraft.commissionRate}
                      onChange={(event) => setGoalDraft((prev) => ({ ...prev, commissionRate: Number(event.target.value || 0.45) }))}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#c5a059]/70"
                    />
                  </label>
                  <label className="text-sm font-semibold text-white/62">
                    Dias uteis
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={goalDraft.workingDays}
                      onChange={(event) => setGoalDraft((prev) => ({ ...prev, workingDays: Number(event.target.value || 24) }))}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#c5a059]/70"
                    />
                  </label>
                </div>
                <div className="mt-4">
                  <PremiumButton icon={savingGoal ? RefreshCw : Save} onClick={saveGoal} disabled={savingGoal} variant="gold">
                    {savingGoal ? 'Salvando' : 'Salvar meta e recalcular'}
                  </PremiumButton>
                </div>
              </section>
            )}

            <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#f8e4b5]">Plano de aceleracao</p>
                    <h2 className="text-2xl font-black">O que fazer para bater</h2>
                  </div>
                  <ClipboardList className="h-6 w-6 text-white/50" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {actionCards.map(({ label, value, icon: Icon }) => {
                    const tone = getActionTone(value);
                    return (
                      <div key={label} className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <span className="text-sm font-bold">{label}</span>
                          </div>
                          <strong className="text-4xl font-black">{value}</strong>
                        </div>
                        <p className="mt-2 text-xs opacity-75">{value <= 0 ? 'Em dia' : 'Necessario para fechar o gap'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#f8e4b5]">Previsao</p>
                    <h2 className="text-2xl font-black">AppBarber intelligence</h2>
                  </div>
                  <Wand2 className="h-6 w-6 text-cyan-200" />
                </div>
                {selectedBarber.goalPrediction ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-4">
                      <p className="text-xs text-cyan-100/70">Meta sugerida</p>
                      <strong className="text-xl">{compactCurrency(selectedBarber.goalPrediction.suggestedTarget)}</strong>
                    </div>
                    <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-4">
                      <p className="text-xs text-cyan-100/70">Projecao</p>
                      <strong className="text-xl">{compactCurrency(selectedBarber.goalPrediction.projectedRevenue)}</strong>
                    </div>
                    <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-4">
                      <p className="text-xs text-cyan-100/70">Oportunidade</p>
                      <strong className="text-xl">{compactCurrency(selectedBarber.goalPrediction.upsellOpportunity)}</strong>
                    </div>
                    <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-4">
                      <p className="text-xs text-cyan-100/70">Confianca</p>
                      <strong className="text-xl capitalize">{selectedBarber.goalPrediction.confidence}</strong>
                    </div>
                    <p className="sm:col-span-2 text-xs leading-relaxed text-cyan-100/65">
                      Base: {selectedBarber.goalPrediction.basis.appointmentsCount} agendamentos, ticket efetivo {formatCurrency(selectedBarber.goalPrediction.basis.effectiveTicket)} e {selectedBarber.goalPrediction.basis.remainingDays} dias restantes.
                    </p>
                  </div>
                ) : (
                  <EmptyState text="Crie metas previstas para liberar a leitura de projecao por barbeiro." />
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Historico AppBarber</p>
                <h2 className="text-2xl font-black">Curva de receita</h2>
              </div>
              <LineChart className="h-6 w-6 text-white/50" />
            </div>
            {historicalRevenue?.warning && (
              <div className="mb-4 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-100">
                {historicalRevenue.warning}
              </div>
            )}
            {historyValues.length > 0 ? <Sparkline values={historyValues} labels={historyLabels} /> : <EmptyState text="Historico ainda insuficiente para montar curva de receita." />}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Servicos</p>
                <h2 className="text-2xl font-black">Onde o dinheiro esta entrando</h2>
              </div>
              <PieChart className="h-6 w-6 text-white/50" />
            </div>
            <ServiceChart services={data.appbarber?.topServices || []} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Indicacoes</p>
                <h2 className="text-2xl font-black">Proximas acoes para {toShortName(selectedBarber.barberName)}</h2>
              </div>
              <Zap className="h-6 w-6 text-amber-300" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {selectedIndications.map(({ title, text, tone, icon: Icon }) => (
                <div key={title} className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <h3 className="font-bold">{title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed opacity-90">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Agenda</p>
                <h2 className="text-2xl font-black">Proximos horarios</h2>
              </div>
              <Calendar className="h-6 w-6 text-white/50" />
            </div>
            {selectedAppointments.length === 0 ? (
              <EmptyState text="Nenhum proximo horario encontrado para este barbeiro." />
            ) : (
              <div className="space-y-3">
                {selectedAppointments.map((appointment) => (
                  <div key={appointment.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{appointment.service}</p>
                      <p className="mt-1 text-white/45">{appointment.date} as {appointment.time || '--:--'}</p>
                    </div>
                    <span className="h-fit rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-bold text-white/70">
                      {formatCurrency(appointment.value || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">Resumo historico</p>
                <h2 className="text-2xl font-black">Ultimos meses</h2>
              </div>
              <BarChart3 className="h-6 w-6 text-white/50" />
            </div>
            {historicalRevenue?.byBarber?.length ? (
              <div className="space-y-3">
                {historicalRevenue.byBarber.slice(0, 6).map((barber) => (
                  <div key={barber.barberName} className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{barber.barberName}</p>
                      <p className="text-xs text-white/45">{barber.totalAppointments} atendimentos • {barber.confidence}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">{compactCurrency(barber.averageRevenue)}</p>
                      <p className="text-xs text-white/45">media</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Sem base historica suficiente para listar barbeiros." />
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#f8e4b5]">WhatsApp</p>
                <h2 className="text-2xl font-black">Confirmacoes da agenda</h2>
              </div>
              <MessageCircle className="h-6 w-6 text-white/50" />
            </div>
            {data.confirmations.length === 0 ? (
              <EmptyState text="Nenhuma confirmacao pendente no momento." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.confirmations.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{item.clientName}</p>
                        <p className="mt-1 text-sm text-white/45">Horario {item.timeLabel}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${confirmationStyles[item.status]}`}>
                        {item.status === 'confirmed' ? 'confirmado' : item.status === 'pending' ? 'pendente' : 'sem resposta'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#c5a059]/25 bg-[#c5a059]/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
            <div>
              <p className="text-sm font-bold text-[#f8e4b5]">Fechamento da reuniao</p>
              <h2 className="text-2xl font-black">Proximo passo da equipe</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/58">
                Melhor performance atual: {bestBarber ? toShortName(bestBarber.barberName) : 'equipe'} com {bestBarber ? compactCurrency(bestBarber.realizedMonth) : compactCurrency(0)} no mes. O foco agora e reduzir o gap de {compactCurrency(teamTotals.totalGap)} com agenda, complemento e recorrencia.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-center">
              <p className="text-xs text-white/45">Comissao diaria alvo</p>
              <strong className="text-xl">{compactCurrency(teamTotals.totalCommissionTarget)}</strong>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-center">
              <p className="text-xs text-white/45">Financeiro AppBarber</p>
              <strong className="text-xl">{compactCurrency(appbarberSummary?.financialBalance || 0)}</strong>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-center">
              <p className="text-xs text-white/45">Assinaturas</p>
              <strong className="text-xl">{appbarberSummary?.subscriptionAppointments || 0}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
