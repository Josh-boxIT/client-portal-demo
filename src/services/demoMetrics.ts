import type { DashboardKPIs, ListParams, MetricSeries, MetricsService, Page } from './types';
import { mockMetricsService } from './mock/metrics';
import { restTicketService } from './rest/tickets';

export const demoMetricsService: MetricsService = {
  listSeries(tenantId: string, params?: ListParams): Promise<Page<MetricSeries>> {
    return mockMetricsService.listSeries(tenantId, params);
  },
  getSeries(tenantId: string, key: string): Promise<MetricSeries | null> {
    return mockMetricsService.getSeries(tenantId, key);
  },
  async getDashboard(tenantId: string): Promise<DashboardKPIs> {
    const [base, tickets] = await Promise.all([
      mockMetricsService.getDashboard(tenantId),
      restTicketService.list(tenantId, { pageSize: 1000 }),
    ]);
    return {
      ...base,
      openTickets: tickets.data.filter((ticket) => ['open', 'in-progress', 'waiting'].includes(ticket.status)).length,
    };
  },
};
