import { differenceInDays, parseISO } from 'date-fns';
import { formatDate } from '@/lib/format';
import type { Asset } from '@/services/types';

// "today" is fixed to 2026-06-30 per project spec.
export const ASSET_TODAY = parseISO('2026-06-30');
const WARRANTY_WARN_DAYS = 90;

export function hasValidDate(value?: string): value is string {
  if (!value) return false;
  return !Number.isNaN(parseISO(value).getTime());
}

export function shouldShowNoWarrantyByDefault(assets: Asset[]): boolean {
  return assets.length > 0 && !assets.some((asset) => hasValidDate(asset.warrantyEnd));
}

export function warrantyClass(warrantyEnd?: string): string {
  if (!hasValidDate(warrantyEnd)) return '';
  const diff = differenceInDays(parseISO(warrantyEnd), ASSET_TODAY);
  if (diff < 0) return 'text-red-600 font-semibold';
  if (diff < WARRANTY_WARN_DAYS) return 'text-yellow-600 font-medium';
  return '';
}

export function warrantyLabel(warrantyEnd?: string): string {
  if (!hasValidDate(warrantyEnd)) return '—';
  const diff = differenceInDays(parseISO(warrantyEnd), ASSET_TODAY);
  if (diff < 0) return `${formatDate(warrantyEnd)} (expired)`;
  if (diff < WARRANTY_WARN_DAYS) return `${formatDate(warrantyEnd)} (${diff}d left)`;
  return formatDate(warrantyEnd);
}

export function refreshDueClass(refreshDue?: string): string {
  if (!hasValidDate(refreshDue)) return '';
  const diff = differenceInDays(parseISO(refreshDue), ASSET_TODAY);
  if (diff < 0) return 'text-red-600 font-semibold';
  if (diff < 180) return 'text-yellow-600 font-medium';
  return '';
}

export type AssetSortDir = 'asc' | 'desc';
export type AssetSortBy = 'name' | 'status' | 'warrantyEnd' | 'refreshDue';

export function sortAssets(data: Asset[], by: AssetSortBy, dir: AssetSortDir): Asset[] {
  return [...data].sort((a, b) => {
    let comparison = 0;
    if (by === 'name') comparison = a.name.localeCompare(b.name);
    else if (by === 'status') comparison = a.status.localeCompare(b.status);
    else if (by === 'warrantyEnd') comparison = (a.warrantyEnd ?? '').localeCompare(b.warrantyEnd ?? '');
    else if (by === 'refreshDue') comparison = (a.refreshDue ?? '').localeCompare(b.refreshDue ?? '');
    return dir === 'asc' ? comparison : -comparison;
  });
}
