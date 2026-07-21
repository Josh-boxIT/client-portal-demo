import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type {
  ActionStep,
  ActionTicketConfig,
  FormSubmission,
  AssistantCitation,
  Ticket,
  TicketMessage,
  TicketStatus,
  ProductPricingModel,
  SalesOpportunityAnalysis,
  SalesOpportunityFinding,
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
  displayName: text('display_name'),
  vertical: text('vertical'),
  theme: text('theme', { mode: 'json' }).$type<TenantThemeTokens>().notNull(),
  logo: text('logo', { mode: 'json' }).$type<LogoDescriptor>().notNull(),
  supportPhone: text('support_phone'),
  supportHours: text('support_hours'),
  connectWiseCompanyId: integer('connectwise_company_id'),
  ninjaOneOrganizationId: integer('ninjaone_organization_id'),
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

export const productCatalog = sqliteTable('product_catalog', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull(),
  pricingModel: text('pricing_model').$type<ProductPricingModel>().notNull(),
  monthlyPriceLow: integer('monthly_price_low').notNull(),
  monthlyPriceHigh: integer('monthly_price_high').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
}, (table) => ({
  normalizedNameUnique: uniqueIndex('product_catalog_normalized_name_uq').on(table.normalizedName),
}));

export const salesOpportunityAnalyses = sqliteTable('sales_opportunity_analyses', {
  tenantId: text('tenant_id').primaryKey().references(() => tenants.id),
  analyzedAt: text('analyzed_at').notNull(),
  model: text('model').notNull(),
  sourceSummary: text('source_summary', { mode: 'json' }).$type<SalesOpportunityAnalysis['sourceSummary']>().notNull(),
  findings: text('findings', { mode: 'json' }).$type<SalesOpportunityFinding[]>().notNull(),
  updatedAt: text('updated_at').notNull().default(now),
});

export const salesOpportunityHandoffs = sqliteTable('sales_opportunity_handoffs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  fingerprint: text('fingerprint').notNull(),
  sentAt: text('sent_at').notNull(),
  sentBy: text('sent_by').notNull(),
  payload: text('payload', { mode: 'json' }).$type<SalesOpportunityFinding>().notNull(),
}, (table) => ({
  tenantFingerprintUnique: uniqueIndex('sales_opportunity_handoff_tenant_fingerprint_uq')
    .on(table.tenantId, table.fingerprint),
}));

export const churnNarratives = sqliteTable('churn_narratives', {
  tenantId: text('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull(),
  assessment: text('assessment').notNull(),
  suggestedActions: text('suggested_actions').notNull(),
  generatedAt: text('generated_at').notNull(),
  model: text('model').notNull(),
  updatedAt: text('updated_at').notNull().default(now),
});

export const demoTickets = sqliteTable('demo_tickets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  data: text('data', { mode: 'json' }).$type<Ticket>().notNull(),
  createdAt: text('created_at').notNull().default(now),
}, (table) => ({
  tenantIndex: index('demo_tickets_tenant_idx').on(table.tenantId),
}));

export type ConnectWiseCacheResource =
  | 'company'
  | 'invoices'
  | 'people'
  | 'devices'
  | 'tickets'
  | 'ticket-details'
  | 'agreements';

/** Last successful normalized ConnectWise snapshot for each tenant/resource. */
export const connectWiseCacheSnapshots = sqliteTable('connectwise_cache_snapshots', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  resource: text('resource').$type<ConnectWiseCacheResource>().notNull(),
  syncedAt: text('synced_at').notNull(),
}, (table) => ({
  tenantResourceUnique: uniqueIndex('connectwise_cache_snapshots_tenant_resource_uq')
    .on(table.tenantId, table.resource),
}));

/** Individually upserted entities belonging to a successful cache snapshot. */
export const connectWiseCacheEntries = sqliteTable('connectwise_cache_entries', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  resource: text('resource').$type<ConnectWiseCacheResource>().notNull(),
  entityId: text('entity_id').notNull(),
  data: text('data', { mode: 'json' }).$type<unknown>().notNull(),
  position: integer('position').notNull(),
  syncedAt: text('synced_at').notNull(),
}, (table) => ({
  tenantResourceEntityUnique: uniqueIndex('connectwise_cache_entries_tenant_resource_entity_uq')
    .on(table.tenantId, table.resource, table.entityId),
  tenantResourcePositionIndex: index('connectwise_cache_entries_tenant_resource_position_idx')
    .on(table.tenantId, table.resource, table.position),
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

export const assistantConversations = sqliteTable('assistant_conversations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New conversation'),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
}, (table) => ({
  ownerTenantUpdatedIndex: index('assistant_conversations_owner_tenant_updated_idx')
    .on(table.userId, table.tenantId, table.updatedAt),
}));

export const assistantMessages = sqliteTable('assistant_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull()
    .references(() => assistantConversations.id, { onDelete: 'cascade' }),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  requestId: text('request_id'),
  citations: text('citations', { mode: 'json' }).$type<AssistantCitation[]>().notNull(),
  createdAt: text('created_at').notNull().default(now),
}, (table) => ({
  conversationCreatedIndex: index('assistant_messages_conversation_created_idx')
    .on(table.conversationId, table.createdAt),
  conversationRequestUnique: uniqueIndex('assistant_messages_conversation_request_uq')
    .on(table.conversationId, table.requestId),
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export function tenantDisplayName(tenant: Pick<Tenant, 'name' | 'displayName'>): string {
  return tenant.displayName?.trim() || tenant.name;
}

export type AuditEntry = typeof auditLog.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type ActionDefRow = typeof actionDefs.$inferSelect;
export type NewActionDef = typeof actionDefs.$inferInsert;
export type DemoTicketRow = typeof demoTickets.$inferSelect;
export type ConnectWiseCacheEntryRow = typeof connectWiseCacheEntries.$inferSelect;
export type FormSubmissionRow = typeof formSubmissions.$inferSelect;
export type AssistantConversationRow = typeof assistantConversations.$inferSelect;
export type AssistantMessageRow = typeof assistantMessages.$inferSelect;
export type ProductCatalogRow = typeof productCatalog.$inferSelect;
export type NewProductCatalogRow = typeof productCatalog.$inferInsert;
export type SalesOpportunityAnalysisRow = typeof salesOpportunityAnalyses.$inferSelect;
export type SalesOpportunityHandoffRow = typeof salesOpportunityHandoffs.$inferSelect;
