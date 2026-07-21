import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminApi } from '../adminApi';
import type { AdminRole, AdminUser, ClientView } from '../types';

interface Props {
  open: boolean;
  user: AdminUser | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: AdminRole[] = ['admin', 'editor', 'viewer'];

export function UserFormDialog({ open, user, onClose, onSaved }: Props) {
  const isEdit = user !== null;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('editor');
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [clients, setClients] = useState<ClientView[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email ?? '');
    setName(user?.name ?? '');
    setRole(user?.role ?? 'editor');
    setClientIds(user?.clientIds ?? []);
    setError(null);
    adminApi.clients().then(setClients).catch(() => setClients([]));
  }, [open, user]);

  function toggleClient(id: string) {
    setClientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await adminApi.updateUser(user!.id, { name, role, clientIds: role === 'viewer' ? clientIds : [] });
      } else {
        await adminApi.createUser({ email, name, role, clientIds: role === 'viewer' ? clientIds : undefined });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit user' : 'Add user'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="uf-email">Email</Label>
            <Input id="uf-email" value={email} disabled={isEdit}
              onChange={(e) => setEmail(e.target.value)} placeholder="person@boxit.net" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf-name">Name</Label>
            <Input id="uf-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf-role">Role</Label>
            <select
              id="uf-role"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {role === 'viewer' && (
            <div className="space-y-1.5">
              <Label>Client access</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-slate-700 bg-slate-800 p-2 space-y-1">
                {clients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={clientIds.includes(c.id)} onChange={() => toggleClient(c.id)} />
                    <span>{c.displayName || c.name}</span>
                  </label>
                ))}
                {clients.length === 0 && <p className="text-xs text-slate-500">No clients available.</p>}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !email || !name}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
