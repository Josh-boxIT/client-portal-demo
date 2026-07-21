import { getDemoAgreements, getSeed } from '@/data';
import { buildMockDetail } from '@/services/mock/devices';
import type { ConnectWiseAgreement, Device, DeviceDetail, Person, Ticket } from '@/services/types';
import type { ServerEnv } from '../config/env';
import type { Tenant } from '../db/schema';
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

function demo<T>(data: T, fallback = false): VendorResult<T> {
  return { data, source: 'demo', fallback };
}

export class VendorDataService {
  private readonly connectWise?: ConnectWiseClient;
  private readonly ninjaOne?: NinjaOneClient;

  constructor(env: ServerEnv, fetchImpl: typeof fetch = fetch) {
    if (env.connectWise) this.connectWise = new ConnectWiseClient(env.connectWise, fetchImpl);
    if (env.ninjaOne) this.ninjaOne = new NinjaOneClient(env.ninjaOne, fetchImpl);
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
    if (!this.connectWise) return demo([...seed], true);
    try {
      const rows = await this.connectWise.listContacts(tenant.connectWiseCompanyId);
      return {
        data: rows.map((row) => normalizeConnectWiseContact(row, tenant.id)).filter((row): row is Person => Boolean(row)),
        source: 'connectwise',
        fallback: false,
      };
    } catch {
      return demo([...seed], true);
    }
  }

  async devices(tenant: Tenant): Promise<VendorResult<Device[]>> {
    const seed = getSeed(tenant.id).devices.map((device) => ({ ...device }));
    let base = seed;
    let source: VendorDataSource = 'demo';
    let fallback = false;
    if (tenant.connectWiseCompanyId !== null) {
      if (!this.connectWise) fallback = true;
      else {
        try {
          const rows = await this.connectWise.listConfigurations(tenant.connectWiseCompanyId);
          base = rows.map((row) => normalizeConnectWiseConfiguration(row, tenant.id))
            .filter((row): row is Device => Boolean(row));
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
    if (!this.connectWise) return demo(id ? seed.tickets.filter((ticket) => ticket.id === id) : [...seed.tickets], true);
    const numericId = id?.startsWith('cw-ticket-') ? Number(id.slice('cw-ticket-'.length)) : undefined;
    if (id !== undefined && !Number.isInteger(numericId)) return { data: [], source: 'connectwise', fallback: false };
    try {
      const rows = await this.connectWise.listTickets(tenant.connectWiseCompanyId, numericId);
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
      return {
        data: tickets.filter((ticket): ticket is Ticket => Boolean(ticket)),
        source: 'connectwise',
        fallback: false,
      };
    } catch {
      return demo(id ? seed.tickets.filter((ticket) => ticket.id === id) : [...seed.tickets], true);
    }
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
    if (!this.connectWise) return demo(seed, true);
    try {
      const rows = await this.connectWise.listAgreements(tenant.connectWiseCompanyId);
      const agreements = await Promise.all(rows.map(async (row) => {
        const id = typeof row.id === 'number' ? row.id : undefined;
        const additions = id === undefined ? [] : await this.connectWise!.listAgreementAdditions(id);
        return normalizeConnectWiseAgreement(row, additions, tenant.id);
      }));
      return {
        data: agreements.filter((agreement): agreement is ConnectWiseAgreement => Boolean(agreement)),
        source: 'connectwise',
        fallback: false,
      };
    } catch {
      return demo(seed, true);
    }
  }
}
