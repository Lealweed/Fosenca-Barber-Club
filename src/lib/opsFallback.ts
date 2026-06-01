import {
  buildActionPlan,
  calculateGoalMetrics,
  getRepurchaseStatus,
  type ConfirmationStatus,
  type MetricTone,
  type RepurchaseStatus,
} from './opsMetrics';

export type { ConfirmationStatus, RepurchaseStatus } from './opsMetrics';

export interface BarberKpiSnapshot {
  customersCount: number;
  baseServicesRevenue: number;
  extraServicesRevenue: number;
  productsRevenue: number;
  extraConversionPct: number;
  productsConversionPct: number;
  ticketAvg: number;
}

export interface ActionPlan {
  customersNeeded: number;
  eyebrowNeeded: number;
  sealingNeeded: number;
  productsNeeded: number;
}

export interface BarberDashboardItem {
  id: string;
  officeId: string;
  barberUserId: string;
  barberName: string;
  monthRef: string;
  targetTotal: number;
  guaranteedSubscription: number;
  productionTarget: number;
  dailyCommissionTarget: number;
  dailyRevenueTarget: number;
  commissionRate: number;
  workingDays: number;
  realizedToday: number;
  realizedWeek: number;
  realizedMonth: number;
  gapRemaining: number;
  progressPercent: number;
  tone: MetricTone;
  kpisToday: BarberKpiSnapshot;
  actionPlan: ActionPlan;
}

export interface AppointmentConfirmationItem {
  id: string;
  appointmentId: string;
  clientName: string;
  timeLabel: string;
  channel: 'whatsapp' | 'app';
  status: ConfirmationStatus;
  sentAt: string;
  confirmedAt?: string;
  payload?: Record<string, unknown>;
}

export interface DashboardResponse {
  officeId: string;
  monthRef: string;
  generatedAt: string;
  barbers: BarberDashboardItem[];
  confirmations: AppointmentConfirmationItem[];
  appbarber?: AppBarberDashboardSnapshot;
}

export interface AppBarberDashboardSnapshot {
  source: 'appbarber' | string;
  generatedAt: string;
  period: {
    today: string;
    monthStart: string;
    monthEnd: string;
  };
  summary: {
    servicesCount: number;
    professionalsCount: number;
    monthAppointments: number;
    todayAppointments: number;
    monthScheduledRevenue: number;
    todayScheduledRevenue: number;
    averageTicket: number;
    subscriptionAppointments: number;
    financialBalance: number;
    financialInflows: number;
    financialOutflows: number;
  };
  professionals: Array<{
    name: string;
    fullName: string;
    code: number | null;
    image: string | null;
    evaluation: number;
    appointments: number;
    revenue: number;
    subscriptions: number;
  }>;
  topServices: Array<{
    name: string;
    appointments: number;
    revenue: number;
  }>;
  nextAppointments: Array<{
    id: string;
    clientName: string;
    phone: string;
    service: string;
    professional: string;
    value: number;
    status: string;
    date: string;
    time: string;
    rawStart: string;
    subscription: boolean;
  }>;
  catalog: Array<{
    code: number;
    name: string;
    duration: number;
    value: number;
    image: string | null;
    hasSubscription: boolean;
  }>;
  errors?: Record<string, string | null>;
}

export interface HistoryRow {
  id: string;
  date: string;
  itemName: string;
  amount: number;
  barberName?: string;
}

export interface RepurchaseSignal {
  id: string;
  itemType: 'service' | 'product';
  itemName: string;
  cycleDays: number;
  lastDoneAt: string;
  nextRecommendedAt: string;
  status: RepurchaseStatus;
  offerText: string;
}

export interface Client360Response {
  id: string;
  officeId: string;
  name: string;
  phone: string;
  lastVisitAt: string;
  preferences: string[];
  notes: string;
  averageFrequencyDays: number;
  nextVisitSuggestion: string;
  serviceHistory: HistoryRow[];
  purchaseHistory: HistoryRow[];
  signals: RepurchaseSignal[];
}

const cycle = (now: Date, minusDays: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - minusDays);
  return date.toISOString();
};

const makeBarber = (data: {
  id: string;
  barberName: string;
  targetTotal: number;
  guaranteedSubscription: number;
  commissionRate: number;
  workingDays: number;
  realizedToday: number;
  realizedWeek: number;
  realizedMonth: number;
  kpisToday: BarberKpiSnapshot;
}): BarberDashboardItem => {
  const metrics = calculateGoalMetrics({
    targetTotal: data.targetTotal,
    guaranteedSubscription: data.guaranteedSubscription,
    commissionRate: data.commissionRate,
    workingDays: data.workingDays,
    realizedMonth: data.realizedMonth,
  });

  return {
    id: data.id,
    officeId: 'office-fonseca',
    barberUserId: data.id,
    barberName: data.barberName,
    monthRef: '2026-04',
    targetTotal: data.targetTotal,
    guaranteedSubscription: data.guaranteedSubscription,
    productionTarget: metrics.productionTarget,
    dailyCommissionTarget: metrics.dailyCommissionTarget,
    dailyRevenueTarget: metrics.dailyRevenueTarget,
    commissionRate: data.commissionRate,
    workingDays: data.workingDays,
    realizedToday: data.realizedToday,
    realizedWeek: data.realizedWeek,
    realizedMonth: data.realizedMonth,
    gapRemaining: metrics.gapRemaining,
    progressPercent: metrics.progressPercent,
    tone: metrics.tone,
    kpisToday: data.kpisToday,
    actionPlan: buildActionPlan(metrics.gapRemaining, data.kpisToday.ticketAvg),
  };
};

export const dashboardFallback: DashboardResponse = {
  officeId: 'office-fonseca',
  monthRef: '2026-04',
  generatedAt: new Date().toISOString(),
  barbers: [
    makeBarber({
      id: 'barber-lucas',
      barberName: 'Lucas Fonseca',
      targetTotal: 18000,
      guaranteedSubscription: 5200,
      commissionRate: 0.45,
      workingDays: 24,
      realizedToday: 930,
      realizedWeek: 3870,
      realizedMonth: 12640,
      kpisToday: {
        customersCount: 11,
        baseServicesRevenue: 690,
        extraServicesRevenue: 155,
        productsRevenue: 85,
        extraConversionPct: 42,
        productsConversionPct: 19,
        ticketAvg: 84.5,
      },
    }),
    makeBarber({
      id: 'barber-diego',
      barberName: 'Diego Mendes',
      targetTotal: 14500,
      guaranteedSubscription: 4100,
      commissionRate: 0.4,
      workingDays: 24,
      realizedToday: 710,
      realizedWeek: 2960,
      realizedMonth: 9875,
      kpisToday: {
        customersCount: 9,
        baseServicesRevenue: 540,
        extraServicesRevenue: 110,
        productsRevenue: 60,
        extraConversionPct: 35,
        productsConversionPct: 16,
        ticketAvg: 78.9,
      },
    }),
    makeBarber({
      id: 'barber-rafael',
      barberName: 'Rafael Costa',
      targetTotal: 13200,
      guaranteedSubscription: 3600,
      commissionRate: 0.38,
      workingDays: 22,
      realizedToday: 590,
      realizedWeek: 2480,
      realizedMonth: 9020,
      kpisToday: {
        customersCount: 8,
        baseServicesRevenue: 470,
        extraServicesRevenue: 80,
        productsRevenue: 40,
        extraConversionPct: 29,
        productsConversionPct: 12,
        ticketAvg: 73.75,
      },
    }),
  ],
  confirmations: [
    {
      id: 'conf-1',
      appointmentId: 'ap-001',
      clientName: 'Matheus Nunes',
      timeLabel: '09:00',
      channel: 'whatsapp',
      status: 'confirmed',
      sentAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      payload: { flow: 'inicio_do_dia' },
    },
    {
      id: 'conf-2',
      appointmentId: 'ap-002',
      clientName: 'Ana Souza',
      timeLabel: '13:30',
      channel: 'whatsapp',
      status: 'pending',
      sentAt: new Date().toISOString(),
      payload: { flow: '30_min' },
    },
    {
      id: 'conf-3',
      appointmentId: 'ap-003',
      clientName: 'Carlos Vieira',
      timeLabel: '18:00',
      channel: 'whatsapp',
      status: 'no_response',
      sentAt: new Date().toISOString(),
      payload: { flow: 'inicio_do_dia' },
    },
  ],
  appbarber: {
    source: 'appbarber',
    generatedAt: new Date().toISOString(),
    period: {
      today: new Date().toISOString().slice(0, 10),
      monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      monthEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    },
    summary: {
      servicesCount: 0,
      professionalsCount: 0,
      monthAppointments: 0,
      todayAppointments: 0,
      monthScheduledRevenue: 0,
      todayScheduledRevenue: 0,
      averageTicket: 0,
      subscriptionAppointments: 0,
      financialBalance: 0,
      financialInflows: 0,
      financialOutflows: 0,
    },
    professionals: [],
    topServices: [],
    nextAppointments: [],
    catalog: [],
  },
};

const now = new Date();

export const clientFallbackMap: Record<string, Client360Response> = {
  '1': {
    id: '1',
    officeId: 'office-fonseca',
    name: 'Ana Souza',
    phone: '+55 94 99222-1001',
    lastVisitAt: cycle(now, 18),
    preferences: ['degradê baixo', 'barba alinhada', 'pomada fosca'],
    notes: 'Cliente responde bem a ofertas discretas e prefere atendimento no início da noite.',
    averageFrequencyDays: 19,
    nextVisitSuggestion: 'Retorno ideal entre 18 e 22 dias com oferta de selagem + leave-in.',
    serviceHistory: [
      { id: 'svc-1', date: cycle(now, 18), itemName: 'Corte + barba', amount: 75, barberName: 'Lucas Fonseca' },
      { id: 'svc-2', date: cycle(now, 39), itemName: 'Selagem', amount: 95, barberName: 'Lucas Fonseca' },
      { id: 'svc-3', date: cycle(now, 58), itemName: 'Corte social', amount: 45, barberName: 'Diego Mendes' },
    ],
    purchaseHistory: [
      { id: 'prd-1', date: cycle(now, 61), itemName: 'Leave-in premium', amount: 59 },
      { id: 'prd-2', date: cycle(now, 95), itemName: 'Pomada matte', amount: 45 },
    ],
    signals: [
      {
        id: 'sig-1',
        itemType: 'service',
        itemName: 'Selagem',
        cycleDays: 30,
        lastDoneAt: cycle(now, 39),
        nextRecommendedAt: cycle(now, 9),
        status: getRepurchaseStatus(cycle(now, 39), 30),
        offerText: 'Oferecer nova selagem com combo de manutenção.',
      },
      {
        id: 'sig-2',
        itemType: 'product',
        itemName: 'Leave-in premium',
        cycleDays: 60,
        lastDoneAt: cycle(now, 61),
        nextRecommendedAt: cycle(now, 1),
        status: getRepurchaseStatus(cycle(now, 61), 60),
        offerText: 'Sugerir recompra do leave-in no fechamento do caixa.',
      },
    ],
  },
  'matheus-nunes': {
    id: 'matheus-nunes',
    officeId: 'office-fonseca',
    name: 'Matheus Nunes',
    phone: '+55 94 99111-2222',
    lastVisitAt: cycle(now, 12),
    preferences: ['navalhado', 'toalha quente'],
    notes: 'Costuma confirmar rápido pelo WhatsApp e aceita bem serviços extras.',
    averageFrequencyDays: 14,
    nextVisitSuggestion: 'Agendar manutenção em até 2 dias e oferecer sobrancelha.',
    serviceHistory: [
      { id: 'svc-10', date: cycle(now, 12), itemName: 'Corte degradê', amount: 50, barberName: 'Rafael Costa' },
      { id: 'svc-11', date: cycle(now, 28), itemName: 'Sobrancelha', amount: 25, barberName: 'Rafael Costa' },
    ],
    purchaseHistory: [
      { id: 'prd-10', date: cycle(now, 70), itemName: 'Óleo para barba', amount: 42 },
    ],
    signals: [
      {
        id: 'sig-10',
        itemType: 'service',
        itemName: 'Sobrancelha',
        cycleDays: 15,
        lastDoneAt: cycle(now, 28),
        nextRecommendedAt: cycle(now, 13),
        status: getRepurchaseStatus(cycle(now, 28), 15),
        offerText: 'Já cabe oferta direta de sobrancelha no atendimento de hoje.',
      },
    ],
  },
};

export const getFallbackClient = (clientId?: string): Client360Response => {
  if (!clientId) return clientFallbackMap['1'];
  return clientFallbackMap[clientId] || clientFallbackMap['1'];
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const formatPercent = (value: number) => `${value.toFixed(0)}%`;

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
