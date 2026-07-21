import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { ActionDef, ActionStep, CreateTicketInput, FormField, Ticket } from '@/services/types';
import { renderTemplate } from './template';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantStore } from '@/theme/tenantStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase = 'form' | 'running' | 'success';

interface FieldErrors {
  [fieldId: string]: string;
}

// ─── Simulate sub-steps ───────────────────────────────────────────────────────

const PROGRESS_STEPS = ['Validating…', 'Provisioning…', 'Notifying…', 'Finalizing…'];

// ─── Single field renderer ────────────────────────────────────────────────────

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (id: string, value: unknown) => void;
}

function FieldRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const inputId = `wiz-field-${field.id}`;
  const errorId = error ? `${inputId}-error` : undefined;

  const commonProps = {
    id: inputId,
    'aria-invalid': !!error,
    'aria-describedby': errorId,
  };

  let input: React.ReactNode;

  switch (field.type) {
    case 'textarea':
      input = (
        <Textarea
          {...commonProps}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="resize-none"
        />
      );
      break;

    case 'select':
      input = (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(field.id, v)}
        >
          <SelectTrigger id={inputId} aria-invalid={!!error} aria-describedby={errorId}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;

    case 'checkbox':
      input = (
        <div className="flex items-center gap-2">
          <Checkbox
            id={inputId}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(field.id, checked === true)}
            aria-invalid={!!error}
            aria-describedby={errorId}
          />
          <label htmlFor={inputId} className="text-sm cursor-pointer">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
        </div>
      );
      // Skip label above for checkbox — it's inline
      return (
        <div className="space-y-1">
          {input}
          {error && (
            <p id={errorId} className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'date':
      input = (
        <Input
          {...commonProps}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
      break;

    case 'number':
      input = (
        <Input
          {...commonProps}
          type="number"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
        />
      );
      break;

    case 'email':
      input = (
        <Input
          {...commonProps}
          type="email"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
        />
      );
      break;

    default:
      // text
      input = (
        <Input
          {...commonProps}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
        />
      );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {input}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: ActionStep[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-5" aria-label="Progress steps">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1 flex-1">
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              i < current
                ? 'bg-primary text-primary-foreground'
                : i === current
                ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                : 'bg-muted text-muted-foreground'
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {i < current ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={cn(
              'hidden sm:block text-xs truncate',
              i === current ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'h-px flex-1 mx-1 transition-colors',
                i < current ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Running screen ───────────────────────────────────────────────────────────

function RunningScreen({
  actionTitle,
  subStep,
  progress,
}: {
  actionTitle: string;
  subStep: string;
  progress: number;
}) {
  return (
    <div className="py-8 flex flex-col items-center gap-6 text-center">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
          <Play className="h-6 w-6 text-primary animate-pulse" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{actionTitle}</p>
        <p className="text-sm text-muted-foreground">{subStep}</p>
      </div>
      <div className="w-full space-y-1.5">
        <Progress value={progress} className="h-2" aria-label="Action progress" />
        <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  actionTitle,
  message,
}: {
  actionTitle: string;
  message: string;
}) {
  return (
    <div className="py-8 flex flex-col items-center gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-green-700">Action complete!</p>
        <p className="text-sm font-medium">{actionTitle}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

interface ActionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionDef: ActionDef | null;
}

export function ActionWizard({ open, onOpenChange, actionDef }: ActionWizardProps) {
  const { tickets, people } = useServices();
  const { activeTenantId, activePersonaId, pushActivity } = useSessionStore();
  const readOnly = useTenantStore((state) => {
    const source = state.getTenant(activeTenantId)?.dataSource;
    return source ? source.connectWise || source.ninjaOne : false;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<WizardPhase>('form');
  const [progressValue, setProgressValue] = useState(0);
  const [progressSubStep, setProgressSubStep] = useState(PROGRESS_STEPS[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setValues({});
      setErrors({});
      setPhase('form');
      setProgressValue(0);
      setProgressSubStep(PROGRESS_STEPS[0]);
      setSuccessMessage('');
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [open]);

  const steps = actionDef?.steps ?? [];
  const step = steps[currentStep] as ActionStep | undefined;
  const isLastStep = currentStep === steps.length - 1;

  function setFieldValue(id: string, value: unknown) {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function validateStep(): boolean {
    if (!step?.fields) return true;
    const e: FieldErrors = {};
    for (const field of step.fields) {
      if (!field.required) continue;
      const val = values[field.id];
      if (field.type === 'checkbox') {
        if (!val) e[field.id] = 'This field is required.';
      } else {
        if (!val || (typeof val === 'string' && !val.trim())) {
          e[field.id] = 'This field is required.';
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;
    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    setCurrentStep((s) => s - 1);
    setErrors({});
  }

  const handleRun = useCallback(async () => {
    if (!validateStep()) return;
    if (!actionDef) return;

    setPhase('running');

    // Animate progress over ~2.5s through PROGRESS_STEPS
    const totalDuration = 2500;
    const tickMs = 50;
    const totalTicks = totalDuration / tickMs;
    let tick = 0;

    progressIntervalRef.current = setInterval(() => {
      tick++;
      const pct = Math.min((tick / totalTicks) * 100, 99);
      setProgressValue(pct);
      const subIdx = Math.floor((tick / totalTicks) * PROGRESS_STEPS.length);
      setProgressSubStep(PROGRESS_STEPS[Math.min(subIdx, PROGRESS_STEPS.length - 1)]);

      if (tick >= totalTicks) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgressValue(100);
      }
    }, tickMs);

    // Build a CreateTicketInput from the def's templated ticket mapping and submit
    // via the same live ticket-create path used by the manual "New ticket" dialog.
    try {
      // Resolve a requesterId — look for the person matching the active persona
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
        subject: renderTemplate(actionDef.ticket.summaryTemplate, values).slice(0, 100),
        body: renderTemplate(actionDef.ticket.descriptionTemplate, values),
        priority: actionDef.ticket.priority,
        category: actionDef.ticket.category,
        requesterId,
      };

      const created: Ticket = await tickets.create(activeTenantId, input);

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgressValue(100);

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

      // Brief pause so 100% is visible
      setTimeout(() => {
        const message = `${created.number} — ${created.subject}`;
        toast.success('Ticket created', { description: message });
        setSuccessMessage(message);
        setPhase('success');
      }, 400);
    } catch {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      toast.error('Action failed. Please try again.');
      setPhase('form');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionDef, tickets, people, activeTenantId, activePersonaId, pushActivity, values]);

  function handleClose() {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    onOpenChange(false);
  }

  if (!actionDef) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => {
          // Prevent accidental close while running
          if (phase === 'running') e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{actionDef.title}</DialogTitle>
          <DialogDescription>{actionDef.description}</DialogDescription>
        </DialogHeader>

        {phase === 'form' && (
          <>
            {steps.length > 1 && (
              <StepIndicator steps={steps} current={currentStep} />
            )}

            {step && (
              <div className="space-y-4 py-2">
                <p className="text-sm font-medium text-muted-foreground">{step.label}</p>
                {(step.fields ?? []).map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    error={errors[field.id]}
                    onChange={setFieldValue}
                  />
                ))}
                {(!step.fields || step.fields.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    No additional information needed for this step.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="flex-row justify-between sm:justify-between">
              <div>
                {currentStep > 0 && (
                  <Button variant="ghost" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                {isLastStep ? (
                  <Button disabled={readOnly} onClick={handleRun} title={readOnly ? 'ConnectWise-mapped clients are read-only' : undefined}>
                    <Play className="h-4 w-4 mr-1" />
                    {readOnly ? 'Read-only' : 'Run'}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}

        {phase === 'running' && (
          <RunningScreen
            actionTitle={actionDef.title}
            subStep={progressSubStep}
            progress={progressValue}
          />
        )}

        {phase === 'success' && (
          <>
            <SuccessScreen actionTitle={actionDef.title} message={successMessage} />
            <DialogFooter>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
