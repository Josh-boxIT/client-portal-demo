import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';

const DEMO_IDENTITIES = [
  {
    key: 'admin',
    name: 'Alex Morgan',
    title: 'boxIT Demo Admin',
    description: 'Manage all sample clients, users, and portal actions.',
    email: 'alex.morgan@boxit.demo',
    tenantId: 'brightwater',
    personaId: 'bw-admin',
    icon: ShieldCheck,
  },
  {
    key: 'client-admin',
    name: 'Sarah Okonkwo',
    title: 'Brightwater IT Manager',
    description: 'Explore client-admin tools, budgets, QBRs, and requests.',
    email: 'sarah.okonkwo@brightwaterlogistics.com',
    tenantId: 'brightwater',
    personaId: 'bw-admin',
    icon: Building2,
  },
  {
    key: 'client-user',
    name: 'Marcus Thiele',
    title: 'Brightwater Operations Analyst',
    description: 'See the everyday client-user experience and role limits.',
    email: 'marcus.thiele@brightwaterlogistics.com',
    tenantId: 'brightwater',
    personaId: 'bw-user',
    icon: UserRound,
  },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession, setIdentity, setAccessibleClientIds } = useAuthStore();
  const { switchTenant, switchPersona } = useSessionStore();
  const [loading, setLoading] = useState<string | null>(null);

  async function signIn(identity: (typeof DEMO_IDENTITIES)[number]) {
    setLoading(identity.key);
    try {
      const result = await authApi.login(identity.email);
      setSession(result.token, result.identity);
      const me = await authApi.me();
      setIdentity(me);
      setAccessibleClientIds(me.clientIds ?? []);
      switchTenant(identity.tenantId);
      switchPersona(identity.personaId);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Demo sign-in failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col justify-center">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-950/40">
            <span className="text-xl font-bold text-white">bx</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Client Portal Demo</h1>
          <p className="mt-2 text-slate-400">Choose a sample identity to explore the portal.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {DEMO_IDENTITIES.map((identity) => {
            const Icon = identity.icon;
            return (
              <Card key={identity.key} className="flex flex-col border-slate-700/70 bg-white/95 shadow-xl">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{identity.name}</CardTitle>
                  <CardDescription className="font-medium text-slate-600">{identity.title}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="mb-5 flex-1 text-sm text-muted-foreground">{identity.description}</p>
                  <Button onClick={() => void signIn(identity)} disabled={loading !== null} className="w-full">
                    {loading === identity.key ? 'Opening demo…' : `Continue as ${identity.name.split(' ')[0]}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">Sample data only. No external services or credentials are used.</p>
      </div>
    </div>
  );
}
