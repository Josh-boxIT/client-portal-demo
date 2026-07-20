import { and, desc, eq } from 'drizzle-orm';
import type { FormSubmission, Ticket } from '@/services/types';
import type { AppDb } from '../client';
import { demoTickets, formSubmissions } from '../schema';

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
