import { describe, expect, it } from 'vitest';
import type { Ticket } from '@/services/types';
import { buildChurnAssessment, calculateChurnScore, neutralChurnMetrics } from './scoring';

function ticket(id: string, createdAt: string, isClosed: boolean, isInSla?: boolean): Ticket {
  return {
    id,
    tenantId: 'tenant-1',
    number: id,
    subject: id,
    status: isClosed ? 'closed' : 'open',
    isClosed,
    priority: 'medium',
    requesterId: 'person-1',
    createdAt,
    updatedAt: createdAt,
    category: 'Support',
    messages: [],
    ...(isInSla === undefined ? {} : { isInSla }),
  };
}

describe('customer churn scoring', () => {
  it('uses neutral demo defaults when ConnectWise fields are unavailable', () => {
    const assessment = buildChurnAssessment('tenant-1', {}, new Date('2026-07-21T12:00:00Z'));
    expect(assessment).toMatchObject({
      ...neutralChurnMetrics,
      source: 'demo',
      score: calculateChurnScore(neutralChurnMetrics),
    });
    expect(new Set(Object.values(assessment.metricSources))).toEqual(new Set(['demo']));
  });

  it('uses current open tickets and trailing-90-day closed, SLA, and invoice data', () => {
    const assessment = buildChurnAssessment('tenant-1', {
      company: { id: 'cw-company-1', dateAcquired: '2020-01-01T00:00:00Z', creditLimit: 10_000 },
      invoices: [
        { id: 'invoice-1', date: '2026-06-01T00:00:00Z', dueDate: '2026-06-30T00:00:00Z', balance: 5_000, total: 5_000, paidOnTime: false },
        { id: 'invoice-2', date: '2026-05-01T00:00:00Z', dueDate: '2026-05-31T00:00:00Z', balance: 0, total: 1_000, paidOnTime: true },
      ],
      tickets: [
        ticket('old-open', '2025-01-01T00:00:00Z', false),
        ticket('recent-closed-in-sla', '2026-07-01T00:00:00Z', true, true),
        ticket('recent-closed-missed-sla', '2026-07-02T00:00:00Z', true, false),
      ],
    }, new Date('2026-07-21T12:00:00Z'));

    expect(assessment).toMatchObject({
      accountAgeYears: 6.6,
      creditLimitUsagePercent: 50,
      daysPastDue: 21,
      onTimePaymentRatio: 50,
      slaConformancePercent: 50,
      openCases: 1,
      closedCases: 2,
      repeatCases: neutralChurnMetrics.repeatCases,
      source: 'mixed',
    });
    expect(assessment.metricSources).toMatchObject({
      accountAgeYears: 'connectwise',
      creditLimitUsagePercent: 'connectwise',
      daysPastDue: 'connectwise',
      onTimePaymentRatio: 'connectwise',
      slaConformancePercent: 'connectwise',
      openCases: 'connectwise',
      closedCases: 'connectwise',
      repeatCases: 'demo',
    });
  });
});
