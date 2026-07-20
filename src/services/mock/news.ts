import { getSeed } from '@/data/index';
import type { NewsService, Page, ListParams, NewsItem } from '../types';
import { withLatency, paginate } from './util';

export const mockNewsService: NewsService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<NewsItem>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.news as unknown as Record<string, unknown>[], params) as unknown as Page<NewsItem>);
  },

  async get(tenantId: string, id: string): Promise<NewsItem | null> {
    const seed = getSeed(tenantId);
    const item = seed.news.find((n) => n.id === id) ?? null;
    return withLatency(item);
  },
};
