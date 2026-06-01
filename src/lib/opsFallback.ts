import {
  buildActionPlan,
  calculateGoalMetrics,
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

export const dashboardFallback: DashboardResponse = {
  officeId: 'office-fonseca',
  monthRef: `${new Date().toISOString().slice(0, 7)}-01`,
  generatedAt: new Date().toISOString(),
  barbers: [],
  confirmations: [],
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

export const getFallbackClient = (clientId?: string): Client360Response => {
  const now = new Date().toISOString();
  return {
    id: clientId || '',
    officeId: 'office-fonseca',
    name: 'Cliente',
    phone: '',
    lastVisitAt: now,
    preferences: [],
    notes: '',
    averageFrequencyDays: 0,
    nextVisitSuggestion: '',
    serviceHistory: [],
    purchaseHistory: [],
    signals: [],
  };
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const formatPercent = (value: number) => `${value.toFixed(0)}%`;

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
