import { ACTION_DEFS } from '@/data/actions';
import type { ActionService, Page, ListParams, ActionDef } from '../types';
import { withLatency, paginate } from './util';

export const mockActionService: ActionService = {
  async listDefs(_tenantId: string, params?: ListParams): Promise<Page<ActionDef>> {
    return withLatency(paginate(ACTION_DEFS as unknown as Record<string, unknown>[], params) as unknown as Page<ActionDef>);
  },

  async getDef(_tenantId: string, key: string): Promise<ActionDef | null> {
    const def = ACTION_DEFS.find((a) => a.key === key) ?? null;
    return withLatency(def);
  },
};
