import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type {
  ProductCatalogItem,
  SalesOpportunityEvidence,
  SalesOpportunityFinding,
  SalesOpportunityAnalysis,
} from '@/services/types';
import type { ConnectWiseAgreement } from '@/services/types';
import { requireRole } from '../admin/require-role';
import { auditRepo, productCatalogDto, productCatalogRepo, salesOpportunityRepo } from '../db/repositories';
import { ApiError, BadRequestError, NotFoundError } from '../framework/errors';
import { resolvePortalAccess, ticketsForScope } from '../assistant/portal-data';
import type { OpportunityModelSuggestion, SalesOpportunityModelProvider } from './provider';
import type { VendorDataService } from '../integrations/vendor-data';
import type { ChurnService } from '../churn/service';

function tenantHeader(req: FastifyRequest): string {
  const raw = req.headers['x-tenant-id'];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!value) throw new BadRequestError('Missing tenant (x-tenant-id header)');
  return value;
}

function safetyIdentifier(userId: string, tenantId: string): string {
  return createHash('sha256').update(`client-portal-demo:opportunities:${userId}:${tenantId}`).digest('hex');
}

function fingerprint(tenantId: string, suggestion: OpportunityModelSuggestion, product?: ProductCatalogItem): string {
  const key = product?.id ?? `${suggestion.kind}:${suggestion.category}:${suggestion.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return createHash('sha256').update(`${tenantId}:${key}`).digest('hex').slice(0, 32);
}

function valueRange(product: ProductCatalogItem | undefined, agreements: ConnectWiseAgreement[]) {
  if (!product) return { monthlyValueLow: null, monthlyValueHigh: null };
  const agreement = agreements[0];
  const multiplier = product.pricingModel === 'per-user'
    ? agreement?.coveredUsers ?? 0
    : product.pricingModel === 'per-device'
      ? agreement?.coveredDevices ?? 0
      : 1;
  return {
    monthlyValueLow: product.monthlyPriceLow * multiplier,
    monthlyValueHigh: product.monthlyPriceHigh * multiplier,
  };
}

function visibleAnalysis(
  analysis: SalesOpportunityAnalysis | null,
  role: 'admin' | 'editor' | 'viewer',
): SalesOpportunityAnalysis | null {
  if (!analysis || role === 'admin') return analysis;
  return {
    ...analysis,
    sourceSummary: { ...analysis.sourceSummary, churnScore: null },
    findings: analysis.findings.filter((finding) =>
      !finding.evidence.some((item) => item.sourceType === 'churn')),
  };
}

export function registerSalesOpportunityRoutes(
  app: FastifyInstance,
  provider: SalesOpportunityModelProvider | null,
  vendorData: VendorDataService,
  churnService: ChurnService,
): void {
  const staffOnly = { preHandler: requireRole('admin', 'editor') };

  async function accessibleTenantFor(req: FastifyRequest) {
    const tenantId = tenantHeader(req);
    const scope = await resolvePortalAccess(app.db, app.configStore, req.adminIdentity!, tenantId);
    if (!scope || !scope.isStaff) throw new NotFoundError('Client not found');
    const tenant = app.configStore.tenantById(tenantId)!;
    return { tenantId, scope, tenant };
  }

  async function inputFor(req: FastifyRequest) {
    const { tenantId, scope, tenant } = await accessibleTenantFor(req);
    const [ticketResult, agreementResult, rows, churn] = await Promise.all([
      tenant.connectWiseCompanyId !== null
        ? vendorData.tickets(tenant)
        : ticketsForScope(app.db, scope).then((data) => ({ data })),
      vendorData.agreements(tenant),
      productCatalogRepo(app.db).list(),
      req.adminIdentity!.role === 'admin' ? churnService.get(tenantId) : Promise.resolve(null),
    ]);
    return {
      tenantId,
      tenantName: tenant.name,
      tickets: ticketResult.data,
      products: rows.map(productCatalogDto).filter((product) => product.enabled),
      agreements: agreementResult.data,
      churn,
      scope,
    };
  }

  app.get('/api/sales-opportunities/status', staffOnly, async (req) => {
    await inputFor(req);
    return { enabled: provider !== null };
  });

  app.get('/api/sales-opportunities/context', staffOnly, async (req) => {
    const input = await inputFor(req);
    return {
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      agreements: input.agreements,
      ticketCount: input.tickets.length,
      churn: input.churn ? {
        score: input.churn.score,
        assessment: input.churn.assessment,
        suggestedActions: input.churn.suggestedActions,
        assessedAt: input.churn.assessedAt,
      } : null,
    };
  });

  app.get('/api/sales-opportunities/latest', staffOnly, async (req) => {
    const input = await inputFor(req);
    return visibleAnalysis(
      await salesOpportunityRepo(app.db).latest(input.tenantId),
      req.adminIdentity!.role,
    );
  });

  app.delete('/api/sales-opportunities/latest', staffOnly, async (req, reply) => {
    const { tenantId } = await accessibleTenantFor(req);
    if (await salesOpportunityRepo(app.db).clear(tenantId)) {
      await auditRepo(app.db).write({
        actor: req.adminIdentity!.email,
        action: 'sales-opportunity.clear',
        target: tenantId,
        metadata: { tenantId },
      });
    }
    return reply.status(204).send();
  });

  app.post('/api/sales-opportunities/analyze', staffOnly, async (req) => {
    const input = await inputFor(req);
    if (!provider) throw new ApiError(503, 'opportunity_agent_disabled', 'Sales opportunity analysis requires an OpenAI API key');
    const suggestions = (await provider.generate({
      ...input,
      safetyIdentifier: safetyIdentifier(input.scope.userId, input.tenantId),
    })).slice(0, 5);

    const products = new Map(input.products.map((product) => [product.id, product]));
    const evidence = new Map<string, SalesOpportunityEvidence>();
    for (const agreement of input.agreements) evidence.set(`agreement:${agreement.id}`, {
      sourceType: 'agreement', sourceId: agreement.id, label: agreement.name, href: `/sales-opportunities#agreement-${agreement.id}`,
    });
    for (const ticket of input.tickets) evidence.set(`ticket:${ticket.id}`, {
      sourceType: 'ticket', sourceId: ticket.id, label: `${ticket.number}: ${ticket.subject}`, href: `/tickets/${encodeURIComponent(ticket.id)}`,
    });
    if (input.churn) evidence.set('churn:assessment', {
      sourceType: 'churn', sourceId: 'assessment', label: `Churn risk score ${input.churn.score}`,
      href: `/customer-churn/${encodeURIComponent(input.tenantId)}`,
    });

    const findings: SalesOpportunityFinding[] = [];
    for (const suggestion of suggestions) {
      const validEvidence = [...new Set(suggestion.evidenceIds)].map((id) => evidence.get(id))
        .filter((item): item is SalesOpportunityEvidence => Boolean(item));
      if (!suggestion.title.trim() || !suggestion.rationale.trim() || !suggestion.suggestedApproach.trim() || validEvidence.length === 0) continue;
      const product = suggestion.catalogProductId ? products.get(suggestion.catalogProductId) : undefined;
      findings.push({
        fingerprint: fingerprint(input.tenantId, suggestion, product), tenantId: input.tenantId,
        ...(product ? { catalogProductId: product.id } : {}),
        title: suggestion.title.trim(), category: (product?.category ?? suggestion.category.trim()) || 'Other',
        kind: suggestion.kind, priority: suggestion.priority,
        confidence: Math.min(100, Math.max(0, Math.round(suggestion.confidence))),
        ...valueRange(product, input.agreements),
        rationale: suggestion.rationale.trim(), suggestedApproach: suggestion.suggestedApproach.trim(),
        evidence: validEvidence,
      });
    }
    const analysis = await salesOpportunityRepo(app.db).save({
      tenantId: input.tenantId,
      analyzedAt: new Date().toISOString(), model: provider.modelName,
      sourceSummary: {
        agreementCount: input.agreements.length, ticketCount: input.tickets.length,
        catalogProductCount: input.products.length, churnScore: input.churn?.score ?? null,
      },
      findings,
    });
    return analysis;
  });

  app.post('/api/sales-opportunities/:fingerprint/send-to-connectwise', staffOnly, async (req) => {
    const input = await inputFor(req);
    const requested = (req.params as { fingerprint: string }).fingerprint;
    const latest = visibleAnalysis(
      await salesOpportunityRepo(app.db).latest(input.tenantId),
      req.adminIdentity!.role,
    );
    const finding = latest?.findings.find((item) => item.fingerprint === requested);
    if (!finding) throw new NotFoundError('Opportunity not found in the latest analysis');
    const sentAt = new Date().toISOString();
    const sent = await salesOpportunityRepo(app.db).send(input.tenantId, finding, req.adminIdentity!.email, sentAt);
    await auditRepo(app.db).write({
      actor: req.adminIdentity!.email, action: 'sales-opportunity.send', target: finding.fingerprint,
      metadata: { tenantId: input.tenantId, title: finding.title, simulated: true },
    });
    return sent;
  });
}
