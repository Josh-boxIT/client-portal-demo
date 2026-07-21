# Build: White-label MSP Client Portal (v1, mock data)

Build a polished, runnable single-page web app: a white-label self-service portal that an MSP gives to its clients' end users (think a client-side junior IT/ops person who runs common fixes themselves instead of waiting on a senior admin). This is v1 with seeded mock data only — no live integrations — but architected so real APIs slot in later without rewriting components.

## Stack & tooling
- Vite + React + TypeScript, Tailwind CSS, **shadcn/ui** (initialize it), **lucide-react** icons, **recharts** for charts, **react-router-dom** for routing.
- Use **zustand** for app/session state (active tenant, active persona, ephemeral session data). NO persistence — state resets on reload. Do not use localStorage/sessionStorage.
- `date-fns` for dates. Use shadcn's `cn` helper.
- Strict TypeScript. ESLint + Prettier. Clean, conventional commit-able structure.

## Layout (reproduce the reference look)
A clean SaaS dashboard: a colored gradient left sidebar, a top bar, and a light content area.

**Left sidebar**, grouped with section labels, in this exact order (NO "Approvals" — omit it):
- OPERATE: Dashboard, Actions, Tickets, People & devices, Assets & lifecycle
- PLAN: Roadmaps, QBRs
- INSIGHTS: Reports & metrics
- RESOURCES: Documents, Forms, My apps, News

Sidebar shows the active tenant's logo + name at top, nav items with icons + optional count badges, and a bottom "Need a human now?" support card (phone + hours). Sidebar collapses to icons / a drawer on mobile.

**Top bar:** global search input, notifications bell, help icon, and a user menu showing the active persona (name, title) + tenant. The user menu contains the **tenant + persona switcher** (see below).

## White-label theming
Drive branding entirely from the active tenant via CSS variables (lean on shadcn's `--primary`, `--accent`, etc.) plus a sidebar gradient and a tenant logo. Switching tenant reskins the whole app live: logo, name, primary/accent colors, sidebar gradient, and the data shown. Define theme tokens per tenant in `src/theme/tenants.ts`.

## Auth & persona switcher (fake)
- A simple fake login screen (pick a persona, no real credentials) that lands on the Dashboard.
- A tenant + persona switcher (in the user menu and on the login screen) to flip between seeded tenants/personas at any time.
- Personas carry a role (`client-admin` vs `client-user`). Role lightly gates UI: e.g., QBRs are admin-only; users see a friendly "ask your admin" state. Keep gating simple but real.

## Data layer (the important part)
Define a **typed service interface per domain** and provide **mock implementations** now. Design interfaces so a future REST-backed implementation (ConnectWise Manage, NinjaRMM, Hudu, CIPP, M365, etc.) can replace the mock with no component changes.
- `src/services/types.ts` — domain models + service interfaces (e.g., `TicketService`, `PeopleService`, `DeviceService`, `AssetService`, `RoadmapService`, `QBRService`, `MetricsService`, `DocumentService`, `FormService`, `AppLaunchpadService`, `NewsService`, `ActionService`).
- Make method signatures and return shapes **REST-friendly**: async, paginated list results (`{ data, page, pageSize, total }`), typed filters, and id-based fetches — so swapping in a `fetch`-based impl is mechanical.
- `src/services/mock/*` — mock impls reading from seed data, with small simulated latency.
- A `ServicesProvider` (React context) exposes the services; components consume via a `useServices()` hook. A future `src/services/rest/*` directory swaps in behind the same provider.
- Components must NEVER import seed data directly — only go through services.

## Seed data
Create **3 tenants** in distinct verticals with distinct themes and **logoipsum-style placeholder logos generated as local inline SVG components** (abstract mark + wordmark, no external requests):
1. **Brightwater Logistics** (logistics) — deep indigo/violet sidebar (matches the reference).
2. **Cedar & Vine Hospitality** (hospitality) — warm amber/forest theme.
3. **Northwind Health Partners** (healthcare) — teal/blue theme.

Each tenant gets 2 personas (one `client-admin`, one `client-user`) and realistic seeded records across every page (people, devices, tickets, assets, roadmap items, QBRs, metrics time-series, documents, forms, apps, news). Vary the numbers per tenant so switching feels real.

## Interaction bar ("functional shells")
Every page gets a realistic layout, seeded data, and working **in-page** interactions: search, filters, tabs, sortable tables, detail drawers/modals, toasts, and optimistic UI. Forms validate and "submit" into session state (appear in a submissions list) but reset on reload. Include loading skeletons and empty states. No backend, no persistence.

## Pages
- **Dashboard** — reproduce the reference closely: a dismissible announcement banner; "Good morning, {firstName}" greeting + a self-service tagline; a primary CTA ("Onboard employee"); four KPI cards (Open Tickets, Security Score /100 with trend, Licenses in Use x/y with unused $ /mo, Devices Compliant % with "x of y healthy"); a "Your people" list (avatar, name, role, status badge Active/Onboarding, Manage link, Add + Manage all); a "Quick actions" card (Onboard a new employee, Reset a password, Request software or a license, Report a security concern, See all actions); a "Recent activity" feed with View all. (Note: there is no Approvals feature — reword any "awaiting your approval" copy to "needs your input.")
- **Actions** — grid of self-service automation cards (onboard, offboard, reset password, unlock account, reset MFA, request software/license, create shared mailbox, report security concern). Each opens a multi-step guided modal that **simulates** running with progress, then a success toast + entry in Recent activity.
- **Tickets** — filterable/sortable table (status, priority, requester), search, "New ticket" form, and a detail drawer with a threaded conversation and status changes.
- **People & devices** — employee directory (status, role, manager) → person detail showing assigned devices, licenses, and groups; device list with filters.
- **Assets & lifecycle** — hardware/software assets with warranty/lifecycle status, refresh timeline, filters by type/status.
- **Roadmaps** — IT initiatives across quarters with status/owner; simple timeline/kanban.
- **QBRs** (admin-only) — past/upcoming quarterly reviews, each with summary metrics, action items, and a placeholder deck/doc link.
- **Reports & metrics** — dashboard of recharts visuals: tickets over time, SLA attainment, security score trend, device compliance, license utilization. Date-range filter.
- **Documents** — knowledge base: folders, search, doc cards, and a reader view (markdown-rendered placeholder content).
- **Forms** — list of request forms; opening one shows a validated form that submits to a session "My submissions" list.
- **My apps** — SSO launchpad grid of app tiles (generic: Mail, Chat, CRM, Files, etc.); clicking opens a placeholder.
- **News** — announcements feed with article cards and a reader view.

## Quality bar
- Responsive (usable down to mobile), keyboard-accessible, sensible focus states, ARIA where relevant.
- Consistent design system via shadcn + Tailwind tokens; cohesive spacing/typography; no default-template feel.
- No console errors. `npm install && npm run dev` works out of the box.

## Deliverables
- A runnable repo with the structure: `src/{app, routes, components/ui, components/layout, features/<page>, services/{types,mock}, data, theme, lib, store}`.
- A `README.md` covering: how to run; how the service layer works and how to add a `rest` implementation; how to add a tenant/persona; and where seed data lives.
- Build the full breadth first (all pages reachable with real layouts + seeded data + working in-page interactions), then polish.
