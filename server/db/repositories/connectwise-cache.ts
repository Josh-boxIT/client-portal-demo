import { and, asc, eq } from 'drizzle-orm';
import type { AppDb } from '../client';
import {
  connectWiseCacheEntries,
  connectWiseCacheSnapshots,
  type ConnectWiseCacheResource,
} from '../schema';

export interface ConnectWiseCacheEntity<T> {
  id: string;
  data: T;
}

function cacheId(tenantId: string, resource: ConnectWiseCacheResource, entityId = ''): string {
  return `${tenantId}:${resource}:${entityId}`;
}

export function connectWiseCacheRepo(db: AppDb) {
  const scope = (tenantId: string, resource: ConnectWiseCacheResource) => and(
    eq(connectWiseCacheEntries.tenantId, tenantId),
    eq(connectWiseCacheEntries.resource, resource),
  );

  return {
    /** Undefined means no successful snapshot exists; an empty array is a valid cached snapshot. */
    async list<T>(tenantId: string, resource: ConnectWiseCacheResource): Promise<T[] | undefined> {
      const snapshot = db.select({ id: connectWiseCacheSnapshots.id })
        .from(connectWiseCacheSnapshots)
        .where(and(
          eq(connectWiseCacheSnapshots.tenantId, tenantId),
          eq(connectWiseCacheSnapshots.resource, resource),
        ))
        .get();
      if (!snapshot) return undefined;
      return db.select({ data: connectWiseCacheEntries.data })
        .from(connectWiseCacheEntries)
        .where(scope(tenantId, resource))
        .orderBy(asc(connectWiseCacheEntries.position))
        .all()
        .map((row) => row.data as T);
    },

    async entityIds(tenantId: string, resource: ConnectWiseCacheResource): Promise<string[]> {
      return db.select({ entityId: connectWiseCacheEntries.entityId })
        .from(connectWiseCacheEntries)
        .where(scope(tenantId, resource))
        .orderBy(asc(connectWiseCacheEntries.position))
        .all()
        .map((row) => row.entityId);
    },

    /** Upserts the new snapshot and removes entities absent from the successful vendor response. */
    async replace<T>(
      tenantId: string,
      resource: ConnectWiseCacheResource,
      entities: ConnectWiseCacheEntity<T>[],
      syncedAt = new Date().toISOString(),
    ): Promise<void> {
      const keep = new Set(entities.map((entity) => entity.id));
      db.transaction((tx) => {
        entities.forEach((entity, position) => {
          tx.insert(connectWiseCacheEntries).values({
            id: cacheId(tenantId, resource, entity.id),
            tenantId,
            resource,
            entityId: entity.id,
            data: entity.data,
            position,
            syncedAt,
          }).onConflictDoUpdate({
            target: connectWiseCacheEntries.id,
            set: { data: entity.data, position, syncedAt },
          }).run();
        });

        const existing = tx.select({ id: connectWiseCacheEntries.id, entityId: connectWiseCacheEntries.entityId })
          .from(connectWiseCacheEntries)
          .where(scope(tenantId, resource))
          .all();
        for (const row of existing) {
          if (!keep.has(row.entityId)) {
            tx.delete(connectWiseCacheEntries).where(eq(connectWiseCacheEntries.id, row.id)).run();
          }
        }

        tx.insert(connectWiseCacheSnapshots).values({
          id: cacheId(tenantId, resource),
          tenantId,
          resource,
          syncedAt,
        }).onConflictDoUpdate({
          target: connectWiseCacheSnapshots.id,
          set: { syncedAt },
        }).run();
      });
    },

    async clearTenant(tenantId: string): Promise<void> {
      db.transaction((tx) => {
        tx.delete(connectWiseCacheEntries).where(eq(connectWiseCacheEntries.tenantId, tenantId)).run();
        tx.delete(connectWiseCacheSnapshots).where(eq(connectWiseCacheSnapshots.tenantId, tenantId)).run();
      });
    },
  };
}
