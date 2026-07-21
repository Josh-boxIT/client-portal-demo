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

/** Returns only the assessment belonging to the requested tenant. */
export function getChurnAssessment(tenantId: string): ChurnAssessment | null {
  return churnAssessments[tenantId] ?? null;
}
