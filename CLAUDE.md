# client-portal demo

Self-contained white-label MSP client portal demo. Vite + React frontend, Fastify backend, and SQLite persistence through Drizzle ORM.

## Core rules

- Use Node 22.x from `.nvmrc` for all installs, rebuilds, tests, and dev servers. Never use a bundled agent runtime with another Node major; doing so recompiles `better-sqlite3` for the wrong ABI.
- The product is sample-only. Do not add vendor connectors, cloud auth, or external data dependencies. The permission-aware portal assistant is the sole exception: it may call OpenAI, but only with server-filtered demo data.
- Components consume domain data through `useServices()` and interfaces in `src/services/types.ts`.
- Canonical samples live in `src/data/seed/`; do not duplicate them into SQLite.
- SQLite stores tenants, users/grants, action definitions, audit events, created tickets, and form submissions.
- Every portal request and persisted mutable record is tenant-scoped.
- Assistant conversations are user- and tenant-scoped; assistant model tools are read-only and permission-filtered on the server.
- Tests use fresh in-memory SQLite databases and must not depend on Docker, environment credentials, or the local demo database.

## Commands

```bash
npm run dev
npm run demo
npm test
npm run lint
npm run build
```

No `.env` file is required. The default local database is `server/data/app.db` and is gitignored.
