import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Ticket, TicketStatus, TicketPriority } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRelative } from '@/lib/format';
import { Ticket as TicketIcon, Search, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { NewTicketDialog } from './NewTicketDialog';

type SortKey = 'updatedAt' | 'createdAt' | 'priority' | 'status';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_ORDER: Record<TicketStatus, number> = {
  open: 5,
  'in-progress': 4,
  waiting: 3,
  resolved: 2,
  closed: 1,
};

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  if (sortDir === 'asc') return <ChevronUp className="h-3.5 w-3.5 ml-1" />;
  return <ChevronDown className="h-3.5 w-3.5 ml-1" />;
}

export function TicketsPage() {
  const navigate = useNavigate();
  const { tickets, people } = useServices();
  const { activeTenantId } = useSessionStore();

  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [requesterFilter, setRequesterFilter] = useState<string>('all');
  const [showClosed, setShowClosed] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});

  // Fetch base tickets
  useEffect(() => {
    setLoading(true);
    setError(null);
    tickets
      .list(activeTenantId, { pageSize: 200 })
      .then((r) => setData(r.data))
      .catch(() => setError('We couldn’t load tickets. Please try again.'))
      .finally(() => setLoading(false));
  }, [activeTenantId, tickets, reloadKey]);

  // Resolve requester names
  useEffect(() => {
    people.list(activeTenantId, { pageSize: 200 }).then((r) => {
      const map: Record<string, string> = {};
      r.data.forEach((p) => {
        map[p.id] = p.name;
      });
      setRequesterNames(map);
    }).catch(() => {
      setRequesterNames({});
    });
  }, [activeTenantId, people]);

  const allTickets = data;

  // Unique requesters for filter
  const uniqueRequesters = useMemo(() => {
    const seen = new Map<string, string>();
    allTickets.forEach((t) => {
      if (!seen.has(t.requesterId)) {
        seen.set(t.requesterId, requesterNames[t.requesterId] ?? t.requesterId);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allTickets, requesterNames]);

  // Filter + sort
  const displayed = useMemo(() => {
    let result = [...allTickets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.number.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (requesterNames[t.requesterId] ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (requesterFilter !== 'all') {
      result = result.filter((t) => t.requesterId === requesterFilter);
    }
    if (!showClosed) {
      result = result.filter((t) => !t.isClosed);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'updatedAt') {
        cmp = a.updatedAt.localeCompare(b.updatedAt);
      } else if (sortKey === 'createdAt') {
        cmp = a.createdAt.localeCompare(b.createdAt);
      } else if (sortKey === 'priority') {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else if (sortKey === 'status') {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allTickets, search, statusFilter, priorityFilter, requesterFilter, showClosed, sortKey, sortDir, requesterNames]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function handleRowClick(ticketId: string) {
    navigate(`/tickets/${ticketId}`);
  }

  function handleTicketCreated(ticket: Ticket) {
    navigate(`/tickets/${ticket.id}`);
  }

  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' || requesterFilter !== 'all';

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle="Support requests and IT issues"
        actions={
          <Button size="sm" onClick={() => setNewTicketOpen(true)} aria-label="Create new ticket">
            <Plus className="h-4 w-4 mr-1.5" />
            New ticket
          </Button>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tickets"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36" aria-label="Filter by priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={requesterFilter} onValueChange={setRequesterFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by requester">
            <SelectValue placeholder="Requester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All requesters</SelectItem>
            {uniqueRequesters.map(({ id, name }) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox id="show-closed" checked={showClosed} onCheckedChange={(v) => setShowClosed(v === true)} />
          <Label htmlFor="show-closed" className="text-sm text-muted-foreground cursor-pointer">Show closed</Label>
        </div>

        {(search || hasActiveFilters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setRequesterFilter('all');
              setShowClosed(false);
            }}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={<TicketIcon className="h-10 w-10" />}
          title="Couldn’t load tickets"
          description={error}
          action={
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          }
        />
      ) : loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<TicketIcon className="h-10 w-10" />}
          title="No tickets found"
          description={
            search || hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No tickets yet. Submit one to get started.'
          }
          action={
            !search && !hasActiveFilters ? (
              <Button size="sm" onClick={() => setNewTicketOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New ticket
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Number</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>
                  <button
                    className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleSort('status')}
                    aria-label={`Sort by status ${sortKey === 'status' ? (sortDir === 'asc' ? 'descending' : 'ascending') : ''}`}
                  >
                    Status
                    <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleSort('priority')}
                    aria-label={`Sort by priority ${sortKey === 'priority' ? (sortDir === 'asc' ? 'descending' : 'ascending') : ''}`}
                  >
                    Priority
                    <SortIcon col="priority" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">Requester</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>
                  <button
                    className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleSort('updatedAt')}
                    aria-label={`Sort by updated date ${sortKey === 'updatedAt' ? (sortDir === 'asc' ? 'descending' : 'ascending') : ''}`}
                  >
                    Updated
                    <SortIcon col="updatedAt" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => handleRowClick(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(t.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ticket ${t.number}: ${t.subject}`}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.number}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs">
                    <span className="line-clamp-1">{t.subject}</span>
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>
                    <TicketPriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {requesterNames[t.requesterId] ?? t.requesterId}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {t.category}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatRelative(t.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewTicketDialog
        open={newTicketOpen}
        onOpenChange={setNewTicketOpen}
        onCreated={handleTicketCreated}
      />
    </div>
  );
}
