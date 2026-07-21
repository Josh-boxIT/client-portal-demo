import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getDb, runMigrations } from './client';
import { seedIfEmpty, seedProductCatalogIfEmpty } from './seed';
import { actionDefs, adminUsers, productCatalog, tenants } from './schema';
import { demoTicketMutationRepo, demoTicketRepo, formSubmissionRepo, tenantRepo } from './repositories';
import type { FormSubmission, Ticket } from '@/services/types';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe('SQLite demo persistence', () => {
  it('seeds the canonical sample data exactly once', async () => {
    const { db, raw } = getDb(':memory:');
    runMigrations(db);
    expect(await seedIfEmpty(db)).toEqual({ seeded: true });
    expect(await seedIfEmpty(db)).toEqual({ seeded: false });
    expect(await seedProductCatalogIfEmpty(db)).toEqual({ seeded: true });
    expect(await seedProductCatalogIfEmpty(db)).toEqual({ seeded: false });
    expect(db.select().from(tenants).all()).toHaveLength(3);
    expect(db.select().from(adminUsers).all()).toHaveLength(3);
    expect(db.select().from(actionDefs).all()).toHaveLength(24);
    expect(db.select().from(productCatalog).all()).toHaveLength(8);

    await tenantRepo(db).update('brightwater', { name: 'Edited Demo Client' });
    await seedIfEmpty(db);
    expect((await tenantRepo(db).getById('brightwater'))?.name).toBe('Edited Demo Client');
    raw.close();
  });

  it('preserves created tickets and submissions after reopening a file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'client-portal-demo-'));
    tempDirs.push(directory);
    const path = join(directory, 'demo.db');
    const first = getDb(path);
    runMigrations(first.db);
    await seedIfEmpty(first.db);

    const ticket: Ticket = {
      id: 'demo-tkt-persisted', tenantId: 'brightwater', number: 'DEMO-0001', subject: 'Persist me',
      status: 'open', isClosed: false, priority: 'medium', requesterId: 'bw-p1', category: 'Demo',
      createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z', messages: [],
    };
    const submission: FormSubmission = {
      id: 'sub-persisted', formId: 'bw-form-1', tenantId: 'brightwater', values: { request: 'Persist me' },
      submittedAt: '2026-07-20T12:00:00.000Z', submittedBy: 'bw-admin',
    };
    await demoTicketRepo(first.db).create(ticket);
    await demoTicketMutationRepo(first.db).setStatus('brightwater', ticket.id, 'resolved', '2026-07-20T12:05:00.000Z');
    await demoTicketMutationRepo(first.db).addReply('brightwater', ticket.id, {
      id: 'msg-persisted', author: 'Sarah Okonkwo', authorType: 'requester', body: 'This is fixed.',
      at: '2026-07-20T12:06:00.000Z',
    });
    await formSubmissionRepo(first.db).create(submission);
    first.raw.close();

    const second = getDb(path);
    runMigrations(second.db);
    expect(await demoTicketRepo(second.db).get('brightwater', ticket.id)).toEqual(ticket);
    expect(await demoTicketMutationRepo(second.db).get('brightwater', ticket.id)).toEqual({
      status: 'resolved',
      replies: [{
        id: 'msg-persisted', author: 'Sarah Okonkwo', authorType: 'requester', body: 'This is fixed.',
        at: '2026-07-20T12:06:00.000Z',
      }],
      updatedAt: '2026-07-20T12:06:00.000Z',
    });
    expect(await formSubmissionRepo(second.db).list('brightwater', 'bw-admin')).toEqual([submission]);
    second.raw.close();
  });
});
