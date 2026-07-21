import type { SalesOpportunityAnalysis, SalesOpportunityFinding, SalesOpportunityService } from '../types';
import { rest } from './client';

export const restSalesOpportunityService: SalesOpportunityService = {
  status(tenantId) {
    return rest.getPath(tenantId, 'sales-opportunities/status');
  },
  context(tenantId) {
    return rest.getPath(tenantId, 'sales-opportunities/context');
  },
  latest(tenantId) {
    return rest.getPath<SalesOpportunityAnalysis | null>(tenantId, 'sales-opportunities/latest');
  },
  analyze(tenantId) {
    return rest.createPath<SalesOpportunityAnalysis>(tenantId, 'sales-opportunities/analyze', {});
  },
  sendToConnectWise(tenantId, fingerprint) {
    return rest.createPath<SalesOpportunityFinding>(
      tenantId,
      `sales-opportunities/${encodeURIComponent(fingerprint)}/send-to-connectwise`,
      {},
    );
  },
};
