import { eq } from 'drizzle-orm';
import type { AppDb } from '../client';
import { now, tenants, type NewTenant, type Tenant } from '../schema';

const TOUCH = { updatedAt: now };

export function tenantRepo(db: AppDb) {
  return {
    async list(): Promise<Tenant[]> {
      return db.select().from(tenants).all();
    },
    async getById(id: string): Promise<Tenant | undefined> {
      return db.select().from(tenants).where(eq(tenants.id, id)).get();
    },
    async getBySlug(slug: string): Promise<Tenant | undefined> {
      return db.select().from(tenants).where(eq(tenants.slug, slug)).get();
    },
    async create(row: NewTenant): Promise<Tenant> {
      return db.insert(tenants).values(row).returning().get();
    },
    async update(id: string, patch: Partial<NewTenant>): Promise<Tenant> {
      return db.update(tenants).set({ ...patch, ...TOUCH }).where(eq(tenants.id, id)).returning().get();
    },
  };
}
