import { getDemoAgreements, getSeed } from '@/data';
import { buildMockDetail } from '@/services/mock/devices';
import type { ConnectWiseAgreement, Device, DeviceDetail, Person, Ticket } from '@/services/types';
import type { ServerEnv } from '../config/env';
import type { AppDb } from '../db/client';
import { connectWiseCacheRepo } from '../db/repositories';
import type { ConnectWiseCacheResource, Tenant } from '../db/schema';
import {
  ConnectWiseClient,
  type ConnectWiseCompanySummary,
  normalizeConnectWiseAgreement,
  normalizeConnectWiseCompany,
  normalizeConnectWiseConfiguration,
  normalizeConnectWiseContact,
  normalizeConnectWiseDocument,
  normalizeConnectWiseNote,
  normalizeConnectWiseTimeEntryMessages,
  normalizeConnectWiseTicket,
} from './connectwise';
import {
  enrichWithNinja,
  matchNinjaDevice,
  NinjaOneClient,
  normalizeNinjaDetail,
} from './ninjaone';

export type VendorDataSource = 'demo' | 'connectwise';

export interface VendorResult<T> {
  data: T;
  source: VendorDataSource;
  fallback: boolean;
}

export const CONNECTWISE_CACHE_REFRESH_MS = 5 * 60 * 1000;

function demo<T>(data: T, fallback = false): VendorResult<T> {
  return { data, source: 'demo', fallback };
}

export class VendorDataService {
  private readonly connectWise?: ConnectWiseClient;
  private readonly ninjaOne?: NinjaOneClient;
  private readonly cache: ReturnType<typeof connectWiseCacheRepo>;
  private refreshTimer?: NodeJS.Timeout;
  private refreshAllInFlight?: Promise<void>;
  private tenantProvider: () => Tenant[] = () => [];
  private onRefreshError: (error: unknown) => void = () => undefined;

  constructor(env: ServerEnv, db: AppDb, fetchImpl: typeof fetch = fetch) {
    this.cache = connectWiseCacheRepo(db);
    if (env.connectWise) this.connectWise = new ConnectWiseClient(env.connectWise, fetchImpl);
    if (env.ninjaOne) this.ninjaOne = new NinjaOneClient(env.ninjaOne, fetchImpl);
  }

  async start(
    tenantProvider: () => Tenant[],
    onRefreshError: (error: unknown) => void = () => undefined,
  ): Promise<void> {
    this.tenantProvider = tenantProvider;
    this.onRefreshError = onRefreshError;
    await this.refreshAll();
    if (!this.connectWise || this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      void this.refreshAll().catch((error) => this.onRefreshError(error));
    }, CONNECTWISE_CACHE_REFRESH_MS);
    this.refreshTimer.unref();
  }

  async stop(): Promise<void> {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    await this.refreshAllInFlight;
  }

  async refreshAll(): Promise<void> {
    if (!this.connectWise) return;
    if (this.refreshAllInFlight) return this.refreshAllInFlight;
    this.refreshAllInFlight = Promise.all(
      this.tenantProvider().map((tenant) => this.refreshTenant(tenant)),
    ).then(() => undefined).finally(() => {
      this.refreshAllInFlight = undefined;
    });
    return this.refreshAllInFlight;
  }

  async refreshTenant(tenant: Tenant, reset = false): Promise<void> {
    if (tenant.connectWiseCompanyId === null) {
      await this.cache.clearTenant(tenant.id);
      return;
    }
    if (reset) await this.cache.clearTenant(tenant.id);
    if (!this.connectWise) return;

    const refresh = async <T extends { id: string }>(
      resource: ConnectWiseCacheResource,
      load: () => Promise<T[]>,
    ) => {
      try {
        await this.store(tenant.id, resource, await load());
      } catch (error) {
        this.onRefreshError(error);
      }
    };

    await Promise.all([
      refresh('people', () => this.loadPeople(tenant)),
      refresh('devices', () => this.loadDevices(tenant)),
      refresh('tickets', () => this.loadTickets(tenant)),
      refresh('agreements', () => this.loadAgreements(tenant)),
    ]);

    // Only refresh details that somebody has opened before. This keeps common
    // drill-downs warm without making three extra ConnectWise calls per ticket.
    const detailIds = await this.cache.entityIds(tenant.id, 'ticket-details');
    const refreshedDetails = await Promise.all(detailIds.map(async (id) => {
      try {
        const tickets = await this.loadTickets(tenant, id, true);
        return { id, ticket: tickets[0], succeeded: true as const };
      } catch (error) {
        this.onRefreshError(error);
        return { id, succeeded: false as const };
      }
    }));
    if (detailIds.length > 0) {
      const existingDetails = await this.cache.list<Ticket>(tenant.id, 'ticket-details') ?? [];
      const succeeded = new Set(refreshedDetails.filter((result) => result.succeeded).map((result) => result.id));
      const nextDetails = [
        ...existingDetails.filter((ticket) => !succeeded.has(ticket.id)),
        ...refreshedDetails.flatMap((result) => result.succeeded && result.ticket ? [result.ticket] : []),
      ];
      await this.store(tenant.id, 'ticket-details', nextDetails);
    }
  }

  private async store<T extends { id: string }>(
    tenantId: string,
    resource: ConnectWiseCacheResource,
    rows: T[],
    replaceSnapshot = true,
  ): Promise<void> {
    if (replaceSnapshot) {
      await this.cache.replace(tenantId, resource, rows.map((row) => ({ id: row.id, data: row })));
      return;
    }
    const existing = await this.cache.list<T>(tenantId, resource) ?? [];
    const merged = [...existing.filter((row) => !rows.some((next) => next.id === row.id)), ...rows];
    await this.cache.replace(tenantId, resource, merged.map((row) => ({ id: row.id, data: row })));
  }

  private async cached<T>(tenantId: string, resource: ConnectWiseCacheResource): Promise<T[] | undefined> {
    return this.cache.list<T>(tenantId, resource);
  }

  get connectWiseConfigured(): boolean {
    return this.connectWise !== undefined;
  }

  async searchConnectWiseCompanies(search: string): Promise<ConnectWiseCompanySummary[]> {
    if (!this.connectWise) return [];
    const rows = await this.connectWise.searchCompanies(search);
    return rows.map(normalizeConnectWiseCompany)
      .filter((company): company is ConnectWiseCompanySummary => Boolean(company));
  }

  async connectWiseCompany(id: number): Promise<ConnectWiseCompanySummary | null> {
    if (!this.connectWise) return null;
    const row = await this.connectWise.getCompany(id);
    return row ? normalizeConnectWiseCompany(row) : null;
  }

  async people(tenant: Tenant): Promise<VendorResult<Person[]>> {
    const seed = getSeed(tenant.id).people;
    if (tenant.connectWiseCompanyId === null) return demo([...seed]);
    const cached = await this.cached<Person>(tenant.id, 'people');
    if (cached !== undefined) return { data: cached, source: 'connectwise', fallback: false };
    if (!this.connectWise) return demo([...seed], true);
    try {
      const data = await this.loadPeople(tenant);
      await this.store(tenant.id, 'people', data);
      return { data, source: 'connectwise', fallback: false };
    } catch {
      return demo([...seed], true);
    }
  }

  private async loadPeople(tenant: Tenant): Promise<Person[]> {
    const rows = await this.connectWise!.listContacts(tenant.connectWiseCompanyId!);
    return rows.map((row) => normalizeConnectWiseContact(row, tenant.id))
      .filter((row): row is Person => Boolean(row));
  }

  async devices(tenant: Tenant): Promise<VendorResult<Device[]>> {
    const seed = getSeed(tenant.id).devices.map((device) => ({ ...device }));
    let base = seed;
    let source: VendorDataSource = 'demo';
    let fallback = false;
    if (tenant.connectWiseCompanyId !== null) {
      const cached = await this.cached<Device>(tenant.id, 'devices');
      if (cached !== undefined) {
        base = cached;
        source = 'connectwise';
      } else if (!this.connectWise) fallback = true;
      else {
        try {
          base = await this.loadDevices(tenant);
          await this.store(tenant.id, 'devices', base);
          source = 'connectwise';
        } catch {
          fallback = true;
        }
      }
    }
    if (tenant.ninjaOneOrganizationId !== null) {
      if (!this.ninjaOne) fallback = true;
      else {
        try {
          const ninjaRows = await this.ninjaOne.listDevices(tenant.ninjaOneOrganizationId);
          base = base.map((device) => {
            const match = matchNinjaDevice(device, ninjaRows);
            return match ? enrichWithNinja(device, match) : device;
          });
        } catch {
          fallback = true;
        }
      }
    }
    return { data: base, source, fallback };
  }

  private async loadDevices(tenant: Tenant): Promise<Device[]> {
    const rows = await this.connectWise!.listConfigurations(tenant.connectWiseCompanyId!);
    return rows.map((row) => normalizeConnectWiseConfiguration(row, tenant.id))
      .filter((row): row is Device => Boolean(row));
  }

  async device(tenant: Tenant, portalId: string): Promise<VendorResult<Device | null>> {
    const result = await this.devices(tenant);
    return { ...result, data: result.data.find((device) => device.id === portalId) ?? null };
  }

  async deviceDetail(tenant: Tenant, portalId: string): Promise<VendorResult<DeviceDetail | null>> {
    const deviceResult = await this.device(tenant, portalId);
    if (!deviceResult.data) return { ...deviceResult, data: null };
    const fallbackDetail = buildMockDetail(deviceResult.data);
    if (tenant.ninjaOneOrganizationId === null || !this.ninjaOne) {
      return demo(fallbackDetail, tenant.ninjaOneOrganizationId !== null);
    }
    try {
      const candidates = await this.ninjaOne.listDevices(tenant.ninjaOneOrganizationId);
      const match = matchNinjaDevice(deviceResult.data, candidates);
      if (!match || typeof match.id !== 'number') return demo(fallbackDetail, true);
      const reports = await this.ninjaOne.deviceDetail(match.id);
      reports.device = [match];
      return {
        data: normalizeNinjaDetail(portalId, reports),
        source: deviceResult.source,
        fallback: deviceResult.fallback,
      };
    } catch {
      return demo(fallbackDetail, true);
    }
  }

  async liveTelemetry(tenant: Tenant, portalId: string): Promise<VendorResult<Device | null>> {
    const device = await this.device(tenant, portalId);
    if (!device.data) return device;
    const detail = await this.deviceDetail(tenant, portalId);
    if (!detail.data) return device;
    const diskBytes = detail.data.volumes?.reduce((total, volume) => total + (volume.capacityBytes ?? 0), 0);
    return {
      data: {
        ...device.data,
        hardware: {
          cpu: detail.data.processors?.[0]?.name,
          ramBytes: detail.data.ramBytes,
          diskBytes: diskBytes || undefined,
        },
        enrichedBy: 'ninjarmm',
      },
      source: device.source,
      fallback: device.fallback || detail.fallback,
    };
  }

  async tickets(tenant: Tenant, id?: string, includeNotes = false): Promise<VendorResult<Ticket[]>> {
    const seed = getSeed(tenant.id);
    if (tenant.connectWiseCompanyId === null) {
      const tickets = id ? seed.tickets.filter((ticket) => ticket.id === id) : [...seed.tickets];
      return demo(tickets);
    }
    const numericId = id?.startsWith('cw-ticket-') ? Number(id.slice('cw-ticket-'.length)) : undefined;
    if (id !== undefined && !Number.isInteger(numericId)) return { data: [], source: 'connectwise', fallback: false };
    const resource = includeNotes ? 'ticket-details' : 'tickets';
    const cached = await this.cached<Ticket>(tenant.id, resource);
    if (cached !== undefined) {
      const data = id ? cached.filter((ticket) => ticket.id === id) : cached;
      if (!id || data.length > 0) return { data, source: 'connectwise', fallback: false };
    }
    if (!this.connectWise) return demo(id ? seed.tickets.filter((ticket) => ticket.id === id) : [...seed.tickets], true);
    try {
      const data = await this.loadTickets(tenant, id, includeNotes);
      await this.store(tenant.id, resource, data, !includeNotes);
      return { data, source: 'connectwise', fallback: false };
    } catch {
      return demo(id ? seed.tickets.filter((ticket) => ticket.id === id) : [...seed.tickets], true);
    }
  }

  private async loadTickets(tenant: Tenant, id?: string, includeNotes = false): Promise<Ticket[]> {
    const seed = getSeed(tenant.id);
    const numericId = id?.startsWith('cw-ticket-') ? Number(id.slice('cw-ticket-'.length)) : undefined;
    const rows = await this.connectWise!.listTickets(tenant.connectWiseCompanyId!, numericId);
    const tickets = await Promise.all(rows.map(async (row) => {
      const ticketId = typeof row.id === 'number' ? row.id : undefined;
      const [noteRows, timeEntryRows, documentRows] = includeNotes && ticketId !== undefined
        ? await Promise.all([
            this.connectWise!.listTicketNotes(ticketId).catch(() => []),
            this.connectWise!.listTicketTimeEntries(ticketId).catch(() => []),
            this.connectWise!.listTicketDocuments(ticketId).catch(() => []),
          ])
        : [[], [], []];
      const notes = noteRows.map(normalizeConnectWiseNote)
        .filter((note): note is NonNullable<typeof note> => Boolean(note));
      const timeEntries = timeEntryRows.flatMap(normalizeConnectWiseTimeEntryMessages);
      const attachments = documentRows.map((document) =>
        normalizeConnectWiseDocument(document, `cw-ticket-${ticketId}`))
        .filter((document): document is NonNullable<typeof document> => Boolean(document));
      return normalizeConnectWiseTicket(row, tenant.id, [...notes, ...timeEntries], seed.people, attachments);
    }));
    return tickets.filter((ticket): ticket is Ticket => Boolean(ticket));
  }

  async ticketDocument(
    tenant: Tenant,
    ticketPortalId: string,
    documentId: number,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    if (tenant.connectWiseCompanyId === null || !this.connectWise) return null;
    const ticketId = ticketPortalId.startsWith('cw-ticket-') ? Number(ticketPortalId.slice('cw-ticket-'.length)) : NaN;
    if (!Number.isInteger(ticketId) || !Number.isInteger(documentId)) return null;
    try {
      const tickets = await this.connectWise.listTickets(tenant.connectWiseCompanyId, ticketId);
      if (tickets.length !== 1) return null;
      const documents = await this.connectWise.listTicketDocuments(ticketId);
      if (!documents.some((document) => document.id === documentId)) return null;
      return this.connectWise.downloadDocument(documentId);
    } catch {
      return null;
    }
  }

  async agreements(tenant: Tenant): Promise<VendorResult<ConnectWiseAgreement[]>> {
    const seed = getDemoAgreements(tenant.id);
    if (tenant.connectWiseCompanyId === null) return demo(seed);
    const cached = await this.cached<ConnectWiseAgreement>(tenant.id, 'agreements');
    if (cached !== undefined) return { data: cached, source: 'connectwise', fallback: false };
    if (!this.connectWise) return demo(seed, true);
    try {
      const data = await this.loadAgreements(tenant);
      await this.store(tenant.id, 'agreements', data);
      return { data, source: 'connectwise', fallback: false };
    } catch {
      return demo(seed, true);
    }
  }

  private async loadAgreements(tenant: Tenant): Promise<ConnectWiseAgreement[]> {
    const rows = await this.connectWise!.listAgreements(tenant.connectWiseCompanyId!);
    const agreements = await Promise.all(rows.map(async (row) => {
      const id = typeof row.id === 'number' ? row.id : undefined;
      const additions = id === undefined ? [] : await this.connectWise!.listAgreementAdditions(id);
      return normalizeConnectWiseAgreement(row, additions, tenant.id);
    }));
    return agreements.filter((agreement): agreement is ConnectWiseAgreement => Boolean(agreement));
  }
}
