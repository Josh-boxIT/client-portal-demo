import { randomUUID } from 'node:crypto';
import { desc } from 'drizzle-orm';
import type { AppDb } from '../client';
import { auditLog, type AuditEntry } from '../schema';

export function newId(prefix: string): string {
  return `${prefix}${randomUUID()}`;
}

export function auditRepo(db: AppDb) {
  return {
    async write(entry: { actor: string; action: string; target?: string; metadata?: Record<string, unknown> }): Promise<void> {
      db.insert(auditLog).values({ id: newId('aud_'), actor: entry.actor, action: entry.action, target: entry.target, metadata: entry.metadata }).run();
    },
    async list(limit = 100): Promise<AuditEntry[]> {
      return db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(limit).all();
    },
  };
}
