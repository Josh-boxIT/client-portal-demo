import type { Services } from './types';
import { mockPeopleService } from './mock/people';
import { mockDeviceService } from './mock/devices';
import { mockLicenseService } from './mock/licenses';
import { mockAssetService } from './mock/assets';
import { mockRoadmapService } from './mock/roadmap';
import { mockQBRService } from './mock/qbr';
import { mockBudgetService } from './mock/budget';
import { mockRiskService } from './mock/risk';
import { mockDocumentService } from './mock/documents';
import { mockNewsService } from './mock/news';
import { mockActivityService } from './mock/activity';
import { mockBacklogIntelligenceService } from './mock/backlogIntelligence';
import { restTicketService } from './rest/tickets';
import { restActionService } from './rest/actions';
import { restAssistantService } from './rest/assistant';
import { restSalesOpportunityService } from './rest/salesOpportunities';
import { persistentFormService } from './rest/forms';
import { demoMetricsService } from './demoMetrics';
import { installDrilldownCache } from './cache/drilldownCache';

/** Sample-only service graph. Immutable catalog data is local; mutable demo data uses SQLite-backed APIs. */
export function buildServices(): Services {
  return installDrilldownCache({
    tickets: restTicketService,
    people: mockPeopleService,
    devices: mockDeviceService,
    licenses: mockLicenseService,
    assets: mockAssetService,
    roadmap: mockRoadmapService,
    qbr: mockQBRService,
    budget: mockBudgetService,
    risk: mockRiskService,
    metrics: demoMetricsService,
    documents: mockDocumentService,
    forms: persistentFormService,
    news: mockNewsService,
    actions: restActionService,
    activity: mockActivityService,
    assistant: restAssistantService,
    backlogIntelligence: mockBacklogIntelligenceService,
    salesOpportunities: restSalesOpportunityService,
  });
}
