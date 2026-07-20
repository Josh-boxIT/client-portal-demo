import { useEffect, useState, useMemo } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { FormDef, FormField, FormSubmission } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, ArrowRight, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

// ─── Field renderer ────────────────────────────────────────────────────────────

interface FieldProps {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
}

function FormFieldInput({ field, value, onChange, error }: FieldProps) {
  const id = `form-field-${field.id}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {field.required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>

      {field.type === 'text' || field.type === 'email' || field.type === 'number' || field.type === 'date' ? (
        <Input
          id={id}
          type={field.type}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      ) : field.type === 'textarea' ? (
        <Textarea
          id={id}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      ) : field.type === 'select' && field.options ? (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={onChange}
        >
          <SelectTrigger
            id={id}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={error ? 'border-destructive' : ''}
          >
            <SelectValue placeholder={field.placeholder ?? 'Select an option…'} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === 'checkbox' ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
            {field.placeholder ?? field.label}
          </Label>
        </div>
      ) : null}

      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateFields(
  fields: FormField[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const val = values[field.id];

    if (field.required) {
      if (field.type === 'checkbox' && val !== true) {
        errors[field.id] = 'This field is required.';
        continue;
      }
      if (
        field.type !== 'checkbox' &&
        (val === undefined || val === null || val === '')
      ) {
        errors[field.id] = 'This field is required.';
        continue;
      }
    }

    if (field.type === 'email' && val && typeof val === 'string') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(val)) {
        errors[field.id] = 'Please enter a valid email address.';
      }
    }

    if (field.type === 'number' && val !== undefined && val !== '') {
      if (isNaN(Number(val))) {
        errors[field.id] = 'Please enter a valid number.';
      }
    }
  }

  return errors;
}

// ─── Form modal ───────────────────────────────────────────────────────────────

interface FormModalProps {
  form: FormDef;
  open: boolean;
  onClose: () => void;
  onSubmitted: (submission: FormSubmission) => void;
}

function FormModal({ form, open, onClose, onSubmitted }: FormModalProps) {
  const { forms } = useServices();
  const { activeTenantId, activePersonaId } = useSessionStore();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setValue(fieldId: string, val: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
    // Clear error on change
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateFields(form.fields, values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Focus first error field
      const firstErrorId = Object.keys(errs)[0];
      const el = document.getElementById(`form-field-${firstErrorId}`);
      el?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const result = await forms.submit(
        activeTenantId,
        form.id,
        values,
        activePersonaId,
      );
      onSubmitted(result);
      setSubmitted(true);
      toast.success(`"${form.title}" submitted successfully.`);
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setValues({});
    setErrors({});
    setSubmitted(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">Request submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can track this in the My submissions tab.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5 py-2">
              {form.fields.map((field) => (
                <FormFieldInput
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  onChange={(val) => setValue(field.id, val)}
                  error={errors[field.id]}
                />
              ))}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit request'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Submission list ──────────────────────────────────────────────────────────

interface SubmissionCardProps {
  submission: FormSubmission;
  formTitle: string;
}

function SubmissionCard({ submission, formTitle }: SubmissionCardProps) {
  const valuePeek = Object.entries(submission.values)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{formTitle}</p>
              <Badge variant="secondary" className="text-xs shrink-0">
                Submitted
              </Badge>
            </div>
            {valuePeek && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{valuePeek}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              <time dateTime={submission.submittedAt}>
                {formatDateTime(submission.submittedAt)}
              </time>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function FormsPage() {
  const { forms } = useServices();
  const { activeTenantId, activePersonaId } = useSessionStore();
  const [data, setData] = useState<FormDef[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState<FormDef | null>(null);
  const [activeTab, setActiveTab] = useState('forms');

  useEffect(() => {
    setLoading(true);
    forms
      .list(activeTenantId, { pageSize: 50 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, forms]);

  useEffect(() => {
    if (!activePersonaId) {
      setSubmissions([]);
      return;
    }
    forms.listSubmissions(activeTenantId, activePersonaId, { pageSize: 100 })
      .then((result) => setSubmissions(result.data))
      .catch(() => setSubmissions([]));
  }, [activeTenantId, activePersonaId, forms]);

  // Map formId → title for submissions display
  const formTitleMap = useMemo(
    () => Object.fromEntries(data.map((f) => [f.id, f.title])),
    [data],
  );

  // Only show submissions for this tenant
  const tenantSubmissions = submissions;

  return (
    <div>
      <PageHeader title="Request forms" subtitle="Submit IT requests and track your submissions" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="forms">Available forms</TabsTrigger>
          <TabsTrigger value="submissions">
            My submissions
            {tenantSubmissions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {tenantSubmissions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Forms list */}
        <TabsContent value="forms">
          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              title="No forms available"
              description="Request forms will appear here when configured."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((form) => (
                <Card
                  key={form.id}
                  className="flex flex-col hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-snug">{form.title}</CardTitle>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {form.category}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{form.description}</CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="mt-3 pt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => setOpenForm(form)}
                        aria-label={`Open ${form.title}`}
                      >
                        Open form
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My submissions */}
        <TabsContent value="submissions">
          {tenantSubmissions.length === 0 ? (
            <EmptyState
              icon={<ArrowRight className="h-10 w-10" />}
              title="No submissions yet"
              description="Forms you submit will appear here and remain available after a restart."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('forms')}
                >
                  Browse forms
                </Button>
              }
            />
          ) : (
            <div className="space-y-3" aria-label="My submissions">
              {tenantSubmissions.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  submission={sub}
                  formTitle={formTitleMap[sub.formId] ?? 'Unknown form'}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form modal */}
      {openForm && (
        <FormModal
          form={openForm}
          open={!!openForm}
          onClose={() => setOpenForm(null)}
          onSubmitted={(submission) => setSubmissions((current) => [submission, ...current])}
        />
      )}
    </div>
  );
}
