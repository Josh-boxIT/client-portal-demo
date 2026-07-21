# MSP Client Portal Demo

A white-label MSP client portal built for demos. It ships with three fictional clients, realistic sample records across every portal feature, one-click identities, and a local SQLite database for mutable demo content. Optional read-only ConnectWise and NinjaOne mappings can replace the matching demo domains for any seeded client.

No Docker, Postgres, cloud login, vendor credentials, or external API access is required for the default demo.

## Development setup

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js 22 LTS](https://nodejs.org/) and npm. The repository is pinned to
  Node 22 because `better-sqlite3` is a native module and cannot share one
  `node_modules` installation across different Node ABI versions.

If you use nvm, select the checked-in runtime before installing:

```bash
nvm use
```

You do not need Docker, a cloud account, or any third-party credentials.

### Install and run

```bash
git clone https://github.com/Josh-boxIT/client-portal-demo.git
cd client-portal-demo
npm ci
npm run dev
```

Open the frontend URL printed by Vite (normally
`http://localhost:5173`). The development command starts both the React
frontend with hot reload and the local API at `http://127.0.0.1:8787`.

The first startup automatically creates `server/data/app.db`, applies the
SQLite migrations, and loads the sample data. An `.env` file is not required.
To override the API host, port, or database location, copy the example first:

```bash
cp .env.example .env
```

### Optional AI features

The portal hides its permission-aware AI assistant and disables new Sales Opportunities analysis unless an OpenAI API key is configured. The assistant can only search server-filtered records, while the staff-only opportunity agent produces structured, evidence-backed findings from agreements, tickets, churn data, and the admin product catalog. Neither feature can change external systems.

```bash
export OPENAI_API_KEY="your-api-key"
# Optional defaults:
export OPENAI_MODEL="gpt-5.6-terra"
export OPENAI_REASONING_EFFORT="low"
npm run dev
```

Conversation history and each client's latest opportunity analysis remain in the local SQLite database. The API key is read only by the Fastify server and is never sent to the browser.

### Optional read-only vendor data

Configure global credentials in `.env`, then sign in as the demo administrator and add a ConnectWise company ID and/or NinjaOne organization ID under **Admin → Clients**. The IDs are stored in SQLite; secrets remain in the server environment.

```bash
CONNECTWISE_BASE_URL=https://api-na.myconnectwise.net/v4_6_release/apis/3.0
CONNECTWISE_COMPANY_ID=your-psa-company-id
CONNECTWISE_PUBLIC_KEY=...
CONNECTWISE_PRIVATE_KEY=...
CONNECTWISE_CLIENT_ID=...

NINJAONE_BASE_URL=https://app.ninjarmm.com
NINJAONE_CLIENT_ID=...
NINJAONE_CLIENT_SECRET=...
```

Mapped ConnectWise clients use live people, configurations/devices, tickets from the last 365 days, ticket notes/time entries/attachments, and agreements. Mapped NinjaOne organizations enrich those devices with inventory and telemetry. If a vendor read fails, the portal uses that tenant's demo data. Any vendor mapping marks the client as read-only: ticket creation, replies, status changes, and action-generated tickets are disabled.

In **Admin → Clients**, **Import from ConnectWise** searches companies by name or identifier and creates a new portal client from the selected company. The server fetches the selected company directly from ConnectWise, generates local branding, stores its company ID in SQLite, and exposes the new tenant to staff users. Existing clients can still be edited to change their ConnectWise or NinjaOne numeric mappings.

After making changes, run the same checks used to validate the project:

```bash
npm test
npm run lint
npm run build
```

### Run the production-style demo locally

```bash
npm run demo
```

This builds the production frontend and launches it with the local API. Open
the preview URL printed in the terminal.

### Reset the local demo data

Stop the development server, delete `server/data/app.db` and any neighboring
`app.db-wal` or `app.db-shm` files, then run `npm run dev` again. These database
files are ignored by Git and are recreated from the canonical sample data.

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

Canonical sample records live in `src/data/seed/`. They cover people, devices, licenses, tickets, generated ConnectWise agreements, assets, roadmaps, QBRs, budgets, risks, reports, documents, forms, apps, news, and activity.

SQLite persists:

- Client branding and metadata edits.
- Demo users and client grants.
- Tenant-specific action definitions.
- Tickets created directly or through an action wizard.
- Form submissions.
- Permission-aware assistant conversations and messages.
- The global sales product catalog, latest per-client opportunity analyses, and simulated ConnectWise handoff ledger.
- Admin audit events.

Created tickets are merged with the canonical ticket samples. Form submissions are scoped to the active client persona. Other transient interface state, such as dismissed banners and the current activity overlay, resets with the browser session.

## Architecture

- **Frontend:** Vite, React 18, strict TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Router, Recharts.
- **Backend:** Fastify with Drizzle ORM over `better-sqlite3`.
- **Domain data:** typed services behind `useServices()` with server-selected vendor reads or demo fallbacks.
- **Mutable demo data:** same-origin REST services backed by SQLite.
- **Multi-tenancy:** every service call and persisted record is scoped by tenant ID.
- **Permission-aware AI:** optional OpenAI-powered conversations plus staff-only structured sales analysis grounded in permitted demo records.

The portal has one service graph and no browser-side live-data switch. The Fastify backend selects vendor reads per tenant based on admin mappings, while components continue to consume the same typed service interfaces.

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

## Admin surfaces

Alex Morgan can open **Admin** from the user menu:

- **Clients:** edit the three demo clients' display metadata, branding tokens, and optional ConnectWise/NinjaOne mappings.
- **Users:** create, edit, disable, and grant client access to local demo identities.
- **Products:** configure the global offerings and demo pricing assumptions used by Sales Opportunities.
- **Actions:** available from the portal's Actions page for editing tenant-specific self-service workflows.

Credential, import, synchronization, and SSO surfaces remain intentionally absent. Credentials are configured only in the server environment. ConnectWise/NinjaOne reads are on demand; sales-opportunity sends remain local simulations and never make vendor write calls.
