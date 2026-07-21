import { backlogIntelligenceSnapshot } from '@/data/seed/backlogIntelligence';
import type {
  BacklogIntelligenceItem,
  BacklogIntelligenceQuery,
  BacklogIntelligenceService,
  BacklogIntelligenceSnapshot,
} from '../types';

function buildScopedSnapshot(query: BacklogIntelligenceQuery): BacklogIntelligenceSnapshot {
  const items = backlogIntelligenceSnapshot.items.filter((item) => {
    if (query.tenantId && item.tenantId !== query.tenantId) return false;
    if (query.viewerAccess === 'client-user') {
      return Boolean(query.personaId) && item.requesterPersonaId === query.personaId;
    }
    return true;
  });
  const countBand = (band: BacklogIntelligenceItem['priorityBand']) =>
    items.filter((item) => item.priorityBand === band).length;
  const unassignedCount = items.filter(
    (item) => item.display.assignedResource === '(unassigned)'
  ).length;
  const bundledChildCount = items.filter(
    (item) => item.clusterDisposition === 'BUNDLE'
  ).length;
  const auditPendingCount = items.filter(
    (item) => item.display.auditVerifiedOpen === false
  ).length;

  return {
    ...structuredClone(backlogIntelligenceSnapshot),
    scope: {
      ...backlogIntelligenceSnapshot.scope,
      type: query.tenantId ? 'account' : 'organization',
      queueIds: [...new Set(items.map((item) => item.display.queue))],
    },
    summary: {
      scannedTicketCount: items.length,
      eligibleTicketCount: items.length,
      flaggedTicketCount: items.length,
      countsByPriorityBand: {
        ACT_NOW: countBand('ACT_NOW'),
        REVIEW_TODAY: countBand('REVIEW_TODAY'),
        REVIEW_THIS_WEEK: countBand('REVIEW_THIS_WEEK'),
        MONITOR: countBand('MONITOR'),
      },
      unassignedCount,
      bundledChildCount,
      syncStaleTicketCount: 0,
      displayedItemCount: items.length,
    },
    items: structuredClone(items),
    topPatterns: [
      {
        title: 'Unassigned work needs an owner',
        summary: `${unassignedCount} of ${items.length} visible findings have no resource owner.`,
        itemIds: items
          .filter((item) => item.display.assignedResource === '(unassigned)')
          .map((item) => item.itemId),
      },
      {
        title: 'Audit verification is incomplete',
        summary: `${auditPendingCount} visible findings still need PSA audit verification.`,
        itemIds: items
          .filter((item) => item.display.auditVerifiedOpen === false)
          .map((item) => item.itemId),
      },
      {
        title: 'Bundled children need parent review',
        summary: `${bundledChildCount} visible findings are bundled child tickets.`,
        itemIds: items
          .filter((item) => item.clusterDisposition === 'BUNDLE')
          .map((item) => item.itemId),
      },
    ],
    suggestedDispatchAgenda: items.slice(0, 4).map((item, index) => ({
      rank: index + 1,
      itemId: item.itemId,
      summary: `${item.primaryTicketExternalId}: ${item.suggestedHumanAction.summary}`,
    })),
  };
}

export const mockBacklogIntelligenceService: BacklogIntelligenceService = {
  async getSnapshot(query): Promise<BacklogIntelligenceSnapshot> {
    if (!query) return structuredClone(backlogIntelligenceSnapshot);
    return buildScopedSnapshot(query);
  },
};
