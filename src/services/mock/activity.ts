import { getSeed } from '@/data/index';
import type { ActivityService, Page, ListParams, ActivityItem } from '../types';
import { withLatency, paginate } from './util';

export const mockActivityService: ActivityService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<ActivityItem>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.activity as unknown as Record<string, unknown>[], params) as unknown as Page<ActivityItem>);
  },
};
