import type { TicketStatus } from '@/services/types';

/**
 * Local status -> Tailwind bg color mapping for the preview variants' accent
 * spines/nodes. Kept in sync with the palette used by
 * `@/components/common/StatusBadge` (open=blue, in-progress=amber/yellow,
 * waiting=purple, resolved=green, closed=gray) without touching that file.
 */
export function ticketStatusColor(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-blue-500';
    case 'in-progress':
      return 'bg-amber-500';
    case 'waiting':
      return 'bg-purple-500';
    case 'resolved':
      return 'bg-green-500';
    case 'closed':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}
