import { createHash } from 'node:crypto';
import type { Ticket } from '@/services/types';
import {
  type ChurnAssessment,
  type ChurnDataSource,
  type ChurnMetricKey,
} from '@/data/seed/customerChurn';

export const CHURN_WINDOW_DAYS = 90;

export const neutralChurnMetrics: Pick<ChurnAssessment, ChurnMetricKey> = {
  accountAgeYears: 5,
  creditLimitUsagePercent: 50,
  daysPastDue: 0,
  onTimePaymentRatio: 90,
  slaConformancePercent: 90,
  openCases: 3,
  closedCases: 12,
  repeatCases: 1,
};

export interface ConnectWiseChurnCompany {
  id: string;
  dateAcquired?: string;
  creditLimit?: number;
}

export interface ConnectWiseChurnInvoice {
  id: string;
  date: string;
  dueDate: string;
  balance: number;
  total: number;
  paidOnTime?: boolean;
}

export interface ConnectWiseChurnInputs {
  company?: ConnectWiseChurnCompany;
  invoices?: ConnectWiseChurnInvoice[];
  tickets?: Ticket[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function validDate(value: string | undefined): number | undefined {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function yearsBetween(from: number, to: number): number {
  return Math.round(((to - from) / (365.25 * 86_400_000)) * 10) / 10;
}

export function calculateChurnScore(metrics: Pick<ChurnAssessment, ChurnMetricKey>): number {
  const accountAgeRisk = metrics.accountAgeYears >= 5
    ? 0
    : metrics.accountAgeYears >= 3
      ? 3
      : metrics.accountAgeYears >= 1
        ? 6
        : 10;
  const closureTotal = metrics.openCases + metrics.closedCases;
  const unresolvedShare = closureTotal > 0 ? metrics.openCases / closureTotal : 0;
  const score = accountAgeRisk
    + clamp(metrics.creditLimitUsagePercent) * 0.15
    + clamp(metrics.daysPastDue, 0, 30) * 0.5
    + (100 - clamp(metrics.onTimePaymentRatio)) * 0.15
    + (100 - clamp(metrics.slaConformancePercent)) * 0.2
    + clamp(metrics.openCases, 0, 10)
    + unresolvedShare * 10
    + clamp(metrics.repeatCases, 0, 5) * 3;
  return Math.round(clamp(score));
}

function deterministicNarrative(score: number, metrics: Pick<ChurnAssessment, ChurnMetricKey>) {
  const risk = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';
  return {
    assessment: `This account has a ${risk} churn risk score. The assessment combines current account and receivables data with support activity from the trailing ${CHURN_WINDOW_DAYS} days. The strongest visible signals are ${metrics.openCases} open cases, ${metrics.slaConformancePercent}% SLA conformance, ${metrics.creditLimitUsagePercent}% credit utilization, and ${metrics.daysPastDue} days past due.`,
    suggestedActions: metrics.daysPastDue > 0 || metrics.openCases >= 5
      ? 'Review the overdue balance and oldest open support issues with the account owner, then agree on named owners and follow-up dates.'
      : 'Continue routine account engagement, monitor support responsiveness, and review any new payment or service friction at the next account check-in.',
  };
}

export function buildChurnAssessment(
  customerId: string,
  inputs: ConnectWiseChurnInputs,
  now = new Date(),
): ChurnAssessment {
  const cutoff = now.getTime() - CHURN_WINDOW_DAYS * 86_400_000;
  const values = { ...neutralChurnMetrics };
  const metricSources = Object.fromEntries(
    (Object.keys(neutralChurnMetrics) as ChurnMetricKey[]).map((key) => [key, 'demo']),
  ) as Record<ChurnMetricKey, ChurnDataSource>;

  const acquired = validDate(inputs.company?.dateAcquired);
  if (acquired !== undefined && acquired <= now.getTime()) {
    values.accountAgeYears = yearsBetween(acquired, now.getTime());
    metricSources.accountAgeYears = 'connectwise';
  }

  if (inputs.invoices) {
    const creditLimit = inputs.company?.creditLimit;
    if (typeof creditLimit === 'number' && creditLimit > 0) {
      const outstanding = inputs.invoices.reduce((total, invoice) => total + Math.max(0, invoice.balance), 0);
      values.creditLimitUsagePercent = Math.round(clamp((outstanding / creditLimit) * 100));
      metricSources.creditLimitUsagePercent = 'connectwise';
    }
    const overdue = inputs.invoices
      .filter((invoice) => invoice.balance > 0)
      .map((invoice) => validDate(invoice.dueDate))
      .filter((due): due is number => due !== undefined && due < now.getTime());
    values.daysPastDue = overdue.length
      ? Math.max(...overdue.map((due) => Math.max(0, Math.floor((now.getTime() - due) / 86_400_000))))
      : 0;
    metricSources.daysPastDue = 'connectwise';

    const qualifyingInvoices = inputs.invoices.filter((invoice) => {
      const invoiceDate = validDate(invoice.date);
      const dueDate = validDate(invoice.dueDate);
      return invoiceDate !== undefined && invoiceDate >= cutoff
        && dueDate !== undefined && dueDate <= now.getTime()
        && invoice.paidOnTime !== undefined;
    });
    if (qualifyingInvoices.length > 0) {
      values.onTimePaymentRatio = Math.round(
        (qualifyingInvoices.filter((invoice) => invoice.paidOnTime).length / qualifyingInvoices.length) * 100,
      );
      metricSources.onTimePaymentRatio = 'connectwise';
    }
  }

  if (inputs.tickets) {
    values.openCases = inputs.tickets.filter((ticket) => !ticket.isClosed).length;
    metricSources.openCases = 'connectwise';
    const recentTickets = inputs.tickets.filter((ticket) => (validDate(ticket.createdAt) ?? 0) >= cutoff);
    values.closedCases = recentTickets.filter((ticket) => ticket.isClosed).length;
    metricSources.closedCases = 'connectwise';
    const slaTickets = recentTickets.filter((ticket) => typeof ticket.isInSla === 'boolean');
    if (slaTickets.length > 0) {
      values.slaConformancePercent = Math.round(
        (slaTickets.filter((ticket) => ticket.isInSla).length / slaTickets.length) * 100,
      );
      metricSources.slaConformancePercent = 'connectwise';
    }
  }

  const score = calculateChurnScore(values);
  const sourceValues = Object.values(metricSources);
  const source = sourceValues.every((value) => value === 'connectwise')
    ? 'connectwise'
    : sourceValues.every((value) => value === 'demo')
      ? 'demo'
      : 'mixed';
  const fingerprint = createHash('sha256').update(JSON.stringify({ values, metricSources }))
    .digest('hex').slice(0, 32);
  const narrative = deterministicNarrative(score, values);
  return {
    customerId,
    assessedAt: now.toISOString().slice(0, 10),
    score,
    ...narrative,
    ...values,
    metricSources,
    source,
    fingerprint,
  };
}

export function fallbackChurnNarrative(assessment: ChurnAssessment) {
  return deterministicNarrative(assessment.score, assessment);
}
