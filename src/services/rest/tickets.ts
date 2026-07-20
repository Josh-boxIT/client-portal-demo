import type {
  TicketService,
  Page,
  ListParams,
  Ticket,
  CreateTicketInput,
  CreateTicketReplyInput,
  UpdateTicketStatusInput,
} from '../types';
import { rest } from './client';

/** Seeded tickets plus SQLite-persisted demo tickets. */
export const restTicketService: TicketService = {
  list(tenantId: string, params?: ListParams): Promise<Page<Ticket>> {
    return rest.list<Ticket>(tenantId, 'tickets', params);
  },
  get(tenantId: string, id: string): Promise<Ticket | null> {
    return rest.getOrNull<Ticket>(tenantId, 'tickets', id);
  },
  create(tenantId: string, input: CreateTicketInput): Promise<Ticket> {
    return rest.create<Ticket>(tenantId, 'tickets', input);
  },
  updateStatus(tenantId: string, id: string, input: UpdateTicketStatusInput): Promise<Ticket> {
    return rest.updatePath<Ticket>(tenantId, `tickets/${encodeURIComponent(id)}/status`, input);
  },
  reply(tenantId: string, id: string, input: CreateTicketReplyInput): Promise<Ticket> {
    return rest.createPath<Ticket>(tenantId, `tickets/${encodeURIComponent(id)}/replies`, input);
  },
};
