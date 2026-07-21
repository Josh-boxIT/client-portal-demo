import type {
  ConnectWiseAgreement,
  Device,
  Person,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TicketAttachment,
} from '@/services/types';
import type { ServerEnv } from '../config/env';
import type {
  ConnectWiseChurnCompany,
  ConnectWiseChurnInvoice,
} from '../churn/scoring';

type JsonObject = Record<string, unknown>;
type FetchLike = typeof fetch;

export interface ConnectWiseCompanySummary {
  id: number;
  identifier: string;
  name: string;
  status: string;
  city: string;
  state: string;
  phoneNumber: string;
  website: string;
  market: string;
}

function object(value: unknown): JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean {
  return value === true;
}

function date(value: unknown, fallback = new Date(0).toISOString()): string {
  const raw = text(value);
  return raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : fallback;
}

function referenceName(value: unknown): string {
  const ref = object(value);
  return text(ref.name) || text(ref.identifier);
}

function infoDate(value: unknown, fallback?: unknown): string {
  const info = object(value);
  return date(info.lastUpdated, date(fallback));
}

function timestamp(value: unknown): number | undefined {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** ConnectWise reference fields use slash paths in conditions, e.g. company/id = 123. */
export function connectWiseCompanyCondition(companyId: number): string {
  return `company/id = ${companyId}`;
}

export const CONNECTWISE_TICKET_HISTORY_DAYS = 365;

export function connectWiseTicketCutoff(now = new Date()): string {
  const cutoff = new Date(now.getTime() - CONNECTWISE_TICKET_HISTORY_DAYS * 86_400_000);
  return cutoff.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function connectWiseTicketConditions(companyId: number, id?: number, now = new Date()): string {
  const conditions = [
    connectWiseCompanyCondition(companyId),
    `(dateEntered >= [${connectWiseTicketCutoff(now)}] OR closedFlag = false)`,
  ];
  if (id !== undefined) conditions.push(`id = ${id}`);
  return conditions.join(' AND ');
}

export function connectWiseInvoiceConditions(companyId: number, now = new Date()): string {
  const cutoff = new Date(now.getTime() - 90 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `${connectWiseCompanyCondition(companyId)} AND (date >= [${cutoff}] OR balance > 0)`;
}

/** Time entries are shared across charge types, so constrain both type and ticket id. */
export function connectWiseTimeEntryConditions(ticketId: number): string {
  return `chargeToType = "ServiceTicket" AND chargeToId = ${ticketId}`;
}

function safeConditionSearch(value: string): string {
  return [...value].map((character) => {
    const code = character.charCodeAt(0);
    return character === '"' || character === '\\' || code < 32 ? ' ' : character;
  }).join('').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export function connectWiseCompanySearchCondition(search: string): string {
  const query = safeConditionSearch(search);
  return query
    ? `(name contains "${query}" OR identifier contains "${query}") AND deletedFlag = false`
    : 'deletedFlag = false';
}

export class ConnectWiseClient {
  constructor(
    private readonly config: NonNullable<ServerEnv['connectWise']>,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async listContacts(companyId: number): Promise<JsonObject[]> {
    return this.list('/company/contacts', connectWiseCompanyCondition(companyId));
  }

  async searchCompanies(search = ''): Promise<JsonObject[]> {
    const url = new URL(`${this.config.baseUrl.replace(/\/$/, '')}/company/companies`);
    url.searchParams.set('conditions', connectWiseCompanySearchCondition(search));
    url.searchParams.set('orderBy', 'name asc');
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('page', '1');
    const response = await this.request(url);
    const rows = await response.json() as unknown;
    if (!Array.isArray(rows)) throw new Error('ConnectWise /company/companies returned a non-array response');
    return rows.map(object);
  }

  async getCompany(id: number): Promise<JsonObject | null> {
    const response = await this.request(`/company/companies/${id}`);
    const row = object(await response.json());
    return number(row.id) === id ? row : null;
  }

  async listConfigurations(companyId: number, id?: number): Promise<JsonObject[]> {
    const conditions = [connectWiseCompanyCondition(companyId), 'activeFlag = true'];
    if (id !== undefined) conditions.push(`id = ${id}`);
    return this.list('/company/configurations', conditions.join(' AND '));
  }

  async listTickets(companyId: number, id?: number, now = new Date()): Promise<JsonObject[]> {
    return this.list('/service/tickets', connectWiseTicketConditions(companyId, id, now));
  }

  async listTicketNotes(ticketId: number): Promise<JsonObject[]> {
    return this.list(`/service/tickets/${ticketId}/allNotes`);
  }

  async listTicketTimeEntries(ticketId: number): Promise<JsonObject[]> {
    return this.list('/time/entries', connectWiseTimeEntryConditions(ticketId));
  }

  async listTicketDocuments(ticketId: number): Promise<JsonObject[]> {
    try {
      return await this.list(`/service/tickets/${ticketId}/documents`);
    } catch {
      // Some API-member security roles deny the ticket sub-resource while
      // permitting the equivalent documented system document lookup.
      return this.list('/system/documents', undefined, {
        recordType: 'Ticket',
        recordId: String(ticketId),
      });
    }
  }

  async downloadDocument(documentId: number): Promise<{ bytes: Uint8Array; contentType: string }> {
    const response = await this.request(`/system/documents/${documentId}/download`);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
    };
  }

  async listAgreements(companyId: number): Promise<JsonObject[]> {
    return this.list('/finance/agreements', connectWiseCompanyCondition(companyId));
  }

  async listAgreementAdditions(agreementId: number): Promise<JsonObject[]> {
    return this.list(`/finance/agreements/${agreementId}/additions`);
  }

  async listInvoices(companyId: number, now = new Date()): Promise<JsonObject[]> {
    return this.list('/finance/invoices', connectWiseInvoiceConditions(companyId, now));
  }

  async listInvoicePayments(invoiceId: number): Promise<JsonObject[]> {
    return this.list(`/finance/invoices/${invoiceId}/payments`);
  }

  private async list(
    path: string,
    conditions?: string,
    params: Record<string, string> = {},
  ): Promise<JsonObject[]> {
    const rows: JsonObject[] = [];
    for (let page = 1; ; page += 1) {
      const url = new URL(`${this.config.baseUrl.replace(/\/$/, '')}${path}`);
      if (conditions) url.searchParams.set('conditions', conditions);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      url.searchParams.set('pageSize', '1000');
      url.searchParams.set('page', String(page));
      const response = await this.request(url);
      const pageRows = await response.json() as unknown;
      if (!Array.isArray(pageRows)) throw new Error(`ConnectWise ${path} returned a non-array response`);
      rows.push(...pageRows.map(object));
      if (pageRows.length < 1000) return rows;
    }
  }

  private async request(pathOrUrl: string | URL): Promise<Response> {
    const url = pathOrUrl instanceof URL
      ? pathOrUrl
      : new URL(`${this.config.baseUrl.replace(/\/$/, '')}${pathOrUrl}`);
    const authorization = Buffer.from(
      `${this.config.companyId}+${this.config.publicKey}:${this.config.privateKey}`,
    ).toString('base64');
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.connectwise.com+json; version=2025.16',
        Authorization: `Basic ${authorization}`,
        clientId: this.config.clientId,
      },
    });
    if (!response.ok) throw new Error(`ConnectWise ${url.pathname} returned ${response.status}`);
    return response;
  }
}

export function normalizeConnectWiseCompany(row: JsonObject): ConnectWiseCompanySummary | null {
  const id = number(row.id);
  const name = text(row.name);
  if (id === undefined || !name) return null;
  return {
    id,
    identifier: text(row.identifier),
    name,
    status: referenceName(row.status),
    city: text(row.city),
    state: text(row.state),
    phoneNumber: text(row.phoneNumber),
    website: text(row.website),
    market: referenceName(row.market),
  };
}

export function normalizeConnectWiseChurnCompany(row: JsonObject): ConnectWiseChurnCompany | null {
  const id = number(row.id);
  if (id === undefined) return null;
  const acquired = timestamp(row.dateAcquired);
  const creditLimit = number(row.creditLimit);
  return {
    id: `cw-company-${id}`,
    ...(acquired !== undefined ? { dateAcquired: new Date(acquired).toISOString() } : {}),
    ...(creditLimit !== undefined ? { creditLimit } : {}),
  };
}

export function normalizeConnectWiseChurnInvoice(
  row: JsonObject,
  paymentRows: JsonObject[],
  now = new Date(),
): ConnectWiseChurnInvoice | null {
  const id = number(row.id);
  const invoiceDate = timestamp(row.date);
  const dueDate = timestamp(row.dueDate);
  if (id === undefined || invoiceDate === undefined || dueDate === undefined) return null;
  const balance = number(row.balance) ?? 0;
  const paymentDates = paymentRows.map((payment) => timestamp(payment.paymentDate))
    .filter((value): value is number => value !== undefined);
  let paidOnTime: boolean | undefined;
  if (dueDate <= now.getTime() && balance > 0) paidOnTime = false;
  else if (balance <= 0 && paymentDates.length > 0) paidOnTime = Math.max(...paymentDates) <= dueDate;
  return {
    id: `cw-invoice-${id}`,
    date: new Date(invoiceDate).toISOString(),
    dueDate: new Date(dueDate).toISOString(),
    balance,
    total: number(row.total) ?? 0,
    ...(paidOnTime !== undefined ? { paidOnTime } : {}),
  };
}

export function normalizeConnectWiseDocument(row: JsonObject, ticketId: string): TicketAttachment | null {
  const id = number(row.id);
  const name = text(row.fileName) || text(row.title) || text(row.name);
  if (id === undefined || !name) return null;
  return {
    id: String(id),
    name,
    url: `/api/tickets/${encodeURIComponent(ticketId)}/images/${id}`,
    isImage: bool(row.imageFlag) || /\.(?:png|jpe?g|gif|webp|bmp)$/i.test(name),
    referenced: false,
    internal: false,
  };
}

function emailFromContact(row: JsonObject): string {
  const items = Array.isArray(row.communicationItems) ? row.communicationItems.map(object) : [];
  const emails = items.filter((item) =>
    text(item.communicationType).toLowerCase() === 'email'
    || referenceName(item.type).toLowerCase() === 'email',
  );
  return text(emails.find((item) => item.defaultFlag === true)?.value) || text(emails[0]?.value);
}

export function normalizeConnectWiseContact(row: JsonObject, tenantId: string): Person | null {
  const id = number(row.id);
  const email = emailFromContact(row);
  const name = [text(row.firstName), text(row.lastName)].filter(Boolean).join(' ').trim();
  if (id === undefined || (!name && !email)) return null;
  const title = text(row.title);
  return {
    id: `cw-contact-${id}`,
    tenantId,
    name: name || email,
    email,
    title,
    role: title,
    department: referenceName(row.department),
    ...(referenceName(row.managerContact) ? { manager: referenceName(row.managerContact) } : {}),
    status: bool(row.inactiveFlag) ? 'suspended' : 'active',
    avatarInitials: (name || email).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''),
    startDate: '',
    deviceIds: [],
    licenseIds: [],
    groups: [],
  };
}

function deviceType(row: JsonObject): Device['type'] {
  const value = `${referenceName(row.type)} ${text(row.osType)} ${text(row.name)}`.toLowerCase();
  if (/server/.test(value)) return 'server';
  if (/tablet|ipad/.test(value)) return 'tablet';
  if (/mobile|phone|ios|android/.test(value)) return 'mobile';
  if (/laptop|notebook|macbook/.test(value)) return 'laptop';
  return 'workstation';
}

export function normalizeConnectWiseConfiguration(row: JsonObject, tenantId: string): Device | null {
  const id = number(row.id);
  if (id === undefined) return null;
  const contactId = number(object(row.contact).id);
  const active = row.activeFlag !== false;
  return {
    id: `cw-config-${id}`,
    tenantId,
    name: text(row.name) || text(row.deviceIdentifier) || `Configuration ${id}`,
    type: deviceType(row),
    os: text(row.osInfo) || text(row.osType) || 'Unknown',
    ...(contactId !== undefined ? { owner: `cw-contact-${contactId}` } : {}),
    status: active ? 'healthy' : 'offline',
    compliant: active,
    lastSeen: infoDate(row._info, row.installationDate),
    serial: text(row.serialNumber),
    model: text(row.modelNumber),
    ...(referenceName(row.manufacturer) ? { manufacturer: referenceName(row.manufacturer) } : {}),
    ...(text(row.lastLoginName) ? { lastLoggedIn: text(row.lastLoginName) } : {}),
    lastSeenSource: 'connectwise',
    configurationType: referenceName(row.type),
  };
}

function ticketStatus(row: JsonObject): TicketStatus {
  if (bool(row.closedFlag)) return 'closed';
  const value = referenceName(row.status).toLowerCase();
  if (/resolved|complete/.test(value)) return 'resolved';
  if (/wait|hold|client/.test(value)) return 'waiting';
  if (/progress|assigned|working/.test(value)) return 'in-progress';
  return 'open';
}

function ticketPriority(row: JsonObject): TicketPriority {
  const value = `${referenceName(row.priority)} ${text(object(row.priority).level)}`.toLowerCase();
  if (/urgent|critical|p1|priority 1/.test(value)) return 'urgent';
  if (/high|p2|priority 2/.test(value)) return 'high';
  if (/low|p4|priority 4/.test(value)) return 'low';
  return 'medium';
}

export function normalizeConnectWiseNote(row: JsonObject): TicketMessage | null {
  const id = number(row.id);
  const body = text(row.text);
  if (id === undefined || !body) return null;
  const contact = referenceName(row.contact);
  const member = referenceName(row.member);
  const internal = bool(row.internalAnalysisFlag);
  return {
    id: `cw-note-${id}`,
    author: contact || member || text(row.originalAuthor) || 'ConnectWise',
    authorType: contact ? 'requester' : member ? 'agent' : 'system',
    body,
    at: infoDate(row._info, row.timeStart),
    ...(internal ? { internal: true } : {}),
  };
}

function timeEntryHours(row: JsonObject): number | undefined {
  const actualHours = number(row.actualHours);
  if (actualHours !== undefined) return actualHours;
  const start = Date.parse(text(row.timeStart));
  const end = Date.parse(text(row.timeEnd));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}

/**
 * A ConnectWise time entry can carry a regular note and a separate internal
 * note. Keep them separate so client-facing filtering never leaks the latter.
 */
export function normalizeConnectWiseTimeEntryMessages(row: JsonObject): TicketMessage[] {
  const id = number(row.id);
  if (id === undefined) return [];

  const author = referenceName(row.member) || text(row.enteredBy) || 'ConnectWise';
  const at = date(row.timeStart, infoDate(row._info, row.dateEntered));
  const hours = timeEntryHours(row);
  const notes = text(row.notes).trim();
  const internalNotes = text(row.internalNotes).trim();
  const customerVisible = bool(row.addToDetailDescriptionFlag)
    || bool(row.addToResolutionFlag)
    || bool(row.emailContactFlag)
    || bool(row.emailCcFlag);
  const messages: TicketMessage[] = [];

  if (notes || hours !== undefined) {
    messages.push({
      id: `cw-time-${id}`,
      author,
      authorType: 'agent',
      body: notes,
      at,
      kind: 'time',
      ...(hours !== undefined ? { hours } : {}),
      ...(!customerVisible ? { internal: true } : {}),
    });
  }

  if (internalNotes && internalNotes !== notes) {
    messages.push({
      id: `cw-time-${id}-internal`,
      author,
      authorType: 'agent',
      body: internalNotes,
      at,
      internal: true,
      kind: 'time',
    });
  }

  return messages;
}

export function normalizeConnectWiseTicket(
  row: JsonObject,
  tenantId: string,
  notes: TicketMessage[] = [],
  seededPeople: Person[] = [],
  attachments: TicketAttachment[] = [],
): Ticket | null {
  const id = number(row.id);
  if (id === undefined) return null;
  const createdAt = date(object(row._info).dateEntered, infoDate(row._info));
  const contactId = number(object(row.contact).id);
  const contactEmail = text(row.contactEmailAddress).toLowerCase();
  const seeded = seededPeople.find((person) => person.email.toLowerCase() === contactEmail);
  const description = text(row.initialDescription);
  const initial = description ? [{
    id: `cw-ticket-${id}-initial`,
    author: text(row.contactName) || referenceName(row.contact) || 'Requester',
    authorType: 'requester' as const,
    body: description,
    at: createdAt,
  }] : [];
  const status = ticketStatus(row);
  return {
    id: `cw-ticket-${id}`,
    tenantId,
    number: String(id),
    subject: text(row.summary) || `Ticket ${id}`,
    status,
    isClosed: bool(row.closedFlag),
    priority: ticketPriority(row),
    requesterId: seeded?.id ?? (contactId !== undefined ? `cw-contact-${contactId}` : `cw-requester-${id}`),
    ...(referenceName(row.owner) ? { assignee: referenceName(row.owner) } : {}),
    createdAt,
    updatedAt: infoDate(row._info, row.dateResolved),
    category: referenceName(row.type) || referenceName(row.board) || 'Support',
    messages: [...initial, ...notes],
    ...(typeof row.isInSla === 'boolean' ? { isInSla: row.isInSla } : {}),
    ...(attachments.length ? { attachments } : {}),
  };
}

export function isConnectWiseAgreementActive(row: JsonObject, now = new Date()): boolean {
  if (bool(row.cancelledFlag)) return false;
  const status = text(row.agreementStatus).trim().toLowerCase();
  if (status && status !== 'active') return false;
  const at = now.getTime();
  const start = timestamp(row.startDate);
  const end = timestamp(row.endDate);
  if (start !== undefined && start > at) return false;
  return bool(row.noEndingDateFlag) || end === undefined || end >= at;
}

export function isConnectWiseAgreementAdditionActive(addition: JsonObject, now = new Date()): boolean {
  if (bool(addition.cancelledFlag)) return false;
  const status = text(addition.agreementStatus).trim().toLowerCase();
  if (status && status !== 'active') return false;
  const at = now.getTime();
  const effective = timestamp(addition.effectiveDate);
  const cancelled = timestamp(addition.cancelledDate);
  return (effective === undefined || effective <= at) && (cancelled === undefined || cancelled > at);
}

function agreementStatus(row: JsonObject, now: Date): ConnectWiseAgreement['status'] {
  if (!isConnectWiseAgreementActive(row, now)) return 'expired';
  const end = timestamp(row.endDate);
  if (end !== undefined && end - now.getTime() < 90 * 86_400_000) return 'expiring';
  return 'active';
}

function agreementBillingCycle(row: JsonObject): ConnectWiseAgreement['billingCycle'] {
  const value = referenceName(row.billingCycle);
  if (/annual|year/i.test(value)) return 'annual';
  if (/quarter/i.test(value)) return 'quarterly';
  return 'monthly';
}

function monthlyEquivalent(amount: number, billingCycle: ConnectWiseAgreement['billingCycle']): number {
  if (billingCycle === 'annual') return amount / 12;
  if (billingCycle === 'quarterly') return amount / 3;
  return amount;
}

export function normalizeConnectWiseAgreement(
  row: JsonObject,
  additions: JsonObject[],
  tenantId: string,
  now = new Date(),
): ConnectWiseAgreement | null {
  const id = number(row.id);
  if (id === undefined) return null;
  const billingCycle = agreementBillingCycle(row);
  const lineItems = additions
    .filter((addition) => isConnectWiseAgreementAdditionActive(addition, now))
    .map((addition, index) => {
      const quantity = number(addition.quantity) ?? number(addition.billedQuantity) ?? 0;
      const unitPrice = number(addition.unitPrice) ?? 0;
      const cycleAmount = number(addition.extPrice) ?? quantity * unitPrice;
      return {
        id: `cw-addition-${number(addition.id) ?? index}`,
        name: referenceName(addition.product) || text(addition.description) || 'Agreement addition',
        description: text(addition.invoiceDescription) || text(addition.description),
        quantity,
        unitPrice,
        monthlyAmount: monthlyEquivalent(cycleAmount, billingCycle),
      };
    });
  const monthlyAmount = monthlyEquivalent(number(row.billAmount) ?? 0, billingCycle)
    + lineItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const contact = object(row.contact);
  return {
    id: `cw-agreement-${id}`,
    tenantId,
    externalId: String(id),
    name: text(row.name) || `Agreement ${id}`,
    type: referenceName(row.type) || 'Agreement',
    status: agreementStatus(row, now),
    startDate: text(row.startDate),
    endDate: text(row.endDate),
    autoRenew: bool(row.noEndingDateFlag),
    renewalNoticeDays: number(row.expiredDays) ?? 0,
    billingCycle,
    monthlyAmount,
    currency: 'USD',
    coveredUsers: 0,
    coveredDevices: 0,
    sla: referenceName(row.sla),
    contractContacts: referenceName(contact) ? [{ name: referenceName(contact), role: 'Agreement contact', email: '' }] : [],
    addOns: lineItems.map((item) => item.name),
    exclusions: [],
    lineItems,
    sourceUpdatedAt: infoDate(row._info),
  };
}
