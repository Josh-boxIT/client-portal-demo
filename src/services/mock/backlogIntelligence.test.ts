import { describe, expect, it } from 'vitest';
import { mockBacklogIntelligenceService } from './backlogIntelligence';

describe('backlog intelligence snapshot', () => {
  it('exposes the versioned, pre-ranked four-item scanner projection', async () => {
    const snapshot = await mockBacklogIntelligenceService.getSnapshot();

    expect(snapshot.schemaVersion).toBe('backlog-intelligence/v1');
    expect(snapshot.summary).toMatchObject({
      scannedTicketCount: 10,
      eligibleTicketCount: 4,
      flaggedTicketCount: 4,
      countsByPriorityBand: { ACT_NOW: 2, REVIEW_TODAY: 1, MONITOR: 1 },
    });
    expect(snapshot.items.map((item) => item.primaryTicketExternalId)).toEqual([
      'DEMO-4001',
      'DEMO-1001',
      'DEMO-2001',
      'DEMO-3001',
    ]);
    expect(snapshot.items.map((item) => item.riskScore)).toEqual([75, 55, 40, 5]);
  });

  it('keeps bundled child alerts out of the operational ranking', async () => {
    const snapshot = await mockBacklogIntelligenceService.getSnapshot();

    expect(snapshot.items.every((item) => item.clusterDisposition !== 'BUNDLE')).toBe(true);
    expect(
      snapshot.items.find((item) => item.primaryTicketExternalId === 'DEMO-1001')
        ?.memberTicketExternalIds
    ).toEqual(['DEMO-1001', 'DEMO-1002', 'DEMO-1003', 'DEMO-1004']);
  });

  it('provides explainable scores and at least two signals for every recommendation', async () => {
    const snapshot = await mockBacklogIntelligenceService.getSnapshot();

    for (const item of snapshot.items) {
      const baseTotal = Object.entries(item.factorBreakdown)
        .filter(([key]) => key !== 'modifiers')
        .reduce((total, [, value]) => total + Number(value), 0);
      const modifierTotal = Object.values(item.factorBreakdown.modifiers ?? {}).reduce(
        (total, value) => total + value,
        0
      );

      expect(item.attentionReasons.length).toBeGreaterThanOrEqual(2);
      expect(baseTotal + modifierTotal).toBe(item.riskScore);
      expect(item.priorityBand).not.toBe('NO_ACTION');
    }
  });

  it('returns a fresh copy so the UI cannot mutate the scanner fixture', async () => {
    const first = await mockBacklogIntelligenceService.getSnapshot();
    const second = await mockBacklogIntelligenceService.getSnapshot();

    first.items[0].riskScore = 0;
    expect(second.items[0].riskScore).toBe(75);
  });
});
