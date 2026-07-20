import type { ActionDef, ActionStep, ActionTicketConfig, TicketPriority } from '@/services/types';
import type { AppDb } from '../db/client';
import { actionDefRepo, auditRepo, newId } from '../db/repositories';
import type { ActionDefRow, NewActionDef } from '../db/schema';
import type { ConfigStore } from '../framework/config-store';
import { ApiError, NotFoundError } from '../framework/errors';

export interface ActionDefDeps {
  db: AppDb;
  actor: string;
  configStore: ConfigStore;
}

export interface CreateActionDefInput {
  tenantId: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  enabled?: boolean;
  steps?: ActionStep[];
  ticket: ActionTicketConfig;
}

export interface UpdateActionDefPatch {
  key?: string;
  title?: string;
  description?: string;
  icon?: string;
  category?: string;
  enabled?: boolean;
  steps?: ActionStep[];
  ticket?: ActionTicketConfig;
}

const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

function toDto(row: ActionDefRow): ActionDef {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    icon: row.icon,
    category: row.category,
    enabled: row.enabled,
    steps: row.steps as ActionStep[],
    ticket: row.ticket as ActionTicketConfig,
  };
}

function assertValidTicket(ticket: ActionTicketConfig): void {
  if (!ticket.summaryTemplate?.trim()) throw new ApiError(400, 'bad_request', 'summaryTemplate is required');
  if (!ticket.descriptionTemplate?.trim()) throw new ApiError(400, 'bad_request', 'descriptionTemplate is required');
  if (!TICKET_PRIORITIES.includes(ticket.priority)) {
    throw new ApiError(400, 'bad_request', `Invalid priority: ${ticket.priority}`);
  }
  if (!ticket.category?.trim()) throw new ApiError(400, 'bad_request', 'category is required');
}

export async function listActionDefs(deps: ActionDefDeps, tenantId: string): Promise<ActionDef[]> {
  const rows = await actionDefRepo(deps.db).listByTenant(tenantId);
  return rows.map(toDto);
}

export async function createActionDef(deps: ActionDefDeps, input: CreateActionDefInput): Promise<ActionDef> {
  const { db, actor, configStore } = deps;
  const repo = actionDefRepo(db);

  const tenantId = input.tenantId?.trim();
  if (!tenantId) throw new ApiError(400, 'bad_request', 'tenantId is required');
  const key = input.key?.trim();
  if (!key) throw new ApiError(400, 'bad_request', 'key is required');
  if (!input.title?.trim()) throw new ApiError(400, 'bad_request', 'title is required');
  assertValidTicket(input.ticket);

  if (await repo.getByTenantAndKey(tenantId, key)) {
    throw new ApiError(409, 'conflict', `Action key "${key}" already exists for this client`);
  }

  const row = await repo.create({
    id: newId('actdef_'),
    tenantId,
    key,
    title: input.title.trim(),
    description: input.description ?? '',
    icon: input.icon ?? 'Package',
    category: input.category ?? '',
    enabled: input.enabled ?? true,
    steps: input.steps ?? [],
    ticket: input.ticket,
  } satisfies NewActionDef);

  await auditRepo(db).write({ actor, action: 'actiondef.create', target: row.id, metadata: { tenantId, key } });
  await configStore.reload();
  return toDto(row);
}

export async function updateActionDef(deps: ActionDefDeps, id: string, patch: UpdateActionDefPatch): Promise<ActionDef> {
  const { db, actor, configStore } = deps;
  const repo = actionDefRepo(db);

  const existing = await repo.getById(id);
  if (!existing) throw new NotFoundError(`Action ${id} not found`);

  if (patch.key !== undefined) {
    const key = patch.key.trim();
    if (!key) throw new ApiError(400, 'bad_request', 'key is required');
    const other = await repo.getByTenantAndKey(existing.tenantId, key);
    if (other && other.id !== id) {
      throw new ApiError(409, 'conflict', `Action key "${key}" already exists for this client`);
    }
  }
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new ApiError(400, 'bad_request', 'title is required');
  }
  if (patch.ticket !== undefined) assertValidTicket(patch.ticket);

  const updates: Partial<NewActionDef> = {};
  if (patch.key !== undefined) updates.key = patch.key.trim();
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.icon !== undefined) updates.icon = patch.icon;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.steps !== undefined) updates.steps = patch.steps;
  if (patch.ticket !== undefined) updates.ticket = patch.ticket;

  const updated = await repo.update(id, updates);

  await auditRepo(db).write({ actor, action: 'actiondef.update', target: id, metadata: { tenantId: existing.tenantId } });
  await configStore.reload();
  return toDto(updated);
}

export async function deleteActionDef(deps: ActionDefDeps, id: string): Promise<void> {
  const { db, actor, configStore } = deps;
  const repo = actionDefRepo(db);

  const existing = await repo.getById(id);
  if (!existing) throw new NotFoundError(`Action ${id} not found`);

  await repo.remove(id);

  await auditRepo(db).write({ actor, action: 'actiondef.delete', target: id, metadata: { tenantId: existing.tenantId } });
  await configStore.reload();
}
