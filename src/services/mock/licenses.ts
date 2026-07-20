import { getSeed } from '@/data/index';
import type { LicenseService, Page, ListParams, License, LicenseAssignedUser } from '../types';
import { withLatency, paginate } from './util';

function assignedUsersFor(seed: ReturnType<typeof getSeed>, licenseId: string): LicenseAssignedUser[] {
  return seed.people
    .filter((p) => p.licenseIds.includes(licenseId))
    .map((p): LicenseAssignedUser => ({
      personId: p.id,
      name: p.name,
      email: p.email,
      department: p.department,
    }));
}

export const mockLicenseService: LicenseService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<License>> {
    const seed = getSeed(tenantId);
    const withUsers = seed.licenses.map((l): License => ({ ...l, assignedUsers: assignedUsersFor(seed, l.id) }));
    return withLatency(paginate(withUsers as unknown as Record<string, unknown>[], params) as unknown as Page<License>);
  },

  async listForPerson(tenantId: string, personId: string): Promise<License[]> {
    const seed = getSeed(tenantId);
    const person = seed.people.find((p) => p.id === personId);
    if (!person) return withLatency([]);
    const licenses = seed.licenses.filter((l) => person.licenseIds.includes(l.id));
    return withLatency(licenses);
  },
};
