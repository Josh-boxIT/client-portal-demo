import { getSeed } from '@/data/index';
import type { TicketService, Page, ListParams, Ticket, CreateTicketInput } from '../types';
import { withLatency, paginate } from './util';

export const mockTicketService: TicketService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Ticket>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.tickets as unknown as Record<string, unknown>[], params) as unknown as Page<Ticket>);
  },

  async get(tenantId: string, id: string): Promise<Ticket | null> {
    const seed = getSeed(tenantId);
    const ticket = seed.tickets.find((t) => t.id === id) ?? null;
    return withLatency(ticket);
  },

  async create(tenantId: string, input: CreateTicketInput): Promise<Ticket> {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: `session-tkt-${Date.now()}`,
      tenantId,
      number: `TKT-${Math.floor(Math.random() * 9000) + 1000}`,
      subject: input.subject,
      status: 'open',
      isClosed: false,
      priority: input.priority,
      requesterId: input.requesterId,
      createdAt: now,
      updatedAt: now,
      category: input.category,
      messages: [
        {
          id: `msg-${Date.now()}`,
          author: 'You',
          authorType: 'requester',
          body: input.body,
          at: now,
        },
      ],
    };
    return withLatency(ticket);
  },
};
