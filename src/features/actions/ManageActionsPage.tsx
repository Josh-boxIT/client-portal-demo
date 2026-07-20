import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '@/admin/adminApi';
import type { ActionDefDto } from '@/admin/types';
import { ActionDefFormDialog } from './ActionDefFormDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';
import { isBoxItStaff } from '@/lib/accessibleTenants';

function fieldCount(def: ActionDefDto): number {
  return def.steps.reduce((sum, step) => sum + (step.fields?.length ?? 0), 0);
}

export function ManageActionsPage() {
  const { identity } = useAuthStore();
  const { activeTenantId } = useSessionStore();

  const [actionDefs, setActionDefs] = useState<ActionDefDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<ActionDefDto | undefined>(undefined);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDefs = useCallback(async () => {
    if (!activeTenantId) return;
    setLoading(true);
    setError(null);
    try {
      const defs = await adminApi.actionDefs(activeTenantId);
      setActionDefs(defs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    void loadDefs();
  }, [loadDefs]);

  if (!isBoxItStaff(identity)) {
    return <Navigate to="/actions" replace />;
  }

  function openCreate() {
    setDialogMode('create');
    setEditTarget(undefined);
    setDialogOpen(true);
  }

  function openEdit(def: ActionDefDto) {
    setDialogMode('edit');
    setEditTarget(def);
    setDialogOpen(true);
  }

  async function handleToggleEnabled(def: ActionDefDto) {
    setTogglingId(def.id);
    try {
      await adminApi.updateActionDef(def.id, { enabled: !def.enabled });
      await loadDefs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update action');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(def: ActionDefDto) {
    if (!window.confirm(`Delete action "${def.title}"? This cannot be undone.`)) return;
    setDeletingId(def.id);
    try {
      await adminApi.deleteActionDef(def.id);
      toast.success('Action deleted');
      await loadDefs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Manage actions"
        subtitle="Author guided, self-service actions that create standardized demo tickets."
        actions={
          <Button onClick={openCreate} disabled={!activeTenantId}>
            New action
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-muted-foreground text-sm">Loading actions…</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDefs()}>
            Retry
          </Button>
        </div>
      ) : actionDefs.length === 0 ? (
        <div className="rounded-md border border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No actions configured for this client yet.{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={openCreate}
            >
              Create one
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Steps / fields</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionDefs.map((def) => (
                <TableRow key={def.id}>
                  <TableCell className="font-medium">{def.title}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{def.key}</TableCell>
                  <TableCell className="text-muted-foreground">{def.category}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{def.icon}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {def.steps.length} step{def.steps.length === 1 ? '' : 's'} · {fieldCount(def)} field
                      {fieldCount(def) === 1 ? '' : 's'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={def.enabled}
                      onCheckedChange={() => void handleToggleEnabled(def)}
                      disabled={togglingId === def.id}
                      aria-label={def.enabled ? 'Disable action' : 'Enable action'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(def)}
                        disabled={deletingId === def.id}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(def)}
                        disabled={deletingId === def.id}
                      >
                        {deletingId === def.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTenantId && (
        <ActionDefFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          tenantId={activeTenantId}
          actionDef={editTarget}
          onSaved={() => void loadDefs()}
        />
      )}
    </div>
  );
}
