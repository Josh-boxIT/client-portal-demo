# Demo Architecture and Contracts

## Runtime shape

The project is a React SPA plus a Fastify API. It runs without external services by default, but an administrator can optionally map each seeded client to a ConnectWise company and NinjaOne organization. Vendor credentials are server-only environment variables; SQLite stores only the numeric mappings. OpenAI remains optional for the portal assistant and staff-only Sales Opportunities agent.

- `src/data/seed/` is the canonical source for immutable portal content.
- `src/services/mock/` provides async typed access to immutable content.
- Tickets, actions, form submissions, product configuration, and sales opportunity workflows use same-origin REST services.
- People, devices, and tickets use same-origin REST services that select read-only vendor data for mapped tenants and local demo data otherwise.
- `server/data/app.db` is the only database and uses SQLite through Drizzle ORM.

## Persistence

The SQLite schema contains portal configuration, optional vendor organization mappings, mutable demo tables, user- and tenant-scoped assistant conversations, the global product catalog, latest per-tenant sales analyses, and simulated ConnectWise handoffs. Vendor credentials are never persisted.

Migrations run at backend startup. Transactional versioned seeds independently initialize the core demo and product catalog, so existing databases receive the catalog while later admin edits and deletions remain preserved. Tests use a fresh `:memory:` database.

Canonical tickets and generated ConnectWise agreements are not copied into SQLite. `GET /api/tickets` merges code-backed samples with SQLite-created tickets before applying filtering and pagination. Form definitions remain code-backed while submissions are stored in SQLite.

## Authentication and roles

The local demo provider resolves seeded users by email and issues in-memory bearer tokens.

- `admin` and `editor` identities can access every tenant and the admin plane.
- `viewer` identities can access only their SQLite client grants.
- Client feature gates use the sample persona associated with the selected one-click identity.

## API surface

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/tenants`
- `GET|POST /api/tickets`, `GET /api/tickets/:id`
- `GET /api/people`, `GET /api/people/:id`
- `GET /api/devices`, `GET /api/devices/:id`, and Ninja telemetry/detail routes
- `GET /api/actions`, `GET /api/actions/:key`
- `POST /api/forms/:formId/submissions`, `GET /api/form-submissions`
- `/api/admin/clients`, `/api/admin/users`, `/api/admin/action-defs`
- `/api/admin/product-catalog`
- `/api/assistant/status`, `/api/assistant/conversations`, and conversation message/history routes
- `/api/sales-opportunities/status`, `/context`, `/latest`, `/analyze`, and simulated handoff routes

All portal data requests are tenant-scoped with `x-tenant-id`. Components access data through the interfaces in `src/services/types.ts` and `useServices()`.

Assistant routes additionally require a valid bearer token. The server resolves tenant grants and the matching client persona before exposing read-only search/list/get tools to the model. Client users cannot retrieve budget or QBR data, see other requesters' tickets or form submissions, or receive internal ticket content.

Sales opportunity routes require an `admin` or `editor` identity and always analyze one tenant at a time. The browser orchestrates all-client runs with bounded concurrency. For a mapped tenant, the model receives read-only ConnectWise agreements and tickets; otherwise it receives the demo equivalents. Churn data and enabled catalog entries remain local. Returned evidence identifiers are validated before persistence, and catalog pricing is calculated deterministically on the server. Product-catalog mutation remains admin-only.

## Vendor reads and fallback

- ConnectWise uses Basic API-member authentication plus the required `clientId` header. Contacts, configurations, tickets, notes, time entries, documents, agreements, and additions are retrieved only with `GET` requests.
- ConnectWise list scoping uses the documented URL-encoded `conditions` expression and slash-reference form, for example `company/id = 123`.
- ConnectWise ticket reads add `dateEntered >= [<UTC cutoff>]` to the company condition, limiting portal, assistant, and sales-opportunity ticket data to the trailing 365 days.
- Ticket detail reads `/time/entries` with `chargeToType = "ServiceTicket" AND chargeToId = <ticket id>`. Customer-facing time notes appear in the conversation with logged hours; internal time notes remain staff-only.
- Admin company search calls `GET /company/companies` with a URL-encoded condition such as `(name contains "Acme" OR identifier contains "Acme") AND deletedFlag = false`. Import re-fetches the company by ID on the server, creates a local `cw-{companyId}` tenant with generated branding, and persists the mapping in SQLite.
- NinjaOne uses the OAuth client-credentials flow with the read-only `monitoring` scope. Device scoping uses the documented URL-encoded `df` expression, for example `org = 456`.
- Successful vendor responses replace only the domains owned by that vendor. Any missing configuration or failed vendor request falls back to the existing tenant demo records.
- Any ConnectWise or NinjaOne mapping marks ticket workflows read-only. Ticket creation, replies, status changes, and action-generated ticket creation are disabled in the UI and rejected by the API.

## Demo invariants

- Startup still requires no `.env`, Docker service, credentials, or external network; vendor reads are opt-in.
- Only Brightwater, Cedar & Vine, and Northwind are seeded.
- The first-run seed creates three demo identities and all eight action templates for each tenant.
- A separate idempotent seed creates eight editable global product offerings.
- Client identities never receive ticket messages or attachments marked internal.
- Created tickets and form submissions survive backend restarts.
- Sales-opportunity sends remain simulations and never write to ConnectWise. Agreement reads use ConnectWise only for mapped tenants.
