import { getSeed } from '@/data/index';
import type { BudgetService, Page, ListParams, BudgetLine } from '../types';
import { withLatency, paginate } from './util';

export const mockBudgetService: BudgetService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<BudgetLine>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.budgetLines as unknown as Record<string, unknown>[], params) as unknown as Page<BudgetLine>);
  },
};
