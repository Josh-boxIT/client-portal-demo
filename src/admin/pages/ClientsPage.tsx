import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi, type UpdateClientPatch } from '../adminApi';
import type { ClientView, ConnectWiseCompanyView } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantStore } from '@/theme/tenantStore';

interface EditState {
  name: string;
  displayName: string;
  slug: string;
  vertical: string;
  status: string;
  primary: string;
  accent: string;
  sidebarGradient: string;
  connectWiseCompanyId: string;
  ninjaOneOrganizationId: string;
}

function editState(client: ClientView): EditState {
  return {
    name: client.name,
    displayName: client.displayName ?? '',
    slug: client.slug,
    vertical: client.vertical ?? '',
    status: client.status,
    primary: client.theme.primary,
    accent: client.theme.accent,
    sidebarGradient: client.theme.sidebarGradient,
    connectWiseCompanyId: client.connectWiseCompanyId?.toString() ?? '',
    ninjaOneOrganizationId: client.ninjaOneOrganizationId?.toString() ?? '',
  };
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientView | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState<ConnectWiseCompanyView[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [companySearchError, setCompanySearchError] = useState('');
  const [importingCompanyId, setImportingCompanyId] = useState<number | null>(null);

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

  async function loadConnectWiseCompanies(search: string) {
    setSearchingCompanies(true);
    setCompanySearchError('');
    try {
      setCompanies(await adminApi.connectWiseCompanies(search));
    } catch (error) {
      setCompanies([]);
      setCompanySearchError(error instanceof Error ? error.message : 'Could not load ConnectWise companies');
    } finally {
      setSearchingCompanies(false);
    }
  }

  function beginImport() {
    setImportOpen(true);
    setCompanySearch('');
    void loadConnectWiseCompanies('');
  }

  async function importCompany(company: ConnectWiseCompanyView) {
    setImportingCompanyId(company.id);
    try {
      const imported = await adminApi.importConnectWiseCompany(company.id);
      setClients((current) => [...current, imported].sort((a, b) =>
        (a.displayName || a.name).localeCompare(b.displayName || b.name)));
      setCompanies((current) => current.map((candidate) => candidate.id === company.id
        ? { ...candidate, importedTenantId: imported.id }
        : candidate));
      await useTenantStore.getState().load();
      toast.success(`${company.name} imported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImportingCompanyId(null);
    }
  }

  async function save() {
    if (!editing || !form) return;
    setSaving(true);
    const patch: UpdateClientPatch = {
      name: form.name,
      displayName: form.displayName.trim() || null,
      slug: form.slug,
      vertical: form.vertical,
      status: form.status,
      theme: { primary: form.primary, accent: form.accent, sidebarGradient: form.sidebarGradient },
      connectWiseCompanyId: form.connectWiseCompanyId.trim() ? Number(form.connectWiseCompanyId) : null,
      ninjaOneOrganizationId: form.ninjaOneOrganizationId.trim() ? Number(form.ninjaOneOrganizationId) : null,
    };
    try {
      const updated = await adminApi.updateClient(editing.id, patch);
      setClients((current) => current.map((client) => client.id === updated.id ? updated : client));
      await useTenantStore.getState().load();
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Clients</h1>
          <p className="mt-1 text-sm text-slate-400">Demo clients and imported ConnectWise companies are stored locally in SQLite.</p>
        </div>
        <Button onClick={beginImport}>Import from ConnectWise</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Vertical</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{client.displayName || client.name}</div>
                  <div className="text-xs text-slate-500">
                    {client.displayName ? `${client.name} · ` : ''}{client.slug}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">{client.vertical || '—'}</td>
                <td className="px-4 py-3"><div className="flex gap-1.5"><Badge variant={client.connectWiseCompanyId ? 'success' : 'secondary'}>CW {client.connectWiseCompanyId ?? 'demo'}</Badge><Badge variant={client.ninjaOneOrganizationId ? 'success' : 'secondary'}>Ninja {client.ninjaOneOrganizationId ?? 'demo'}</Badge></div></td>
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
                <div className="space-y-1.5"><Label htmlFor="client-name">Source name</Label><Input id="client-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="client-slug">Slug</Label><Input id="client-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-display-name">Display name</Label>
                <Input id="client-display-name" placeholder="Uses source name when blank" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
                <p className="text-xs text-slate-500">Shown throughout the portal and used in AI-generated content. Live-data mappings continue to use the client IDs below.</p>
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
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="space-y-1.5"><Label htmlFor="client-connectwise-company">ConnectWise company ID</Label><Input id="client-connectwise-company" inputMode="numeric" placeholder="Blank uses demo data" value={form.connectWiseCompanyId} onChange={(event) => setForm({ ...form, connectWiseCompanyId: event.target.value.replace(/\D/g, '') })} /></div>
                <div className="space-y-1.5"><Label htmlFor="client-ninja-organization">NinjaOne organization ID</Label><Input id="client-ninja-organization" inputMode="numeric" placeholder="Blank uses demo data" value={form.ninjaOneOrganizationId} onChange={(event) => setForm({ ...form, ninjaOneOrganizationId: event.target.value.replace(/\D/g, '') })} /></div>
                <p className="col-span-2 text-xs text-slate-500">Mappings enable read-only vendor data. Credentials remain server-side in the environment.</p>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving || !form?.name.trim() || !form.slug.trim()} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import a ConnectWise client</DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadConnectWiseCompanies(companySearch);
            }}
          >
            <Input
              aria-label="Search ConnectWise companies"
              placeholder="Search by company name or identifier"
              value={companySearch}
              onChange={(event) => setCompanySearch(event.target.value)}
            />
            <Button type="submit" variant="outline" disabled={searchingCompanies}>
              {searchingCompanies ? 'Searching…' : 'Search'}
            </Button>
          </form>

          {companySearchError ? (
            <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {companySearchError}
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {searchingCompanies && companies.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading companies…</p>
              ) : companies.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No ConnectWise companies found.</p>
              ) : companies.map((company) => {
                const location = [company.city, company.state].filter(Boolean).join(', ');
                return (
                  <div key={company.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-100">{company.name}</p>
                        {company.status && <Badge variant="secondary">{company.status}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {company.identifier || `Company ${company.id}`}{location ? ` · ${location}` : ''}
                      </p>
                    </div>
                    {company.importedTenantId ? (
                      <Badge variant="success">Imported</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={importingCompanyId !== null}
                        onClick={() => void importCompany(company)}
                      >
                        {importingCompanyId === company.id ? 'Importing…' : 'Import'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Importing creates a read-only portal client and stores only its ConnectWise company ID. Credentials remain server-side.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
