import { describe, expect, it } from 'vitest';
import type { Identity } from '@/store/auth';
import type { TenantTheme } from '@/theme/tenants';
import {
  churnAssessments,
  formatAssessmentDate,
  getAccessibleChurnRows,
  getRiskTone,
} from './churnData';

const tenants = [
  { id: 'brightwater', name: 'Brightwater Logistics', vertical: 'Logistics' },
  { id: 'cedarvine', name: 'Cedar & Vine Hospitality', vertical: 'Hospitality' },
  { id: 'northwind', name: 'Northwind Health Partners', vertical: 'Healthcare' },
] as TenantTheme[];

const admin = {
  id: 'admin',
  email: 'admin@example.test',
  name: 'Admin',
  role: 'admin',
} satisfies Identity;

const viewer = {
  id: 'viewer',
  email: 'viewer@example.test',
  name: 'Viewer',
  role: 'viewer',
} satisfies Identity;

describe('customer churn data', () => {
  it('returns every customer for staff, ordered by highest risk first', () => {
    const rows = getAccessibleChurnRows(admin, [], tenants);

    expect(rows.map(({ customer }) => customer.id)).toEqual([
      'northwind',
      'brightwater',
      'cedarvine',
    ]);
  });

  it('returns only customers assigned to a viewer', () => {
    const rows = getAccessibleChurnRows(viewer, ['cedarvine'], tenants);

    expect(rows.map(({ customer }) => customer.id)).toEqual(['cedarvine']);
  });

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
