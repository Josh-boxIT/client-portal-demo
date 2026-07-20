import { getSeed } from '@/data/index';
import type { QBRService, Page, ListParams, QBR } from '../types';
import { withLatency, paginate } from './util';

export const mockQBRService: QBRService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<QBR>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.qbrs as unknown as Record<string, unknown>[], params) as unknown as Page<QBR>);
  },

  async get(tenantId: string, id: string): Promise<QBR | null> {
    const seed = getSeed(tenantId);
    const qbr = seed.qbrs.find((q) => q.id === id) ?? null;
    return withLatency(qbr);
  },
};
