# Demo Architecture and Contracts

## Runtime shape

The project is a React SPA plus a Fastify API. It is permanently sample-only and has no vendor connectors or external identity provider.

- `src/data/seed/` is the canonical source for immutable portal content.
- `src/services/mock/` provides async typed access to immutable content.
- Tickets, actions, and form submissions use same-origin REST services.
- `server/data/app.db` is the only database and uses SQLite through Drizzle ORM.

## Persistence

The SQLite schema contains `app_meta`, `tenants`, `admin_users`, `admin_user_client_access`, `action_defs`, `audit_log`, `demo_tickets`, and `form_submissions`.

Migrations run at backend startup. A transactional versioned seed runs only when `app_meta.demo_seed_version` is absent, so later admin edits and deletions are preserved. Tests use a fresh `:memory:` database.

Canonical tickets are not copied into SQLite. `GET /api/tickets` merges code-backed samples with SQLite-created tickets before applying filtering and pagination. Form definitions remain code-backed while submissions are stored in SQLite.

## Authentication and roles

The local demo provider resolves seeded users by email and issues in-memory bearer tokens.

- `admin` and `editor` identities can access every tenant and the admin plane.
- `viewer` identities can access only their SQLite client grants.
- Client feature gates use the sample persona associated with the selected one-click identity.

## API surface

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/tenants`
- `GET|POST /api/tickets`, `GET /api/tickets/:id`
- `GET /api/actions`, `GET /api/actions/:key`
- `POST /api/forms/:formId/submissions`, `GET /api/form-submissions`
- `/api/admin/clients`, `/api/admin/users`, `/api/admin/action-defs`

All portal data requests are tenant-scoped with `x-tenant-id`. Components access data through the interfaces in `src/services/types.ts` and `useServices()`.

## Demo invariants

- Startup requires no `.env`, Docker service, credentials, or external network.
- Only Brightwater, Cedar & Vine, and Northwind are seeded.
- The first-run seed creates three demo identities and all eight action templates for each tenant.
- Client identities never receive ticket messages or attachments marked internal.
- Created tickets and form submissions survive backend restarts.
