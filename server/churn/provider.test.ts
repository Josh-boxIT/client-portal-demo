import { describe, expect, it } from 'vitest';
import type { ChurnAssessment } from '@/data/seed/customerChurn';
import {
  buildChurnNarrativeModelInput,
  CHURN_NARRATIVE_INSTRUCTIONS,
  type ChurnNarrativeInput,
} from './provider';

const assessment: ChurnAssessment = {
  customerId: 'atomera',
  assessedAt: '2026-07-21',
  score: 41,
  assessment: 'Existing narrative',
  suggestedActions: 'Existing actions',
  accountAgeYears: 5,
  creditLimitUsagePercent: 50,
  daysPastDue: 21,
  onTimePaymentRatio: 50,
  slaConformancePercent: 90,
  openCases: 3,
  closedCases: 12,
  repeatCases: 1,
  source: 'mixed',
  metricSources: {
    accountAgeYears: 'connectwise',
    creditLimitUsagePercent: 'demo',
    daysPastDue: 'connectwise',
    onTimePaymentRatio: 'connectwise',
    slaConformancePercent: 'demo',
    openCases: 'connectwise',
    closedCases: 'connectwise',
    repeatCases: 'demo',
  },
};

describe('churn narrative model input', () => {
  it('does not disclose demo or metric-source provenance to the model', () => {
    const input: ChurnNarrativeInput = {
      tenantId: 'atomera',
      tenantName: 'Atomera',
      assessment,
      safetyIdentifier: 'hashed-user',
    };
    const serialized = JSON.stringify(buildChurnNarrativeModelInput(input)).toLowerCase();

    expect(serialized).not.toContain('metricsources');
    expect(serialized).not.toContain('connectwise');
    expect(serialized).not.toContain('demo');
    expect(serialized).not.toContain('fallback');
    const instructions = CHURN_NARRATIVE_INSTRUCTIONS.toLowerCase();
    expect(instructions).not.toContain('demo');
    expect(instructions).not.toContain('fallback');
    expect(instructions).not.toContain('connectwise');
    expect(instructions).not.toContain('synthetic');
    expect(instructions).not.toContain('placeholder');
  });
});
