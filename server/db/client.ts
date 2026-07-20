import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

export type AppDb = BetterSQLite3Database<typeof schema>;
export type DbClient = Database.Database;

const DEFAULT_PATH = resolve(process.cwd(), 'server/data/app.db');

export function getDb(path = process.env.SQLITE_PATH ?? DEFAULT_PATH): { db: AppDb; raw: DbClient } {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const raw = new Database(path);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  return { db: drizzle(raw, { schema }), raw };
}

export function runMigrations(db: AppDb): void {
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'server/db/migrations') });
}

export function closeDb(raw: DbClient): void {
  raw.close();
}
