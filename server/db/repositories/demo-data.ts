import { and, desc, eq } from 'drizzle-orm';
import type { FormSubmission, Ticket, TicketMessage, TicketStatus } from '@/services/types';
import type { AppDb } from '../client';
import { demoTicketMutations, demoTickets, formSubmissions } from '../schema';

export interface DemoTicketMutation {
  status: TicketStatus | null;
  replies: TicketMessage[];
  updatedAt: string;
}

export function demoTicketRepo(db: AppDb) {
  return {
    async list(tenantId: string): Promise<Ticket[]> {
      return db.select({ data: demoTickets.data }).from(demoTickets)
        .where(eq(demoTickets.tenantId, tenantId)).orderBy(desc(demoTickets.createdAt)).all()
        .map((row) => row.data);
    },
    async get(tenantId: string, id: string): Promise<Ticket | undefined> {
      return db.select({ data: demoTickets.data }).from(demoTickets)
        .where(and(eq(demoTickets.tenantId, tenantId), eq(demoTickets.id, id))).get()?.data;
    },
    async create(ticket: Ticket): Promise<Ticket> {
      db.insert(demoTickets).values({ id: ticket.id, tenantId: ticket.tenantId, data: ticket }).run();
      return ticket;
    },
  };
}

export function demoTicketMutationRepo(db: AppDb) {
  const mutationId = (tenantId: string, ticketId: string) => `${tenantId}:${ticketId}`;

  return {
    async list(tenantId: string): Promise<Map<string, DemoTicketMutation>> {
      const rows = db.select({
        ticketId: demoTicketMutations.ticketId,
        status: demoTicketMutations.status,
        replies: demoTicketMutations.replies,
        updatedAt: demoTicketMutations.updatedAt,
      }).from(demoTicketMutations).where(eq(demoTicketMutations.tenantId, tenantId)).all();
      return new Map(rows.map((row) => [row.ticketId, {
        status: row.status,
        replies: row.replies,
        updatedAt: row.updatedAt,
      }]));
    },
    async get(tenantId: string, ticketId: string): Promise<DemoTicketMutation | undefined> {
      return db.select({
        status: demoTicketMutations.status,
        replies: demoTicketMutations.replies,
        updatedAt: demoTicketMutations.updatedAt,
      }).from(demoTicketMutations).where(and(
        eq(demoTicketMutations.tenantId, tenantId),
        eq(demoTicketMutations.ticketId, ticketId),
      )).get();
    },
    async setStatus(tenantId: string, ticketId: string, status: TicketStatus, updatedAt: string): Promise<DemoTicketMutation> {
      const current = await this.get(tenantId, ticketId);
      db.insert(demoTicketMutations).values({
        id: mutationId(tenantId, ticketId), tenantId, ticketId, status,
        replies: current?.replies ?? [], updatedAt,
      }).onConflictDoUpdate({
        target: demoTicketMutations.id,
        set: { status, updatedAt },
      }).run();
      return { status, replies: current?.replies ?? [], updatedAt };
    },
    async addReply(tenantId: string, ticketId: string, reply: TicketMessage): Promise<DemoTicketMutation> {
      const current = await this.get(tenantId, ticketId);
      const replies = [...(current?.replies ?? []), reply];
      db.insert(demoTicketMutations).values({
        id: mutationId(tenantId, ticketId), tenantId, ticketId,
        status: current?.status, replies, updatedAt: reply.at,
      }).onConflictDoUpdate({
        target: demoTicketMutations.id,
        set: { replies, updatedAt: reply.at },
      }).run();
      return { status: current?.status ?? null, replies, updatedAt: reply.at };
    },
  };
}

export function formSubmissionRepo(db: AppDb) {
  return {
    async list(tenantId: string, submittedBy: string): Promise<FormSubmission[]> {
      return db.select().from(formSubmissions)
        .where(and(eq(formSubmissions.tenantId, tenantId), eq(formSubmissions.submittedBy, submittedBy)))
        .orderBy(desc(formSubmissions.submittedAt)).all();
    },
    async create(submission: FormSubmission): Promise<FormSubmission> {
      return db.insert(formSubmissions).values(submission).returning().get();
    },
  };
}
