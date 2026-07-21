import { describe, expect, it } from 'vitest';
import {
  churnAssessments,
  formatAssessmentDate,
  getRiskTone,
} from './churnData';

describe('customer churn data', () => {
  it('keeps the risk labels, dates, and grid metrics in the shared records', () => {
    expect(getRiskTone(churnAssessments.northwind.score).label).toBe('Critical risk');
    expect(getRiskTone(churnAssessments.brightwater.score).label).toBe('High risk');
    expect(getRiskTone(churnAssessments.cedarvine.score).label).toBe('Moderate risk');
    expect(formatAssessmentDate(churnAssessments.brightwater.assessedAt)).toBe('Jul 20, 2026');
    expect(churnAssessments.brightwater).toMatchObject({
      assessment: expect.stringContaining('high risk of churn'),
      suggestedActions: expect.stringContaining('Proactively contact'),
      accountAgeYears: 8.4,
      creditLimitUsagePercent: 74,
      daysPastDue: 18,
      onTimePaymentRatio: 82,
      slaConformancePercent: 84,
      openCases: 5,
      closedCases: 12,
      repeatCases: 3,
    });
    expect(churnAssessments.cedarvine.slaConformancePercent)
      .toBeGreaterThan(churnAssessments.brightwater.slaConformancePercent);
    expect(churnAssessments.brightwater.slaConformancePercent)
      .toBeGreaterThan(churnAssessments.northwind.slaConformancePercent);
    expect(churnAssessments.brightwater.assessment).toContain('SLA conformance');
  });
});
