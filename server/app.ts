import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { getDb, runMigrations, type AppDb } from './db/client';
import { seedIfEmpty } from './db/seed';
import { ConfigStore } from './framework/config-store';
import { FakeAdminAuthProvider } from './admin/auth/fake';
import { registerSessionAuth } from './auth/plugin';
import { registerAuthRoutes } from './auth/routes';
import { registerAdminRoutes } from './admin/routes';
import { registerApiRoutes } from './api';
import { loadEnv, type ServerEnv } from './config/env';
import { OpenAIAssistantProvider, type AssistantModelProvider } from './assistant/provider';
import { registerAssistantRoutes } from './assistant/routes';

export interface BuildAppOptions {
  env?: ServerEnv;
  logger?: boolean;
  db?: AppDb;
  assistantProvider?: AssistantModelProvider | null;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();
  const app = Fastify({ logger: options.logger ?? true });
  await app.register(cors, { origin: true });

  const opened = options.db ? undefined : getDb(env.sqlitePath);
  const db = options.db ?? opened!.db;
  runMigrations(db);
  await seedIfEmpty(db);

  const configStore = new ConfigStore(db);
  await configStore.reload();
  app.decorate('db', db);
  app.decorate('configStore', configStore);

  const authProvider = new FakeAdminAuthProvider(db);
  registerSessionAuth(app, authProvider);
  registerAuthRoutes(app, { authProvider, db });
  registerAdminRoutes(app, configStore);
  registerApiRoutes(app);
  const assistantProvider = Object.prototype.hasOwnProperty.call(options, 'assistantProvider')
    ? options.assistantProvider ?? null
    : env.openAiApiKey
      ? new OpenAIAssistantProvider(env.openAiApiKey, env.openAiModel, env.openAiReasoningEffort)
      : null;
  registerAssistantRoutes(app, { provider: assistantProvider });

  if (opened) app.addHook('onClose', async () => opened.raw.close());
  return app;
}
