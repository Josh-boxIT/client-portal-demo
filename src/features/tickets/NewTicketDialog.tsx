import { useState } from 'react';
import { toast } from 'sonner';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Ticket, TicketPriority, CreateTicketInput } from '@/services/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (ticket: Ticket) => void;
}

interface FormErrors {
  subject?: string;
  category?: string;
  priority?: string;
  body?: string;
}

const CATEGORIES = [
  'Access & permissions',
  'Hardware',
  'Software',
  'Network',
  'Email & communication',
  'Security',
  'Onboarding',
  'Other',
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function NewTicketDialog({ open, onOpenChange, onCreated }: NewTicketDialogProps) {
  const { tickets, people } = useServices();
  const { activeTenantId, activePersonaId, pushActivity } = useSessionStore();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!subject.trim()) e.subject = 'Subject is required.';
    if (!category) e.category = 'Category is required.';
    if (!priority) e.priority = 'Priority is required.';
    if (!body.trim()) e.body = 'Description is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Resolve a requesterId — look for the person matching the active persona email
      let requesterId = activePersonaId;
      try {
        const personList = await people.list(activeTenantId, { pageSize: 100 });
        const match = personList.data.find((p) =>
          p.id === activePersonaId ||
          p.name.toLowerCase() === activePersonaId.toLowerCase()
        );
        if (match) requesterId = match.id;
      } catch {
        // fallback to persona id
      }

      const input: CreateTicketInput = {
        subject: subject.trim(),
        category,
        priority: priority as TicketPriority,
        body: body.trim(),
        requesterId,
      };

      const created = await tickets.create(activeTenantId, input);
      pushActivity({
        id: `act-ticket-${created.id}`,
        tenantId: activeTenantId,
        type: 'ticket-created',
        title: `Ticket created: ${created.subject}`,
        detail: `${created.number} · ${created.priority} priority`,
        at: new Date().toISOString(),
        actor: activePersonaId,
        icon: 'Ticket',
      });

      toast.success('Ticket created', {
        description: `${created.number} — ${created.subject}`,
      });

      onCreated(created);
      handleClose();
    } catch {
      toast.error('Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setSubject('');
    setCategory('');
    setPriority('');
    setBody('');
    setErrors({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and our team will get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'ticket-subject-error' : undefined}
            />
            {errors.subject && (
              <p id="ticket-subject-error" className="text-xs text-destructive">
                {errors.subject}
              </p>
            )}
          </div>

          {/* Category + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  id="ticket-category"
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? 'ticket-category-error' : undefined}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p id="ticket-category-error" className="text-xs text-destructive">
                  {errors.category}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger
                  id="ticket-priority"
                  aria-invalid={!!errors.priority}
                  aria-describedby={errors.priority ? 'ticket-priority-error' : undefined}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p id="ticket-priority-error" className="text-xs text-destructive">
                  {errors.priority}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-body">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ticket-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the issue in detail…"
              rows={4}
              aria-invalid={!!errors.body}
              aria-describedby={errors.body ? 'ticket-body-error' : undefined}
            />
            {errors.body && (
              <p id="ticket-body-error" className="text-xs text-destructive">
                {errors.body}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
