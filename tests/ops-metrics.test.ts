import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGoalMetrics,
  confirmAppointmentStatus,
  getMetricTone,
  getRepurchaseStatus,
} from '../src/lib/opsMetrics';

test('calcula produção e diária corretamente para meta com assinatura', () => {
  const result = calculateGoalMetrics({
    targetTotal: 10000,
    guaranteedSubscription: 3000,
    commissionRate: 0.4,
    workingDays: 20,
    realizedMonth: 7000,
  });

  assert.equal(result.productionTarget, 7000);
  assert.equal(result.dailyCommissionTarget, 350);
  assert.equal(result.dailyRevenueTarget, 875);
  assert.equal(result.tone, 'attention');
});

test('marca recompra como due ou overdue após 35 dias', () => {
  const status = getRepurchaseStatus('2026-03-13T00:00:00.000Z', 30, '2026-04-17T00:00:00.000Z');
  assert.ok(status === 'due' || status === 'overdue');
  assert.equal(status, 'overdue');
});

test('confirmação de WhatsApp atualiza o status do sistema', () => {
  const status = confirmAppointmentStatus('pending', true);
  assert.equal(status, 'confirmed');
});

test('usa cores operacionais esperadas', () => {
  assert.equal(getMetricTone(90), 'ok');
  assert.equal(getMetricTone(70), 'attention');
  assert.equal(getMetricTone(45), 'below');
});
