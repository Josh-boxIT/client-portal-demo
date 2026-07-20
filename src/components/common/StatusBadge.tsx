import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketStatus, TicketPriority, RiskSeverity, PersonStatus, DeviceStatus, AssetStatus, LicenseStatus } from '@/services/types';

// ─── Ticket Status ────────────────────────────────────────────────────────────

const ticketStatusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  waiting: { label: 'Waiting', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 border-green-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = ticketStatusConfig[status] ?? { label: status, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Ticket Priority ──────────────────────────────────────────────────────────

const ticketPriorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = ticketPriorityConfig[priority] ?? { label: priority, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Risk Severity ────────────────────────────────────────────────────────────

const riskSeverityConfig: Record<RiskSeverity, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-green-100 text-green-800 border-green-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function RiskSeverityBadge({ severity }: { severity: RiskSeverity }) {
  const config = riskSeverityConfig[severity] ?? { label: severity, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Person Status ────────────────────────────────────────────────────────────

const personStatusConfig: Record<PersonStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-200' },
  onboarding: { label: 'Onboarding', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  offboarding: { label: 'Offboarding', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function PersonStatusBadge({ status }: { status: PersonStatus }) {
  const config = personStatusConfig[status] ?? { label: status, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Device Status ────────────────────────────────────────────────────────────

const deviceStatusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'bg-green-100 text-green-800 border-green-200' },
  warning: { label: 'Warning', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 border-red-200' },
  offline: { label: 'Offline', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const config = deviceStatusConfig[status] ?? { label: status, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Asset Status ─────────────────────────────────────────────────────────────

const assetStatusConfig: Record<AssetStatus, { label: string; className: string }> = {
  'in-service': { label: 'In Service', className: 'bg-green-100 text-green-800 border-green-200' },
  aging: { label: 'Aging', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  eol: { label: 'End of Life', className: 'bg-red-100 text-red-800 border-red-200' },
  retired: { label: 'Retired', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const config = assetStatusConfig[status] ?? { label: status, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// ─── License Status ───────────────────────────────────────────────────────────

const licenseStatusConfig: Record<LicenseStatus, { label: string; className: string }> = {
  in_use: { label: 'In use', className: 'bg-green-100 text-green-800 border-green-200' },
  unused: { label: 'Unused', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  const config = licenseStatusConfig[status] ?? { label: status, className: '' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}

// Generic badge helper for reuse
export { Badge };
