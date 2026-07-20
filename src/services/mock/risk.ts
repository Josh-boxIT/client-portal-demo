import { getSeed } from '@/data/index';
import type { RiskService, Page, ListParams, Risk } from '../types';
import { withLatency, paginate } from './util';

export const mockRiskService: RiskService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Risk>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.risks as unknown as Record<string, unknown>[], params) as unknown as Page<Risk>);
  },

  async get(tenantId: string, id: string): Promise<Risk | null> {
    const seed = getSeed(tenantId);
    const risk = seed.risks.find((r) => r.id === id) ?? null;
    return withLatency(risk);
  },
};
