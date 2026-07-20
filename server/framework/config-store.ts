import type { ActionDef } from '@/services/types';
import type { AppDb } from '../db/client';
import { actionDefRepo, tenantRepo } from '../db/repositories';
import type { ActionDefRow, Tenant } from '../db/schema';

function toActionDef(row: ActionDefRow): ActionDef {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    icon: row.icon,
    category: row.category,
    enabled: row.enabled,
    steps: row.steps,
    ticket: row.ticket,
  };
}

export class ConfigStore {
  private tenantRows = new Map<string, Tenant>();
  private actions = new Map<string, ActionDef[]>();

  constructor(private readonly db: AppDb) {}

  async reload(): Promise<void> {
    const [tenants, actionDefs] = await Promise.all([
      tenantRepo(this.db).list(),
      actionDefRepo(this.db).list(),
    ]);
    this.tenantRows = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    this.actions = new Map();
    for (const row of actionDefs) {
      const list = this.actions.get(row.tenantId) ?? [];
      list.push(toActionDef(row));
      this.actions.set(row.tenantId, list);
    }
  }

  tenants(): Tenant[] {
    return [...this.tenantRows.values()];
  }

  tenantById(id: string): Tenant | undefined {
    return this.tenantRows.get(id);
  }

  actionDefsForTenant(tenantId: string): ActionDef[] {
    return this.actions.get(tenantId) ?? [];
  }
}
