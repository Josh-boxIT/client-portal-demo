/**
 * Deterministic inline-SVG logo generator for admin-created tenants.
 * Style mirrors the bespoke marks in tenants.ts: rounded-rect background,
 * simple glyph in accent/white, optional wordmark for 'full' variant.
 *
 * This module intentionally exports both utility functions and a component-
 * returning function. Fast-refresh does not apply to utility modules.
 */

/* eslint-disable react-refresh/only-export-components */
import React from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedLogoDescriptor {
  kind: 'generated';
  shape: string;
  /** hex color string, e.g. "#4f46e5" */
  primary: string;
  /** hex color string, e.g. "#818cf8" */
  accent: string;
  /** short display text / initials */
  text: string;
}

// ── Shapes ────────────────────────────────────────────────────────────────────

export const LOGO_SHAPES = ['wave', 'leaf', 'cross', 'spark', 'hex', 'bolt', 'circle'] as const;
export type LogoShape = (typeof LOGO_SHAPES)[number];

// ── Palettes ──────────────────────────────────────────────────────────────────

/** A handful of pleasant hex palettes [primary, accent]. */
const PALETTES: [string, string][] = [
  ['#4f46e5', '#818cf8'], // indigo
  ['#0d9488', '#34d399'], // teal/emerald
  ['#d97706', '#fbbf24'], // amber
  ['#dc2626', '#f87171'], // red
  ['#7c3aed', '#c4b5fd'], // violet
  ['#0369a1', '#38bdf8'], // sky
  ['#15803d', '#4ade80'], // green
  ['#be185d', '#f9a8d4'], // pink
];

// ── Hash ──────────────────────────────────────────────────────────────────────

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

// ── Initials ──────────────────────────────────────────────────────────────────

function toInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function pickDefaultLogo(name: string): GeneratedLogoDescriptor {
  const h = simpleHash(name);
  const [primary, accent] = PALETTES[h % PALETTES.length];
  const shape = LOGO_SHAPES[h % LOGO_SHAPES.length];
  return {
    kind: 'generated',
    shape,
    primary,
    accent,
    text: toInitials(name),
  };
}

// ── Glyph renderers ───────────────────────────────────────────────────────────

function renderGlyph(shape: string, color: string): React.ReactElement {
  switch (shape) {
    case 'wave':
      return React.createElement('path', {
        key: 'g',
        d: 'M8 24 C10 20 14 16 20 18 C26 20 30 16 32 12',
        stroke: color,
        strokeWidth: '3',
        strokeLinecap: 'round',
        fill: 'none',
      });
    case 'leaf':
      return React.createElement('path', {
        key: 'g',
        d: 'M20 30 C20 30 11 24 11 17 C11 12 15 8 20 8 C25 8 29 12 29 17 C29 24 20 30 20 30Z M20 30 L20 15',
        stroke: 'none',
        fill: color,
        opacity: '0.9',
      });
    case 'cross':
      return React.createElement(
        React.Fragment,
        { key: 'g' },
        React.createElement('rect', { x: '17', y: '9', width: '6', height: '22', rx: '2', fill: color }),
        React.createElement('rect', { x: '9', y: '17', width: '22', height: '6', rx: '2', fill: color }),
      );
    case 'spark':
      return React.createElement('path', {
        key: 'g',
        d: 'M20 8 L22 17 L31 17 L24 23 L27 32 L20 26 L13 32 L16 23 L9 17 L18 17 Z',
        fill: color,
      });
    case 'hex':
      return React.createElement('polygon', {
        key: 'g',
        points: '20,9 29,14 29,26 20,31 11,26 11,14',
        fill: 'none',
        stroke: color,
        strokeWidth: '2.5',
      });
    case 'bolt':
      return React.createElement('path', {
        key: 'g',
        d: 'M22 8 L14 22 L19 22 L18 32 L26 18 L21 18 Z',
        fill: color,
      });
    case 'circle':
      return React.createElement('circle', {
        key: 'g',
        cx: '20',
        cy: '20',
        r: '9',
        fill: 'none',
        stroke: color,
        strokeWidth: '3',
      });
    default:
      // fallback: initials text inside mark
      return React.createElement(
        'text',
        {
          key: 'g',
          x: '20',
          y: '25',
          textAnchor: 'middle',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14',
          fontWeight: '700',
          fill: color,
        },
        '',
      );
  }
}

export function renderGeneratedLogo(
  descriptor: GeneratedLogoDescriptor,
  opts: { variant: 'mark' | 'full' },
): React.ReactElement {
  const { shape, primary, accent, text } = descriptor;
  const glyph = renderGlyph(shape, accent);

  if (opts.variant === 'mark') {
    return React.createElement(
      'svg',
      {
        viewBox: '0 0 40 40',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
      },
      React.createElement('rect', { width: '40', height: '40', rx: '8', fill: primary }),
      glyph,
    );
  }

  // 'full' — mark + wordmark
  const label = text.length <= 3 ? text : text.slice(0, 8);
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 180 40',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    // Mark
    React.createElement('rect', { width: '40', height: '40', rx: '8', fill: primary }),
    glyph,
    // Wordmark
    React.createElement(
      'text',
      {
        x: '50',
        y: '25',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13',
        fontWeight: '700',
        fill: 'white',
      },
      label,
    ),
  );
}
