import type { AdminIdentity } from '../admin/auth/provider';
import type { AppDb } from '../db/client';
import { adminUsersRepo, demoTicketMutationRepo, demoTicketRepo, formSubmissionRepo } from '../db/repositories';
import type { ConfigStore } from '../framework/config-store';
import { getSeed } from '@/data';
import { backlogIntelligenceSnapshot } from '@/data/seed/backlogIntelligence';
import { getChurnAssessment } from '@/data/seed/customerChurn';
import type { Ticket } from '@/services/types';
import type { VendorDataService } from '../integrations/vendor-data';
import type { ChurnService } from '../churn/service';
import { tenantDisplayName } from '../db/schema';

export const PORTAL_DOMAINS = [
  'actions',
  'tickets',
  'people',
  'devices',
  'licenses',
  'assets',
  'roadmaps',
  'qbrs',
  'customer-churn',
  'metrics',
  'queue-attention',
  'documents',
  'forms',
  'form-submissions',
  'news',
  'activity',
] as const;

export type PortalDomain = typeof PORTAL_DOMAINS[number];

export interface PortalRecord {
  sourceId: string;
  tenantId: string;
  clientName: string;
  domain: PortalDomain;
  recordId: string;
  title: string;
  href: string;
  data: Record<string, unknown>;
}

export interface PortalAccessScope {
  userId: string;
  tenantId: string;
  isStaff: boolean;
  isAdmin: boolean;
  clientRole: 'client-admin' | 'client-user';
  personaId?: string;
}

function recordHref(domain: PortalDomain, id: string): string {
  switch (domain) {
    case 'tickets': return `/tickets/${encodeURIComponent(id)}`;
    case 'people': return `/people/${encodeURIComponent(id)}`;
    case 'devices': return `/devices/${encodeURIComponent(id)}`;
    case 'licenses': return `/licenses/${encodeURIComponent(id)}`;
    case 'documents': return `/documents/${encodeURIComponent(id)}`;
    case 'news': return `/news/${encodeURIComponent(id)}`;
    case 'actions': return '/actions';
    case 'assets': return '/assets';
    case 'roadmaps': return '/roadmaps';
    case 'qbrs': return '/qbrs';
    case 'customer-churn': return '/customer-churn';
    case 'metrics': return '/reports';
    case 'queue-attention': return '/queue-attention';
    case 'forms':
    case 'form-submissions': return '/forms';
    case 'activity': return '/';
  }
}

function cleanValue(value: unknown, key?: string): unknown {
  if (key === 'tenantId' || key === 'url' || key === 'internal') return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => cleanValue(item)).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([childKey, childValue]) => [childKey, cleanValue(childValue, childKey)] as const)
      .filter((entry): entry is readonly [string, unknown] => entry[1] !== undefined));
  }
  return value;
}

function asRecord(
  scope: PortalAccessScope,
  clientName: string,
  domain: PortalDomain,
  raw: Record<string, unknown>,
  title: string,
): PortalRecord {
  const recordId = String(raw.id ?? raw.key ?? title);
  return {
    sourceId: `${scope.tenantId}:${domain}:${recordId}`,
    tenantId: scope.tenantId,
    clientName,
    domain,
    recordId,
    title,
    href: recordHref(domain, recordId),
    data: cleanValue(raw) as Record<string, unknown>,
  };
}

function publicTicket(ticket: Ticket, staff: boolean): Ticket {
  if (staff) return ticket;
  return {
    ...ticket,
    messages: ticket.messages.filter((message) => !message.internal),
    attachments: ticket.attachments?.filter((attachment) => !attachment.internal),
  };
}

export async function resolvePortalAccess(
  db: AppDb,
  configStore: ConfigStore,
  identity: AdminIdentity,
  tenantId: string,
): Promise<PortalAccessScope | null> {
  if (!configStore.tenantById(tenantId)) return null;
  const isStaff = identity.role === 'admin' || identity.role === 'editor';
  const isAdmin = identity.role === 'admin';
  if (!isStaff) {
    const grants = await adminUsersRepo(db).getClientAccess(identity.id);
    if (!grants.includes(tenantId)) return null;
  }

  const persona = getSeed(tenantId).personas.find(
    (candidate) => candidate.email.toLowerCase() === identity.email.toLowerCase(),
  );
  return {
    userId: identity.id,
    tenantId,
    isStaff,
    isAdmin,
    clientRole: isStaff ? 'client-admin' : persona?.role ?? 'client-user',
    personaId: persona?.id,
  };
}

/** Resolve every client the signed-in identity may use, independent of the
 * currently selected portal client. */
export async function resolvePortalAccessScopes(
  db: AppDb,
  configStore: ConfigStore,
  identity: AdminIdentity,
): Promise<PortalAccessScope[]> {
  const isStaff = identity.role === 'admin' || identity.role === 'editor';
  const isAdmin = identity.role === 'admin';
  const tenantIds = isStaff
    ? configStore.tenants().map((tenant) => tenant.id)
    : await adminUsersRepo(db).getClientAccess(identity.id);

  return tenantIds.flatMap((tenantId) => {
    if (!configStore.tenantById(tenantId)) return [];
    const persona = getSeed(tenantId).personas.find(
      (candidate) => candidate.email.toLowerCase() === identity.email.toLowerCase(),
    );
    return [{
      userId: identity.id,
      tenantId,
      isStaff,
      isAdmin,
      clientRole: isStaff ? 'client-admin' : persona?.role ?? 'client-user',
      personaId: persona?.id,
    }];
  });
}

export async function ticketsForScope(db: AppDb, scope: PortalAccessScope): Promise<Ticket[]> {
  const seed = getSeed(scope.tenantId);
  const [created, mutations] = await Promise.all([
    demoTicketRepo(db).list(scope.tenantId),
    demoTicketMutationRepo(db).list(scope.tenantId),
  ]);
  const tickets = [...created, ...seed.tickets].map((ticket) => {
    const mutation = mutations.get(ticket.id);
    if (!mutation) return ticket;
    const status = mutation.status ?? ticket.status;
    return {
      ...ticket,
      status,
      isClosed: status === 'closed',
      updatedAt: mutation.updatedAt,
      messages: [...ticket.messages, ...mutation.replies],
    };
  });
  return filterTicketsForScope(tickets, scope);
}

export function filterTicketsForScope(tickets: Ticket[], scope: PortalAccessScope): Ticket[] {
  const seed = getSeed(scope.tenantId);
  let permitted = tickets;
  if (!scope.isStaff && scope.clientRole === 'client-user') {
    const person = seed.people.find((candidate) => candidate.email.toLowerCase() ===
      seed.personas.find((persona) => persona.id === scope.personaId)?.email.toLowerCase());
    const requesterId = person?.id ?? scope.personaId;
    permitted = requesterId ? tickets.filter((ticket) => ticket.requesterId === requesterId) : [];
  }
  return permitted.map((ticket) => publicTicket(ticket, scope.isStaff));
}

export async function buildPortalRecords(
  db: AppDb,
  configStore: ConfigStore,
  scope: PortalAccessScope,
  vendorData?: VendorDataService,
  churn?: ChurnService,
): Promise<PortalRecord[]> {
  const seed = getSeed(scope.tenantId);
  const tenant = configStore.tenantById(scope.tenantId)!;
  const clientName = tenantDisplayName(tenant);
  const [people, devices, tickets] = vendorData
    ? await Promise.all([
        vendorData.people(tenant).then((result) => result.data),
        vendorData.devices(tenant).then((result) => result.data),
        tenant.connectWiseCompanyId !== null
          ? vendorData.tickets(tenant).then((result) => filterTicketsForScope(result.data, scope))
          : ticketsForScope(db, scope),
      ])
    : [seed.people, seed.devices, await ticketsForScope(db, scope)];
  const records: PortalRecord[] = [];
  const push = (domain: PortalDomain, values: unknown[], title: (value: Record<string, unknown>) => string) => {
    for (const value of values as Record<string, unknown>[]) {
      records.push(asRecord(scope, clientName, domain, value, title(value)));
    }
  };

  push(
    'actions',
    configStore.actionDefsForTenant(scope.tenantId).filter((action) => action.enabled),
    (value) => String(value.title),
  );
  push('tickets', tickets, (value) => `${String(value.number)}: ${String(value.subject)}`);
  push('people', people, (value) => String(value.name));
  push('devices', devices, (value) => String(value.name ?? value.hostname ?? value.id));
  push('licenses', seed.licenses, (value) => String(value.name));
  push('assets', seed.assets, (value) => String(value.name));
  push('roadmaps', seed.roadmap, (value) => String(value.title));
  if (scope.clientRole === 'client-admin') {
    push('qbrs', seed.qbrs, (value) => `${String(value.quarter)} QBR`);
  }
  const churnAssessment = scope.isAdmin
    ? churn
      ? await churn.get(scope.tenantId)
      : getChurnAssessment(scope.tenantId)
    : null;
  if (scope.isAdmin && churnAssessment) {
    push('customer-churn', [{ id: 'assessment', ...churnAssessment }], () => 'Customer churn assessment');
  }
  push('metrics', seed.metricSeries, (value) => String(value.label));
  if (scope.isAdmin) {
    const snapshot = backlogIntelligenceSnapshot;
    push('queue-attention', [{
      id: 'overview',
      schemaVersion: snapshot.schemaVersion,
      scoringVersion: snapshot.scoringVersion,
      generatedAt: snapshot.generatedAt,
      scope: snapshot.scope,
      dataQuality: snapshot.dataQuality,
      summary: snapshot.summary,
    }], () => 'Queue Attention overview');
    push('queue-attention', snapshot.items.map((item) => ({
      id: `item:${item.itemId}`,
      ...item,
    })), (value) => {
      const display = value.display as Record<string, unknown>;
      return `${String(display.title)} (${String(value.primaryTicketExternalId)})`;
    });
    push('queue-attention', snapshot.topPatterns.map((pattern, index) => ({
      id: `pattern:${index + 1}`,
      ...pattern,
    })), (value) => `Queue pattern: ${String(value.title)}`);
    push('queue-attention', snapshot.suggestedDispatchAgenda.map((item) => ({
      id: `agenda:${item.rank}`,
      ...item,
    })), (value) => `Dispatch priority ${String(value.rank)}`);
  }
  push('documents', seed.documents, (value) => String(value.title));
  push('forms', seed.forms, (value) => String(value.title));
  push('news', seed.news, (value) => String(value.title));
  push('activity', seed.activity, (value) => String(value.title));

  const submissions = scope.isStaff
    ? await formSubmissionRepo(db).listForTenant(scope.tenantId)
    : scope.personaId
      ? await formSubmissionRepo(db).list(scope.tenantId, scope.personaId)
      : [];
  const formTitles = new Map(seed.forms.map((form) => [form.id, form.title]));
  push('form-submissions', submissions, (value) =>
    `${formTitles.get(String(value.formId)) ?? 'Form'} submission`);

  return records;
}

export function searchPortalRecords(
  records: PortalRecord[],
  query: string,
  domains?: PortalDomain[],
  limit = 20,
): PortalRecord[] {
  const terms = query.toLowerCase().split(/\s+/).map((term) => term.trim()).filter(Boolean);
  const allowedDomains = domains?.length ? new Set(domains) : null;
  return records
    .filter((record) => !allowedDomains || allowedDomains.has(record.domain))
    .map((record) => {
      const haystack = `${record.clientName} ${record.tenantId} ${record.title} ${JSON.stringify(record.data)}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { record, score };
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
    .slice(0, Math.min(Math.max(limit, 1), 50))
    .map(({ record }) => record);
}
