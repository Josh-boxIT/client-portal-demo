import type { FormService, FormSubmission, ListParams, Page } from '../types';
import { mockFormService } from '../mock/forms';
import { rest } from './client';

function submissionPath(submittedBy: string, params?: ListParams): string {
  const query = new URLSearchParams({ submittedBy });
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return `form-submissions?${query.toString()}`;
}

export const persistentFormService: FormService = {
  list: mockFormService.list,
  get: mockFormService.get,
  submit(tenantId, formId, values, submittedBy) {
    return rest.create<FormSubmission>(tenantId, `forms/${encodeURIComponent(formId)}/submissions`, { values, submittedBy });
  },
  listSubmissions(tenantId, submittedBy, params) {
    return rest.getPath<Page<FormSubmission>>(tenantId, submissionPath(submittedBy, params));
  },
};
