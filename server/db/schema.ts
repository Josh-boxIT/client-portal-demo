import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type {
  ActionStep,
  ActionTicketConfig,
  FormSubmission,
  Ticket,
  TicketMessage,
  TicketStatus,
} from '@/services/types';

export const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export type AdminRole = 'admin' | 'editor' | 'viewer';

export interface TenantThemeTokens {
  primary: string;
  accent: string;
  primaryForeground?: string;
  accentForeground?: string;
  ring?: string;
  sidebarGradient: string;
}

export type LogoDescriptor =
  | { kind: 'builtin'; key: string }
  | { kind: 'generated'; shape: string; primary: string; accent: string; text: string };

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  vertical: text('vertical'),
  theme: text('theme', { mode: 'json' }).$type<TenantThemeTokens>().notNull(),
  logo: text('logo', { mode: 'json' }).$type<LogoDescriptor>().notNull(),
  supportPhone: text('support_phone'),
  supportHours: text('support_hours'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  target: text('target'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  timestamp: text('timestamp').notNull().default(now),
});

export const adminUsers = sqliteTable('admin_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').$type<AdminRole>().notNull().default('viewer'),
  status: text('status').$type<'active' | 'disabled'>().notNull().default('active'),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
});

export const adminUserClientAccess = sqliteTable('admin_user_client_access', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => adminUsers.id),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  createdAt: text('created_at').notNull().default(now),
}, (table) => ({
  userTenantUnique: uniqueIndex('admin_user_client_uq').on(table.userId, table.tenantId),
}));

export const actionDefs = sqliteTable('action_defs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  key: text('key').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  steps: text('steps', { mode: 'json' }).$type<ActionStep[]>().notNull(),
  ticket: text('ticket', { mode: 'json' }).$type<ActionTicketConfig>().notNull(),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
}, (table) => ({
  tenantKeyUnique: uniqueIndex('action_defs_tenant_key_uq').on(table.tenantId, table.key),
}));

export const demoTickets = sqliteTable('demo_tickets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  data: text('data', { mode: 'json' }).$type<Ticket>().notNull(),
  createdAt: text('created_at').notNull().default(now),
}, (table) => ({
  tenantIndex: index('demo_tickets_tenant_idx').on(table.tenantId),
}));

/** Mutable fields layered over canonical seeded tickets (and demo-created tickets). */
export const demoTicketMutations = sqliteTable('demo_ticket_mutations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  ticketId: text('ticket_id').notNull(),
  status: text('status').$type<TicketStatus>(),
  replies: text('replies', { mode: 'json' }).$type<TicketMessage[]>().notNull(),
  updatedAt: text('updated_at').notNull().default(now),
}, (table) => ({
  tenantTicketUnique: uniqueIndex('demo_ticket_mutations_tenant_ticket_uq').on(table.tenantId, table.ticketId),
  tenantIndex: index('demo_ticket_mutations_tenant_idx').on(table.tenantId),
}));

export const formSubmissions = sqliteTable('form_submissions', {
  id: text('id').primaryKey(),
  formId: text('form_id').notNull(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  values: text('values', { mode: 'json' }).$type<FormSubmission['values']>().notNull(),
  submittedAt: text('submitted_at').notNull(),
  submittedBy: text('submitted_by').notNull(),
}, (table) => ({
  tenantSubmitterIndex: index('form_submissions_tenant_submitter_idx').on(table.tenantId, table.submittedBy),
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type AuditEntry = typeof auditLog.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type ActionDefRow = typeof actionDefs.$inferSelect;
export type NewActionDef = typeof actionDefs.$inferInsert;
export type DemoTicketRow = typeof demoTickets.$inferSelect;
export type FormSubmissionRow = typeof formSubmissions.$inferSelect;
