import { getSeed } from '@/data/index';
import type { MetricsService, Page, ListParams, MetricSeries, DashboardKPIs } from '../types';
import { withLatency, paginate } from './util';
import { isInventoryDevice } from '@/lib/devices';

export const mockMetricsService: MetricsService = {
  async listSeries(tenantId: string, params?: ListParams): Promise<Page<MetricSeries>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.metricSeries as unknown as Record<string, unknown>[], params) as unknown as Page<MetricSeries>);
  },

  async getSeries(tenantId: string, key: string): Promise<MetricSeries | null> {
    const seed = getSeed(tenantId);
    const series = seed.metricSeries.find((s) => s.key === key) ?? null;
    return withLatency(series);
  },

  async getDashboard(tenantId: string): Promise<DashboardKPIs> {
    const seed = getSeed(tenantId);

    const openTickets = seed.tickets.filter((t) => t.status === 'open' || t.status === 'in-progress' || t.status === 'waiting').length;

    const secSeries = seed.metricSeries.find((s) => s.key === 'security-score');
    const secPoints = secSeries?.points ?? [];
    const lastScore = secPoints[secPoints.length - 1]?.value ?? 0;
    const prevScore = secPoints[secPoints.length - 2]?.value ?? lastScore;
    const securityTrend: 'up' | 'down' | 'flat' = lastScore > prevScore ? 'up' : lastScore < prevScore ? 'down' : 'flat';

    // Licenses are modeled per-SKU with seat counts now — sum seats, not rows.
    const totalLicenses = seed.licenses.reduce((sum, l) => sum + l.totalUnits, 0);
    const usedLicenses = seed.licenses.reduce((sum, l) => sum + l.consumedUnits, 0);
    const unusedMonthlyCost = seed.licenses.reduce(
      (sum, l) => sum + (l.totalUnits - l.consumedUnits) * (l.costPerMonth ?? 0),
      0,
    );

    const deployedDevices = seed.devices.filter((d) => !isInventoryDevice(d));
    const totalDevices = deployedDevices.length;
    const healthyDevices = deployedDevices.filter((d) => d.status === 'healthy').length;
    const compliantDevices = deployedDevices.filter((d) => d.compliant).length;
    const devicesCompliantPct = totalDevices > 0 ? Math.round((compliantDevices / totalDevices) * 100) : 0;

    const kpis: DashboardKPIs = {
      openTickets,
      securityScore: lastScore,
      securityTrend,
      licensesUsed: usedLicenses,
      licensesTotal: totalLicenses,
      unusedMonthlyCost,
      devicesCompliantPct,
      devicesHealthy: healthyDevices,
      devicesTotal: totalDevices,
    };

    return withLatency(kpis);
  },
};
