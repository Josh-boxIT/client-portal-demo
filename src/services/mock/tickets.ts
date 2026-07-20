import { getSeed } from '@/data/index';
import type {
  TicketService,
  Page,
  ListParams,
  Ticket,
  CreateTicketInput,
  CreateTicketReplyInput,
  UpdateTicketStatusInput,
} from '../types';
import { withLatency, paginate } from './util';

const changedTickets = new Map<string, Ticket>();

function key(tenantId: string, ticketId: string): string {
  return `${tenantId}:${ticketId}`;
}

function currentTicket(tenantId: string, id: string): Ticket | null {
  return changedTickets.get(key(tenantId, id)) ?? getSeed(tenantId).tickets.find((ticket) => ticket.id === id) ?? null;
}

export const mockTicketService: TicketService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Ticket>> {
    const seed = getSeed(tenantId);
    const tickets = seed.tickets.map((ticket) => changedTickets.get(key(tenantId, ticket.id)) ?? ticket);
    return withLatency(paginate(tickets as unknown as Record<string, unknown>[], params) as unknown as Page<Ticket>);
  },

  async get(tenantId: string, id: string): Promise<Ticket | null> {
    return withLatency(currentTicket(tenantId, id));
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
    changedTickets.set(key(tenantId, ticket.id), ticket);
    return withLatency(ticket);
  },

  async updateStatus(tenantId: string, id: string, input: UpdateTicketStatusInput): Promise<Ticket> {
    const ticket = currentTicket(tenantId, id);
    if (!ticket) throw new Error('Ticket not found');
    const updated: Ticket = {
      ...ticket,
      status: input.status,
      isClosed: input.status === 'closed',
      updatedAt: new Date().toISOString(),
    };
    changedTickets.set(key(tenantId, id), updated);
    return withLatency(updated);
  },

  async reply(tenantId: string, id: string, input: CreateTicketReplyInput): Promise<Ticket> {
    const ticket = currentTicket(tenantId, id);
    if (!ticket) throw new Error('Ticket not found');
    const now = new Date().toISOString();
    const updated: Ticket = {
      ...ticket,
      updatedAt: now,
      messages: [
        ...ticket.messages,
        {
          id: `msg-${Date.now()}`,
          author: 'You',
          authorType: 'requester',
          body: input.body.trim(),
          at: now,
        },
      ],
    };
    changedTickets.set(key(tenantId, id), updated);
    return withLatency(updated);
  },
};
