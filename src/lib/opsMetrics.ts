export type MetricTone = 'ok' | 'attention' | 'below';
export type ConfirmationStatus = 'pending' | 'confirmed' | 'no_response';
export type RepurchaseStatus = 'due' | 'overdue' | 'done';

export interface GoalMetricsInput {
  targetTotal: number;
  guaranteedSubscription?: number;
  commissionRate?: number;
  workingDays?: number;
  realizedMonth?: number;
}

export interface GoalMetricsResult {
  productionTarget: number;
  dailyCommissionTarget: number;
  dailyRevenueTarget: number;
  gapRemaining: number;
  progressPercent: number;
  tone: MetricTone;
}

export const roundMoney = (value: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : 0;
};

export const getMetricTone = (progressPercent: number): MetricTone => {
  if (progressPercent >= 85) return 'ok';
  if (progressPercent >= 60) return 'attention';
  return 'below';
};

export const calculateGoalMetrics = ({
  targetTotal,
  guaranteedSubscription = 0,
  commissionRate = 0.4,
  workingDays = 24,
  realizedMonth = 0,
}: GoalMetricsInput): GoalMetricsResult => {
  const safeTarget = roundMoney(targetTotal);
  const safeSubscription = roundMoney(guaranteedSubscription);
  const safeDays = Math.max(1, Math.floor(workingDays || 1));
  const safeRate = Math.max(0.01, Number(commissionRate) || 0.4);
  const safeRealized = roundMoney(realizedMonth);

  const productionTarget = roundMoney(safeTarget - safeSubscription);
  const dailyCommissionTarget = roundMoney(productionTarget / safeDays);
  const dailyRevenueTarget = roundMoney(dailyCommissionTarget / safeRate);
  const gapRemaining = roundMoney(safeTarget - safeRealized);
  const progressPercent = safeTarget > 0 ? Number(((safeRealized / safeTarget) * 100).toFixed(1)) : 0;

  return {
    productionTarget,
    dailyCommissionTarget,
    dailyRevenueTarget,
    gapRemaining,
    progressPercent,
    tone: getMetricTone(progressPercent),
  };
};

export const buildActionPlan = (gapRemaining: number, ticketAvg: number) => ({
  customersNeeded: Math.max(0, Math.ceil(roundMoney(gapRemaining) / Math.max(1, roundMoney(ticketAvg)))),
  eyebrowNeeded: Math.max(0, Math.ceil(roundMoney(gapRemaining) / 25)),
  sealingNeeded: Math.max(0, Math.ceil(roundMoney(gapRemaining) / 90)),
  productsNeeded: Math.max(0, Math.ceil(roundMoney(gapRemaining) / 55)),
});

export const daysBetween = (from: string | Date, to: string | Date = new Date()) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diff = toDate.getTime() - fromDate.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

export const getRepurchaseStatus = (
  lastDoneAt: string | Date,
  cycleDays: number,
  referenceDate: string | Date = new Date(),
): RepurchaseStatus => {
  const safeCycle = Math.max(1, Math.floor(cycleDays || 1));
  const daysSince = daysBetween(lastDoneAt, referenceDate);

  if (daysSince > safeCycle + 3) return 'overdue';
  if (daysSince >= Math.max(0, safeCycle - 3)) return 'due';
  return 'done';
};

export const confirmAppointmentStatus = (
  currentStatus: ConfirmationStatus = 'pending',
  confirmed = false,
): ConfirmationStatus => {
  if (confirmed || currentStatus === 'confirmed') return 'confirmed';
  return currentStatus;
};
