import { existsSync } from 'node:fs';
import { buildApp } from './app';
import { loadEnv } from './config/env';

if (existsSync('.env')) process.loadEnvFile('.env');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const env = loadEnv();
buildApp({ env })
  .then((app) => app.listen({ port: env.port, host: env.host }))
  .then((address) => console.log(`demo backend listening on ${address}`))
  .catch((error) => {
    console.error('failed to start demo backend:', error);
    process.exit(1);
  });
