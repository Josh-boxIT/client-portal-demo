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
    const viewer = await login('marcus.thiele@brightwaterlogistics.com');
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
