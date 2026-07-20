export interface ServerEnv {
  port: number;
  host: string;
  nodeEnv: string;
  sqlitePath?: string;
  openAiApiKey?: string;
  openAiModel: string;
  openAiReasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

const REASONING_EFFORTS = new Set<ServerEnv['openAiReasoningEffort']>([
  'none', 'low', 'medium', 'high', 'xhigh', 'max',
]);

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const configuredEffort = source.OPENAI_REASONING_EFFORT ?? 'low';
  const openAiReasoningEffort = REASONING_EFFORTS.has(configuredEffort as ServerEnv['openAiReasoningEffort'])
    ? configuredEffort as ServerEnv['openAiReasoningEffort']
    : 'low';
  return {
    port: Number(source.PORT ?? 8787),
    host: source.HOST ?? '127.0.0.1',
    nodeEnv: source.NODE_ENV ?? 'development',
    sqlitePath: source.SQLITE_PATH,
    openAiApiKey: source.OPENAI_API_KEY?.trim() || undefined,
    openAiModel: source.OPENAI_MODEL?.trim() || 'gpt-5.6-terra',
    openAiReasoningEffort,
  };
}
