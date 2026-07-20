import type { ActionService, Page, ListParams, ActionDef } from '../types';
import { rest } from './client';

/** Actions via the normalized `/api/actions` — portal-native (not connector-backed),
 *  so the backend returns enabled defs for the tenant as a plain array, not a `Page<T>`. */
export const restActionService: ActionService = {
  async listDefs(tenantId: string, params?: ListParams): Promise<Page<ActionDef>> {
    const defs = await rest.getPath<ActionDef[]>(tenantId, 'actions');
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? (defs.length || 1);
    const start = (page - 1) * pageSize;
    return {
      data: defs.slice(start, start + pageSize),
      page,
      pageSize,
      total: defs.length,
    };
  },
  getDef(tenantId: string, key: string): Promise<ActionDef | null> {
    return rest.getOrNullPath<ActionDef>(tenantId, `actions/${encodeURIComponent(key)}`);
  },
};
