import type { TenantTheme } from './tenants';

/**
 * Write tenant CSS variable overrides to :root (document.documentElement).
 * shadcn tokens use HSL channel format: "221 83% 53%"
 */
export function applyTheme(theme: TenantTheme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.cssVars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Reset CSS variables to defaults (useful if needed).
 */
export function resetTheme(): void {
  const root = document.documentElement;
  const defaults: Record<string, string> = {
    '--primary': '221 83% 53%',
    '--primary-foreground': '210 40% 98%',
    '--accent': '210 40% 96.1%',
    '--accent-foreground': '222.2 47.4% 11.2%',
    '--ring': '221 83% 53%',
  };
  for (const [key, value] of Object.entries(defaults)) {
    root.style.setProperty(key, value);
  }
}
