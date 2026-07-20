import { describe, expect, it } from 'vitest';
import { mockLicenseService } from './licenses';
import { getSeed } from '@/data/index';

describe('mockLicenseService', () => {
  const seed = getSeed('brightwater');

  it('listForPerson returns the License rows referenced by a person\'s licenseIds', async () => {
    const person = seed.people.find((p) => p.licenseIds.length > 0);
    expect(person).toBeDefined();

    const result = await mockLicenseService.listForPerson('brightwater', person!.id);
    expect(result.map((l) => l.id).sort()).toEqual([...person!.licenseIds].sort());
  });

  it('listForPerson returns [] for an unknown person', async () => {
    const result = await mockLicenseService.listForPerson('brightwater', 'nonexistent-person');
    expect(result).toEqual([]);
  });

  it("list embeds assignedUsers with every person whose licenseIds include the license (inverse of listForPerson)", async () => {
    const targetLicense = seed.licenses.find((l) =>
      seed.people.some((p) => p.licenseIds.includes(l.id))
    );
    expect(targetLicense).toBeDefined();

    const expectedPeople = seed.people.filter((p) => p.licenseIds.includes(targetLicense!.id));
    const page = await mockLicenseService.list('brightwater', { pageSize: 500 });
    const license = page.data.find((l) => l.id === targetLicense!.id);
    expect(license).toBeDefined();

    const result = license!.assignedUsers ?? [];
    expect(result).toHaveLength(expectedPeople.length);
    expect(result.map((u) => u.personId).sort()).toEqual(expectedPeople.map((p) => p.id).sort());
    for (const u of result) {
      const person = expectedPeople.find((p) => p.id === u.personId);
      expect(person).toBeDefined();
      expect(u.name).toBe(person!.name);
      expect(u.email).toBe(person!.email);
      expect(u.department).toBe(person!.department);
    }
  });

  it('list embeds an empty assignedUsers array for a license nobody holds', async () => {
    // brightwater's seed licenses are all held by someone; cedarvine has a
    // couple that aren't (verified against the seed).
    const cedarvineSeed = getSeed('cedarvine');
    const targetLicense = cedarvineSeed.licenses.find(
      (l) => !cedarvineSeed.people.some((p) => p.licenseIds.includes(l.id))
    );
    expect(targetLicense).toBeDefined();

    const page = await mockLicenseService.list('cedarvine', { pageSize: 500 });
    const license = page.data.find((l) => l.id === targetLicense!.id);
    expect(license?.assignedUsers).toEqual([]);
  });
});
