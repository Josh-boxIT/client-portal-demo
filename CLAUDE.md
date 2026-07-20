# client-portal demo

Self-contained white-label MSP client portal demo. Vite + React frontend, Fastify backend, and SQLite persistence through Drizzle ORM.

## Core rules

- The product is sample-only. Do not add vendor connectors, cloud auth, or external data dependencies.
- Components consume domain data through `useServices()` and interfaces in `src/services/types.ts`.
- Canonical samples live in `src/data/seed/`; do not duplicate them into SQLite.
- SQLite stores tenants, users/grants, action definitions, audit events, created tickets, and form submissions.
- Every portal request and persisted mutable record is tenant-scoped.
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
