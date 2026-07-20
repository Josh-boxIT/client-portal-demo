import { getSeed } from '@/data/index';
import type { FormService, Page, ListParams, FormDef, FormSubmission } from '../types';
import { withLatency, paginate } from './util';

export const mockFormService: FormService = {
  async list(tenantId: string, params?: ListParams): Promise<Page<FormDef>> {
    const seed = getSeed(tenantId);
    return withLatency(paginate(seed.forms as unknown as Record<string, unknown>[], params) as unknown as Page<FormDef>);
  },

  async get(tenantId: string, id: string): Promise<FormDef | null> {
    const seed = getSeed(tenantId);
    const form = seed.forms.find((f) => f.id === id) ?? null;
    return withLatency(form);
  },

  async submit(
    tenantId: string,
    formId: string,
    values: Record<string, unknown>,
    submittedBy: string
  ): Promise<FormSubmission> {
    const submission: FormSubmission = {
      id: `sub-${Date.now()}`,
      formId,
      tenantId,
      values,
      submittedAt: new Date().toISOString(),
      submittedBy,
    };
    return withLatency(submission);
  },

  async listSubmissions(): Promise<Page<FormSubmission>> {
    return withLatency({ data: [], page: 1, pageSize: 25, total: 0 });
  },
};
