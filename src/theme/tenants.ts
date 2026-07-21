import React from 'react';

// ── Shared types (re-exported from server/db/schema — duplicated for SPA use) ──

export interface TenantThemeTokens {
  primary: string;
  accent: string;
  primaryForeground?: string;
  accentForeground?: string;
  ring?: string;
  sidebarGradient: string;
}

export type LogoDescriptor =
  | { kind: 'builtin'; key: string }
  | { kind: 'generated'; shape: string; primary: string; accent: string; text: string };

export interface TenantPublic {
  id: string;
  slug: string;
  name: string;
  vertical: string | null;
  theme: TenantThemeTokens;
  logo: LogoDescriptor;
  supportPhone: string | null;
  supportHours: string | null;
  status: string;
  dataSource: {
    connectWise: boolean;
    ninjaOne: boolean;
  };
}

// ── TenantTheme (portal runtime shape) ───────────────────────────────────────

export interface TenantTheme {
  id: string;
  name: string;
  vertical: string;
  logo: React.FC<{ className?: string }>;
  mark: React.FC<{ className?: string }>;
  sidebarGradient: string;
  cssVars: Record<string, string>;
  supportPhone: string;
  supportHours: string;
  dataSource: TenantPublic['dataSource'];
}

// ─── Brightwater Logistics ────────────────────────────────────────────────────

const BrightwaterMark: React.FC<{ className?: string }> = ({ className }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 40 40', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: '#4f46e5' }),
    React.createElement('path', {
      d: 'M8 28 L20 12 L32 28',
      stroke: 'white',
      strokeWidth: '3',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none',
    }),
    React.createElement('path', {
      d: 'M14 22 L26 22',
      stroke: 'rgba(255,255,255,0.6)',
      strokeWidth: '2.5',
      strokeLinecap: 'round',
    }),
    React.createElement('circle', { cx: '20', cy: '12', r: '2.5', fill: 'white' })
  );

const BrightwaterLogo: React.FC<{ className?: string }> = ({ className }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 180 40', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
    // Mark
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: '#4f46e5' }),
    React.createElement('path', {
      d: 'M8 28 L20 12 L32 28',
      stroke: 'white',
      strokeWidth: '3',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none',
    }),
    React.createElement('path', {
      d: 'M14 22 L26 22',
      stroke: 'rgba(255,255,255,0.6)',
      strokeWidth: '2.5',
      strokeLinecap: 'round',
    }),
    React.createElement('circle', { cx: '20', cy: '12', r: '2.5', fill: 'white' }),
    // Wordmark
    React.createElement(
      'text',
      { x: '50', y: '16', fontFamily: 'system-ui, sans-serif', fontSize: '11', fontWeight: '700', fill: 'white' },
      'BRIGHTWATER'
    ),
    React.createElement(
      'text',
      { x: '50', y: '30', fontFamily: 'system-ui, sans-serif', fontSize: '9', fontWeight: '400', fill: 'rgba(255,255,255,0.75)', letterSpacing: '1.5' },
      'LOGISTICS'
    )
  );

// ─── Cedar & Vine Hospitality ─────────────────────────────────────────────────

const CedarvineMark: React.FC<{ className?: string }> = ({ className }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 40 40', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: '#d97706' }),
    // Leaf/vine mark
    React.createElement('path', {
      d: 'M20 32 C20 32 10 26 10 18 C10 13 14 9 20 9 C26 9 30 13 30 18 C30 26 20 32 20 32Z',
      fill: '#15803d',
      opacity: '0.9',
    }),
    React.createElement('path', {
      d: 'M20 32 L20 16',
      stroke: 'white',
      strokeWidth: '1.5',
      strokeLinecap: 'round',
    }),
    React.createElement('path', {
      d: 'M20 24 C17 21 14 20 13 19',
      stroke: 'rgba(255,255,255,0.7)',
      strokeWidth: '1.2',
      strokeLinecap: 'round',
    }),
    React.createElement('path', {
      d: 'M20 20 C23 17 26 16 27 15',
      stroke: 'rgba(255,255,255,0.7)',
      strokeWidth: '1.2',
      strokeLinecap: 'round',
    })
  );

const CedarvineLogo: React.FC<{ className?: string }> = ({ className }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 190 40', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: '#d97706' }),
    React.createElement('path', {
      d: 'M20 32 C20 32 10 26 10 18 C10 13 14 9 20 9 C26 9 30 13 30 18 C30 26 20 32 20 32Z',
      fill: '#15803d',
      opacity: '0.9',
    }),
    React.createElement('path', { d: 'M20 32 L20 16', stroke: 'white', strokeWidth: '1.5', strokeLinecap: 'round' }),
    React.createElement('path', { d: 'M20 24 C17 21 14 20 13 19', stroke: 'rgba(255,255,255,0.7)', strokeWidth: '1.2', strokeLinecap: 'round' }),
    React.createElement('path', { d: 'M20 20 C23 17 26 16 27 15', stroke: 'rgba(255,255,255,0.7)', strokeWidth: '1.2', strokeLinecap: 'round' }),
    React.createElement(
      'text',
      { x: '50', y: '17', fontFamily: 'Georgia, serif', fontSize: '13', fontWeight: '700', fill: 'white' },
      'Cedar & Vine'
    ),
    React.createElement(
      'text',
      { x: '50', y: '31', fontFamily: 'system-ui, sans-serif', fontSize: '8', fontWeight: '400', fill: 'rgba(255,255,255,0.75)', letterSpacing: '1.8' },
      'HOSPITALITY'
    )
  );

// ─── Northwind Health Partners ────────────────────────────────────────────────

const NorthwindMark: React.FC<{ className?: string }> = ({ className }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 40 40', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: '#0d9488' }),
    // Cross / health mark
    React.createElement('rect', { x: '17', y: '9', width: '6', height: '22', rx: '2', fill: 'white' }),
    React.createElement('rect', { x: '9', y: '17', width: '22', height: '6', rx: '2', fill: 'white' }),
    React.createElement('circle', { cx: '20', cy: '20', r: '4', fill: '#0d9488' })
  );

const NorthwindLogo: React.FC<{ className?: string }> = ({ className }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 210 40', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: '#0d9488' }),
    React.createElement('rect', { x: '17', y: '9', width: '6', height: '22', rx: '2', fill: 'white' }),
    React.createElement('rect', { x: '9', y: '17', width: '22', height: '6', rx: '2', fill: 'white' }),
    React.createElement('circle', { cx: '20', cy: '20', r: '4', fill: '#0d9488' }),
    React.createElement(
      'text',
      { x: '50', y: '16', fontFamily: 'system-ui, sans-serif', fontSize: '11', fontWeight: '700', fill: 'white' },
      'NORTHWIND'
    ),
    React.createElement(
      'text',
      { x: '50', y: '30', fontFamily: 'system-ui, sans-serif', fontSize: '8.5', fontWeight: '400', fill: 'rgba(255,255,255,0.75)', letterSpacing: '0.8' },
      'HEALTH PARTNERS'
    )
  );

// ─── Builtin logo registry ────────────────────────────────────────────────────

export const BUILTIN_LOGOS: Record<string, { logo: React.FC<{ className?: string }>; mark: React.FC<{ className?: string }> }> = {
  brightwater: { logo: BrightwaterLogo, mark: BrightwaterMark },
  cedarvine:   { logo: CedarvineLogo,   mark: CedarvineMark   },
  northwind:   { logo: NorthwindLogo,   mark: NorthwindMark   },
};

// ─── Logo descriptor → React components ──────────────────────────────────────

import { renderGeneratedLogo, pickDefaultLogo } from './logoGenerator';
import type { GeneratedLogoDescriptor } from './logoGenerator';

function descriptorToComponents(descriptor: LogoDescriptor): {
  logo: React.FC<{ className?: string }>;
  mark: React.FC<{ className?: string }>;
} {
  if (descriptor.kind === 'builtin') {
    const builtin = BUILTIN_LOGOS[descriptor.key];
    if (builtin) return builtin;
    // fallback: treat the key as a name and generate
    const generated = pickDefaultLogo(descriptor.key);
    return descriptorToComponents(generated);
  }

  // kind === 'generated'
  const desc: GeneratedLogoDescriptor = {
    kind: 'generated',
    shape: descriptor.shape,
    primary: descriptor.primary,
    accent: descriptor.accent,
    text: descriptor.text,
  };
  const FullLogo: React.FC<{ className?: string }> = ({ className }) =>
    React.cloneElement(renderGeneratedLogo(desc, { variant: 'full' }), { className });
  const MarkLogo: React.FC<{ className?: string }> = ({ className }) =>
    React.cloneElement(renderGeneratedLogo(desc, { variant: 'mark' }), { className });

  return { logo: FullLogo, mark: MarkLogo };
}

// ─── Build TenantTheme from a TenantPublic API record ─────────────────────────

export function tenantThemeFromRecord(rec: TenantPublic): TenantTheme {
  const { logo, mark } = descriptorToComponents(rec.logo);

  const cssVars: Record<string, string> = {
    '--primary': rec.theme.primary,
    '--accent': rec.theme.accent,
  };
  if (rec.theme.primaryForeground) cssVars['--primary-foreground'] = rec.theme.primaryForeground;
  if (rec.theme.accentForeground)  cssVars['--accent-foreground']  = rec.theme.accentForeground;
  if (rec.theme.ring)              cssVars['--ring']                = rec.theme.ring;

  return {
    id: rec.id,
    name: rec.name,
    vertical: rec.vertical ?? '',
    logo,
    mark,
    sidebarGradient: rec.theme.sidebarGradient,
    cssVars,
    supportPhone: rec.supportPhone ?? '',
    supportHours: rec.supportHours ?? '',
    dataSource: rec.dataSource,
  };
}
