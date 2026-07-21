import type { Asset, AssetService, ListParams, Page } from '../types';
import { rest } from './client';

export const restAssetService: AssetService = {
  list(tenantId: string, params?: ListParams): Promise<Page<Asset>> {
    return rest.list<Asset>(tenantId, 'assets', params);
  },
  get(tenantId: string, id: string): Promise<Asset | null> {
    return rest.getOrNull<Asset>(tenantId, 'assets', id);
  },
};
