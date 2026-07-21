import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { OpportunityModelInput, OpportunityModelSuggestion, SalesOpportunityModelProvider } from './provider';
import { buildApp } from '../app';
import { openTestDb } from '../db/test-db';
import type { AppDb, DbClient } from '../db/client';
import { adminUsers, auditLog, salesOpportunityHandoffs } from '../db/schema';

class FakeOpportunityProvider implements SalesOpportunityModelProvider {
  readonly modelName = 'fake-opportunity-model';
  calls: OpportunityModelInput[] = [];
  suggestions: OpportunityModelSuggestion[] = [
    {
      title: 'Deploy managed antivirus across Brightwater endpoints', category: 'Model-supplied category', kind: 'gap',
      priority: 'high', confidence: 91, catalogProductId: 'product-managed-antivirus',
      rationale: 'A malware ticket and the missing agreement line show a managed antivirus gap.',
      suggestedApproach: 'Lead with consistent warehouse and office endpoint coverage.',
      evidenceIds: ['ticket:brightwater-sales-signal-3', 'agreement:agreement-bw-managed'],
    },
    {
      title: 'Run an executive service recovery workshop', category: 'Account', kind: 'retention',
      priority: 'medium', confidence: 78, catalogProductId: null,
      rationale: 'Churn signals support a retention-oriented conversation.',
      suggestedApproach: 'Review recurring friction before proposing expansion.',
      evidenceIds: ['churn:assessment'],
    },
    {
      title: 'Fabricated finding', category: 'Other', kind: 'other', priority: 'low', confidence: 40,
      catalogProductId: null, rationale: 'Unsupported.', suggestedApproach: 'Do not show this.',
      evidenceIds: ['ticket:not-real'],
    },
  ];

  async generate(input: OpportunityModelInput): Promise<OpportunityModelSuggestion[]> {
    this.calls.push(input);
    return this.suggestions;
  }
}

let app: FastifyInstance;
let raw: DbClient;
let db: AppDb;
let provider: FakeOpportunityProvider;

beforeEach(async () => {
  const opened = openTestDb();
  raw = opened.raw;
  db = opened.db;
  provider = new FakeOpportunityProvider();
  app = await buildApp({ db, logger: false, salesOpportunityProvider: provider });
  db.insert(adminUsers).values({
    id: 'demo-editor', email: 'editor@boxit.demo', name: 'Demo Editor', role: 'editor', status: 'active',
  }).run();
});

afterEach(async () => {
  await app.close();
  raw.close();
});

async function token(email: string): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email } });
  expect(response.statusCode).toBe(200);
  return response.json().token;
}

function headers(value: string, tenantId = 'brightwater') {
  return { authorization: `Bearer ${value}`, 'x-tenant-id': tenantId };
}

describe('sales opportunity API', () => {
  it('is staff-only and supplies tenant-scoped agreement, ticket, churn, and catalog data', async () => {
    const admin = await token('alex.morgan@boxit.demo');
    const editor = await token('editor@boxit.demo');
    const viewer = await token('sarah.okonkwo@brightwaterlogistics.com');
    expect((await app.inject({ method: 'GET', url: '/api/sales-opportunities/context', headers: headers(viewer) })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/sales-opportunities/context', headers: headers(editor) })).json().churn).toBeNull();

    const context = await app.inject({ method: 'GET', url: '/api/sales-opportunities/context', headers: headers(admin) });
    expect(context.statusCode).toBe(200);
    expect(context.json()).toMatchObject({
      tenantId: 'brightwater', tenantName: 'Brightwater Logistics',
      agreements: [{ externalId: 'CW-AGR-4107', lineItems: expect.any(Array) }],
      churn: { score: 68 },
    });
    expect(context.json().ticketCount).toBeGreaterThanOrEqual(12);

    const analyzed = await app.inject({ method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin), payload: {} });
    expect(analyzed.statusCode).toBe(200);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].tenantId).toBe('brightwater');
    expect(provider.calls[0].agreements).toHaveLength(1);
    expect(provider.calls[0].tickets.every((ticket) => ticket.tenantId === 'brightwater')).toBe(true);
    expect(provider.calls[0].products).toHaveLength(25);
  });

  it('drops unsupported evidence and calculates values only for catalog products', async () => {
    const admin = await token('alex.morgan@boxit.demo');
    const response = await app.inject({ method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin), payload: {} });
    const findings = response.json().findings;
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      catalogProductId: 'product-managed-antivirus', monthlyValueLow: 66, monthlyValueHigh: 154,
      category: 'Security',
      evidence: [{ sourceType: 'ticket' }, { sourceType: 'agreement' }],
    });
    expect(findings[1]).toMatchObject({ monthlyValueLow: null, monthlyValueHigh: null });
    expect(findings.some((finding: { title: string }) => finding.title === 'Fabricated finding')).toBe(false);

    const editor = await token('editor@boxit.demo');
    const editorLatest = await app.inject({
      method: 'GET', url: '/api/sales-opportunities/latest', headers: headers(editor),
    });
    expect(editorLatest.json().sourceSummary.churnScore).toBeNull();
    expect(editorLatest.json().findings).toHaveLength(1);
    expect(editorLatest.json().findings[0].evidence.every(
      (item: { sourceType: string }) => item.sourceType !== 'churn',
    )).toBe(true);
  });

  it('persists idempotent handoffs across analysis reruns', async () => {
    const admin = await token('alex.morgan@boxit.demo');
    const analyzed = await app.inject({ method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin), payload: {} });
    const fingerprint = analyzed.json().findings[0].fingerprint;
    const first = await app.inject({ method: 'POST', url: `/api/sales-opportunities/${fingerprint}/send-to-connectwise`, headers: headers(admin), payload: {} });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ sentBy: 'alex.morgan@boxit.demo' });
    const second = await app.inject({ method: 'POST', url: `/api/sales-opportunities/${fingerprint}/send-to-connectwise`, headers: headers(admin), payload: {} });
    expect(second.json().sentAt).toBe(first.json().sentAt);

    await app.inject({ method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin), payload: {} });
    const latest = await app.inject({ method: 'GET', url: '/api/sales-opportunities/latest', headers: headers(admin) });
    expect(latest.json().findings[0].sentAt).toBe(first.json().sentAt);
    expect(db.select().from(auditLog).all().filter((entry) => entry.action === 'sales-opportunity.send')).toHaveLength(2);
  });

  it('clears only the selected client analysis while preserving handoff history', async () => {
    const admin = await token('alex.morgan@boxit.demo');
    const editor = await token('editor@boxit.demo');
    const viewer = await token('sarah.okonkwo@brightwaterlogistics.com');

    const brightwater = await app.inject({
      method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin), payload: {},
    });
    const fingerprint = brightwater.json().findings[0].fingerprint;
    await app.inject({
      method: 'POST', url: `/api/sales-opportunities/${fingerprint}/send-to-connectwise`, headers: headers(admin), payload: {},
    });
    await app.inject({
      method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin, 'cedarvine'), payload: {},
    });

    expect((await app.inject({
      method: 'DELETE', url: '/api/sales-opportunities/latest', headers: headers(viewer),
    })).statusCode).toBe(403);
    expect((await app.inject({
      method: 'DELETE', url: '/api/sales-opportunities/latest', headers: headers(editor),
    })).statusCode).toBe(204);

    const cleared = await app.inject({ method: 'GET', url: '/api/sales-opportunities/latest', headers: headers(admin) });
    const otherClient = await app.inject({
      method: 'GET', url: '/api/sales-opportunities/latest', headers: headers(admin, 'cedarvine'),
    });
    expect(cleared.json()).toBeNull();
    expect(otherClient.json()).toMatchObject({ tenantId: 'cedarvine' });
    expect(db.select().from(salesOpportunityHandoffs).all()).toHaveLength(1);
    expect(db.select().from(auditLog).all()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actor: 'editor@boxit.demo', action: 'sales-opportunity.clear', target: 'brightwater',
        metadata: { tenantId: 'brightwater' },
      }),
    ]));
  });

  it('reports a disabled agent while retaining authenticated route behavior', async () => {
    await app.close();
    app = await buildApp({ db, logger: false, salesOpportunityProvider: null });
    const admin = await token('alex.morgan@boxit.demo');
    const status = await app.inject({ method: 'GET', url: '/api/sales-opportunities/status', headers: headers(admin) });
    expect(status.json()).toEqual({ enabled: false });
    const analyze = await app.inject({ method: 'POST', url: '/api/sales-opportunities/analyze', headers: headers(admin), payload: {} });
    expect(analyze.statusCode).toBe(503);
    expect(analyze.json().error.code).toBe('opportunity_agent_disabled');
  });
});

describe('product catalog API', () => {
  it('restricts catalog maintenance to admins and validates CRUD operations', async () => {
    const admin = await token('alex.morgan@boxit.demo');
    const editor = await token('editor@boxit.demo');
    expect((await app.inject({ method: 'GET', url: '/api/admin/product-catalog', headers: headers(editor) })).statusCode).toBe(403);

    const listed = await app.inject({ method: 'GET', url: '/api/admin/product-catalog', headers: headers(admin) });
    expect(listed.json()).toHaveLength(25);
    const invalid = await app.inject({ method: 'POST', url: '/api/admin/product-catalog', headers: headers(admin), payload: {
      name: 'Invalid', category: 'Test', description: 'Bad range', aliases: [], pricingModel: 'flat', monthlyPriceLow: 20, monthlyPriceHigh: 10,
    } });
    expect(invalid.statusCode).toBe(400);

    const created = await app.inject({ method: 'POST', url: '/api/admin/product-catalog', headers: headers(admin), payload: {
      name: '  Secure Web Gateway  ', category: 'Security', description: 'Protective web filtering.', aliases: ['web filter'], pricingModel: 'per-user', monthlyPriceLow: 2, monthlyPriceHigh: 5,
    } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: 'Secure Web Gateway', enabled: true });
    const duplicate = await app.inject({ method: 'POST', url: '/api/admin/product-catalog', headers: headers(admin), payload: {
      name: 'secure web gateway', category: 'Security', description: 'Duplicate.', aliases: [], pricingModel: 'flat', monthlyPriceLow: 1, monthlyPriceHigh: 2,
    } });
    expect(duplicate.statusCode).toBe(409);
    const id = created.json().id;
    expect((await app.inject({ method: 'PATCH', url: `/api/admin/product-catalog/${id}`, headers: headers(admin), payload: { enabled: false } })).json().enabled).toBe(false);
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/product-catalog/${id}`, headers: headers(admin) })).statusCode).toBe(204);
    expect(db.select().from(auditLog).all().map((entry) => entry.action)).toEqual(expect.arrayContaining(['product.create', 'product.update', 'product.delete']));
  });
});
