import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Zap, Ticket, Users, HardDrive, Key,
  Map, PresentationIcon, DollarSign, ShieldAlert, BarChart3,
  FileText, ClipboardList, Newspaper, Phone, UserMinus, ListChecks,
  BriefcaseBusiness,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/session';
import { useTenantStore } from '@/theme/tenantStore';
import { useAuthStore } from '@/store/auth';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  staffOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OPERATE',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Actions', href: '/actions', icon: <Zap className="h-4 w-4" /> },
      { label: 'Tickets', href: '/tickets', icon: <Ticket className="h-4 w-4" /> },
      { label: 'People & devices', href: '/people', icon: <Users className="h-4 w-4" /> },
      { label: 'Assets & lifecycle', href: '/assets', icon: <HardDrive className="h-4 w-4" /> },
      { label: 'Licenses', href: '/licenses', icon: <Key className="h-4 w-4" /> },
    ],
  },
  {
    label: 'PLAN',
    items: [
      { label: 'Roadmaps', href: '/roadmaps', icon: <Map className="h-4 w-4" /> },
      { label: 'QBRs', href: '/qbrs', icon: <PresentationIcon className="h-4 w-4" /> },
      { label: 'Budget', href: '/budget', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Risk register', href: '/risk', icon: <ShieldAlert className="h-4 w-4" /> },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { label: 'Reports & metrics', href: '/reports', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Customer Churn', href: '/customer-churn', icon: <UserMinus className="h-4 w-4" /> },
      {
        label: 'Queue Attention',
        href: '/queue-attention',
        icon: <ListChecks className="h-4 w-4" />,
        staffOnly: true,
      },
      {
        label: 'Sales Opportunities',
        href: '/sales-opportunities',
        icon: <BriefcaseBusiness className="h-4 w-4" />,
        staffOnly: true,
      },
    ],
  },
  {
    label: 'RESOURCES',
    items: [
      { label: 'Documents', href: '/documents', icon: <FileText className="h-4 w-4" /> },
      { label: 'Forms', href: '/forms', icon: <ClipboardList className="h-4 w-4" /> },
      { label: 'News', href: '/news', icon: <Newspaper className="h-4 w-4" /> },
    ],
  },
];

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const { activeTenantId } = useSessionStore();
  const { identity } = useAuthStore();
  const { getTenant } = useTenantStore();
  const navigate = useNavigate();

  const tenant = getTenant(activeTenantId);

  const Logo = tenant?.logo;
  const gradient = tenant?.sidebarGradient ?? 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)';
  const phone = tenant?.supportPhone ?? '';
  const hours = tenant?.supportHours ?? '';
  const isStaff = identity?.role === 'admin' || identity?.role === 'editor';

  function handleNavClick() {
    if (onClose) onClose();
  }

  return (
    <div
      className={cn('flex flex-col h-full text-white', className)}
      style={{ background: gradient }}
    >
      {/* Logo / tenant name */}
      <div
        className="flex items-center gap-3 px-4 py-5 cursor-pointer"
        onClick={() => { navigate('/'); handleNavClick(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
      >
        {Logo && <Logo className="h-9 w-auto max-w-[160px]" />}
      </div>

      <Separator className="bg-white/10 mx-4" />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.filter((item) => !item.staffOnly || isStaff).map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Support card */}
      {phone && (
        <div className="mx-3 mb-4 rounded-lg bg-white/10 p-3">
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold mb-1">
            <Phone className="h-3.5 w-3.5" />
            Need a human now?
          </div>
          <div className="text-white text-sm font-medium">{phone}</div>
          <div className="text-white/60 text-xs mt-0.5">{hours}</div>
        </div>
      )}
    </div>
  );
}
