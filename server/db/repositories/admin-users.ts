import { and, eq } from 'drizzle-orm';
import type { AppDb } from '../client';
import {
  now,
  adminUsers,
  adminUserClientAccess,
  type AdminRole,
  type AdminUserRow,
  type NewAdminUser,
} from '../schema';
import { newId } from './audit';

const TOUCH = { updatedAt: now };

export function adminUsersRepo(db: AppDb) {
  return {
    async list(): Promise<AdminUserRow[]> {
      return db.select().from(adminUsers).all();
    },
    async getById(id: string): Promise<AdminUserRow | undefined> {
      return db.select().from(adminUsers).where(eq(adminUsers.id, id)).get();
    },
    async getByEmail(email: string): Promise<AdminUserRow | undefined> {
      return db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase())).get();
    },
    async create(user: NewAdminUser): Promise<AdminUserRow> {
      return db.insert(adminUsers).values({ ...user, email: user.email.toLowerCase() }).returning().get();
    },
    async update(id: string, patch: Partial<NewAdminUser>): Promise<AdminUserRow> {
      const next = { ...patch, ...TOUCH };
      if (patch.email !== undefined) next.email = patch.email.toLowerCase();
      return db.update(adminUsers).set(next).where(eq(adminUsers.id, id)).returning().get();
    },
    async getClientAccess(userId: string): Promise<string[]> {
      return db.select().from(adminUserClientAccess).where(eq(adminUserClientAccess.userId, userId)).all().map((row) => row.tenantId);
    },
    async setClientAccess(userId: string, tenantIds: string[]): Promise<void> {
      db.transaction((tx) => {
        tx.delete(adminUserClientAccess).where(eq(adminUserClientAccess.userId, userId)).run();
        for (const tenantId of tenantIds) {
          tx.insert(adminUserClientAccess).values({ id: newId('uca_'), userId, tenantId }).run();
        }
      });
    },
    async countActiveByRole(role: AdminRole): Promise<number> {
      return db.select().from(adminUsers)
        .where(and(eq(adminUsers.role, role), eq(adminUsers.status, 'active')))
        .all().length;
    },
  };
}
