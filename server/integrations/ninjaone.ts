import type { Device, DeviceDetail } from '@/services/types';
import type { ServerEnv } from '../config/env';

type JsonObject = Record<string, unknown>;
type FetchLike = typeof fetch;

function object(value: unknown): JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function epoch(value: unknown): string | undefined {
  const raw = number(value);
  if (raw === undefined) return undefined;
  return new Date(raw < 10_000_000_000 ? raw * 1000 : raw).toISOString();
}

/** NinjaOne device filters are URL encoded in the df parameter. */
export function ninjaOrganizationFilter(organizationId: number): string {
  return `org = ${organizationId}`;
}

export class NinjaOneClient {
  private token?: { value: string; expiresAt: number };

  constructor(
    private readonly config: NonNullable<ServerEnv['ninjaOne']>,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async listDevices(organizationId: number): Promise<JsonObject[]> {
    const rows: JsonObject[] = [];
    let after: number | undefined;
    for (;;) {
      const page = await this.getArray('/v2/devices-detailed', {
        df: ninjaOrganizationFilter(organizationId),
        pageSize: '1000',
        ...(after !== undefined ? { after: String(after) } : {}),
      });
      rows.push(...page);
      const lastId = number(page.at(-1)?.id);
      if (page.length < 1000 || lastId === undefined || lastId === after) return rows;
      after = lastId;
    }
  }

  async deviceDetail(deviceId: number): Promise<Record<string, JsonObject[]>> {
    const df = `id = ${deviceId}`;
    const paths = {
      computerSystems: '/v2/queries/computer-systems',
      processors: '/v2/queries/processors',
      volumes: '/v2/queries/volumes',
      disks: '/v2/queries/disks',
      networkInterfaces: '/v2/queries/network-interfaces',
      operatingSystems: '/v2/queries/operating-systems',
      loggedOnUsers: '/v2/queries/logged-on-users',
      customFields: '/v2/queries/custom-fields',
    } as const;
    const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [
      key,
      await this.getReport(path, { df, pageSize: '1000' }),
    ] as const));
    return Object.fromEntries(entries);
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'monitoring',
    });
    const response = await this.fetchImpl(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new Error(`NinjaOne token endpoint returned ${response.status}`);
    const payload = object(await response.json());
    const value = text(payload.access_token);
    if (!value) throw new Error('NinjaOne token response did not include access_token');
    this.token = { value, expiresAt: Date.now() + (number(payload.expires_in) ?? 3600) * 1000 };
    return value;
  }

  private async get(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`${this.config.baseUrl.replace(/\/$/, '')}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${await this.accessToken()}` },
    });
    if (!response.ok) throw new Error(`NinjaOne ${path} returned ${response.status}`);
    return response.json();
  }

  private async getArray(path: string, params: Record<string, string>): Promise<JsonObject[]> {
    const payload = await this.get(path, params);
    if (!Array.isArray(payload)) throw new Error(`NinjaOne ${path} returned a non-array response`);
    return payload.map(object);
  }

  private async getReport(path: string, params: Record<string, string>): Promise<JsonObject[]> {
    const rows: JsonObject[] = [];
    let cursor: string | undefined;
    for (;;) {
      const payload = object(await this.get(path, { ...params, ...(cursor ? { cursor } : {}) }));
      const page = Array.isArray(payload.results) ? payload.results.map(object) : [];
      rows.push(...page);
      const nextCursor = text(object(payload.cursor).name);
      if (page.length < Number(params.pageSize ?? 1000) || !nextCursor || nextCursor === cursor) return rows;
      cursor = nextCursor;
    }
  }
}

function deviceType(nodeClass: string, fallback: Device['type']): Device['type'] {
  if (/SERVER|VM_HOST/.test(nodeClass)) return 'server';
  if (/ANDROID|IOS|PHONE/.test(nodeClass)) return 'mobile';
  if (/IPAD|TABLET/.test(nodeClass)) return 'tablet';
  return fallback;
}

export function matchNinjaDevice(base: Device, candidates: JsonObject[]): JsonObject | undefined {
  const serial = base.serial.trim().toLowerCase();
  const name = base.name.trim().toLowerCase();
  return candidates.find((candidate) => {
    const refs = object(candidate.references);
    const serials = [candidate.serialNumber, refs.serialNumber, object(candidate.system).serialNumber]
      .map(text).filter(Boolean).map((value) => value.toLowerCase());
    return serial !== '' && serials.includes(serial);
  }) ?? candidates.find((candidate) =>
    [candidate.displayName, candidate.systemName, candidate.dnsName, candidate.netbiosName]
      .map(text).some((value) => value.toLowerCase() === name),
  );
}

export function enrichWithNinja(base: Device, row: JsonObject): Device {
  const online = row.offline !== true;
  const lastSeen = epoch(row.lastContact) ?? epoch(row.lastUpdate) ?? base.lastSeen;
  const nodeClass = text(row.nodeClass);
  const system = object(row.system);
  const memory = object(row.memory);
  return {
    ...base,
    type: nodeClass ? deviceType(nodeClass, base.type) : base.type,
    os: text(object(row.os).name) || text(row.osName) || text(row.operatingSystem) || base.os,
    status: online ? base.status === 'offline' ? 'healthy' : base.status : 'offline',
    compliant: online && base.compliant,
    lastSeen,
    online,
    ...(text(row.manufacturer) || text(system.manufacturer) ? { manufacturer: text(row.manufacturer) || text(system.manufacturer) } : {}),
    ...(text(row.model) || text(system.model) ? { model: text(row.model) || text(system.model) } : {}),
    ...(number(memory.capacity) !== undefined ? { hardware: { ramBytes: number(memory.capacity) } } : {}),
    ...(text(row.lastLoggedInUser) ? { lastLoggedIn: text(row.lastLoggedInUser) } : {}),
    lastSeenSource: 'ninjarmm',
    enrichedBy: 'ninjarmm',
  };
}

function first(rows: JsonObject[]): JsonObject {
  return rows[0] ?? {};
}

function customFieldMap(rows: JsonObject[]): Record<string, string> {
  const row = first(rows);
  const fields = object(row.fields);
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    const nestedValue = object(value).value;
    const normalized = nestedValue ?? value;
    if (typeof normalized === 'string') return [key, normalized];
    if (typeof normalized === 'number' || typeof normalized === 'boolean') return [key, String(normalized)];
    try {
      return [key, normalized === null || normalized === undefined ? '' : JSON.stringify(normalized)];
    } catch {
      return [key, ''];
    }
  }));
}

function field(custom: Record<string, string>, pattern: RegExp): string | undefined {
  const entry = Object.entries(custom).find(([key]) => pattern.test(key));
  return entry?.[1] || undefined;
}

function jsonObject(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeNinjaDetail(
  portalDeviceId: string,
  reports: Record<string, JsonObject[]>,
): DeviceDetail {
  const system = first(reports.computerSystems ?? []);
  const operatingSystem = first(reports.operatingSystems ?? []);
  const device = first(reports.device ?? []);
  const references = object(device.references);
  const warranty = object(references.warranty);
  const locationReference = object(references.location);
  const customFields = customFieldMap(reports.customFields ?? []);
  const processors = (reports.processors ?? []).map((row) => ({
    name: text(row.name) || undefined,
    architecture: text(row.architecture) || undefined,
    cores: number(row.numCores),
    logicalCores: number(row.numLogicalCores),
    clockSpeedHz: number(row.clockSpeed),
  }));
  const volumes = (reports.volumes ?? []).map((row) => ({
    name: text(row.name) || undefined,
    driveLetter: text(row.driveLetter) || undefined,
    label: text(row.label) || undefined,
    fileSystem: text(row.fileSystem) || undefined,
    capacityBytes: number(row.capacity),
    freeBytes: number(row.freeSpace),
    bitLocker: row.bitLockerStatus ? {
      protectionStatus: text(object(row.bitLockerStatus).protectionStatus) || undefined,
      conversionStatus: text(object(row.bitLockerStatus).conversionStatus) || undefined,
      encryptionMethod: text(object(row.bitLockerStatus).encryptionMethod) || undefined,
    } : undefined,
  }));
  const disks = (reports.disks ?? []).map((row) => ({
    model: text(row.model) || undefined,
    manufacturer: text(row.manufacturer) || undefined,
    interfaceType: text(row.interfaceType) || undefined,
    mediaType: text(row.mediaType) || undefined,
    sizeBytes: number(row.size) ?? number(row.capacity),
    smartStatus: text(row.status) || text(row.smartStatus) || undefined,
  }));
  const networkAdapters = (reports.networkInterfaces ?? []).map((row) => ({
    name: text(row.adapterName) || text(row.interfaceName) || undefined,
    type: text(row.interfaceType) || undefined,
    status: text(row.status) || undefined,
    ipAddresses: Array.isArray(row.ipAddress) ? row.ipAddress.map(String) : undefined,
    macAddresses: Array.isArray(row.macAddress) ? row.macAddress.map(String) : undefined,
    gateway: text(row.defaultGateway) || undefined,
    dnsServers: text(row.dnsServers)
      ? text(row.dnsServers).split(',').map((value) => value.trim()).filter(Boolean)
      : undefined,
  }));
  return {
    deviceId: portalDeviceId,
    source: 'ninjarmm',
    processors,
    cpuArchitecture: processors[0]?.architecture || text(operatingSystem.architecture) || undefined,
    ramBytes: number(system.totalPhysicalMemory),
    volumes,
    disks,
    networkAdapters,
    localIps: networkAdapters.flatMap((adapter) => adapter.ipAddresses ?? []),
    publicIp: text(device.publicIP) || undefined,
    domain: text(system.domain) || undefined,
    domainRole: text(system.domainRole) || undefined,
    warranty: Object.keys(warranty).length ? {
      startDate: epoch(warranty.startDate) ?? (text(warranty.startDate) || undefined),
      endDate: epoch(warranty.endDate) ?? (text(warranty.endDate) || undefined),
    } : undefined,
    customFields,
    boxit: {
      avInstalled: field(customFields, /av.*installed/i),
      azureAdJoined: field(customFields, /azure.*ad.*joined/i),
      domainJoinStatus: field(customFields, /domain.*join.*status/i),
      cpuArchitecture: field(customFields, /cpu.*architecture/i),
      publicFirewallEnabled: field(customFields, /public.*firewall.*enabled/i),
      domainFirewallEnabled: field(customFields, /domain.*firewall.*enabled/i),
      privateFirewallEnabled: field(customFields, /private.*firewall.*enabled/i),
    },
    location: jsonObject(field(customFields, /^location$/i)) ?? (Object.keys(locationReference).length ? locationReference : undefined),
  };
}
