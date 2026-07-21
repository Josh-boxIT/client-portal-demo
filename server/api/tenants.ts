import type { FastifyInstance } from 'fastify';
import { tenantRepo } from '../db/repositories';
import {
  tenantDisplayName,
  type LogoDescriptor,
  type Tenant,
  type TenantThemeTokens,
} from '../db/schema';

export interface TenantPublic {
  id: string;
  slug: string;
  name: string;
  vertical: string | null;
  theme: TenantThemeTokens;
  logo: LogoDescriptor;
  supportPhone: string | null;
  supportHours: string | null;
  status: string;
  dataSource: {
    connectWise: boolean;
    ninjaOne: boolean;
  };
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2)
    .map((word) => word[0]?.toUpperCase()).join('') || 'CL';
}

function publicLogo(tenant: Tenant): LogoDescriptor {
  if (!tenant.displayName?.trim()) return tenant.logo;
  const text = initials(tenantDisplayName(tenant));
  if (tenant.logo.kind === 'generated') return { ...tenant.logo, text };
  return {
    kind: 'generated',
    shape: 'hex',
    primary: `hsl(${tenant.theme.primary})`,
    accent: `hsl(${tenant.theme.accent})`,
    text,
  };
}

export function registerTenantRoutes(app: FastifyInstance): void {
  app.get('/api/tenants', async () => {
    const repo = tenantRepo(app.db);
    const all = await repo.list();
    const tenants: TenantPublic[] = all
      .filter((t) => t.status === 'active')
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: tenantDisplayName(t),
        vertical: t.vertical ?? null,
        theme: t.theme,
        logo: publicLogo(t),
        supportPhone: t.supportPhone ?? null,
        supportHours: t.supportHours ?? null,
        status: t.status,
        dataSource: {
          connectWise: t.connectWiseCompanyId !== null,
          ninjaOne: t.ninjaOneOrganizationId !== null,
        },
      }));
    return { tenants };
  });
}
