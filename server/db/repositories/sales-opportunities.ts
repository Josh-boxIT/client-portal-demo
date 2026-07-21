import { and, eq } from 'drizzle-orm';
import type { ProductCatalogItem, SalesOpportunityAnalysis, SalesOpportunityFinding } from '@/services/types';
import type { AppDb } from '../client';
import {
  now,
  productCatalog,
  salesOpportunityAnalyses,
  salesOpportunityHandoffs,
  type NewProductCatalogRow,
  type ProductCatalogRow,
} from '../schema';
import { newId } from './audit';

export function normalizeProductName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function productCatalogDto(row: ProductCatalogRow): ProductCatalogItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    aliases: row.aliases,
    pricingModel: row.pricingModel,
    monthlyPriceLow: row.monthlyPriceLow,
    monthlyPriceHigh: row.monthlyPriceHigh,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function productCatalogRepo(db: AppDb) {
  return {
    async list(): Promise<ProductCatalogRow[]> {
      return db.select().from(productCatalog).all();
    },
    async get(id: string): Promise<ProductCatalogRow | undefined> {
      return db.select().from(productCatalog).where(eq(productCatalog.id, id)).get();
    },
    async getByNormalizedName(name: string): Promise<ProductCatalogRow | undefined> {
      return db.select().from(productCatalog)
        .where(eq(productCatalog.normalizedName, normalizeProductName(name))).get();
    },
    async create(row: NewProductCatalogRow): Promise<ProductCatalogRow> {
      return db.insert(productCatalog).values(row).returning().get();
    },
    async update(id: string, patch: Partial<NewProductCatalogRow>): Promise<ProductCatalogRow> {
      return db.update(productCatalog).set({ ...patch, updatedAt: now })
        .where(eq(productCatalog.id, id)).returning().get();
    },
    async remove(id: string): Promise<void> {
      db.delete(productCatalog).where(eq(productCatalog.id, id)).run();
    },
  };
}

export function salesOpportunityRepo(db: AppDb) {
  return {
    async latest(tenantId: string): Promise<SalesOpportunityAnalysis | null> {
      const row = db.select().from(salesOpportunityAnalyses)
        .where(eq(salesOpportunityAnalyses.tenantId, tenantId)).get();
      if (!row) return null;
      const handoffs = db.select().from(salesOpportunityHandoffs)
        .where(eq(salesOpportunityHandoffs.tenantId, tenantId)).all();
      const sent = new Map(handoffs.map((item) => [item.fingerprint, item]));
      return {
        tenantId: row.tenantId,
        analyzedAt: row.analyzedAt,
        model: row.model,
        sourceSummary: row.sourceSummary,
        findings: row.findings.map((finding) => {
          const handoff = sent.get(finding.fingerprint);
          return handoff ? { ...finding, sentAt: handoff.sentAt, sentBy: handoff.sentBy } : finding;
        }),
      };
    },
    async save(analysis: SalesOpportunityAnalysis): Promise<SalesOpportunityAnalysis> {
      db.insert(salesOpportunityAnalyses).values({
        tenantId: analysis.tenantId,
        analyzedAt: analysis.analyzedAt,
        model: analysis.model,
        sourceSummary: analysis.sourceSummary,
        findings: analysis.findings.map(({ sentAt: _sentAt, sentBy: _sentBy, ...finding }) => finding),
      }).onConflictDoUpdate({
        target: salesOpportunityAnalyses.tenantId,
        set: {
          analyzedAt: analysis.analyzedAt,
          model: analysis.model,
          sourceSummary: analysis.sourceSummary,
          findings: analysis.findings.map(({ sentAt: _sentAt, sentBy: _sentBy, ...finding }) => finding),
          updatedAt: now,
        },
      }).run();
      return (await this.latest(analysis.tenantId))!;
    },
    async clear(tenantId: string): Promise<boolean> {
      return db.delete(salesOpportunityAnalyses)
        .where(eq(salesOpportunityAnalyses.tenantId, tenantId)).run().changes > 0;
    },
    async send(
      tenantId: string,
      finding: SalesOpportunityFinding,
      sentBy: string,
      sentAt: string,
    ): Promise<SalesOpportunityFinding> {
      const existing = db.select().from(salesOpportunityHandoffs).where(and(
        eq(salesOpportunityHandoffs.tenantId, tenantId),
        eq(salesOpportunityHandoffs.fingerprint, finding.fingerprint),
      )).get();
      if (!existing) {
        db.insert(salesOpportunityHandoffs).values({
          id: newId('handoff_'), tenantId, fingerprint: finding.fingerprint,
          sentAt, sentBy, payload: finding,
        }).run();
      }
      const handoff = existing ?? db.select().from(salesOpportunityHandoffs).where(and(
        eq(salesOpportunityHandoffs.tenantId, tenantId),
        eq(salesOpportunityHandoffs.fingerprint, finding.fingerprint),
      )).get()!;
      return { ...finding, sentAt: handoff.sentAt, sentBy: handoff.sentBy };
    },
  };
}
