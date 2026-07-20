export interface ServerEnv {
  port: number;
  host: string;
  nodeEnv: string;
  sqlitePath?: string;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return {
    port: Number(source.PORT ?? 8787),
    host: source.HOST ?? '127.0.0.1',
    nodeEnv: source.NODE_ENV ?? 'development',
    sqlitePath: source.SQLITE_PATH,
  };
}
