import { getSeed } from '@/data/index';
import type { DocumentService, Page, ListParams, Document } from '../types';
import { withLatency, paginate } from './util';

export const mockDocumentService: DocumentService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<Document>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.documents as unknown as Record<string, unknown>[], params) as unknown as Page<Document>);
  },

  async get(tenantId: string, id: string): Promise<Document | null> {
    const seed = getSeed(tenantId);
    const doc = seed.documents.find((d) => d.id === id) ?? null;
    return withLatency(doc);
  },
};
