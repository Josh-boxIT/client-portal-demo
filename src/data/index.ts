import { brightwaterSeed } from './seed/brightwater';
import { cedarvineSeed } from './seed/cedarvine';
import { northwindSeed } from './seed/northwind';
import type { TenantSeed } from '@/services/types';

const seedMap: Record<string, TenantSeed> = {
  brightwater: brightwaterSeed,
  cedarvine: cedarvineSeed,
  northwind: northwindSeed,
};

/** Build a minimal valid seed for tenants that have no bespoke seed data. */
function buildDefaultSeed(tenantId: string): TenantSeed {
  return {
    tenantId,
    personas: [
      {
        id: 'default',
        tenantId,
        name: 'Portal User',
        title: 'Portal User',
        email: 'user@portal.local',
        role: 'client-admin',
        avatarInitials: 'PU',
      },
    ],
    people: [],
    devices: [],
    licenses: [],
    tickets: [],
    assets: [],
    roadmap: [],
    qbrs: [],
    budgetLines: [],
    risks: [],
    metricSeries: [],
    documents: [],
    forms: [],
    apps: [],
    news: [],
    activity: [],
  };
}

export function getSeed(tenantId: string): TenantSeed {
  return seedMap[tenantId] ?? buildDefaultSeed(tenantId);
}

export { brightwaterSeed, cedarvineSeed, northwindSeed };
