import { getSeed } from '@/data/index';
import type { Device, DeviceDetail, DeviceService, ListParams, Page } from '../types';
import { paginate, withLatency } from './util';

/** Stable, non-negative hash of a string — used to derive deterministic fake values from device.id. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const WARRANTY_BASE = '2023-01-15T00:00:00.000Z';
const WARRANTY_YEARS = 3;

function octet(seed: number, salt: number): number {
  return (seed + salt * 37) % 255;
}

function fakeMac(seed: number, salt: number): string {
  const bytes = [0x00, 0x1a, 0x2b].concat([
    octet(seed, salt + 1),
    octet(seed, salt + 2),
    octet(seed, salt + 3),
  ]);
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

/** Build a deterministic, fully-populated DeviceDetail from a seed device (no Math.random/Date.now). */
function buildMockDetail(device: Device): DeviceDetail {
  const seed = hashString(device.id);
  const isMac = /mac/i.test(device.os);
  const isServer = device.type === 'server';
  const subnet = 10 + (seed % 20);
  const host = 20 + (seed % 200);

  const localIp = `10.${subnet}.1.${host}`;
  const publicIp = `203.0.${(seed % 200) + 1}.${(seed % 250) + 1}`;
  const gateway = `10.${subnet}.1.1`;
  const dnsServers = [`10.${subnet}.0.10`, '1.1.1.1'];

  const ramBytes = isServer ? 68_719_476_736 : seed % 2 === 0 ? 17_179_869_184 : 8_589_934_592;
  const cpuArch = isMac ? 'ARM64' : 'x64';

  const warrantyStart = new Date(WARRANTY_BASE);
  warrantyStart.setUTCDate(warrantyStart.getUTCDate() + (seed % 365));
  const warrantyEnd = new Date(warrantyStart);
  warrantyEnd.setUTCFullYear(warrantyEnd.getUTCFullYear() + WARRANTY_YEARS);

  const domain = isMac ? 'WORKGROUP' : isServer ? 'brightwater.local' : 'CORP';
  const domainRole = isServer ? 'MEMBER_SERVER' : 'MEMBER_WORKSTATION';

  const volumes: DeviceDetail['volumes'] = [
    {
      name: 'C:',
      driveLetter: 'C:',
      label: isMac ? 'Macintosh HD' : 'Windows',
      fileSystem: isMac ? 'APFS' : 'NTFS',
      capacityBytes: 512_110_190_592,
      freeBytes: 128_849_018_880 + (seed % 40_000_000_000),
      bitLocker: isMac
        ? undefined
        : { protectionStatus: 'PROTECTED', conversionStatus: 'FULLY_ENCRYPTED', encryptionMethod: 'XTS_AES_256' },
    },
    {
      name: 'D:',
      driveLetter: isMac ? undefined : 'D:',
      label: 'Data',
      fileSystem: isMac ? 'APFS' : 'NTFS',
      capacityBytes: 1_024_209_543_168,
      freeBytes: 512_104_771_584,
      bitLocker: isMac ? undefined : { protectionStatus: 'UNPROTECTED', conversionStatus: 'FULLY_DECRYPTED', encryptionMethod: 'NONE' },
    },
  ];
  if (isServer) {
    volumes.push({
      name: 'E:',
      driveLetter: 'E:',
      label: 'Backups',
      fileSystem: 'NTFS',
      capacityBytes: 2_199_023_255_552,
      freeBytes: 879_609_302_220,
      bitLocker: { protectionStatus: 'PROTECTED', conversionStatus: 'FULLY_ENCRYPTED', encryptionMethod: 'XTS_AES_256' },
    });
  }

  const disks: DeviceDetail['disks'] = [
    {
      model: isMac ? 'Apple SSD AP0512' : 'Samsung SSD 970 EVO Plus 500GB',
      manufacturer: isMac ? 'Apple' : 'Samsung',
      interfaceType: 'NVMe',
      mediaType: 'SSD',
      sizeBytes: 512_110_190_592,
      smartStatus: 'OK',
    },
  ];
  if (isServer) {
    disks.push({
      model: 'Seagate Exos X18 16TB',
      manufacturer: 'Seagate',
      interfaceType: 'SAS',
      mediaType: 'HDD',
      sizeBytes: 16_000_900_000_000,
      smartStatus: 'OK',
    });
  }

  const networkAdapters: DeviceDetail['networkAdapters'] = [
    {
      name: isMac ? 'Wi-Fi' : 'Ethernet',
      type: isMac ? 'Wireless' : 'Ethernet',
      status: 'UP',
      ipAddresses: [localIp],
      macAddresses: [fakeMac(seed, 1)],
      gateway,
      dnsServers,
    },
  ];
  if (!isServer) {
    networkAdapters.push({
      name: isMac ? 'Ethernet Adapter' : 'Wi-Fi',
      type: isMac ? 'Ethernet' : 'Wireless',
      status: 'DOWN',
      ipAddresses: [],
      macAddresses: [fakeMac(seed, 2)],
      gateway: undefined,
      dnsServers: [],
    });
  }

  const avInstalled = seed % 5 === 0 ? 'No' : 'Yes';
  const azureAdJoined = isMac ? 'No' : seed % 3 === 0 ? 'No' : 'Yes';
  const domainJoinStatus = isMac ? 'Not Joined' : 'Joined';
  const publicFirewallActive = seed % 7 === 0 ? 'Inactive' : 'Active';
  const domainFirewallActive = seed % 11 === 0 ? 'Inactive' : 'Active';
  const privateFirewallActive = seed % 9 === 0 ? 'Inactive' : 'Active';

  return {
    deviceId: device.id,
    source: 'ninjarmm',
    processors: [
      {
        name: isMac ? 'Apple M2 Pro' : 'Intel(R) Core(TM) i7-1265U',
        architecture: cpuArch,
        cores: isServer ? 16 : 10,
        logicalCores: isServer ? 32 : 12,
        clockSpeedHz: 2_600_000_000,
      },
    ],
    cpuArchitecture: cpuArch,
    ramBytes,
    volumes,
    disks,
    networkAdapters,
    localIps: [localIp],
    publicIp,
    domain,
    domainRole,
    timezone: 'America/New_York',
    warranty: { startDate: warrantyStart.toISOString(), endDate: warrantyEnd.toISOString() },
    customFields: {
      boxitAvInstalled: avInstalled,
      azureAdJoined,
      domainJoinStatus,
      cpuArchitecture: cpuArch,
      publicFirewallEnabled: publicFirewallActive === 'Active' ? 'Yes' : 'No',
      domainFirewallEnabled: domainFirewallActive === 'Active' ? 'Yes' : 'No',
      privateFirewallEnabled: privateFirewallActive === 'Active' ? 'Yes' : 'No',
    },
    boxit: {
      avInstalled,
      azureAdJoined,
      domainJoinStatus,
      cpuArchitecture: cpuArch,
      publicFirewallEnabled: publicFirewallActive,
      domainFirewallEnabled: domainFirewallActive,
      privateFirewallEnabled: privateFirewallActive,
    },
    location: {
      site: isServer ? 'Data Center' : 'HQ',
      address: `${100 + (seed % 900)} Main St`,
      city: isMac ? 'Portland' : 'Chicago',
      state: isMac ? 'OR' : 'IL',
      postalCode: `${60000 + (seed % 9999)}`,
      floor: `${1 + (seed % 5)}`,
      room: `${100 + (seed % 40)}`,
    },
  };
}

export const mockDeviceService: DeviceService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Device>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.devices as unknown as Record<string, unknown>[], params) as unknown as Page<Device>);
  },

  async get(tenantId: string, id: string): Promise<Device | null> {
    const seed = getSeed(tenantId);
    const device = seed.devices.find((d) => d.id === id) ?? null;
    return withLatency(device);
  },

  async listForPerson(tenantId: string, personId: string): Promise<Device[]> {
    const seed = getSeed(tenantId);
    const person = seed.people.find((p) => p.id === personId);
    if (!person) return withLatency([]);
    const devices = seed.devices.filter((d) => person.deviceIds.includes(d.id));
    return withLatency(devices);
  },

  async getDetail(tenantId: string, id: string): Promise<DeviceDetail | null> {
    const seed = getSeed(tenantId);
    const device = seed.devices.find((d) => d.id === id);
    if (!device) return withLatency(null);
    return withLatency(buildMockDetail(device));
  },

  async getLiveTelemetry(tenantId: string, id: string): Promise<Device | null> {
    const seed = getSeed(tenantId);
    const device = seed.devices.find((d) => d.id === id) ?? null;
    return withLatency(device);
  },
};
