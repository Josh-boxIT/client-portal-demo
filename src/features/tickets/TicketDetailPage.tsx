import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Ticket, TicketMessage, TicketStatus } from '@/services/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/common/StatusBadge';
import { MarkdownRenderer } from '@/features/documents/MarkdownRenderer';
import { formatDateTime, formatRelative } from '@/lib/format';
import { Bot, User, Info, Send, ArrowLeft, AlertCircle, Lock, Clock, Loader2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { isBoxItStaff } from '@/lib/accessibleTenants';
import { ticketStatusColor } from './ticketStatusColor';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function ConsoleNote({ msg, requesterName }: { msg: TicketMessage; requesterName: string }) {
  const isRequester = msg.authorType === 'requester';
  const isSystem = msg.authorType === 'system';
  const isTime = msg.kind === 'time';
  const isInternal = msg.internal && !isTime;
  const authorLabel = isRequester && msg.author === 'You' ? requesterName : msg.author;

  if (isSystem) {
    return (
      <div className="flex items-center justify-center gap-2 py-1 text-center">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <span className="text-xs text-muted-foreground">{msg.body}</span>
        <span className="text-xs font-mono text-muted-foreground">{formatRelative(msg.at)}</span>
      </div>
    );
  }

  if (isInternal) {
    return (
      <div className="rounded-md border-l-2 border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          <Badge variant="secondary" className="border-amber-300 text-amber-700 dark:text-amber-300">
            Internal
          </Badge>
          <span className="font-medium text-foreground">{msg.author}</span>
          <span className="font-mono">{formatRelative(msg.at)}</span>
        </div>
        <div className="mt-1">
          <MarkdownRenderer body={msg.body} />
        </div>
      </div>
    );
  }

  if (isTime && !msg.body?.trim()) {
    return (
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="font-medium">{msg.author}</span>
          <span className="text-muted-foreground">{formatRelative(msg.at)}</span>
          <span className="font-mono text-muted-foreground">logged {msg.hours}h</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', isRequester ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isRequester ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
        aria-hidden="true"
      >
        {isRequester ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex flex-col gap-1 max-w-[80%] min-w-0', isRequester ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">{authorLabel}</span>
          <span className="text-xs text-muted-foreground font-mono">{formatRelative(msg.at)}</span>
          {isTime && msg.hours != null && (
            <Badge variant="secondary" className="border-sky-300 text-sky-700 dark:text-sky-300 gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              <span className="font-mono">{msg.hours}h</span>
            </Badge>
          )}
        </div>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm leading-relaxed border',
            isRequester
              ? 'bg-primary/10 border-primary/30 border-l-2 border-l-primary text-foreground'
              : 'bg-muted border-border'
          )}
        >
          <MarkdownRenderer body={msg.body} />
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Separator />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, people } = useServices();
  const { activeTenantId } = useSessionStore();
  const identity = useAuthStore((s) => s.identity);
  const isStaff = isBoxItStaff(identity);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const paneRef = useRef<HTMLDivElement>(null);
  // On lg+, the pane fills the viewport below the top bar so only the notes list scrolls.
  // Height = viewport - the pane's top offset - the main content wrapper's bottom padding (py-6 => 24px).
  const [paneHeight, setPaneHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const update = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        const top = el.getBoundingClientRect().top;
        setPaneHeight(Math.max(320, window.innerHeight - top - 24));
      } else {
        setPaneHeight(undefined); // mobile: natural height, page scrolls normally
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ticket]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resolved = await tickets.get(activeTenantId, id as string);

        if (!resolved) {
          if (!cancelled) {
            setTicket(null);
            setError('This ticket could not be found.');
          }
          return;
        }

        if (!cancelled) setTicket(resolved);

        const person = await people.get(activeTenantId, resolved.requesterId);
        if (!cancelled) setRequesterName(person?.name ?? resolved.requesterId);
      } catch {
        if (!cancelled) {
          setTicket(null);
          setError('We couldn’t load this ticket. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, tickets, people]);

  async function handleStatusChange(status: TicketStatus) {
    if (!ticket || status === ticket.status) return;
    setStatusUpdating(true);
    try {
      const updated = await tickets.updateStatus(activeTenantId, ticket.id, { status });
      setTicket(updated);
      toast.success('Ticket status updated');
    } catch {
      toast.error('Failed to update ticket status. Please try again.');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || !replyBody.trim() || replying) return;
    setReplying(true);
    try {
      const updated = await tickets.reply(activeTenantId, ticket.id, { body: replyBody.trim() });
      setTicket(updated);
      setReplyBody('');
      toast.success('Reply added');
    } catch {
      toast.error('Failed to add reply. Please try again.');
    } finally {
      setReplying(false);
    }
  }

  if (loading) return <DetailSkeleton />;

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
        <h2 className="text-lg font-semibold">Ticket not found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          {error ?? 'The requested ticket does not exist or has been removed.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/tickets')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          Back to tickets
        </Button>
      </div>
    );
  }

  const [initialMessage, ...notes] = ticket.messages;
  const visibleNotes = (isStaff ? notes : notes.filter((n) => !n.internal))
    // Newest notes first, matching ConnectWise's ordering.
    .slice()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const galleryImages = (ticket.attachments ?? []).filter((a) => a.isImage && !a.referenced);
  const accent = ticketStatusColor(ticket.status);

  return (
    <div
      ref={paneRef}
      style={paneHeight ? { height: paneHeight } : undefined}
      className="max-w-5xl mx-auto lg:flex lg:flex-col lg:min-h-0"
    >
      {/* Top row (not sticky; just the top of the pane) */}
      <div className="shrink-0 flex items-start justify-between gap-4 flex-wrap border-b pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn('w-1 rounded shrink-0 self-stretch min-h-[2.5rem]', accent)}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tickets')}
              className="gap-1.5 -ml-2 mb-1 h-7 px-2 text-xs"
              aria-label="Back to tickets"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to tickets
            </Button>
            <h1 className="text-xl font-semibold tracking-tight truncate">{ticket.subject}</h1>
            <p className="font-mono text-sm text-muted-foreground">{ticket.number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            Updated {formatRelative(ticket.updatedAt)}
          </span>
        </div>
      </div>

      {/* Body: two columns filling remaining pane height on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 pt-6 lg:flex-1 lg:min-h-0">
        {/* Conversation column: on lg a fixed-height flex column; only the notes list scrolls */}
        <div className="order-2 lg:order-1 min-w-0 flex flex-col min-h-0 gap-6 lg:gap-0">
          {/* Original request (fixed) */}
          <div className="shrink-0 rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold">Original request</span>
              <span className="text-xs text-muted-foreground">{requesterName}</span>
              {initialMessage && (
                <span className="text-xs text-muted-foreground font-mono ml-auto">
                  {formatRelative(initialMessage.at)}
                </span>
              )}
            </div>
            <div className="px-4 py-3 max-h-80 overflow-y-auto">
              {initialMessage ? (
                <MarkdownRenderer body={initialMessage.body} />
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </div>
          </div>

          {/* Attachments (fixed) */}
          {galleryImages.length > 0 && (
            <div className="shrink-0 lg:mt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                Attachments
              </div>
              <div className="flex flex-wrap gap-3">
                {galleryImages.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => window.open(a.url, '_blank', 'noopener')}
                    className="text-left rounded-md border overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <img src={a.url} alt={a.name} loading="lazy" className="h-24 w-36 object-cover" />
                    <p className="px-2 py-1 text-xs text-muted-foreground truncate max-w-[9rem]" title={a.name}>
                      {a.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NOTES separator (fixed) — only when there are notes */}
          {visibleNotes.length >= 1 && (
            <div className="shrink-0 flex items-center gap-3 lg:mt-4 mb-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
                Notes · {visibleNotes.length}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* Notes thread — THE ONLY SCROLLER on lg */}
          <div
            className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 space-y-4"
            role="log"
            aria-label="Conversation thread"
            aria-live="polite"
          >
            {visibleNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No further notes yet.</p>
            ) : (
              visibleNotes.map((msg) => (
                <ConsoleNote key={msg.id} msg={msg} requesterName={requesterName} />
              ))
            )}
          </div>

          {/* Reply composer (fixed at bottom) */}
          <form onSubmit={handleReply} className="shrink-0 rounded-lg border p-4 space-y-2 lg:mt-4">
            <Label htmlFor="console-reply" className="text-xs font-medium">
              Add reply
            </Label>
            <Textarea
              id="console-reply"
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              disabled={replying}
              maxLength={10_000}
              placeholder="Write a reply…"
              rows={3}
              className="resize-none text-sm"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={replying || !replyBody.trim()}>
                {replying ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                )}
                {replying ? 'Sending…' : 'Send reply'}
              </Button>
            </div>
          </form>
        </div>

        {/* Properties rail (fixed; scrolls internally if ever taller than the pane) */}
        <div className="order-1 lg:order-2 min-h-0 lg:overflow-y-auto space-y-4">
          <div className="divide-y border-t border-b">
            {[
              { label: 'Status', value: <TicketStatusBadge status={ticket.status} /> },
              { label: 'Priority', value: <TicketPriorityBadge priority={ticket.priority} /> },
              { label: 'Requester', value: requesterName },
              ...(ticket.assignee ? [{ label: 'Assignee', value: ticket.assignee }] : []),
              { label: 'Created', value: <span className="font-mono">{formatDateTime(ticket.createdAt)}</span> },
              { label: 'Updated', value: <span className="font-mono">{formatRelative(ticket.updatedAt)}</span> },
              { label: 'Category', value: ticket.category },
            ].map((row) => (
              <div key={row.label} className="py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{row.label}</div>
                <div className="mt-0.5 text-sm">{row.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="console-status" className="text-xs shrink-0">
                Change status:
              </Label>
              <Select
                value={ticket.status}
                onValueChange={(value) => void handleStatusChange(value as TicketStatus)}
                disabled={statusUpdating}
              >
                <SelectTrigger
                  id="console-status"
                  className="h-8 text-xs"
                  aria-label="Change ticket status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusUpdating && <p className="text-xs text-muted-foreground">Saving status…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
