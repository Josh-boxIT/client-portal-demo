import { useAuthStore } from '@/store/auth';
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantService,
  AssistantStreamEvent,
} from '../types';
import { RestError } from './client';

const BASE = '/api/assistant';

function headers(tenantId: string, json = false): Record<string, string> {
  const result: Record<string, string> = { 'x-tenant-id': tenantId };
  const token = useAuthStore.getState().token;
  if (token) result.Authorization = `Bearer ${token}`;
  if (json) result['Content-Type'] = 'application/json';
  return result;
}

async function errorFrom(response: Response): Promise<RestError> {
  try {
    const body = await response.json() as { error?: { code?: string; message?: string } };
    return new RestError(response.status, body.error?.message ?? response.statusText, body.error?.code);
  } catch {
    return new RestError(response.status, response.statusText);
  }
}

async function request<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(tenantId, Boolean(init?.body)), ...init?.headers },
  });
  if (!response.ok) throw await errorFrom(response);
  return await response.json() as T;
}

function parseEvent(block: string): AssistantStreamEvent | null {
  const data = block.split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (!data) return null;
  try {
    return JSON.parse(data) as AssistantStreamEvent;
  } catch {
    return null;
  }
}

export const restAssistantService: AssistantService = {
  status(tenantId) {
    return request<{ enabled: boolean }>(tenantId, '/status');
  },

  listConversations(tenantId) {
    return request<AssistantConversation[]>(tenantId, '/conversations');
  },

  createConversation(tenantId) {
    return request<AssistantConversation>(tenantId, '/conversations', { method: 'POST' });
  },

  listMessages(tenantId, conversationId) {
    return request<AssistantMessage[]>(tenantId, `/conversations/${encodeURIComponent(conversationId)}/messages`);
  },

  async deleteConversation(tenantId, conversationId) {
    const response = await fetch(`${BASE}/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
      headers: headers(tenantId),
    });
    if (!response.ok) throw await errorFrom(response);
  },

  async sendMessage(tenantId, conversationId, input, onEvent, signal) {
    const response = await fetch(`${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      headers: headers(tenantId, true),
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw await errorFrom(response);
    if (!response.body) throw new Error('Assistant stream was unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const event = parseEvent(block);
        if (event) onEvent(event);
      }
      if (done) break;
    }
    const finalEvent = parseEvent(buffer);
    if (finalEvent) onEvent(finalEvent);
  },
};
