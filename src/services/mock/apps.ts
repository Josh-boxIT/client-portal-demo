import { getSeed } from '@/data/index';
import type { AppLaunchpadService, Page, ListParams, AppTile } from '../types';
import { withLatency, paginate } from './util';

export const mockAppLaunchpadService: AppLaunchpadService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<AppTile>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.apps as unknown as Record<string, unknown>[], params) as unknown as Page<AppTile>);
  },
};
