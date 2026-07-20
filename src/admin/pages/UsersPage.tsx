import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '../adminApi';
import { useAuthStore } from '@/store/auth';
import type { AdminUser } from '../types';
import { UserFormDialog } from './UserFormDialog';

export function UsersPage() {
  const identity = useAuthStore((s) => s.identity);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await adminApi.users());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // UX guard; the backend is authoritative (403 for non-admins).
  if (identity && identity.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  async function handleDisable(u: AdminUser) {
    try {
      await adminApi.disableUser(u.id);
      toast.success(`${u.email} disabled`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disable failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Users</h1>
          <p className="text-sm text-slate-400">Manage staff access and roles.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Add user</Button>
      </div>

      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Client access</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="text-slate-200">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-slate-400">{u.email}</td>
                <td className="px-4 py-2"><Badge>{u.role}</Badge></td>
                <td className="px-4 py-2">{u.status}</td>
                <td className="px-4 py-2 text-slate-400">
                  {u.role === 'viewer' ? `${u.clientIds.length} client(s)` : 'All'}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setDialogOpen(true); }}>Edit</Button>
                  {u.status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => handleDisable(u)}>Disable</Button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <UserFormDialog
        open={dialogOpen}
        user={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
