import type { Identity } from '@/store/auth';
import type { TenantTheme } from '@/theme/tenants';
import { getAccessibleTenants } from '@/lib/accessibleTenants';

export interface ChurnAssessment {
  customerId: string;
  assessedAt: string;
  score: number;
  assessment: string;
  suggestedActions: string;
  accountAgeYears: number;
  creditLimitUsagePercent: number;
  daysPastDue: number;
  onTimePaymentRatio: number;
  openCases: number;
  closedCases: number;
  repeatCases: number;
}

export interface ChurnRiskTone {
  label: string;
  badgeClass: string;
  scoreClass: string;
  ring: string;
}

export interface CustomerChurnRow {
  customer: TenantTheme;
  assessment: ChurnAssessment;
}

const ASSESSED_AT = '2026-07-20';

export const churnAssessments: Record<string, ChurnAssessment> = {
  brightwater: {
    customerId: 'brightwater',
    assessedAt: ASSESSED_AT,
    score: 68,
    assessment:
      'This account has a high risk of churn. Credit utilization is elevated and the oldest unpaid invoice is 18 days past due. Support demand is also persistent: five cases remain open and three issues have repeated during the last 90 days. The account has meaningful tenure and a solid payment history, which moderates the risk.',
    suggestedActions:
      'Proactively contact the customer to address the overdue balance and recurring service issues. Prioritize resolution of the repeated cases and agree on a clear payment follow-up plan.',
    accountAgeYears: 8.4,
    creditLimitUsagePercent: 74,
    daysPastDue: 18,
    onTimePaymentRatio: 82,
    openCases: 5,
    closedCases: 12,
    repeatCases: 3,
  },
  cedarvine: {
    customerId: 'cedarvine',
    assessedAt: ASSESSED_AT,
    score: 42,
    assessment:
      'This account has a moderate risk of churn. Payment behavior is generally healthy, with a strong on-time payment ratio and limited credit usage. A small overdue balance and three open service cases create some short-term friction, but repeat case volume remains low.',
    suggestedActions:
      'Continue routine engagement and resolve the three open cases before they become recurring issues. Monitor the overdue balance and confirm that the next payment is received on time.',
    accountAgeYears: 5.8,
    creditLimitUsagePercent: 48,
    daysPastDue: 6,
    onTimePaymentRatio: 91,
    openCases: 3,
    closedCases: 16,
    repeatCases: 1,
  },
  northwind: {
    customerId: 'northwind',
    assessedAt: ASSESSED_AT,
    score: 81,
    assessment:
      'This account has a critical risk of churn. High credit utilization, a significantly overdue invoice, and a declining on-time payment ratio point to financial stress. Seven open cases and four repeat issues indicate unresolved service friction.',
    suggestedActions:
      'Arrange immediate account-owner outreach and establish a joint payment and support recovery plan. Focus first on the oldest invoice, then assign owners and deadlines to the repeated case themes.',
    accountAgeYears: 11.2,
    creditLimitUsagePercent: 89,
    daysPastDue: 34,
    onTimePaymentRatio: 71,
    openCases: 7,
    closedCases: 9,
    repeatCases: 4,
  },
};

export function getChurnAssessment(customerId: string): ChurnAssessment | undefined {
  return churnAssessments[customerId];
}

export function getAccessibleChurnRows(
  identity: Identity | null,
  accessibleClientIds: string[],
  tenants: TenantTheme[],
): CustomerChurnRow[] {
  return getAccessibleTenants(identity, accessibleClientIds, tenants)
    .map((customer) => {
      const assessment = getChurnAssessment(customer.id);
      return assessment ? { customer, assessment } : null;
    })
    .filter((row): row is CustomerChurnRow => row !== null)
    .sort((a, b) => b.assessment.score - a.assessment.score);
}

export function getRiskTone(score: number): ChurnRiskTone {
  if (score >= 80) {
    return {
      label: 'Critical risk',
      badgeClass: 'border-red-200 bg-red-100 text-red-800',
      scoreClass: 'text-red-600',
      ring: '#dc2626',
    };
  }
  if (score >= 60) {
    return {
      label: 'High risk',
      badgeClass: 'border-orange-200 bg-orange-100 text-orange-800',
      scoreClass: 'text-orange-600',
      ring: '#ea580c',
    };
  }
  if (score >= 30) {
    return {
      label: 'Moderate risk',
      badgeClass: 'border-amber-200 bg-amber-100 text-amber-800',
      scoreClass: 'text-amber-600',
      ring: '#d97706',
    };
  }
  return {
    label: 'Low risk',
    badgeClass: 'border-green-200 bg-green-100 text-green-800',
    scoreClass: 'text-green-600',
    ring: '#16a34a',
  };
}

export function formatAssessmentDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
