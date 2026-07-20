import { getSeed } from '@/data/index';
import type { AssetService, Page, ListParams, Asset } from '../types';
import { withLatency, paginate } from './util';

export const mockAssetService: AssetService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Asset>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.assets as unknown as Record<string, unknown>[], params) as unknown as Page<Asset>);
  },

  async get(tenantId: string, id: string): Promise<Asset | null> {
    const seed = getSeed(tenantId);
    const asset = seed.assets.find((a) => a.id === id) ?? null;
    return withLatency(asset);
  },
};
