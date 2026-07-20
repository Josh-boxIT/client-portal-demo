import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi, type UpdateClientPatch } from '../adminApi';
import type { ClientView } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditState {
  name: string;
  slug: string;
  vertical: string;
  status: string;
  primary: string;
  accent: string;
  sidebarGradient: string;
}

function editState(client: ClientView): EditState {
  return {
    name: client.name,
    slug: client.slug,
    vertical: client.vertical ?? '',
    status: client.status,
    primary: client.theme.primary,
    accent: client.theme.accent,
    sidebarGradient: client.theme.sidebarGradient,
  };
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientView | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.clients()
      .then(setClients)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load clients'))
      .finally(() => setLoading(false));
  }, []);

  function beginEdit(client: ClientView) {
    setEditing(client);
    setForm(editState(client));
  }

  async function save() {
    if (!editing || !form) return;
    setSaving(true);
    const patch: UpdateClientPatch = {
      name: form.name,
      slug: form.slug,
      vertical: form.vertical,
      status: form.status,
      theme: { primary: form.primary, accent: form.accent, sidebarGradient: form.sidebarGradient },
    };
    try {
      const updated = await adminApi.updateClient(editing.id, patch);
      setClients((current) => current.map((client) => client.id === updated.id ? updated : client));
      setEditing(null);
      setForm(null);
      toast.success('Client updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Demo clients</h1>
        <p className="mt-1 text-sm text-slate-400">Branding and metadata are stored locally in SQLite.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Vertical</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3"><div className="font-medium text-slate-100">{client.name}</div><div className="text-xs text-slate-500">{client.slug}</div></td>
                <td className="px-4 py-3 text-slate-300">{client.vertical || '—'}</td>
                <td className="px-4 py-3"><Badge variant={client.status === 'active' ? 'success' : 'secondary'}>{client.status}</Badge></td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => beginEdit(client)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setForm(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit demo client</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="client-name">Name</Label><Input id="client-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="client-slug">Slug</Label><Input id="client-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="client-vertical">Vertical</Label><Input id="client-vertical" value={form.vertical} onChange={(event) => setForm({ ...form, vertical: event.target.value })} /></div>
                <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="client-primary">Primary HSL</Label><Input id="client-primary" value={form.primary} onChange={(event) => setForm({ ...form, primary: event.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="client-accent">Accent HSL</Label><Input id="client-accent" value={form.accent} onChange={(event) => setForm({ ...form, accent: event.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="client-gradient">Sidebar gradient</Label><Input id="client-gradient" value={form.sidebarGradient} onChange={(event) => setForm({ ...form, sidebarGradient: event.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving || !form?.name.trim() || !form.slug.trim()} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
