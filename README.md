# MSP Client Portal Demo

A self-contained, white-label MSP client portal built for demos. It ships with three fictional clients, realistic sample records across every portal feature, one-click identities, and a local SQLite database for mutable demo content.

No Docker, Postgres, cloud login, vendor credentials, or external API access is required.

## Run the demo

```bash
npm install
npm run demo
```

`npm run demo` builds the production frontend and launches it with the local API. Open the Vite preview URL printed in the terminal. For development with hot reload, use:

```bash
npm run dev
```

Both commands automatically create `server/data/app.db`, apply SQLite migrations, and seed the demo on the first run. An `.env` file is optional; see `.env.example` for port, host, and database-path overrides.

## Demo identities

The login page offers three one-click choices:

- **Alex Morgan — boxIT Demo Admin:** all three clients plus Clients, Users, and action-management tools.
- **Sarah Okonkwo — Brightwater IT Manager:** Brightwater client-admin experience, including Budget and QBR access.
- **Marcus Thiele — Brightwater Operations Analyst:** Brightwater client-user experience with role-gated planning content.

Authentication is deliberately local and demo-only. Sessions are kept in memory by the backend, so restarting the backend requires signing in again.

## Sample clients and data

- **Brightwater Logistics** — logistics, indigo/violet branding.
- **Cedar & Vine Hospitality** — hospitality, amber/forest branding.
- **Northwind Health Partners** — healthcare, teal/blue branding.

Canonical sample records live in `src/data/seed/`. They cover people, devices, licenses, tickets, assets, roadmaps, QBRs, budgets, risks, reports, documents, forms, apps, news, and activity.

SQLite persists:

- Client branding and metadata edits.
- Demo users and client grants.
- Tenant-specific action definitions.
- Tickets created directly or through an action wizard.
- Form submissions.
- Admin audit events.

Created tickets are merged with the canonical ticket samples. Form submissions are scoped to the active client persona. Other transient interface state, such as dismissed banners and the current activity overlay, resets with the browser session.

## Architecture

- **Frontend:** Vite, React 18, strict TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Router, Recharts.
- **Backend:** Fastify with Drizzle ORM over `better-sqlite3`.
- **Immutable domain data:** typed sample services behind `useServices()`.
- **Mutable demo data:** same-origin REST services backed by SQLite.
- **Multi-tenancy:** every service call and persisted record is scoped by tenant ID.

The portal has one permanent sample-only service graph. There is no live-data switch or connector registry. Components continue to consume typed service interfaces rather than importing persistence details.

## Commands

```bash
npm run dev               # frontend + backend with hot reload
npm run demo              # production build + preview + backend
npm run build             # strict type checks and frontend build
npm test                  # isolated in-memory SQLite tests
npm run lint              # ESLint
npm run db:generate       # generate SQLite migrations from schema changes
npm run db:migrate        # apply migrations to the local SQLite file
```

The default database file is gitignored. To start from a completely clean demo, stop the app and remove `server/data/app.db` plus any `-wal`/`-shm` companions; the next startup recreates the canonical sample baseline.

## Admin surfaces

Alex Morgan can open **Admin** from the user menu:

- **Clients:** edit the three demo clients' display metadata and branding tokens.
- **Users:** create, edit, disable, and grant client access to local demo identities.
- **Actions:** available from the portal's Actions page for editing tenant-specific self-service workflows.

Integration, connection, import, synchronization, and SSO surfaces are intentionally absent from this demo.
