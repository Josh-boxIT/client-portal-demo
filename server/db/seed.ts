import { eq } from 'drizzle-orm';
import { ACTION_DEFS } from '@/data/actions';
import type { AppDb } from './client';
import { PRODUCT_CATALOG } from './product-catalog';
import {
  actionDefs,
  adminUserClientAccess,
  adminUsers,
  appMeta,
  tenants,
  productCatalog,
  type TenantThemeTokens,
} from './schema';

const SEED_KEY = 'demo_seed_version';
const SEED_VERSION = '1';
const PRODUCT_SEED_KEY = 'product_catalog_seed_version';
const PRODUCT_SEED_VERSION = '2';

export interface SeedTenant {
  slug: string;
  name: string;
  vertical: string;
  theme: TenantThemeTokens;
  supportPhone: string;
  supportHours: string;
}

export const SEED_TENANTS: SeedTenant[] = [
  {
    slug: 'brightwater', name: 'Brightwater Logistics', vertical: 'Logistics',
    theme: { primary: '245 75% 60%', primaryForeground: '0 0% 100%', accent: '250 65% 55%', accentForeground: '0 0% 100%', ring: '245 75% 60%', sidebarGradient: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 50%, #0f0c29 100%)' },
    supportPhone: '+1 (888) 247-9100', supportHours: 'Mon–Fri, 7am–7pm PT',
  },
  {
    slug: 'cedarvine', name: 'Cedar & Vine Hospitality', vertical: 'Hospitality',
    theme: { primary: '32 95% 44%', primaryForeground: '0 0% 100%', accent: '142 71% 27%', accentForeground: '0 0% 100%', ring: '32 95% 44%', sidebarGradient: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #451a03 100%)' },
    supportPhone: '+1 (888) 233-8462', supportHours: 'Mon–Sun, 8am–8pm ET',
  },
  {
    slug: 'northwind', name: 'Northwind Health Partners', vertical: 'Healthcare',
    theme: { primary: '173 80% 40%', primaryForeground: '0 0% 100%', accent: '199 89% 42%', accentForeground: '0 0% 100%', ring: '173 80% 40%', sidebarGradient: 'linear-gradient(180deg, #134e4a 0%, #0f3d3a 50%, #042f2e 100%)' },
    supportPhone: '+1 (888) 669-7846', supportHours: 'Mon–Fri, 6am–10pm CT',
  },
];

export const DEMO_USERS = [
  { id: 'demo-admin', email: 'alex.morgan@boxit.demo', name: 'Alex Morgan', role: 'admin' as const },
  { id: 'demo-client-admin', email: 'sarah.okonkwo@brightwaterlogistics.com', name: 'Sarah Okonkwo', role: 'viewer' as const },
  { id: 'demo-client-user', email: 'marcus.thiele@brightwaterlogistics.com', name: 'Marcus Thiele', role: 'viewer' as const },
];

export async function seedProductCatalogIfEmpty(db: AppDb): Promise<{ seeded: boolean }> {
  const existing = db.select().from(appMeta).where(eq(appMeta.key, PRODUCT_SEED_KEY)).get();
  if (existing?.value === PRODUCT_SEED_VERSION) return { seeded: false };
  db.transaction((tx) => {
    tx.delete(productCatalog).run();
    for (const product of PRODUCT_CATALOG) {
      tx.insert(productCatalog).values({
        ...product,
        normalizedName: product.name.trim().toLowerCase().replace(/\s+/g, ' '),
        enabled: true,
      }).run();
    }
    tx.insert(appMeta).values({ key: PRODUCT_SEED_KEY, value: PRODUCT_SEED_VERSION }).onConflictDoUpdate({
      target: appMeta.key,
      set: { value: PRODUCT_SEED_VERSION },
    }).run();
  });
  return { seeded: true };
}

export async function seedIfEmpty(db: AppDb): Promise<{ seeded: boolean }> {
  const existing = db.select().from(appMeta).where(eq(appMeta.key, SEED_KEY)).get();
  if (existing) return { seeded: false };

  db.transaction((tx) => {
    for (const tenant of SEED_TENANTS) {
      tx.insert(tenants).values({
        id: tenant.slug,
        slug: tenant.slug,
        name: tenant.name,
        vertical: tenant.vertical,
        theme: tenant.theme,
        logo: { kind: 'builtin', key: tenant.slug },
        supportPhone: tenant.supportPhone,
        supportHours: tenant.supportHours,
        status: 'active',
      }).run();
    }

    for (const user of DEMO_USERS) {
      tx.insert(adminUsers).values({ ...user, status: 'active' }).run();
    }
    tx.insert(adminUserClientAccess).values([
      { id: 'demo-access-client-admin', userId: 'demo-client-admin', tenantId: 'brightwater' },
      { id: 'demo-access-client-user', userId: 'demo-client-user', tenantId: 'brightwater' },
    ]).run();

    for (const tenant of SEED_TENANTS) {
      for (const action of ACTION_DEFS) {
        tx.insert(actionDefs).values({
          id: `${tenant.slug}-${action.id}`,
          tenantId: tenant.slug,
          key: action.key,
          title: action.title,
          description: action.description,
          icon: action.icon,
          category: action.category,
          enabled: action.enabled,
          steps: action.steps,
          ticket: action.ticket,
        }).run();
      }
    }

    tx.insert(appMeta).values({ key: SEED_KEY, value: SEED_VERSION }).run();
  });

  return { seeded: true };
}
