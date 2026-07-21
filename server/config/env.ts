export interface ServerEnv {
  port: number;
  host: string;
  nodeEnv: string;
  sqlitePath?: string;
  openAiApiKey?: string;
  openAiModel: string;
  openAiReasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  connectWise?: {
    baseUrl: string;
    companyId: string;
    publicKey: string;
    privateKey: string;
    clientId: string;
  };
  ninjaOne?: {
    baseUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
  };
}

const REASONING_EFFORTS = new Set<ServerEnv['openAiReasoningEffort']>([
  'none', 'low', 'medium', 'high', 'xhigh', 'max',
]);

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const configuredEffort = source.OPENAI_REASONING_EFFORT ?? 'low';
  const openAiReasoningEffort = REASONING_EFFORTS.has(configuredEffort as ServerEnv['openAiReasoningEffort'])
    ? configuredEffort as ServerEnv['openAiReasoningEffort']
    : 'low';
  const connectWiseValues = {
    baseUrl: source.CONNECTWISE_BASE_URL?.trim(),
    companyId: source.CONNECTWISE_COMPANY_ID?.trim(),
    publicKey: source.CONNECTWISE_PUBLIC_KEY?.trim(),
    privateKey: source.CONNECTWISE_PRIVATE_KEY?.trim(),
    clientId: source.CONNECTWISE_CLIENT_ID?.trim(),
  };
  const ninjaOneValues = {
    baseUrl: source.NINJAONE_BASE_URL?.trim(),
    tokenUrl: source.NINJAONE_TOKEN_URL?.trim(),
    clientId: source.NINJAONE_CLIENT_ID?.trim(),
    clientSecret: source.NINJAONE_CLIENT_SECRET?.trim(),
  };
  const connectWise = Object.values(connectWiseValues).every(Boolean)
    ? connectWiseValues as ServerEnv['connectWise']
    : undefined;
  const ninjaOne = ninjaOneValues.baseUrl && ninjaOneValues.clientId && ninjaOneValues.clientSecret
    ? {
        baseUrl: ninjaOneValues.baseUrl,
        tokenUrl: ninjaOneValues.tokenUrl || new URL('/ws/oauth/token', ninjaOneValues.baseUrl).toString(),
        clientId: ninjaOneValues.clientId,
        clientSecret: ninjaOneValues.clientSecret,
      }
    : undefined;
  return {
    port: Number(source.PORT ?? 8787),
    host: source.HOST ?? '127.0.0.1',
    nodeEnv: source.NODE_ENV ?? 'development',
    sqlitePath: source.SQLITE_PATH,
    openAiApiKey: source.OPENAI_API_KEY?.trim() || undefined,
    openAiModel: source.OPENAI_MODEL?.trim() || 'gpt-5.6-terra',
    openAiReasoningEffort,
    connectWise,
    ninjaOne,
  };
}
