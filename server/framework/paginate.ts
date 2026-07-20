import type { ListParams, Page } from '@/services/types';

export interface ListQuery extends ListParams {
  page: number;
  pageSize: number;
}

export function paginateArray<T extends Record<string, unknown>>(items: readonly T[], query: ListQuery): Page<T> {
  const { page, pageSize, search, sortBy, sortDir = 'asc', filters } = query;
  let result = [...items];
  if (search?.trim()) {
    const needle = search.trim().toLowerCase();
    result = result.filter((item) => Object.values(item).some((value) => typeof value === 'string' && value.toLowerCase().includes(needle)));
  }
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
      result = result.filter((item) => Array.isArray(value) ? value.includes(String(item[key])) : String(item[key]) === value);
    }
  }
  if (sortBy) {
    result.sort((left, right) => {
      const a = left[sortBy];
      const b = right[sortBy];
      if (typeof a === 'string' && typeof b === 'string') return sortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      if (typeof a === 'number' && typeof b === 'number') return sortDir === 'asc' ? a - b : b - a;
      return 0;
    });
  }
  const total = result.length;
  const start = (page - 1) * pageSize;
  return { data: result.slice(start, start + pageSize), page, pageSize, total };
}
