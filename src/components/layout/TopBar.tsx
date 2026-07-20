import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, Search, ChevronDown, LogOut, SwitchCamera, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSessionStore } from '@/store/session';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/authApi';
import { useTenantStore } from '@/theme/tenantStore';
import { getAccessibleTenants } from '@/lib/accessibleTenants';
import { Menu } from 'lucide-react';

interface TopBarProps {
  onMenuClick?: () => void;
}

function initialsFrom(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '??';
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { activeTenantId, switchTenant, logout: logoutSession } = useSessionStore();
  const { identity, accessibleClientIds, clear: clearAuth } = useAuthStore();
  const { tenants, getTenant } = useTenantStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const tenantName = getTenant(activeTenantId)?.name ?? '';
  const userName = identity?.name || identity?.email || 'Unknown';
  const userInitials = identity ? initialsFrom(identity.name, identity.email) : '??';
  const isAdminOrEditor = identity?.role === 'admin' || identity?.role === 'editor';
  const accessibleTenants = getAccessibleTenants(identity ?? null, accessibleClientIds, tenants);

  async function handleSignOut() {
    try {
      await authApi.logout();
    } catch {
      /* best effort */
    }
    clearAuth();
    logoutSession();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-9"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Global search"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" aria-label="Help">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">{tenantName}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="font-semibold">{userName}</div>
              <div className="text-xs text-muted-foreground font-normal">{identity?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Admin link */}
            {isAdminOrEditor && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Switch tenant */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">Switch tenant</DropdownMenuLabel>
              {accessibleTenants.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => switchTenant(t.id)}
                  className={t.id === activeTenantId ? 'bg-accent' : ''}
                >
                  <SwitchCamera className="h-4 w-4 mr-2" />
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
