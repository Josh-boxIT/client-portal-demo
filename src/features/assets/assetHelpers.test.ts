import { describe, expect, it } from 'vitest';
import type { Asset } from '@/services/types';
import {
  hasValidDate,
  refreshDueClass,
  shouldShowNoWarrantyByDefault,
  sortAssets,
  warrantyClass,
  warrantyLabel,
} from './assetHelpers';

function asset(id: string, dates: Pick<Asset, 'warrantyEnd' | 'refreshDue'> = {}): Asset {
  return {
    id,
    tenantId: 'brightwater',
    name: id,
    category: 'hardware',
    type: 'Workstation',
    status: 'in-service',
    model: '',
    ...dates,
  };
}

describe('asset date presentation', () => {
  it('renders missing and malformed dates without warnings', () => {
    expect(hasValidDate(undefined)).toBe(false);
    expect(hasValidDate('not-a-date')).toBe(false);
    expect(warrantyLabel()).toBe('—');
    expect(warrantyClass()).toBe('');
    expect(refreshDueClass()).toBe('');
  });

  it('labels expired, approaching, and later warranties', () => {
    expect(warrantyLabel('2026-06-29')).toContain('(expired)');
    expect(warrantyClass('2026-06-29')).toBe('text-red-600 font-semibold');
    expect(warrantyLabel('2026-07-30')).toContain('(30d left)');
    expect(warrantyClass('2026-07-30')).toBe('text-yellow-600 font-medium');
    expect(warrantyClass('2027-07-30')).toBe('');
  });

  it('sorts assets with absent vendor dates deterministically', () => {
    const rows = [asset('later', { warrantyEnd: '2028-01-01' }), asset('missing'), asset('earlier', { warrantyEnd: '2027-01-01' })];
    expect(sortAssets(rows, 'warrantyEnd', 'asc').map((row) => row.id)).toEqual(['missing', 'earlier', 'later']);
    expect(sortAssets(rows, 'warrantyEnd', 'desc').map((row) => row.id)).toEqual(['later', 'earlier', 'missing']);
  });

  it('shows warranty-less inventories by default without overriding mixed inventories', () => {
    expect(shouldShowNoWarrantyByDefault([])).toBe(false);
    expect(shouldShowNoWarrantyByDefault([asset('missing')])).toBe(true);
    expect(shouldShowNoWarrantyByDefault([asset('missing'), asset('covered', { warrantyEnd: '2027-01-01' })])).toBe(false);
  });
});
