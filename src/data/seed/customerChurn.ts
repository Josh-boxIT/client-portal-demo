export interface ChurnAssessment {
  score: number;
  narrative: string;
  accountAgeYears: number;
  creditLimitUsagePercent: number;
  daysPastDue: number;
  onTimePaymentRatio: number;
  openCases: number;
  closedCases: number;
  repeatCases: number;
}

const churnAssessments: Record<string, ChurnAssessment> = {
  brightwater: {
    score: 68,
    narrative:
      'This account has a high risk of churn. Credit utilization is elevated and the oldest unpaid invoice is 18 days past due. Support demand is also persistent: five cases remain open and three issues have repeated during the last 90 days. The account has meaningful tenure and a solid payment history, which moderates the risk, but proactive outreach should focus on the overdue balance and recurring service issues.',
    accountAgeYears: 8.4,
    creditLimitUsagePercent: 74,
    daysPastDue: 18,
    onTimePaymentRatio: 82,
    openCases: 5,
    closedCases: 12,
    repeatCases: 3,
  },
  cedarvine: {
    score: 42,
    narrative:
      'This account has a moderate risk of churn. Payment behavior is generally healthy, with a strong on-time payment ratio and limited credit usage. A small overdue balance and three open service cases create some short-term friction, but repeat case volume remains low. Continue routine engagement and resolve the open cases before they become recurring issues.',
    accountAgeYears: 5.8,
    creditLimitUsagePercent: 48,
    daysPastDue: 6,
    onTimePaymentRatio: 91,
    openCases: 3,
    closedCases: 16,
    repeatCases: 1,
  },
  northwind: {
    score: 81,
    narrative:
      'This account has a critical risk of churn. High credit utilization, a significantly overdue invoice, and a declining on-time payment ratio point to financial stress. Seven open cases and four repeat issues indicate unresolved service friction. Immediate account-owner outreach is recommended, with a joint payment and support recovery plan focused on the oldest invoice and repeated case themes.',
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
