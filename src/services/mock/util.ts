import type { Page, ListParams } from '../types';

/**
 * Simulate network latency between 150–500ms.
 */
export function withLatency<T>(value: T): Promise<T> {
  const ms = 150 + Math.random() * 350;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Apply search, sort, and pagination to an in-memory array.
 */
export function paginate<T extends Record<string, unknown>>(
  items: T[],
  params?: ListParams
): Page<T> {
  const {
    page = 1,
    pageSize = 20,
    search,
    sortBy,
    sortDir = 'asc',
    filters,
  } = params ?? {};

  let result = [...items];

  // Basic full-text search over string values
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((item) =>
      Object.values(item).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(q)
      )
    );
  }

  // Apply filters
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
        continue;
      result = result.filter((item) => {
        const itemVal = item[key];
        if (Array.isArray(value)) {
          return value.includes(String(itemVal));
        }
        return String(itemVal) === value;
      });
    }
  }

  // Sort
  if (sortBy) {
    result = result.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
  }

  const total = result.length;
  const start = (page - 1) * pageSize;
  const data = result.slice(start, start + pageSize);

  return { data, page, pageSize, total };
}
