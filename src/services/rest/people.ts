import type { ListParams, Page, PeopleService, Person } from '../types';
import { rest } from './client';

export const restPeopleService: PeopleService = {
  list(tenantId: string, params?: ListParams): Promise<Page<Person>> {
    return rest.list<Person>(tenantId, 'people', params);
  },
  get(tenantId: string, id: string): Promise<Person | null> {
    return rest.getOrNull<Person>(tenantId, 'people', id);
  },
  resolveM365Licenses(tenantId: string, id: string): Promise<string[]> {
    return rest.getPath<string[]>(tenantId, `people/${encodeURIComponent(id)}/m365-licenses`);
  },
};
