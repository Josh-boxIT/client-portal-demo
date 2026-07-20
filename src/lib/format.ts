import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a number as USD currency.
 */
export function formatCurrency(value: number, opts?: { decimals?: number }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts?.decimals ?? 0,
    maximumFractionDigits: opts?.decimals ?? 0,
  }).format(value);
}

/**
 * Format a number with commas.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a ratio (0–1) as a percentage string, e.g. 0.853 → "85%".
 */
export function formatPercent(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format an ISO date string as a readable date, e.g. "Jun 30, 2026".
 */
export function formatDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'MMM d, yyyy');
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date string as a readable date+time, e.g. "Jun 30, 2026 at 2:45 PM".
 */
export function formatDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return isoString;
  }
}

/**
 * Return a human-friendly relative string like "3 minutes ago".
 */
export function formatRelative(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date for display in a quarter label, e.g. "2025-Q3".
 */
export function formatQuarter(quarter: string): string {
  return quarter;
}

/**
 * Format a byte count as a human-friendly decimal size, e.g. 17179869184 → "16 GB".
 * Values under 1 GB fall back to MB.
 */
export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / 1e9;
  if (gb < 1) {
    const mb = bytes / 1e6;
    return `${Math.round(mb)} MB`;
  }
  return `${Math.round(gb)} GB`;
}
