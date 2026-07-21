import { describe, expect, it } from 'vitest';
import { mockBacklogIntelligenceService } from './backlogIntelligence';

describe('backlog intelligence snapshot', () => {
  it('exposes a curated projection of the supplied stagnant-ticket report', async () => {
    const snapshot = await mockBacklogIntelligenceService.getSnapshot();

    expect(snapshot.schemaVersion).toBe('backlog-intelligence/v1');
    expect(snapshot.summary).toMatchObject({
      scannedTicketCount: 106,
      eligibleTicketCount: 106,
      flaggedTicketCount: 83,
      countsByPriorityBand: {
        ACT_NOW: 2,
        REVIEW_TODAY: 38,
        REVIEW_THIS_WEEK: 43,
        MONITOR: 0,
      },
      unassignedCount: 64,
      syncStaleTicketCount: 8,
      displayedItemCount: 20,
    });
    expect(snapshot.items).toHaveLength(20);
    expect(snapshot.items[0].primaryTicketExternalId).toBe('822871');
    expect(snapshot.items.some((item) => item.priorityBand === 'REVIEW_THIS_WEEK')).toBe(true);
  });

  it('preserves bundled-child status and account context from the source report', async () => {
    const snapshot = await mockBacklogIntelligenceService.getSnapshot();

    const bundled = snapshot.items.find((item) => item.primaryTicketExternalId === '822871');
    expect(bundled).toMatchObject({
      clusterDisposition: 'BUNDLE',
      display: {
        accountName: 'Brightwater Logistics',
        assignedResource: 'Bert Gonzales',
        auditVerifiedOpen: true,
      },
    });
  });

  it('scopes findings by active company and client-user persona', async () => {
    const companySnapshot = await mockBacklogIntelligenceService.getSnapshot({
      tenantId: 'brightwater',
      viewerAccess: 'client-admin',
      personaId: 'bw-admin',
    });
    const userSnapshot = await mockBacklogIntelligenceService.getSnapshot({
      tenantId: 'brightwater',
      viewerAccess: 'client-user',
      personaId: 'bw-user',
    });

    expect(companySnapshot.items).toHaveLength(8);
    expect(companySnapshot.items.every((item) => item.tenantId === 'brightwater')).toBe(true);
    expect(companySnapshot.summary).toMatchObject({
      flaggedTicketCount: 8,
      countsByPriorityBand: { ACT_NOW: 2, REVIEW_TODAY: 6, REVIEW_THIS_WEEK: 0 },
    });
    expect(userSnapshot.items.map((item) => item.primaryTicketExternalId).sort()).toEqual([
      '854334',
      '855928',
      '870375',
    ]);
    expect(userSnapshot.summary.flaggedTicketCount).toBe(3);
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

  it('provides distinct fictional narratives and sync-aware human actions', async () => {
    const snapshot = await mockBacklogIntelligenceService.getSnapshot();
    const titles = snapshot.items.map((item) => item.display.title);

    expect(new Set(titles).size).toBe(snapshot.items.length);
    expect(
      snapshot.items.every(
        (item) => !item.suggestedHumanAction.summary.includes('Verify the parent relationship')
      )
    ).toBe(true);
    expect(
      snapshot.items
        .filter((item) => item.display.auditVerifiedOpen === false)
        .every((item) => item.suggestedHumanAction.summary.includes('ConnectWise'))
    ).toBe(true);
    expect(
      snapshot.items.find((item) => item.primaryTicketExternalId === '822871')
        ?.suggestedHumanAction.summary
    ).toContain('customer liaison and ISP');
  });

  it('returns a fresh copy so the UI cannot mutate the scanner fixture', async () => {
    const first = await mockBacklogIntelligenceService.getSnapshot();
    const second = await mockBacklogIntelligenceService.getSnapshot();

    first.items[0].riskScore = 0;
    expect(second.items[0].riskScore).toBe(90);
  });
});
