import { getSeed } from '@/data/index';
import type { PeopleService, Page, ListParams, Person } from '../types';
import { withLatency, paginate } from './util';

export const mockPeopleService: PeopleService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Person>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.people as unknown as Record<string, unknown>[], params) as unknown as Page<Person>);
  },

  async get(tenantId: string, id: string, opts?: { enrich?: boolean }): Promise<Person | null> {
    const seed = getSeed(tenantId);
    const person = seed.people.find((p) => p.id === id) ?? null;
    if (opts?.enrich === false) {
      if (!person) return withLatency(person);
      // Simulate a CW-only fetch: strip the CIPP/M365 enrichment fields.
      const cwOnly: Person = { ...person };
      delete cwOnly.userPrincipalName;
      delete cwOnly.accountEnabled;
      delete cwOnly.mfaStatus;
      delete cwOnly.lastSignIn;
      delete cwOnly.m365Licenses;
      delete cwOnly.m365UnresolvedSkuIds;
      delete cwOnly.m365Groups;
      delete cwOnly.enrichedBy;
      delete cwOnly.accountClass;
      return withLatency(cwOnly);
    }
    // Default (enriched): simulate the slower CIPP-backed path so the
    // drill-down's M365 skeletons are actually visible in dev.
    if (person) await new Promise((resolve) => setTimeout(resolve, 600));
    return withLatency(person);
  },

  resolveM365Licenses(): Promise<string[]> {
    return Promise.resolve([]);
  },
};
