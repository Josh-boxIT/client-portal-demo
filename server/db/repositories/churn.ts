import { eq } from 'drizzle-orm';
import type { AppDb } from '../client';
import { churnNarratives, now } from '../schema';

export interface ChurnNarrativeRow {
  tenantId: string;
  fingerprint: string;
  assessment: string;
  suggestedActions: string;
  generatedAt: string;
  model: string;
}

export function churnNarrativeRepo(db: AppDb) {
  return {
    async get(tenantId: string): Promise<ChurnNarrativeRow | null> {
      return db.select().from(churnNarratives)
        .where(eq(churnNarratives.tenantId, tenantId)).get() ?? null;
    },
    async save(row: ChurnNarrativeRow): Promise<ChurnNarrativeRow> {
      db.insert(churnNarratives).values(row).onConflictDoUpdate({
        target: churnNarratives.tenantId,
        set: {
          fingerprint: row.fingerprint,
          assessment: row.assessment,
          suggestedActions: row.suggestedActions,
          generatedAt: row.generatedAt,
          model: row.model,
          updatedAt: now,
        },
      }).run();
      return row;
    },
  };
}
