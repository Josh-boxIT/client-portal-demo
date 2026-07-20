import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../client';
import { now, actionDefs, type ActionDefRow, type NewActionDef } from '../schema';

const TOUCH = { updatedAt: now };

export function actionDefRepo(db: AppDb) {
  return {
    async list(): Promise<ActionDefRow[]> {
      return db.select().from(actionDefs).all();
    },
    async listByTenant(tenantId: string): Promise<ActionDefRow[]> {
      return db.select().from(actionDefs).where(eq(actionDefs.tenantId, tenantId)).all();
    },
    async getById(id: string): Promise<ActionDefRow | undefined> {
      return db.select().from(actionDefs).where(eq(actionDefs.id, id)).get();
    },
    async getByTenantAndKey(tenantId: string, key: string): Promise<ActionDefRow | undefined> {
      return db.select().from(actionDefs)
        .where(and(eq(actionDefs.tenantId, tenantId), eq(actionDefs.key, key))).get();
    },
    async create(row: NewActionDef): Promise<ActionDefRow> {
      return db.insert(actionDefs).values(row).returning().get();
    },
    async update(id: string, patch: Partial<NewActionDef>): Promise<ActionDefRow> {
      return db.update(actionDefs).set({ ...patch, ...TOUCH }).where(eq(actionDefs.id, id)).returning().get();
    },
    async remove(id: string): Promise<void> {
      db.delete(actionDefs).where(eq(actionDefs.id, id)).run();
    },
  };
}
