import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getSeed } from '@/data';
import { buildApp } from '../app';
import { openTestDb } from '../db/test-db';
import type { DbClient } from '../db/client';

let app: FastifyInstance;
let raw: DbClient;

beforeEach(async () => {
  const opened = openTestDb();
  raw = opened.raw;
  app = await buildApp({ db: opened.db, logger: false });
});

afterEach(async () => {
  await app.close();
  raw.close();
});

async function login(email: string): Promise<{ token: string; identity: { role: string } }> {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email } });
  expect(response.statusCode).toBe(200);
  return response.json();
}

describe('sample-only demo API', () => {
  it('supports all three seeded identities and tenant grants', async () => {
    const admin = await login('alex.morgan@boxit.demo');
    const clientAdmin = await login('sarah.okonkwo@brightwaterlogistics.com');
    const clientUser = await login('marcus.thiele@brightwaterlogistics.com');
    expect(admin.identity.role).toBe('admin');
    expect(clientAdmin.identity.role).toBe('viewer');
    expect(clientUser.identity.role).toBe('viewer');

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${clientUser.token}` } });
    expect(me.json().clientIds).toEqual(['brightwater']);
  });

  it('merges and persists created tickets while filtering internal notes for clients', async () => {
    const admin = await login('alex.morgan@boxit.demo');
    const viewer = await login('sarah.okonkwo@brightwaterlogistics.com');
    const seeded = getSeed('brightwater').tickets.find((ticket) => ticket.messages.some((message) => message.internal));
    expect(seeded).toBeDefined();

    const staffTicket = await app.inject({ method: 'GET', url: `/api/tickets/${seeded!.id}`, headers: { 'x-tenant-id': 'brightwater', authorization: `Bearer ${admin.token}` } });
    const clientTicket = await app.inject({ method: 'GET', url: `/api/tickets/${seeded!.id}`, headers: { 'x-tenant-id': 'brightwater', authorization: `Bearer ${viewer.token}` } });
    expect(staffTicket.json().messages.some((message: { internal?: boolean }) => message.internal)).toBe(true);
    expect(clientTicket.json().messages.some((message: { internal?: boolean }) => message.internal)).toBe(false);

    const created = await app.inject({
      method: 'POST', url: '/api/tickets', headers: { 'x-tenant-id': 'brightwater', authorization: `Bearer ${viewer.token}` },
      payload: { subject: 'Demo persistence', body: 'Keep this ticket', requesterId: 'bw-p1', category: 'Demo', priority: 'medium' },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    const fetched = await app.inject({ method: 'GET', url: `/api/tickets/${id}`, headers: { 'x-tenant-id': 'brightwater' } });
    expect(fetched.json().subject).toBe('Demo persistence');
  });

  it('limits client users to their own tickets while preserving admin access', async () => {
    const admin = await login('alex.morgan@boxit.demo');
    const clientAdmin = await login('sarah.okonkwo@brightwaterlogistics.com');
    const clientUser = await login('marcus.thiele@brightwaterlogistics.com');
    const clientUserHeaders = {
      'x-tenant-id': 'brightwater',
      authorization: `Bearer ${clientUser.token}`,
    };

    const listed = await app.inject({ method: 'GET', url: '/api/tickets?pageSize=100', headers: clientUserHeaders });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data).not.toHaveLength(0);
    expect(listed.json().data.every((ticket: { requesterId: string }) => ticket.requesterId === 'bw-p2')).toBe(true);

    expect((await app.inject({ method: 'GET', url: '/api/tickets/bw-t1', headers: clientUserHeaders })).statusCode).toBe(404);
    expect((await app.inject({
      method: 'PATCH',
      url: '/api/tickets/bw-t1/status',
      headers: clientUserHeaders,
      payload: { status: 'resolved' },
    })).statusCode).toBe(404);
    expect((await app.inject({
      method: 'POST',
      url: '/api/tickets/bw-t1/replies',
      headers: clientUserHeaders,
      payload: { body: 'I should not be able to reply here.' },
    })).statusCode).toBe(404);

    const created = await app.inject({
      method: 'POST',
      url: '/api/tickets',
      headers: clientUserHeaders,
      payload: { subject: 'My request', body: 'Please help', requesterId: 'bw-p1', category: 'Demo', priority: 'medium' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().requesterId).toBe('bw-p2');

    const unrestrictedHeaders = [
      { 'x-tenant-id': 'brightwater', authorization: `Bearer ${admin.token}` },
      { 'x-tenant-id': 'brightwater', authorization: `Bearer ${clientAdmin.token}` },
    ];
    for (const headers of unrestrictedHeaders) {
      const response = await app.inject({ method: 'GET', url: '/api/tickets/bw-t1', headers });
      expect(response.statusCode).toBe(200);
    }
  });

  it('persists ticket status changes and client replies for seeded tickets', async () => {
    const viewer = await login('marcus.thiele@brightwaterlogistics.com');
    const headers = {
      'x-tenant-id': 'brightwater',
      authorization: `Bearer ${viewer.token}`,
    };

    const status = await app.inject({
      method: 'PATCH',
      url: '/api/tickets/bw-t6/status',
      headers,
      payload: { status: 'resolved' },
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ status: 'resolved', isClosed: false });

    const reply = await app.inject({
      method: 'POST',
      url: '/api/tickets/bw-t6/replies',
      headers,
      payload: { body: '  The laptop is running normally now.  ' },
    });
    expect(reply.statusCode).toBe(201);
    expect(reply.json().messages.at(-1)).toMatchObject({
      author: 'Marcus Thiele',
      authorType: 'requester',
      body: 'The laptop is running normally now.',
    });

    const fetched = await app.inject({ method: 'GET', url: '/api/tickets/bw-t6', headers });
    expect(fetched.json().status).toBe('resolved');
    expect(fetched.json().messages.at(-1).body).toBe('The laptop is running normally now.');

    const listed = await app.inject({ method: 'GET', url: '/api/tickets?pageSize=100', headers });
    expect(listed.json().data.find((ticket: { id: string }) => ticket.id === 'bw-t6').status).toBe('resolved');

    const wrongTenant = await app.inject({
      method: 'PATCH',
      url: '/api/tickets/bw-t6/status',
      headers: { ...headers, 'x-tenant-id': 'northwind' },
      payload: { status: 'closed' },
    });
    expect(wrongTenant.statusCode).toBe(404);
  });

  it('persists and scopes form submissions by tenant and persona', async () => {
    const form = getSeed('brightwater').forms[0];
    const created = await app.inject({
      method: 'POST', url: `/api/forms/${form.id}/submissions`, headers: { 'x-tenant-id': 'brightwater' },
      payload: { values: { reason: 'Demo request' }, submittedBy: 'bw-user' },
    });
    expect(created.statusCode).toBe(201);
    const mine = await app.inject({ method: 'GET', url: '/api/form-submissions?submittedBy=bw-user', headers: { 'x-tenant-id': 'brightwater' } });
    const other = await app.inject({ method: 'GET', url: '/api/form-submissions?submittedBy=bw-admin', headers: { 'x-tenant-id': 'brightwater' } });
    expect(mine.json().total).toBe(1);
    expect(other.json().total).toBe(0);
  });

  it('keeps useful admin routes and removes integration routes', async () => {
    const admin = await login('alex.morgan@boxit.demo');
    const headers = { authorization: `Bearer ${admin.token}` };
    const clients = await app.inject({ method: 'GET', url: '/api/admin/clients', headers });
    expect(clients.json()).toHaveLength(3);
    const updated = await app.inject({ method: 'PATCH', url: '/api/admin/clients/brightwater', headers, payload: { name: 'Brightwater Demo' } });
    expect(updated.json().name).toBe('Brightwater Demo');
    for (const url of ['/api/admin/connections', '/api/admin/sync-status', '/api/admin/import']) {
      expect((await app.inject({ method: 'GET', url, headers })).statusCode).toBe(404);
    }
    expect((await app.inject({ method: 'GET', url: '/api/auth/callback' })).statusCode).toBe(404);
  });
});
