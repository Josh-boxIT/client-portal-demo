import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getSeed } from '@/data';
import type { CreateTicketInput, FormSubmission, Ticket } from '@/services/types';
import { demoTicketRepo, formSubmissionRepo } from '../db/repositories';
import { ApiError, BadRequestError, NotFoundError } from '../framework/errors';
import { paginateArray, type ListQuery } from '../framework/paginate';
import { isBoxItStaff } from '../auth/is-staff';
import { registerTenantRoutes } from './tenants';

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

export function registerApiRoutes(app: FastifyInstance): void {
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

  app.get('/api/tickets', async (req) => {
    const tenantId = tenantFrom(req);
    const created = await demoTicketRepo(app.db).list(tenantId);
    const tickets = [...created, ...getSeed(tenantId).tickets].map((ticket) => publicTicket(ticket, isBoxItStaff(req.adminIdentity)));
    return paginateArray(tickets as unknown as Record<string, unknown>[], listQuery((req.query as Record<string, unknown>) ?? {}));
  });
  app.get('/api/tickets/:id', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const id = (req.params as { id: string }).id;
    const ticket = await demoTicketRepo(app.db).get(tenantId, id) ?? getSeed(tenantId).tickets.find((item) => item.id === id);
    if (!ticket) return reply.status(404).send({ error: { code: 'not_found', message: 'Ticket not found' } });
    return publicTicket(ticket, isBoxItStaff(req.adminIdentity));
  });
  app.post('/api/tickets', async (req, reply) => {
    const tenantId = tenantFrom(req);
    const input = req.body as CreateTicketInput;
    if (!input?.subject?.trim() || !input.body?.trim() || !input.requesterId || !input.category || !input.priority) {
      throw new BadRequestError('subject, body, requesterId, category, and priority are required');
    }
    const ticket = await demoTicketRepo(app.db).create(newTicket(tenantId, input));
    return reply.status(201).send(ticket);
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
