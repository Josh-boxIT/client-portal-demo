import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installDrilldownCache, type BaseServices } from './drilldownCache';
import type { Device, License, Page, Person } from '../types';

const TENANT = 'brightwater';

function makePerson(overrides: Partial<Person> & { id: string }): Person {
  return {
    tenantId: TENANT,
    name: overrides.name ?? `Person ${overrides.id}`,
    email: `${overrides.id}@example.com`,
    title: 'Engineer',
    role: 'Engineer',
    department: 'Engineering',
    status: 'active',
    avatarInitials: 'PP',
    startDate: '2024-01-01',
    deviceIds: [],
    licenseIds: [],
    groups: [],
    ...overrides,
  };
}

function makeDevice(overrides: Partial<Device> & { id: string }): Device {
  return {
    tenantId: TENANT,
    name: `Device ${overrides.id}`,
    type: 'laptop',
    os: 'Windows 11',
    status: 'healthy',
    compliant: true,
    lastSeen: '2025-01-01T00:00:00.000Z',
    serial: 'SN-1',
    model: 'Model X',
    ...overrides,
  };
}

function page<T>(data: T[]): Page<T> {
  return { data, page: 1, pageSize: 200, total: data.length };
}

function buildFakeBase() {
  const persons: Person[] = [
    makePerson({ id: 'p1', m365UnresolvedSkuIds: ['sku-1'] }),
    makePerson({ id: 'p2' }), // no unresolved SKUs
    makePerson({ id: 'p3', m365UnresolvedSkuIds: ['sku-2', 'sku-3'] }),
  ];
  const deviceList: Device[] = [
    makeDevice({ id: 'd1', owner: 'p1' }),
    makeDevice({ id: 'd2', owner: 'p1' }),
    makeDevice({ id: 'd3', owner: 'p2' }),
  ];

  const base: BaseServices = {
    tickets: {} as BaseServices['tickets'],
    people: {
      list: vi.fn(async () => page(persons)),
      get: vi.fn(async (_t: string, id: string) => persons.find((p) => p.id === id) ?? null),
      resolveM365Licenses: vi.fn(async (_t: string, id: string) => [`resolved-${id}`]),
    },
    devices: {
      list: vi.fn(async () => page(deviceList)),
      get: vi.fn(async (_t: string, id: string) => deviceList.find((d) => d.id === id) ?? null),
      listForPerson: vi.fn(async (_t: string, personId: string) =>
        deviceList.filter((d) => d.owner === personId)
      ),
      getDetail: vi.fn(async (_t: string, id: string) => ({ deviceId: id, source: 'ninjarmm' as const })),
      getLiveTelemetry: vi.fn(async (_t: string, id: string) => deviceList.find((d) => d.id === id) ?? null),
    },
    licenses: {
      list: vi.fn(async () => page<License>([])),
      listForPerson: vi.fn(async () => [] as License[]),
    },
    assets: {} as BaseServices['assets'],
    roadmap: {} as BaseServices['roadmap'],
    qbr: {} as BaseServices['qbr'],
    budget: {} as BaseServices['budget'],
    risk: {} as BaseServices['risk'],
    metrics: {} as BaseServices['metrics'],
    documents: {} as BaseServices['documents'],
    forms: {} as BaseServices['forms'],
    news: {} as BaseServices['news'],
    actions: {} as BaseServices['actions'],
    activity: {} as BaseServices['activity'],
    backlogIntelligence: {} as BaseServices['backlogIntelligence'],
  };

  return { base, persons, deviceList };
}

/** Flush pending microtasks (promise chains) without advancing real timers. */
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('drilldownCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // The cache is module-scoped; drop any tenant state left over from a
    // previous test so each test starts cold.
    installDrilldownCache(buildFakeBase().base).prefetch.invalidate();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds persons and devices from list()', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    await services.people.list(TENANT, { pageSize: 200 });
    await services.devices.list(TENANT, { pageSize: 200 });

    const personSnapshot = services.prefetch.peekPersonDrilldown(TENANT, 'p1');
    expect(personSnapshot?.person.id).toBe('p1');
    const deviceSnapshot = services.prefetch.peekDeviceDrilldown(TENANT, 'd1');
    expect(deviceSnapshot?.device.id).toBe('d1');
  });

  it('serves people.get (enriched or not) and devices.get from the seeded cache with zero underlying calls', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    await services.people.list(TENANT, { pageSize: 200 });
    await services.devices.list(TENANT, { pageSize: 200 });
    vi.mocked(base.people.get).mockClear();
    vi.mocked(base.devices.get).mockClear();

    const p1 = await services.people.get(TENANT, 'p1', { enrich: true });
    const p1NoEnrich = await services.people.get(TENANT, 'p1', { enrich: false });
    const d1 = await services.devices.get(TENANT, 'd1');

    expect(p1?.id).toBe('p1');
    expect(p1NoEnrich?.id).toBe('p1');
    expect(d1?.id).toBe('d1');
    expect(base.people.get).not.toHaveBeenCalled();
    expect(base.devices.get).not.toHaveBeenCalled();
  });

  it('serves listForPerson from one warmed devices.list call shared across people', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    const [forP1, forP1Again, forP2] = await Promise.all([
      services.devices.listForPerson(TENANT, 'p1'),
      services.devices.listForPerson(TENANT, 'p1'),
      services.devices.listForPerson(TENANT, 'p2'),
    ]);

    expect(forP1.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(forP1Again.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(forP2.map((d) => d.id)).toEqual(['d3']);
    // The three concurrent misses dedupe onto a single underlying devices.list call.
    expect(base.devices.list).toHaveBeenCalledTimes(1);
  });

  it('warmPeopleDrilldowns resolves M365 licenses only for unresolved-SKU persons, bounded at 5', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    await services.people.list(TENANT, { pageSize: 200 });
    services.prefetch.warmPeopleDrilldowns(TENANT);
    await flushMicrotasks();

    // p1 and p3 have unresolved SKUs; p2 does not.
    expect(base.people.resolveM365Licenses).toHaveBeenCalledTimes(2);
    expect(base.people.resolveM365Licenses).toHaveBeenCalledWith(TENANT, 'p1');
    expect(base.people.resolveM365Licenses).toHaveBeenCalledWith(TENANT, 'p3');
    expect(base.people.resolveM365Licenses).not.toHaveBeenCalledWith(TENANT, 'p2');
  });

  it('warmPeopleDrilldowns never runs more than 5 resolveM365Licenses calls concurrently', async () => {
    vi.useRealTimers();
    const { base } = buildFakeBase();
    // 8 unresolved-SKU persons — well over the concurrency-5 bound.
    const persons = Array.from({ length: 8 }, (_, i) =>
      makePerson({ id: `bulk-${i}`, m365UnresolvedSkuIds: ['sku'] })
    );
    base.people.list = vi.fn(async () => page(persons));
    let live = 0;
    let peak = 0;
    base.people.resolveM365Licenses = vi.fn(async () => {
      live++;
      peak = Math.max(peak, live);
      await new Promise((resolve) => setTimeout(resolve, 5));
      live--;
      return [];
    });
    const services = installDrilldownCache(base);
    await services.people.list(TENANT, { pageSize: 200 });
    services.prefetch.warmPeopleDrilldowns(TENANT);
    // Wait for the warm to fully settle.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(base.people.resolveM365Licenses).toHaveBeenCalledTimes(persons.length);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it('warmDeviceDrilldowns calls getDetail once per warmed device, bounded at 4', async () => {
    vi.useRealTimers();
    const { base } = buildFakeBase();
    const deviceList = Array.from({ length: 10 }, (_, i) => makeDevice({ id: `bulk-d${i}` }));
    base.devices.list = vi.fn(async () => page(deviceList));
    let live = 0;
    let peak = 0;
    base.devices.getDetail = vi.fn(async (_t: string, id: string) => {
      live++;
      peak = Math.max(peak, live);
      await new Promise((resolve) => setTimeout(resolve, 5));
      live--;
      return { deviceId: id, source: 'ninjarmm' as const };
    });
    const services = installDrilldownCache(base);

    services.prefetch.warmDeviceDrilldowns(TENANT);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(base.devices.getDetail).toHaveBeenCalledTimes(deviceList.length);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('re-issues a live fetch after TTL expiry', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    await services.people.list(TENANT, { pageSize: 200 });
    expect(services.prefetch.peekPersonDrilldown(TENANT, 'p1')).toBeDefined();

    vi.advanceTimersByTime(5 * 60_000 + 1);

    expect(services.prefetch.peekPersonDrilldown(TENANT, 'p1')).toBeUndefined();

    await services.people.get(TENANT, 'p1', { enrich: true });
    expect(base.people.get).toHaveBeenCalledWith(TENANT, 'p1', { enrich: true });
  });

  it('invalidate() clears the cache for a tenant', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    await services.people.list(TENANT, { pageSize: 200 });
    expect(services.prefetch.peekPersonDrilldown(TENANT, 'p1')).toBeDefined();

    services.prefetch.invalidate(TENANT);

    expect(services.prefetch.peekPersonDrilldown(TENANT, 'p1')).toBeUndefined();
  });

  it('peek* returns undefined for a cold tenant and a snapshot on a hit', async () => {
    const { base } = buildFakeBase();
    const services = installDrilldownCache(base);

    expect(services.prefetch.peekPersonDrilldown(TENANT, 'p1')).toBeUndefined();
    expect(services.prefetch.peekDeviceDrilldown(TENANT, 'd1')).toBeUndefined();

    await services.people.list(TENANT, { pageSize: 200 });
    await services.devices.list(TENANT, { pageSize: 200 });

    expect(services.prefetch.peekPersonDrilldown(TENANT, 'p1')).toMatchObject({
      person: { id: 'p1' },
    });
    expect(services.prefetch.peekDeviceDrilldown(TENANT, 'd1')).toMatchObject({
      device: { id: 'd1' },
      owner: { id: 'p1' },
      detail: undefined,
    });
  });
});
