import type { Services } from './types';
import { restPeopleService } from './rest/people';
import { restDeviceService } from './rest/devices';
import { mockLicenseService } from './mock/licenses';
import { restAssetService } from './rest/assets';
import { mockRoadmapService } from './mock/roadmap';
import { mockQBRService } from './mock/qbr';
import { mockDocumentService } from './mock/documents';
import { mockNewsService } from './mock/news';
import { mockActivityService } from './mock/activity';
import { mockBacklogIntelligenceService } from './mock/backlogIntelligence';
import { restTicketService } from './rest/tickets';
import { restActionService } from './rest/actions';
import { restAssistantService } from './rest/assistant';
import { restSalesOpportunityService } from './rest/salesOpportunities';
import { restCustomerChurnService } from './rest/customerChurn';
import { persistentFormService } from './rest/forms';
import { demoMetricsService } from './demoMetrics';
import { installDrilldownCache } from './cache/drilldownCache';

/** Vendor-aware service graph. The backend selects mapped read APIs or demo fallbacks per tenant. */
export function buildServices(): Services {
  return installDrilldownCache({
    tickets: restTicketService,
    people: restPeopleService,
    devices: restDeviceService,
    licenses: mockLicenseService,
    assets: restAssetService,
    roadmap: mockRoadmapService,
    qbr: mockQBRService,
    metrics: demoMetricsService,
    documents: mockDocumentService,
    forms: persistentFormService,
    news: mockNewsService,
    actions: restActionService,
    activity: mockActivityService,
    assistant: restAssistantService,
    backlogIntelligence: mockBacklogIntelligenceService,
    salesOpportunities: restSalesOpportunityService,
    customerChurn: restCustomerChurnService,
  });
}
