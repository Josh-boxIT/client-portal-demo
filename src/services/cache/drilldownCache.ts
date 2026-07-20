import type {
  Services,
  Person,
  Device,
  DeviceDetail,
  License,
  PrefetchController,
  PersonDrilldownSnapshot,
  DeviceDrilldownSnapshot,
} from '../types';
import { runPool, createInflight } from './asyncPool';

// ─── Client-side drilldown cache ──────────────────────────────────────────────
//
// Transparent decorator over `people`/`devices`/`licenses`: the People &
// Devices list already downloads fully-enriched Person/Device objects, so
// this seeds an id-keyed, per-tenant, TTL'd cache from those lists and serves
// `get`/`getDetail`/`listForPerson`/`resolveM365Licenses` from it — for free
// on a hit, deduped + live on a miss. A cache MISS behaves exactly like the
// unwrapped service. See docs/plans for the full design.

/** Matches the server's CIPP/CW cache TTL so the client never outlives it. */
const TTL_MS = 5 * 60_000;

/** Cap on distinct tenant entries kept resident at once (simple LRU by recency). */
const MAX_TENANTS = 3;

interface TenantDrilldown {
  createdAt: number;
  persons: Map<string, Person>; // seeded from people.list (enriched)
  m365Resolved: Map<string, string[]>; // resolveM365Licenses results, by personId
  licensesByPerson: Map<string, License[]>;
  devicesById: Map<string, Device>; // seeded from devices.list
  devicesByOwner: Map<string, Device[]>; // grouped from devices.list
  deviceDetails: Map<string, DeviceDetail | null>; // devices.getDetail (Ninja)
  peopleWarmed: boolean;
  devicesWarmed: boolean;
  /** Guards against a concurrent double-run of the same warm for this tenant. */
  peopleWarming: boolean;
  devicesWarming: boolean;
}

function createEntry(): TenantDrilldown {
  return {
    createdAt: Date.now(),
    persons: new Map(),
    m365Resolved: new Map(),
    licensesByPerson: new Map(),
    devicesById: new Map(),
    devicesByOwner: new Map(),
    deviceDetails: new Map(),
    peopleWarmed: false,
    devicesWarmed: false,
    peopleWarming: false,
    devicesWarming: false,
  };
}

// Module-level per-tenant cache + a single shared in-flight dedup map.
const tenants = new Map<string, TenantDrilldown>();
const inflight = createInflight();

/** Bump `tenantId` to most-recently-used and evict past `MAX_TENANTS`. */
function touchLru(tenantId: string): void {
  const entry = tenants.get(tenantId);
  if (!entry) return;
  tenants.delete(tenantId);
  tenants.set(tenantId, entry);
  while (tenants.size > MAX_TENANTS) {
    const oldestKey = tenants.keys().next().value;
    if (oldestKey === undefined) break;
    tenants.delete(oldestKey);
  }
}

/** Return the tenant's entry if it's within TTL, evicting (and returning undefined) if stale. */
function getFresh(tenantId: string): TenantDrilldown | undefined {
  const entry = tenants.get(tenantId);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > TTL_MS) {
    tenants.delete(tenantId);
    return undefined;
  }
  touchLru(tenantId);
  return entry;
}

/** Return the tenant's fresh entry, creating a new one if missing/expired. */
function getOrCreate(tenantId: string): TenantDrilldown {
  const fresh = getFresh(tenantId);
  if (fresh) return fresh;
  const entry = createEntry();
  tenants.set(tenantId, entry);
  touchLru(tenantId);
  return entry;
}

function groupByOwner(devices: Device[]): Map<string, Device[]> {
  const byOwner = new Map<string, Device[]>();
  for (const d of devices) {
    if (!d.owner) continue;
    const list = byOwner.get(d.owner);
    if (list) list.push(d);
    else byOwner.set(d.owner, [d]);
  }
  return byOwner;
}

/** The pre-wrap service bundle: everything `buildServices()` assembles, minus `prefetch`. */
export type BaseServices = Omit<Services, 'prefetch'>;

/**
 * Wrap `base` with the transparent drilldown cache + a `prefetch` controller.
 * Returns a shallow clone of `base` — every other service domain is untouched.
 */
export function installDrilldownCache(base: BaseServices): Services {
  const { people, devices, licenses } = base;

  const cachedPeople: Services['people'] = {
    async list(tenantId, params) {
      const page = await people.list(tenantId, params);
      const entry = getOrCreate(tenantId);
      for (const p of page.data) entry.persons.set(p.id, p);
      entry.peopleWarmed = true;
      return page;
    },
    async get(tenantId, id, opts) {
      const fresh = getFresh(tenantId);
      const cached = fresh?.persons.get(id);
      // The enriched object (from the list, or a prior enrich:true fetch) is a
      // strict superset — safe to serve for either `enrich` value.
      if (cached) return cached;
      const key = `people.get:${tenantId}:${id}:${opts?.enrich !== false}`;
      const result = await inflight.dedupe(key, () => people.get(tenantId, id, opts));
      if (result && opts?.enrich !== false) {
        getOrCreate(tenantId).persons.set(id, result);
      }
      return result;
    },
    async resolveM365Licenses(tenantId, id) {
      const fresh = getFresh(tenantId);
      const cached = fresh?.m365Resolved.get(id);
      if (cached) return cached;
      const key = `people.resolveM365:${tenantId}:${id}`;
      const names = await inflight.dedupe(key, () => people.resolveM365Licenses(tenantId, id));
      getOrCreate(tenantId).m365Resolved.set(id, names);
      return names;
    },
  };

  const cachedDevices: Services['devices'] = {
    async list(tenantId, params) {
      const page = await devices.list(tenantId, params);
      const entry = getOrCreate(tenantId);
      for (const d of page.data) entry.devicesById.set(d.id, d);
      entry.devicesByOwner = groupByOwner(page.data);
      entry.devicesWarmed = true;
      return page;
    },
    async get(tenantId, id) {
      const fresh = getFresh(tenantId);
      const cached = fresh?.devicesById.get(id);
      if (cached) return cached;
      const key = `devices.get:${tenantId}:${id}`;
      const result = await inflight.dedupe(key, () => devices.get(tenantId, id));
      if (result) getOrCreate(tenantId).devicesById.set(id, result);
      return result;
    },
    async getDetail(tenantId, id) {
      const fresh = getFresh(tenantId);
      if (fresh?.deviceDetails.has(id)) return fresh.deviceDetails.get(id) ?? null;
      const key = `devices.getDetail:${tenantId}:${id}`;
      const result = await inflight.dedupe(key, () => devices.getDetail(tenantId, id));
      getOrCreate(tenantId).deviceDetails.set(id, result);
      return result;
    },
    async listForPerson(tenantId, personId) {
      const fresh = getFresh(tenantId);
      if (fresh?.devicesWarmed) return fresh.devicesByOwner.get(personId) ?? [];
      // Miss: dedupe a single warmed devices.list fetch (shared across all callers).
      const key = `devices.list:${tenantId}`;
      const page = await inflight.dedupe(key, () => devices.list(tenantId, { pageSize: 200 }));
      const entry = getOrCreate(tenantId);
      for (const d of page.data) entry.devicesById.set(d.id, d);
      entry.devicesByOwner = groupByOwner(page.data);
      entry.devicesWarmed = true;
      return entry.devicesByOwner.get(personId) ?? [];
    },
    // Always-live refresh — intentionally never cached, and never updates the
    // drill-down cache: the drill-down page merges the result onto its own
    // state directly.
    getLiveTelemetry(tenantId, id) {
      return devices.getLiveTelemetry(tenantId, id);
    },
  };

  const cachedLicenses: Services['licenses'] = {
    list: licenses.list,
    async listForPerson(tenantId, personId) {
      const fresh = getFresh(tenantId);
      const cached = fresh?.licensesByPerson.get(personId);
      if (cached) return cached;
      const key = `licenses.listForPerson:${tenantId}:${personId}`;
      const result = await inflight.dedupe(key, () => licenses.listForPerson(tenantId, personId));
      getOrCreate(tenantId).licensesByPerson.set(personId, result);
      return result;
    },
  };

  const prefetch: PrefetchController = {
    warmPeopleDrilldowns(tenantId) {
      const entry = getOrCreate(tenantId);
      if (entry.peopleWarming) return;
      entry.peopleWarming = true;
      void (async () => {
        try {
          // Warm the shared devices list once (also feeds `listForPerson` hits).
          if (!getFresh(tenantId)?.devicesWarmed) {
            await cachedDevices.list(tenantId, { pageSize: 200 });
          }
          const persons = Array.from(getOrCreate(tenantId).persons.values());
          const withUnresolvedSkus = persons.filter(
            (p) => (p.m365UnresolvedSkuIds?.length ?? 0) > 0
          );
          await runPool(
            withUnresolvedSkus,
            async (p) => {
              await cachedPeople.resolveM365Licenses(tenantId, p.id);
            },
            5
          );
          await runPool(
            persons,
            async (p) => {
              await cachedLicenses.listForPerson(tenantId, p.id);
            },
            5
          );
        } catch (err) {
          console.error('[drilldownCache] warmPeopleDrilldowns failed', err);
        } finally {
          const current = getFresh(tenantId);
          if (current) current.peopleWarming = false;
        }
      })();
    },

    warmDeviceDrilldowns(tenantId) {
      const entry = getOrCreate(tenantId);
      if (entry.devicesWarming) return;
      entry.devicesWarming = true;
      void (async () => {
        try {
          if (!getFresh(tenantId)?.devicesWarmed) {
            await cachedDevices.list(tenantId, { pageSize: 200 });
          }
          const deviceList = Array.from(getOrCreate(tenantId).devicesById.values());
          await runPool(
            deviceList,
            async (d) => {
              await cachedDevices.getDetail(tenantId, d.id);
            },
            4
          );
        } catch (err) {
          console.error('[drilldownCache] warmDeviceDrilldowns failed', err);
        } finally {
          const current = getFresh(tenantId);
          if (current) current.devicesWarming = false;
        }
      })();
    },

    peekPersonDrilldown(tenantId, id): PersonDrilldownSnapshot | undefined {
      const fresh = getFresh(tenantId);
      const person = fresh?.persons.get(id);
      if (!fresh || !person) return undefined;
      return {
        person,
        devices: fresh.devicesByOwner.get(id) ?? [],
        licenses: fresh.licensesByPerson.get(id) ?? [],
        m365ExtraLicenses: fresh.m365Resolved.get(id) ?? [],
      };
    },

    peekDeviceDrilldown(tenantId, id): DeviceDrilldownSnapshot | undefined {
      const fresh = getFresh(tenantId);
      const device = fresh?.devicesById.get(id);
      if (!fresh || !device) return undefined;
      const owner = device.owner ? fresh.persons.get(device.owner) ?? null : null;
      // `undefined` (key absent) means "not warmed yet" — caller should still
      // lazy-fetch; `null` means "fetched, no detail available".
      const detail = fresh.deviceDetails.has(device.id)
        ? (fresh.deviceDetails.get(device.id) ?? null)
        : undefined;
      return { device, owner, detail };
    },

    invalidate(tenantId) {
      if (tenantId) tenants.delete(tenantId);
      else tenants.clear();
    },
  };

  return {
    ...base,
    people: cachedPeople,
    devices: cachedDevices,
    licenses: cachedLicenses,
    prefetch,
  };
}
