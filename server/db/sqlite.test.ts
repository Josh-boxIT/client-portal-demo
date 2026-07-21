import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { getDb, runMigrations } from './client';
import { seedIfEmpty, seedProductCatalogIfEmpty } from './seed';
import { actionDefs, adminUsers, appMeta, productCatalog, tenants } from './schema';
import {
  connectWiseCacheRepo,
  demoTicketMutationRepo,
  demoTicketRepo,
  formSubmissionRepo,
  tenantRepo,
} from './repositories';
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
    expect(db.select().from(productCatalog).all()).toHaveLength(25);
    const corePackage = db.select().from(productCatalog).all().find((product) => product.name === 'Core Package');
    expect(corePackage?.aliases).toContain('Core Package - Mac');

    await tenantRepo(db).update('brightwater', { name: 'Edited Demo Client' });
    await seedIfEmpty(db);
    expect((await tenantRepo(db).getById('brightwater'))?.name).toBe('Edited Demo Client');
    raw.close();
  });

  it('upgrades the legacy product catalog once and preserves later admin edits', async () => {
    const { db, raw } = getDb(':memory:');
    runMigrations(db);
    db.insert(appMeta).values({ key: 'product_catalog_seed_version', value: '1' }).run();
    db.insert(productCatalog).values({
      id: 'product-legacy', name: 'Legacy product', normalizedName: 'legacy product',
      category: 'Legacy', description: 'Replace me', aliases: [], pricingModel: 'flat',
      monthlyPriceLow: 1, monthlyPriceHigh: 1, enabled: true,
    }).run();

    expect(await seedProductCatalogIfEmpty(db)).toEqual({ seeded: true });
    expect(db.select().from(productCatalog).all()).toHaveLength(25);
    expect(db.select().from(productCatalog).all().some((product) => product.id === 'product-legacy')).toBe(false);
    expect(db.select().from(appMeta).all().find((entry) => entry.key === 'product_catalog_seed_version')?.value).toBe('2');

    db.update(productCatalog).set({ description: 'Admin edit' })
      .where(eq(productCatalog.id, 'product-core-package')).run();
    expect(await seedProductCatalogIfEmpty(db)).toEqual({ seeded: false });
    expect(db.select().from(productCatalog).all().find((product) => product.id === 'product-core-package')?.description).toBe('Admin edit');
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

  it('upserts ConnectWise snapshots and preserves them after reopening a file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'client-portal-demo-cw-cache-'));
    tempDirs.push(directory);
    const path = join(directory, 'cache.db');
    const first = getDb(path);
    runMigrations(first.db);
    await seedIfEmpty(first.db);
    const firstCache = connectWiseCacheRepo(first.db);

    await firstCache.replace('brightwater', 'people', [
      { id: 'cw-contact-1', data: { id: 'cw-contact-1', name: 'Old name' } },
      { id: 'cw-contact-stale', data: { id: 'cw-contact-stale', name: 'Remove me' } },
    ], '2026-07-21T10:00:00.000Z');
    await firstCache.replace('brightwater', 'people', [
      { id: 'cw-contact-1', data: { id: 'cw-contact-1', name: 'Updated name' } },
      { id: 'cw-contact-2', data: { id: 'cw-contact-2', name: 'New person' } },
    ], '2026-07-21T10:05:00.000Z');
    first.raw.close();

    const second = getDb(path);
    runMigrations(second.db);
    expect(await connectWiseCacheRepo(second.db).list('brightwater', 'people')).toEqual([
      { id: 'cw-contact-1', name: 'Updated name' },
      { id: 'cw-contact-2', name: 'New person' },
    ]);
    second.raw.close();
  });
});
