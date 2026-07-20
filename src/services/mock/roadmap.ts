import { getSeed } from '@/data/index';
import type { RoadmapService, Page, ListParams, RoadmapItem } from '../types';
import { withLatency, paginate } from './util';

export const mockRoadmapService: RoadmapService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<RoadmapItem>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.roadmap as unknown as Record<string, unknown>[], params) as unknown as Page<RoadmapItem>);
  },

  async get(tenantId: string, id: string): Promise<RoadmapItem | null> {
    const seed = getSeed(tenantId);
    const item = seed.roadmap.find((r) => r.id === id) ?? null;
    return withLatency(item);
  },
};
