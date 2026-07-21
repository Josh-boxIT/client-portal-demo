import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getSeed } from '@/data';
import type {
  CreateTicketInput,
  CreateTicketReplyInput,
  FormSubmission,
  Ticket,
  TicketStatus,
  UpdateTicketStatusInput,
} from '@/services/types';
import { demoTicketMutationRepo, demoTicketRepo, formSubmissionRepo } from '../db/repositories';
import type { DemoTicketMutation } from '../db/repositories/demo-data';
import { ApiError, BadRequestError, NotFoundError } from '../framework/errors';
import { paginateArray, type ListQuery } from '../framework/paginate';
import { isBoxItStaff } from '../auth/is-staff';
import { registerTenantRoutes } from './tenants';
import type { VendorDataService } from '../integrations/vendor-data';

function tenantFrom(req: FastifyRequest): string {
  const value = req.headers['x-tenant-id'];
  const header = Array.isArray(value) ? value[0] : value;
  const query = (req.query as { tenant?: string } | undefined)?.tenant;
  const tenantId = (header ?? query)?.trim();
  if (!tenantId) throw new BadRequestError('Missing tenant (x-tenant-id header or ?tenant=)');
  if (!req.server.configStore.tenantById(tenantId)) throw new NotFoundError(`Unknown tenant "${tenantId}"`);
  return tenantId;
}

function listQuery(raw: Record<string, unknown>): ListQuery {
  const number = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };
  const filters: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('filter.')) continue;
    filters[key.slice(7)] = Array.isArray(value) ? value.map(String) : String(value);
  }
  const sortDir = raw.sortDir === 'desc' ? 'desc' : raw.sortDir === 'asc' ? 'asc' : undefined;
  return {
    page: number(raw.page, 1),
    pageSize: Math.min(number(raw.pageSize, 25), 1000),
    search: typeof raw.search === 'string' ? raw.search : undefined,
    sortBy: typeof raw.sortBy === 'string' ? raw.sortBy : undefined,
    sortDir,
    filters: Object.keys(filters).length ? filters : undefined,
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

/**
 * Client users may only work with tickets they requested. Client admins and
 * boxIT staff retain tenant-wide ticket access. A null scope preserves the
 * existing behavior for routes called without an authenticated portal user.
 */
function ticketRequesterScope(req: FastifyRequest, tenantId: string): string | null {
  if (!req.adminIdentity || isBoxItStaff(req.adminIdentity)) return null;

  const seed = getSeed(tenantId);
  const persona = seed.personas.find(
    (candidate) => candidate.email.toLowerCase() === req.adminIdentity!.email.toLowerCase(),
  );
  if (persona?.role !== 'client-user') return null;

  const person = seed.people.find(
    (candidate) => candidate.email.toLowerCase() === persona.email.toLowerCase(),
  );
  return person?.id ?? persona.id;
}

function canAccessTicket(ticket: Ticket, requesterScope: string | null): boolean {
  return requesterScope === null || ticket.requesterId === requesterScope;
}

function applyTicketMutation(ticket: Ticket, mutation?: DemoTicketMutation): Ticket {
  if (!mutation) return ticket;
  const status = mutation.status ?? ticket.status;
  return {
    ...ticket,
    status,
    isClosed: status === 'closed',
    updatedAt: mutation.updatedAt,
    messages: [...ticket.messages, ...mutation.replies],
  };
}

function newTicket(tenantId: string, input: CreateTicketInput): Ticket {
  const timestamp = new Date().toISOString();
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return {
    id: `demo-tkt-${suffix.toLowerCase()}`,
    tenantId,
    number: `DEMO-${suffix}`,
    subject: input.subject.trim(),
    status: 'open',
    isClosed: false,
    priority: input.priority,
    requesterId: input.requesterId,
    createdAt: timestamp,
    updatedAt: timestamp,
    category: input.category,
    messages: [{ id: `msg-${randomUUID()}`, author: 'You', authorType: 'requester', body: input.body.trim(), at: timestamp }],
  };
}

export function registerApiRoutes(app: FastifyInstance, vendorData: VendorDataService): void {
  app.get('/api/health', async () => ({ status: 'ok', dataSource: 'sample', database: 'sqlite' }));
  registerTenantRoutes(app);

  app.get('/api/actions', async (req) => {
    return req.server.configStore.actionDefsForTenant(tenantFrom(req)).filter((action) => action.enabled);
  });
  app.get('/api/actions/:key', async (req, reply) => {
    const action = req.server.configStore.actionDefsForTenant(tenantFrom(req))
      .find((item) => item.enabled && item.key === (req.params as { key: string }).key);
    if (!action) return reply.status(404).send({ error: { code: 'not_found', message: 'Action not found' } });
    return action;
  });

  app.get('/api/people', async (req) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.people(req.server.configStore.tenantById(tenantId)!);
    return {
      ...paginateArray(result.data as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {})),
      source: result.source,
      fallback: result.fallback,
    };
  });
  app.get('/api/people/:id', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.people(req.server.configStore.tenantById(tenantId)!);
    const person = result.data.find((candidate) => candidate.id === (req.params as { id: string }).id);
    if (!person) return reply.status(404).send({ error: { code: 'not_found', message: 'Person not found' } });
    return person;
  });
  app.get('/api/people/:id/m365-licenses', async () => []);

  app.get('/api/devices', async (req) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.devices(req.server.configStore.tenantById(tenantId)!);
    const personId = typeof (req.query as Record<string, unknown>)?.personId === 'string'
      ? String((req.query as Record<string, unknown>).personId)
      : undefined;
    const rows = personId ? result.data.filter((device) => device.owner === personId) : result.data;
    return {
      ...paginateArray(rows as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {})),
      source: result.source,
      fallback: result.fallback,
    };
  });
  app.get('/api/devices/:id', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.device(
      req.server.configStore.tenantById(tenantId)!,
      (req.params as { id: string }).id,
    );
    if (!result.data) return reply.status(404).send({ error: { code: 'not_found', message: 'Device not found' } });
    return result.data;
  });
  app.get('/api/devices/:id/detail', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.deviceDetail(
      req.server.configStore.tenantById(tenantId)!,
      (req.params as { id: string }).id,
    );
    if (!result.data) return reply.status(404).send({ error: { code: 'not_found', message: 'Device not found' } });
    return result.data;
  });
  app.get('/api/devices/:id/telemetry', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.liveTelemetry(
      req.server.configStore.tenantById(tenantId)!,
      (req.params as { id: string }).id,
    );
    if (!result.data) return reply.status(404).send({ error: { code: 'not_found', message: 'Device not found' } });
    return result.data;
  });

  app.get('/api/assets', async (req) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.assets(req.server.configStore.tenantById(tenantId)!);
    return {
      ...paginateArray(result.data as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {})),
      source: result.source,
      fallback: result.fallback,
    };
  });
  app.get('/api/assets/:id', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const result = await vendorData.asset(
      req.server.configStore.tenantById(tenantId)!,
      (req.params as { id: string }).id,
    );
    if (!result.data) return reply.status(404).send({ error: { code: 'not_found', message: 'Asset not found' } });
    return result.data;
  });

  app.get('/api/tickets', async (req) => {
    const tenantId = tenantFrom(req);
    const tenant = req.server.configStore.tenantById(tenantId)!;
    const requesterScope = ticketRequesterScope(req, tenantId);
    if (tenant.connectWiseCompanyId !== null) {
      const result = await vendorData.tickets(tenant);
      const tickets = result.data
        .filter((ticket) => canAccessTicket(ticket, requesterScope))
        .map((ticket) => publicTicket(ticket, isBoxItStaff(req.adminIdentity)));
      return {
        ...paginateArray(tickets as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {})),
        source: result.source,
        fallback: result.fallback,
      };
    }
    const [created, mutations] = await Promise.all([
      demoTicketRepo(app.db).list(tenantId),
      demoTicketMutationRepo(app.db).list(tenantId),
    ]);
    const tickets = [...created, ...getSeed(tenantId).tickets]
      .map((ticket) => applyTicketMutation(ticket, mutations.get(ticket.id)))
      .filter((ticket) => canAccessTicket(ticket, requesterScope))
      .map((ticket) => publicTicket(ticket, isBoxItStaff(req.adminIdentity)));
    return paginateArray(tickets as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {}));
  });
  app.get('/api/tickets/:id', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const id = (req.params as { id: string }).id;
    const tenant = req.server.configStore.tenantById(tenantId)!;
    if (tenant.connectWiseCompanyId !== null) {
      const result = await vendorData.tickets(tenant, id, true);
      const liveTicket = result.data[0];
      if (!liveTicket || !canAccessTicket(liveTicket, ticketRequesterScope(req, tenantId))) {
        return reply.status(404).send({ error: { code: 'not_found', message: 'Ticket not found' } });
      }
      return publicTicket(liveTicket, isBoxItStaff(req.adminIdentity));
    }
    const ticket = await demoTicketRepo(app.db).get(tenantId, id) ?? getSeed(tenantId).tickets.find((item) => item.id === id);
    if (!ticket || !canAccessTicket(ticket, ticketRequesterScope(req, tenantId))) {
      return reply.status(404).send({ error: { code: 'not_found', message: 'Ticket not found' } });
    }
    const mutation = await demoTicketMutationRepo(app.db).get(tenantId, id);
    return publicTicket(applyTicketMutation(ticket, mutation), isBoxItStaff(req.adminIdentity));
  });
  app.get('/api/tickets/:id/images/:documentId', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const { id, documentId: rawDocumentId } = req.params as { id: string; documentId: string };
    const documentId = Number(rawDocumentId);
    const document = await vendorData.ticketDocument(
      req.server.configStore.tenantById(tenantId)!,
      id,
      documentId,
    );
    if (!document) throw new NotFoundError('Ticket attachment not found');
    return reply.type(document.contentType).send(Buffer.from(document.bytes));
  });
  app.post('/api/tickets', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const tenant = req.server.configStore.tenantById(tenantId)!;
    if (tenant.connectWiseCompanyId !== null || tenant.ninjaOneOrganizationId !== null) {
      throw new ApiError(409, 'read_only_integration', 'Ticket creation is disabled for vendor-mapped clients');
    }
    const input = req.body as CreateTicketInput;
    if (!input?.subject?.trim() || !input.body?.trim() || !input.requesterId || !input.category || !input.priority) {
      throw new BadRequestError('subject, body, requesterId, category, and priority are required');
    }
    const requesterScope = ticketRequesterScope(req, tenantId);
    const ticket = await demoTicketRepo(app.db).create(newTicket(
      tenantId,
      requesterScope === null ? input : { ...input, requesterId: requesterScope },
    ));
    return reply.status(201).send(ticket);
  });
  app.patch('/api/tickets/:id/status', async (req) => {
    const tenantId = tenantFrom(req);
    const tenant = req.server.configStore.tenantById(tenantId)!;
    if (tenant.connectWiseCompanyId !== null || tenant.ninjaOneOrganizationId !== null) {
      throw new ApiError(409, 'read_only_integration', 'Ticket status changes are disabled for vendor-mapped clients');
    }
    const id = (req.params as { id: string }).id;
    const ticket = await demoTicketRepo(app.db).get(tenantId, id) ?? getSeed(tenantId).tickets.find((item) => item.id === id);
    if (!ticket || !canAccessTicket(ticket, ticketRequesterScope(req, tenantId))) throw new NotFoundError('Ticket not found');

    const input = req.body as UpdateTicketStatusInput;
    const validStatuses: TicketStatus[] = ['open', 'in-progress', 'waiting', 'resolved', 'closed'];
    if (!input?.status || !validStatuses.includes(input.status)) throw new BadRequestError('A valid status is required');

    const mutation = await demoTicketMutationRepo(app.db).setStatus(tenantId, id, input.status, new Date().toISOString());
    return publicTicket(applyTicketMutation(ticket, mutation), isBoxItStaff(req.adminIdentity));
  });
  app.post('/api/tickets/:id/replies', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const tenant = req.server.configStore.tenantById(tenantId)!;
    if (tenant.connectWiseCompanyId !== null || tenant.ninjaOneOrganizationId !== null) {
      throw new ApiError(409, 'read_only_integration', 'Ticket replies are disabled for vendor-mapped clients');
    }
    const id = (req.params as { id: string }).id;
    const ticket = await demoTicketRepo(app.db).get(tenantId, id) ?? getSeed(tenantId).tickets.find((item) => item.id === id);
    if (!ticket || !canAccessTicket(ticket, ticketRequesterScope(req, tenantId))) throw new NotFoundError('Ticket not found');

    const input = req.body as CreateTicketReplyInput;
    const body = input?.body?.trim();
    if (!body) throw new BadRequestError('Reply body is required');
    if (body.length > 10_000) throw new BadRequestError('Reply body must be 10,000 characters or fewer');

    const timestamp = new Date().toISOString();
    const mutation = await demoTicketMutationRepo(app.db).addReply(tenantId, id, {
      id: `msg-${randomUUID()}`,
      author: req.adminIdentity?.name ?? 'You',
      authorType: isBoxItStaff(req.adminIdentity) ? 'agent' : 'requester',
      body,
      at: timestamp,
    });
    return reply.status(201).send(publicTicket(applyTicketMutation(ticket, mutation), isBoxItStaff(req.adminIdentity)));
  });

  app.get('/api/form-submissions', async (req) => {
    const tenantId = tenantFrom(req);
    const submittedBy = (req.query as { submittedBy?: string }).submittedBy?.trim();
    if (!submittedBy) throw new BadRequestError('submittedBy is required');
    const rows = await formSubmissionRepo(app.db).list(tenantId, submittedBy);
    return paginateArray(rows as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {}));
  });
  app.post('/api/forms/:formId/submissions', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const formId = (req.params as { formId: string }).formId;
    if (!getSeed(tenantId).forms.some((form) => form.id === formId)) throw new NotFoundError('Form not found');
    const body = req.body as { values?: Record<string, unknown>; submittedBy?: string };
    if (!body.submittedBy?.trim() || !body.values) throw new BadRequestError('values and submittedBy are required');
    const submission: FormSubmission = {
      id: `sub-${randomUUID()}`,
      formId,
      tenantId,
      values: body.values,
      submittedAt: new Date().toISOString(),
      submittedBy: body.submittedBy.trim(),
    };
    return reply.status(201).send(await formSubmissionRepo(app.db).create(submission));
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message, detail: error.detail } });
    }
    app.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ error: { code: 'internal', message: 'Internal server error' } });
  });
}
