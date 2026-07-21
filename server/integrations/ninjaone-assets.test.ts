import { describe, expect, it, vi } from 'vitest';
import type { ServerEnv } from '../config/env';
import { NinjaOneClient, ninjaAssetType, normalizeNinjaAsset } from './ninjaone';

const config: NonNullable<ServerEnv['ninjaOne']> = {
  baseUrl: 'https://ninja.test',
  tokenUrl: 'https://ninja.test/ws/oauth/token',
  clientId: 'client',
  clientSecret: 'secret',
};

const nodeClassCases = [
  ['WINDOWS_SERVER', 'Server'],
  ['LINUX_SERVER', 'Server'],
  ['MAC_SERVER', 'Server'],
  ['NMS_SERVER', 'Server'],
  ['WINDOWS_WORKSTATION', 'Workstation'],
  ['LINUX_WORKSTATION', 'Workstation'],
  ['MAC', 'Workstation'],
  ['NMS_COMPUTER', 'Workstation'],
  ['MANAGED_DEVICE', 'Managed Device'],
  ['ANDROID', 'Mobile'],
  ['APPLE_IOS', 'Mobile'],
  ['NMS_PHONE', 'Mobile'],
  ['APPLE_IPADOS', 'Tablet'],
  ['VMWARE_VM_HOST', 'Virtualization Host'],
  ['HYPERV_VMM_HOST', 'Virtualization Host'],
  ['NMS_VM_HOST', 'Virtualization Host'],
  ['VMWARE_VM_GUEST', 'Virtual Machine'],
  ['HYPERV_VMM_GUEST', 'Virtual Machine'],
  ['NMS_VIRTUAL_MACHINE', 'Virtual Machine'],
  ['CLOUD_MONITOR_TARGET', 'Cloud Monitor'],
  ['NMS_SWITCH', 'Switch'],
  ['NMS_ROUTER', 'Router'],
  ['NMS_FIREWALL', 'Firewall'],
  ['NMS_PRIVATE_NETWORK_GATEWAY', 'Network Gateway'],
  ['NMS_PRINTER', 'Printer'],
  ['NMS_SCANNER', 'Scanner'],
  ['NMS_DIAL_MANAGER', 'Dial Manager'],
  ['NMS_WAP', 'Wireless Access Point'],
  ['NMS_IPSLA', 'Network Monitor'],
  ['NMS_APPLIANCE', 'Network Appliance'],
  ['NMS_OTHER', 'Other'],
  ['NMS_NETWORK_MANAGEMENT_AGENT', 'Network Management Agent'],
  ['UNMANAGED_DEVICE', 'Unmanaged Device'],
] as const;

describe('NinjaOne asset normalization', () => {
  it.each(nodeClassCases)('maps %s to %s', (nodeClass, expected) => {
    expect(ninjaAssetType(nodeClass)).toBe(expected);
  });

  it('normalizes identifiers, metadata, and documented epoch-second warranty dates', () => {
    expect(normalizeNinjaAsset('brightwater', {
      id: 500,
      displayName: 'BW-LAPTOP-01',
      nodeClass: 'WINDOWS_WORKSTATION',
      system: { model: 'Latitude 7440' },
      references: { warranty: { startDate: 1_700_000_000, endDate: 1_800_000_000 } },
    })).toEqual({
      id: 'ninja-device-500',
      tenantId: 'brightwater',
      name: 'BW-LAPTOP-01',
      category: 'hardware',
      type: 'Workstation',
      status: 'in-service',
      model: 'Latitude 7440',
      warrantyStart: new Date(1_700_000_000_000).toISOString(),
      warrantyEnd: new Date(1_800_000_000_000).toISOString(),
    });
  });

  it('tolerates millisecond dates and falls back through documented device names', () => {
    expect(normalizeNinjaAsset('brightwater', {
      id: 501,
      systemName: 'SYSTEM-501',
    }, {
      deviceId: 501,
      fields: { warrantyStartDate: '1700000000000', warrantyEndDate: 1_800_000_000_000 },
    })).toMatchObject({
      id: 'ninja-device-501',
      name: 'SYSTEM-501',
      type: 'Device',
      status: 'in-service',
      model: '',
      warrantyStart: new Date(1_700_000_000_000).toISOString(),
      warrantyEnd: new Date(1_800_000_000_000).toISOString(),
    });
    expect(normalizeNinjaAsset('brightwater', { id: 502, dnsName: 'dns-502' })?.name).toBe('dns-502');
    expect(normalizeNinjaAsset('brightwater', { id: 503, netbiosName: 'NETBIOS-503' })?.name).toBe('NETBIOS-503');
    expect(normalizeNinjaAsset('brightwater', { id: 504 })?.name).toBe('Ninja device 504');
  });

  it('omits unavailable dates and rejects malformed identifiers', () => {
    expect(normalizeNinjaAsset('brightwater', { id: 505 })).not.toHaveProperty('warrantyEnd');
    expect(normalizeNinjaAsset('brightwater', { id: 506, references: { warranty: { endDate: Number.MAX_VALUE } } })).not.toHaveProperty('warrantyEnd');
    expect(normalizeNinjaAsset('brightwater', { id: '505' })).toBeNull();
    expect(normalizeNinjaAsset('brightwater', { id: 505.5 })).toBeNull();
    expect(normalizeNinjaAsset('brightwater', { id: 0 })).toBeNull();
  });
});

describe('NinjaOne asset inventory request', () => {
  it('uses the organization filter and paginates with the last device ID', async () => {
    const requests: URL[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requests.push(url);
      if (url.pathname === '/ws/oauth/token') {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }));
      }
      if (url.pathname === '/v2/devices-detailed') {
        const after = url.searchParams.get('after');
        const rows = after === null
          ? Array.from({ length: 1000 }, (_, index) => ({ id: index + 1 }))
          : [{ id: 1001 }];
        return new Response(JSON.stringify(rows));
      }
      return new Response('{}', { status: 500 });
    }) as typeof fetch;

    const rows = await new NinjaOneClient(config, fetchImpl).listDevices(77);
    const pages = requests.filter((url) => url.pathname === '/v2/devices-detailed');

    expect(rows).toHaveLength(1001);
    expect(pages).toHaveLength(2);
    expect(pages[0].searchParams.get('df')).toBe('org = 77');
    expect(pages[0].searchParams.get('pageSize')).toBe('1000');
    expect(pages[0].searchParams.has('after')).toBe(false);
    expect(pages[1].searchParams.get('after')).toBe('1000');
  });

  it('loads organization-scoped custom fields for warranty enrichment', async () => {
    const requests: URL[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requests.push(url);
      if (url.pathname === '/ws/oauth/token') {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }));
      }
      if (url.pathname === '/v2/queries/custom-fields') {
        return new Response(JSON.stringify({
          results: [{ deviceId: 500, fields: { warrantyEndDate: 1_800_000_000_000 } }],
        }));
      }
      return new Response('{}', { status: 500 });
    }) as typeof fetch;

    const rows = await new NinjaOneClient(config, fetchImpl).listDeviceCustomFields(77);
    const request = requests.find((url) => url.pathname === '/v2/queries/custom-fields');

    expect(rows).toEqual([{ deviceId: 500, fields: { warrantyEndDate: 1_800_000_000_000 } }]);
    expect(request?.searchParams.get('df')).toBe('org = 77');
    expect(request?.searchParams.get('pageSize')).toBe('1000');
  });
});
