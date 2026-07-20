import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import {
  UserPlus,
  UserMinus,
  KeyRound,
  Unlock,
  ShieldOff,
  Package,
  MailPlus,
  ShieldAlert,
  Plus,
  X,
} from 'lucide-react';
import { adminApi } from '@/admin/adminApi';
import type { ActionDefDto } from '@/admin/types';
import type { FormField, FormFieldType, TicketPriority } from '@/services/types';
import { collectTokens } from '@/features/actions/template';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Curated icon picker ──────────────────────────────────────────────────────

const CURATED_ICONS = [
  'UserPlus',
  'UserMinus',
  'KeyRound',
  'Unlock',
  'ShieldOff',
  'Package',
  'MailPlus',
  'ShieldAlert',
] as const;

const ICON_PREVIEW_MAP: Record<string, React.ReactNode> = {
  UserPlus: <UserPlus className="h-4 w-4" />,
  UserMinus: <UserMinus className="h-4 w-4" />,
  KeyRound: <KeyRound className="h-4 w-4" />,
  Unlock: <Unlock className="h-4 w-4" />,
  ShieldOff: <ShieldOff className="h-4 w-4" />,
  Package: <Package className="h-4 w-4" />,
  MailPlus: <MailPlus className="h-4 w-4" />,
  ShieldAlert: <ShieldAlert className="h-4 w-4" />,
};

const CUSTOM_ICON_VALUE = '__custom__';

function previewIcon(name: string): React.ReactNode {
  if (ICON_PREVIEW_MAP[name]) return ICON_PREVIEW_MAP[name];
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps> | undefined>)[name];
  const Icon = Comp ?? Package;
  return <Icon className="h-4 w-4" />;
}

// ─── Slugging helpers ─────────────────────────────────────────────────────────

function slugifyKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function slugifyFieldId(s: string): string {
  const words = s.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

let idCounter = 0;
function nextLocalId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter}`;
}

// ─── Local draft types (form state — converted to ActionStep[]/FormField[] on submit) ──

interface FieldDraft {
  localId: string; // stable React key, independent of the (editable) field id
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string;
  optionsText: string; // comma-separated, only used for type === 'select'
}

interface StepDraft {
  localId: string;
  id: string;
  label: string;
  fields: FieldDraft[];
}

const FIELD_TYPES: FormFieldType[] = ['text', 'textarea', 'select', 'email', 'number', 'date', 'checkbox'];
const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

function draftFromField(field: FormField): FieldDraft {
  return {
    localId: nextLocalId('field-'),
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder ?? '',
    optionsText: (field.options ?? []).join(', '),
  };
}

function emptyField(): FieldDraft {
  return {
    localId: nextLocalId('field-'),
    id: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    optionsText: '',
  };
}

function emptyStep(): StepDraft {
  return { localId: nextLocalId('step-'), id: nextLocalId('step_'), label: '', fields: [] };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  tenantId: string;
  actionDef?: ActionDefDto;
  onSaved: () => void;
}

export function ActionDefFormDialog({ open, onOpenChange, mode, tenantId, actionDef, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [key, setKey] = useState('');
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const [iconSelect, setIconSelect] = useState<string>(CURATED_ICONS[0]);
  const [customIcon, setCustomIcon] = useState('');

  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);

  const [summaryTemplate, setSummaryTemplate] = useState('');
  const [descriptionTemplate, setDescriptionTemplate] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [ticketCategory, setTicketCategory] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const summaryRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedTemplate = useRef<'summary' | 'description'>('description');

  const isCreate = mode === 'create';

  // Reset / hydrate form state whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (mode === 'edit' && actionDef) {
      setTitle(actionDef.title);
      setDescription(actionDef.description);
      setCategory(actionDef.category);
      setKey(actionDef.key);
      setKeyManuallyEdited(true);
      setEnabled(actionDef.enabled);

      const isCurated = (CURATED_ICONS as readonly string[]).includes(actionDef.icon);
      setIconSelect(isCurated ? actionDef.icon : CUSTOM_ICON_VALUE);
      setCustomIcon(isCurated ? '' : actionDef.icon);

      setSteps(
        actionDef.steps.length > 0
          ? actionDef.steps.map((s) => ({
              localId: nextLocalId('step-'),
              id: s.id,
              label: s.label,
              fields: (s.fields ?? []).map(draftFromField),
            }))
          : [emptyStep()]
      );

      setSummaryTemplate(actionDef.ticket.summaryTemplate);
      setDescriptionTemplate(actionDef.ticket.descriptionTemplate);
      setPriority(actionDef.ticket.priority);
      setTicketCategory(actionDef.ticket.category);
    } else {
      setTitle('');
      setDescription('');
      setCategory('');
      setKey('');
      setKeyManuallyEdited(false);
      setEnabled(true);
      setIconSelect(CURATED_ICONS[0]);
      setCustomIcon('');
      setSteps([emptyStep()]);
      setSummaryTemplate('');
      setDescriptionTemplate('');
      setPriority('medium');
      setTicketCategory('');
    }
  }, [open, mode, actionDef]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (isCreate && !keyManuallyEdited) {
      setKey(slugifyKey(value));
    }
  }

  function handleKeyChange(value: string) {
    setKey(value);
    setKeyManuallyEdited(true);
  }

  // ── Step / field builder helpers ──────────────────────────────────────────

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(localId: string) {
    setSteps((prev) => prev.filter((s) => s.localId !== localId));
  }

  function updateStepLabel(localId: string, label: string) {
    setSteps((prev) => prev.map((s) => (s.localId === localId ? { ...s, label } : s)));
  }

  function addField(stepLocalId: string) {
    setSteps((prev) =>
      prev.map((s) => (s.localId === stepLocalId ? { ...s, fields: [...s.fields, emptyField()] } : s))
    );
  }

  function removeField(stepLocalId: string, fieldLocalId: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.localId === stepLocalId
          ? { ...s, fields: s.fields.filter((f) => f.localId !== fieldLocalId) }
          : s
      )
    );
  }

  function updateField(stepLocalId: string, fieldLocalId: string, patch: Partial<FieldDraft>) {
    setSteps((prev) =>
      prev.map((s) =>
        s.localId === stepLocalId
          ? {
              ...s,
              fields: s.fields.map((f) => (f.localId === fieldLocalId ? { ...f, ...patch } : f)),
            }
          : s
      )
    );
  }

  function handleFieldLabelChange(stepLocalId: string, field: FieldDraft, label: string) {
    // Auto-derive id from label unless the user has already customized it away from the slug.
    const priorSlug = slugifyFieldId(field.label);
    const idFollowsLabel = field.id === '' || field.id === priorSlug;
    updateField(stepLocalId, field.localId, {
      label,
      ...(idFollowsLabel ? { id: slugifyFieldId(label) } : {}),
    });
  }

  // ── Token chips (all field ids currently defined, in order) ───────────────

  const allFields: FieldDraft[] = steps.flatMap((s) => s.fields);
  const allFieldIds = allFields.map((f) => f.id).filter(Boolean);

  function insertToken(fieldId: string) {
    const token = `{{${fieldId}}}`;
    if (lastFocusedTemplate.current === 'summary') {
      setSummaryTemplate((prev) => prev + token);
      summaryRef.current?.focus();
    } else {
      setDescriptionTemplate((prev) => prev + token);
      descriptionRef.current?.focus();
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!title.trim()) return 'Title is required.';
    if (!key.trim()) return 'Key is required.';
    if (!summaryTemplate.trim()) return 'Ticket summary template is required.';
    if (!descriptionTemplate.trim()) return 'Ticket description template is required.';

    const ids = allFields.map((f) => f.id.trim());
    if (ids.some((id) => !id)) return 'Every field needs a non-empty id (derived from its label).';
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      return `Field ids must be unique across the whole action — duplicate: ${[...new Set(dupes)].join(', ')}`;
    }

    const idSet = new Set(ids);
    const unknown = new Set<string>();
    for (const token of [...collectTokens(summaryTemplate), ...collectTokens(descriptionTemplate)]) {
      if (!idSet.has(token)) unknown.add(token);
    }
    if (unknown.size > 0) {
      return `Templates reference unknown field id(s): ${[...unknown].join(', ')}`;
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const resolvedIcon = iconSelect === CUSTOM_ICON_VALUE ? customIcon.trim() || 'Package' : iconSelect;

    const payloadSteps = steps
      .filter((s) => s.label.trim() || s.fields.length > 0)
      .map((s) => ({
        id: s.id,
        label: s.label.trim() || 'Details',
        fields: s.fields.map(
          (f): FormField => ({
            id: f.id.trim(),
            label: f.label.trim(),
            type: f.type,
            required: f.required,
            ...(f.placeholder.trim() ? { placeholder: f.placeholder.trim() } : {}),
            ...(f.type === 'select'
              ? {
                  options: f.optionsText
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean),
                }
              : {}),
          })
        ),
      }));

    try {
      if (isCreate) {
        await adminApi.createActionDef({
          tenantId,
          key: key.trim(),
          title: title.trim(),
          description: description.trim(),
          icon: resolvedIcon,
          category: category.trim(),
          enabled,
          steps: payloadSteps,
          ticket: {
            summaryTemplate,
            descriptionTemplate,
            priority,
            category: ticketCategory.trim(),
          },
        });
        toast.success('Action created');
      } else if (actionDef) {
        await adminApi.updateActionDef(actionDef.id, {
          title: title.trim(),
          description: description.trim(),
          icon: resolvedIcon,
          category: category.trim(),
          enabled,
          steps: payloadSteps,
          ticket: {
            summaryTemplate,
            descriptionTemplate,
            priority,
            category: ticketCategory.trim(),
          },
        });
        toast.success('Action updated');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  const title_ = isCreate ? 'New action' : 'Edit action';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title_}</DialogTitle>
        </DialogHeader>

        <form
          id="action-def-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-6 mt-2 min-h-0 overflow-y-auto px-1 -mx-1"
        >
          {/* ── Metadata ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metadata</p>

            <div className="space-y-1.5">
              <Label htmlFor="adef-title">Title</Label>
              <Input
                id="adef-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Reset password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adef-description">Description</Label>
              <Textarea
                id="adef-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Shown on the action card."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adef-category">Category</Label>
                <Input
                  id="adef-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Access"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adef-key">
                  Key <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="adef-key"
                  value={key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="e.g. reset-password"
                  disabled={!isCreate}
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="adef-enabled" checked={enabled} onCheckedChange={(c) => setEnabled(c === true)} />
              <label htmlFor="adef-enabled" className="text-sm cursor-pointer">
                Enabled
              </label>
            </div>
          </div>

          <Separator />

          {/* ── Icon ───────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Icon</p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border">
                {previewIcon(iconSelect === CUSTOM_ICON_VALUE ? customIcon || 'Package' : iconSelect)}
              </div>
              <Select value={iconSelect} onValueChange={setIconSelect}>
                <SelectTrigger className="max-w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURATED_ICONS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_ICON_VALUE}>Custom…</SelectItem>
                </SelectContent>
              </Select>
              {iconSelect === CUSTOM_ICON_VALUE && (
                <Input
                  value={customIcon}
                  onChange={(e) => setCustomIcon(e.target.value)}
                  placeholder="Any lucide-react icon name, e.g. Wifi"
                  className="font-mono text-sm"
                />
              )}
            </div>
          </div>

          <Separator />

          {/* ── Steps & fields ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Steps &amp; fields
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add step
              </Button>
            </div>

            <div className="space-y-4">
              {steps.map((step, stepIdx) => (
                <div key={step.localId} className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Step {stepIdx + 1}</span>
                    <Input
                      value={step.label}
                      onChange={(e) => updateStepLabel(step.localId, e.target.value)}
                      placeholder="Step label"
                      className="h-8 text-sm"
                    />
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.localId)}
                        aria-label="Remove step"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 pl-2 border-l-2 border-border">
                    {step.fields.map((field) => (
                      <div key={field.localId} className="rounded-md bg-muted/30 p-2.5 space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleFieldLabelChange(step.localId, field, e.target.value)}
                              className="h-8 text-sm"
                              placeholder="e.g. First name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Field id</Label>
                            <Input
                              value={field.id}
                              onChange={(e) => updateField(step.localId, field.localId, { id: e.target.value })}
                              className="h-8 text-sm font-mono"
                              placeholder="firstName"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(step.localId, field.localId)}
                            aria-label="Remove field"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(v) =>
                                updateField(step.localId, field.localId, { type: v as FormFieldType })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-1.5 pb-1.5">
                            <Checkbox
                              id={`${field.localId}-required`}
                              checked={field.required}
                              onCheckedChange={(c) =>
                                updateField(step.localId, field.localId, { required: c === true })
                              }
                            />
                            <label htmlFor={`${field.localId}-required`} className="text-xs cursor-pointer">
                              Required
                            </label>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) =>
                                updateField(step.localId, field.localId, { placeholder: e.target.value })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {field.type === 'select' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Options (comma-separated)</Label>
                            <Input
                              value={field.optionsText}
                              onChange={(e) =>
                                updateField(step.localId, field.localId, { optionsText: e.target.value })
                              }
                              className="h-8 text-sm"
                              placeholder="Option A, Option B, Option C"
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={() => addField(step.localId)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add field
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Ticket mapping ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ticket mapping
            </p>

            {allFieldIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allFieldIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => insertToken(id)}
                    className="inline-flex"
                  >
                    <Badge variant="secondary" className="cursor-pointer font-mono hover:bg-secondary/70">
                      {`{{${id}}}`}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="adef-summary">Summary template</Label>
              <Input
                id="adef-summary"
                ref={summaryRef}
                value={summaryTemplate}
                onChange={(e) => setSummaryTemplate(e.target.value)}
                onFocus={() => (lastFocusedTemplate.current = 'summary')}
                placeholder="e.g. New hire: {{firstName}} {{lastName}}"
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adef-description-template">Description template</Label>
              <Textarea
                id="adef-description-template"
                ref={descriptionRef}
                value={descriptionTemplate}
                onChange={(e) => setDescriptionTemplate(e.target.value)}
                onFocus={() => (lastFocusedTemplate.current = 'description')}
                rows={4}
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adef-ticket-category">Ticket category</Label>
                <Input
                  id="adef-ticket-category"
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  placeholder="e.g. Account Access"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{formError}</p>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="action-def-form" disabled={submitting}>
            {submitting ? 'Saving…' : isCreate ? 'Create' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
