import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client';
import { openTestDb } from '../db/test-db';
import { buildApp } from '../app';
import { adminUsersRepo, assistantRepo } from '../db/repositories';
import type {
  AssistantModelInput,
  AssistantModelProvider,
  AssistantModelResult,
} from './provider';
import type { PortalRecord } from './portal-data';

const openApps: Array<{ app: FastifyInstance; raw: DbClient }> = [];

afterEach(async () => {
  for (const opened of openApps.splice(0)) {
    await opened.app.close();
    opened.raw.close();
  }
});

async function makeApp(provider: AssistantModelProvider | null): Promise<FastifyInstance> {
  const opened = openTestDb();
  const app = await buildApp({ db: opened.db, logger: false, assistantProvider: provider });
  openApps.push({ app, raw: opened.raw });
  return app;
}

async function login(app: FastifyInstance, email: string): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email } });
  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

function authHeaders(token: string, tenantId = 'brightwater') {
  return { authorization: `Bearer ${token}`, 'x-tenant-id': tenantId };
}

function sseEvents(responseBody: string): Array<Record<string, unknown>> {
  return responseBody.replace(/\r\n/g, '\n').split('\n\n').flatMap((block) => {
    const data = block.split('\n').find((line) => line.startsWith('data: '));
    return data ? [JSON.parse(data.slice(6)) as Record<string, unknown>] : [];
  });
}

class CitationProvider implements AssistantModelProvider {
  calls = 0;

  async generate(input: AssistantModelInput): Promise<AssistantModelResult> {
    this.calls += 1;
    const records = await input.executeTool('search_portal', {
      query: 'GlobalProtect', domains: ['documents'], limit: 10,
    });
    return {
      answer: 'The portal includes a VPN setup guide.',
      sourceIds: records.slice(0, 1).map((record) => record.sourceId),
      accessedRecords: records,
    };
  }
}

class PermissionCaptureProvider implements AssistantModelProvider {
  captured: Record<string, PortalRecord[]> = {};

  async generate(input: AssistantModelInput): Promise<AssistantModelResult> {
    for (const domain of ['qbrs', 'tickets', 'form-submissions']) {
      this.captured[domain] = await input.executeTool('list_portal_records', { domain, limit: 50 });
    }
    const record = this.captured.tickets[0];
    return {
      answer: record ? 'I found your ticket.' : "I couldn't find that in the portal data available to you.",
      sourceIds: record ? [record.sourceId] : [],
      accessedRecords: Object.values(this.captured).flat(),
    };
  }
}

class NewDataCaptureProvider implements AssistantModelProvider {
  calls: Array<{
    churn: PortalRecord[];
    queueAttention: PortalRecord[];
    queueSearch: PortalRecord[];
  }> = [];

  async generate(input: AssistantModelInput): Promise<AssistantModelResult> {
    const churn = await input.executeTool('search_portal', {
      query: 'risk', domains: ['customer-churn'], limit: 50,
    });
    const queueAttention = await input.executeTool('list_portal_records', {
      domain: 'queue-attention', limit: 50,
    });
    const queueSearch = await input.executeTool('search_portal', {
      query: '822871', domains: ['queue-attention'], limit: 50,
    });
    this.calls.push({ churn, queueAttention, queueSearch });
    const accessedRecords = [...churn, ...queueAttention, ...queueSearch];
    return {
      answer: accessedRecords.length > 0
        ? 'I found the requested insight data.'
        : "I couldn't find that in the portal data available to you.",
      sourceIds: [churn[0], queueAttention[0]]
        .filter((record): record is PortalRecord => Boolean(record))
        .map((record) => record.sourceId),
      accessedRecords,
    };
  }
}

describe('permission-aware assistant API', () => {
  it('requires authentication and reports disabled configuration without a key', async () => {
    const app = await makeApp(null);
    const unauthenticated = await app.inject({
      method: 'GET', url: '/api/assistant/status', headers: { 'x-tenant-id': 'brightwater' },
    });
    expect(unauthenticated.statusCode).toBe(401);

    const token = await login(app, 'marcus.thiele@brightwaterlogistics.com');
    const status = await app.inject({ method: 'GET', url: '/api/assistant/status', headers: authHeaders(token) });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toEqual({ enabled: false });
  });

  it('persists grounded turns, titles conversations, and replays idempotent requests', async () => {
    const provider = new CitationProvider();
    const app = await makeApp(provider);
    const token = await login(app, 'sarah.okonkwo@brightwaterlogistics.com');
    const headers = authHeaders(token);

    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    expect(created.statusCode).toBe(201);
    const conversationId = created.json().id as string;
    const payload = {
      content: 'How do I configure the VPN?',
      requestId: 'request-vpn-1',
      currentPath: '/documents',
    };

    const first = await app.inject({
      method: 'POST', url: `/api/assistant/conversations/${conversationId}/messages`, headers, payload,
    });
    expect(first.statusCode).toBe(200);
    const completed = sseEvents(first.body).find((event) => event.type === 'message.completed');
    expect(completed).toBeDefined();
    expect(completed?.message).toMatchObject({
      role: 'assistant',
      citations: [{ recordType: 'documents', href: '/documents/bw-doc2', tenantId: 'brightwater' }],
    });

    const replay = await app.inject({
      method: 'POST', url: `/api/assistant/conversations/${conversationId}/messages`, headers, payload,
    });
    expect(sseEvents(replay.body).some((event) => event.type === 'message.completed')).toBe(true);
    expect(provider.calls).toBe(1);

    const messages = await app.inject({
      method: 'GET', url: `/api/assistant/conversations/${conversationId}/messages`, headers,
    });
    expect(messages.json()).toHaveLength(2);
    const conversations = await app.inject({ method: 'GET', url: '/api/assistant/conversations', headers });
    expect(conversations.json()[0].title).toBe('How do I configure the VPN?');
  });

  it('keeps conversations private across users and tenant grants', async () => {
    const app = await makeApp(new CitationProvider());
    const sarah = await login(app, 'sarah.okonkwo@brightwaterlogistics.com');
    const marcus = await login(app, 'marcus.thiele@brightwaterlogistics.com');
    const created = await app.inject({
      method: 'POST', url: '/api/assistant/conversations', headers: authHeaders(sarah),
    });
    const conversationId = created.json().id as string;

    const guessed = await app.inject({
      method: 'GET',
      url: `/api/assistant/conversations/${conversationId}/messages`,
      headers: authHeaders(marcus),
    });
    expect(guessed.statusCode).toBe(404);

    const wrongTenant = await app.inject({
      method: 'POST',
      url: '/api/assistant/conversations',
      headers: authHeaders(marcus, 'northwind'),
    });
    expect(wrongTenant.statusCode).toBe(404);
  });

  it('filters client-user tools before any portal data reaches the model', async () => {
    const provider = new PermissionCaptureProvider();
    const app = await makeApp(provider);
    const token = await login(app, 'marcus.thiele@brightwaterlogistics.com');
    const headers = authHeaders(token);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    const conversationId = created.json().id as string;

    await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${conversationId}/messages`,
      headers,
      payload: { content: 'What can I see?', requestId: 'permission-check' },
    });

    expect(provider.captured.qbrs).toEqual([]);
    expect(provider.captured.tickets.length).toBeGreaterThan(0);
    expect(provider.captured.tickets.every((record) => record.data.requesterId === 'bw-p2')).toBe(true);
    expect(JSON.stringify(provider.captured.tickets)).not.toContain('"internal":true');
    expect(provider.captured['form-submissions']).toEqual([]);
  });

  it('uses the configured display name in records sent to the model', async () => {
    const provider = new PermissionCaptureProvider();
    const app = await makeApp(provider);
    const admin = await login(app, 'alex.morgan@boxit.demo');
    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/admin/clients/brightwater',
      headers: { authorization: `Bearer ${admin}` },
      payload: { displayName: 'Coastal Shipping' },
    });
    expect(updated.statusCode).toBe(200);

    const viewer = await login(app, 'marcus.thiele@brightwaterlogistics.com');
    const headers = authHeaders(viewer);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${created.json().id}/messages`,
      headers,
      payload: { content: 'What can I see?', requestId: 'display-name-check' },
    });

    expect(provider.captured.tickets.length).toBeGreaterThan(0);
    expect(provider.captured.tickets.every((record) => record.clientName === 'Coastal Shipping')).toBe(true);
    expect(JSON.stringify(provider.captured.tickets)).not.toContain('Brightwater Logistics');
  });

  it('does not expose churn while searching a client user\'s granted tenants', async () => {
    const provider = new NewDataCaptureProvider();
    const app = await makeApp(provider);
    await adminUsersRepo(app.db).setClientAccess('demo-client-admin', ['brightwater', 'northwind']);
    const token = await login(app, 'sarah.okonkwo@brightwaterlogistics.com');
    const headers = authHeaders(token, 'brightwater');
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });

    const response = await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${created.json().id}/messages`,
      headers,
      payload: { content: 'Compare churn across my clients.', requestId: 'multi-client-churn' },
    });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].churn).toEqual([]);
    const completed = sseEvents(response.body).find((event) => event.type === 'message.completed');
    expect(completed?.message).toMatchObject({
      citations: [],
    });
  });

  it('does not expose churn or Queue Attention to client users', async () => {
    const provider = new NewDataCaptureProvider();
    const app = await makeApp(provider);
    const token = await login(app, 'marcus.thiele@brightwaterlogistics.com');
    const headers = authHeaders(token);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    const response = await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${created.json().id}/messages`,
      headers,
      payload: { content: 'What is our churn risk?', requestId: 'client-churn' },
    });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].churn).toEqual([]);
    expect(provider.calls[0].queueAttention).toEqual([]);
    expect(provider.calls[0].queueSearch).toEqual([]);

    const completed = sseEvents(response.body).find((event) => event.type === 'message.completed');
    expect(completed?.message).toMatchObject({
      citations: [],
    });
  });

  it('redacts historical admin-only insight answers from client conversation history', async () => {
    const app = await makeApp(new NewDataCaptureProvider());
    const token = await login(app, 'marcus.thiele@brightwaterlogistics.com');
    const headers = authHeaders(token);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    await assistantRepo(app.db).persistTurn({
      userId: 'demo-client-user',
      tenantId: 'brightwater',
      conversationId: created.json().id,
      requestId: 'historical-churn',
      userContent: 'What is our churn risk?',
      assistantContent: 'The historical score was 68.',
      citations: [{
        sourceId: 'brightwater:customer-churn:assessment',
        recordType: 'customer-churn',
        recordId: 'assessment',
        title: 'Customer churn assessment',
        href: '/customer-churn',
        tenantId: 'brightwater',
      }],
    });
    await assistantRepo(app.db).persistTurn({
      userId: 'demo-client-user',
      tenantId: 'brightwater',
      conversationId: created.json().id,
      requestId: 'historical-queue-attention',
      userContent: 'What needs queue attention?',
      assistantContent: 'Ticket 822871 needs immediate attention.',
      citations: [{
        sourceId: 'brightwater:queue-attention:item:822871',
        recordType: 'queue-attention',
        recordId: 'item:822871',
        title: 'Queue Attention ticket 822871',
        href: '/queue-attention',
        tenantId: 'brightwater',
      }],
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/assistant/conversations/${created.json().id}/messages`,
      headers,
    });
    const assistantMessages = (response.json() as Array<{
      role: string;
      content: string;
      citations: unknown[];
    }>).filter(
      (message) => message.role === 'assistant',
    );
    expect(assistantMessages).toHaveLength(2);
    expect(assistantMessages.every((message) =>
      message.content === 'This historical insight response is available only to administrators.'
      && message.citations.length === 0
    )).toBe(true);
  });

  it('does not expose Queue Attention to editors', async () => {
    const provider = new NewDataCaptureProvider();
    const app = await makeApp(provider);
    await adminUsersRepo(app.db).create({
      id: 'demo-editor',
      email: 'editor@boxit.demo',
      name: 'Demo Editor',
      role: 'editor',
      status: 'active',
    });
    const token = await login(app, 'editor@boxit.demo');
    const headers = authHeaders(token);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    const response = await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${created.json().id}/messages`,
      headers,
      payload: { content: 'Summarize queue attention.', requestId: 'editor-queue-attention' },
    });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].queueAttention).toEqual([]);
    expect(provider.calls[0].queueSearch).toEqual([]);
    const completed = sseEvents(response.body).find((event) => event.type === 'message.completed');
    expect(completed?.message).toMatchObject({ citations: [] });
  });

  it('gives admins display-safe Queue Attention records and tenant-specific churn citations', async () => {
    const provider = new NewDataCaptureProvider();
    const app = await makeApp(provider);
    const token = await login(app, 'alex.morgan@boxit.demo');

    for (const [tenantId, requestId] of [['brightwater', 'staff-brightwater'], ['northwind', 'staff-northwind']]) {
      const headers = authHeaders(token, tenantId);
      const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
      const response = await app.inject({
        method: 'POST',
        url: `/api/assistant/conversations/${created.json().id}/messages`,
        headers,
        payload: { content: 'Summarize churn and queue attention.', requestId },
      });
      const completed = sseEvents(response.body).find((event) => event.type === 'message.completed');
      expect(completed?.message).toMatchObject({
        citations: [
          { recordType: 'customer-churn', href: '/customer-churn', tenantId },
          { recordType: 'queue-attention', href: '/queue-attention', tenantId },
        ],
      });
    }

    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[0].churn[0].data.score).toBe(68);
    expect(provider.calls[1].churn[0].data.score).toBe(81);
    expect(provider.calls[0].churn.map((record) => record.tenantId)).toEqual([
      'brightwater', 'cedarvine', 'northwind',
    ]);
    expect(provider.calls[1].churn.map((record) => record.tenantId)).toEqual([
      'northwind', 'brightwater', 'cedarvine',
    ]);

    const queueRecords = provider.calls[0].queueAttention;
    expect(queueRecords).toHaveLength(28);
    expect(queueRecords.find((record) => record.recordId === 'overview')?.data.summary).toMatchObject({
      scannedTicketCount: 106,
      flaggedTicketCount: 83,
      unassignedCount: 64,
      syncStaleTicketCount: 8,
    });
    expect(queueRecords.filter((record) => record.recordId.startsWith('item:'))).toHaveLength(20);
    expect(queueRecords.filter((record) => record.recordId.startsWith('pattern:'))).toHaveLength(3);
    expect(queueRecords.filter((record) => record.recordId.startsWith('agenda:'))).toHaveLength(4);
    expect(provider.calls[0].queueSearch.some(
      (record) => record.data.primaryTicketExternalId === '822871',
    )).toBe(true);
    expect(JSON.stringify(queueRecords)).not.toMatch(/"(?:internal|messages|notes)"/);
  });

  it('drops fabricated citations and replaces unsupported factual answers', async () => {
    const provider: AssistantModelProvider = {
      async generate() {
        return {
          answer: 'This answer has no permitted evidence.',
          sourceIds: ['tickets:made-up'],
          accessedRecords: [],
        };
      },
    };
    const app = await makeApp(provider);
    const token = await login(app, 'sarah.okonkwo@brightwaterlogistics.com');
    const headers = authHeaders(token);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    const conversationId = created.json().id as string;
    const response = await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${conversationId}/messages`,
      headers,
      payload: { content: 'Invent something', requestId: 'fabricated-source' },
    });
    const completed = sseEvents(response.body).find((event) => event.type === 'message.completed');
    expect(completed?.message).toMatchObject({
      content: "I couldn't find that in the portal data available to you.",
      citations: [],
    });
  });

  it('rejects oversized messages before calling the provider', async () => {
    const provider = new CitationProvider();
    const app = await makeApp(provider);
    const token = await login(app, 'sarah.okonkwo@brightwaterlogistics.com');
    const headers = authHeaders(token);
    const created = await app.inject({ method: 'POST', url: '/api/assistant/conversations', headers });
    const response = await app.inject({
      method: 'POST',
      url: `/api/assistant/conversations/${created.json().id}/messages`,
      headers,
      payload: { content: 'x'.repeat(4_001), requestId: 'too-long' },
    });
    expect(response.statusCode).toBe(400);
    expect(provider.calls).toBe(0);
  });
});
