import type { FastifyInstance } from 'fastify';
import { tenantRepo } from '../db/repositories';
import type { TenantThemeTokens, LogoDescriptor } from '../db/schema';

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

export function registerTenantRoutes(app: FastifyInstance): void {
  app.get('/api/tenants', async () => {
    const repo = tenantRepo(app.db);
    const all = await repo.list();
    const tenants: TenantPublic[] = all
      .filter((t) => t.status === 'active')
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        vertical: t.vertical ?? null,
        theme: t.theme,
        logo: t.logo,
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
