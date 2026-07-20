import { closeDb, getDb, runMigrations, type AppDb, type DbClient } from './client';

export function openTestDb(): { db: AppDb; raw: DbClient } {
  const opened = getDb(':memory:');
  runMigrations(opened.db);
  return opened;
}

export { closeDb };
