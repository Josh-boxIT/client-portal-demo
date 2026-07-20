import { closeDb, getDb, runMigrations } from './client';

const { db, raw } = getDb();
runMigrations(db);
closeDb(raw);
console.log('migrated');
