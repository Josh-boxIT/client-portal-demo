import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AssistantCitation, AssistantMessage, AssistantStreamEvent } from '@/services/types';
import { assistantRepo } from '../db/repositories';
import { BadRequestError, NotFoundError } from '../framework/errors';
import type { AssistantModelProvider } from './provider';
import type { VendorDataService } from '../integrations/vendor-data';
import { isPortalDomain } from './provider';
import {
  buildPortalRecords,
  resolvePortalAccess,
  searchPortalRecords,
  type PortalRecord,
} from './portal-data';

interface RegisterAssistantRoutesOptions {
  provider: AssistantModelProvider | null;
  vendorData?: VendorDataService;
}

function tenantHeader(req: FastifyRequest): string {
  const value = req.headers['x-tenant-id'];
  const tenantId = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!tenantId) throw new BadRequestError('Missing tenant (x-tenant-id header)');
  return tenantId;
}

function safetyIdentifier(userId: string): string {
  return createHash('sha256').update(`client-portal-demo:${userId}`).digest('hex');
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numericLimit(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 1), 50)
    : 20;
}

function citation(record: PortalRecord): AssistantCitation {
  return {
    sourceId: record.sourceId,
    recordType: record.domain,
    recordId: record.recordId,
    title: record.title,
    href: record.href,
  };
}

function streamEvent(reply: { raw: NodeJS.WritableStream }, event: AssistantStreamEvent): void {
  reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

function streamCompleted(reply: { raw: NodeJS.WritableStream }, message: AssistantMessage): void {
  const chunkSize = 48;
  for (let index = 0; index < message.content.length; index += chunkSize) {
    streamEvent(reply, { type: 'message.delta', delta: message.content.slice(index, index + chunkSize) });
  }
  streamEvent(reply, { type: 'message.completed', message });
}

const NOT_FOUND_ANSWER = "I couldn't find that in the portal data available to you.";

export function registerAssistantRoutes(app: FastifyInstance, options: RegisterAssistantRoutesOptions): void {
  const repo = assistantRepo(app.db);

  async function scopeFor(req: FastifyRequest) {
    const tenantId = tenantHeader(req);
    const identity = req.adminIdentity!;
    const scope = await resolvePortalAccess(app.db, app.configStore, identity, tenantId);
    if (!scope) throw new NotFoundError('Assistant tenant not found');
    return scope;
  }

  app.get('/api/assistant/status', async (req) => {
    await scopeFor(req);
    return { enabled: options.provider !== null };
  });

  app.get('/api/assistant/conversations', async (req) => {
    const scope = await scopeFor(req);
    return repo.listConversations(scope.userId, scope.tenantId);
  });

  app.post('/api/assistant/conversations', async (req, reply) => {
    const scope = await scopeFor(req);
    return reply.status(201).send(await repo.createConversation(scope.userId, scope.tenantId));
  });

  app.get('/api/assistant/conversations/:id/messages', async (req) => {
    const scope = await scopeFor(req);
    const conversationId = (req.params as { id: string }).id;
    const messages = await repo.listMessages(scope.userId, scope.tenantId, conversationId);
    if (!messages) throw new NotFoundError('Conversation not found');
    return messages;
  });

  app.delete('/api/assistant/conversations/:id', async (req, reply) => {
    const scope = await scopeFor(req);
    const conversationId = (req.params as { id: string }).id;
    if (!await repo.deleteConversation(scope.userId, scope.tenantId, conversationId)) {
      throw new NotFoundError('Conversation not found');
    }
    return reply.status(204).send();
  });

  app.post('/api/assistant/conversations/:id/messages', async (req, reply) => {
    const scope = await scopeFor(req);
    if (!options.provider) {
      return reply.status(503).send({ error: { code: 'assistant_disabled', message: 'Assistant is not configured' } });
    }

    const conversationId = (req.params as { id: string }).id;
    const conversation = await repo.getConversation(scope.userId, scope.tenantId, conversationId);
    if (!conversation) throw new NotFoundError('Conversation not found');

    const body = req.body as { content?: unknown; requestId?: unknown; currentPath?: unknown };
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
    const currentPath = typeof body?.currentPath === 'string' && body.currentPath.startsWith('/')
      ? body.currentPath.slice(0, 500)
      : undefined;
    if (!content) throw new BadRequestError('Message content is required');
    if (content.length > 4_000) throw new BadRequestError('Message content must be 4,000 characters or fewer');
    if (!requestId || requestId.length > 100) throw new BadRequestError('A valid requestId is required');

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const abortController = new AbortController();
    reply.raw.on('close', () => {
      if (!reply.raw.writableEnded) abortController.abort();
    });

    try {
      const existing = await repo.getCompletedTurn(scope.userId, scope.tenantId, conversationId, requestId);
      if (existing) {
        streamCompleted(reply, existing);
        reply.raw.end();
        return;
      }

      const [messages, records] = await Promise.all([
        repo.listMessages(scope.userId, scope.tenantId, conversationId),
        buildPortalRecords(app.db, app.configStore, scope, options.vendorData),
      ]);
      if (!messages) throw new NotFoundError('Conversation not found');
      const recordBySource = new Map(records.map((record) => [record.sourceId, record]));

      const result = await options.provider.generate({
        messages: [...messages, {
          id: 'pending',
          conversationId,
          role: 'user',
          content,
          citations: [],
          createdAt: new Date().toISOString(),
        }],
        currentPath,
        safetyIdentifier: safetyIdentifier(scope.userId),
        signal: abortController.signal,
        async executeTool(name, argumentsValue) {
          const args = objectValue(argumentsValue);
          if (name === 'search_portal') {
            const domains = Array.isArray(args.domains)
              ? args.domains.filter(isPortalDomain)
              : undefined;
            return searchPortalRecords(
              records,
              typeof args.query === 'string' ? args.query : '',
              domains,
              numericLimit(args.limit),
            );
          }
          if (name === 'list_portal_records') {
            if (!isPortalDomain(args.domain)) return [];
            return records.filter((record) => record.domain === args.domain)
              .slice(0, numericLimit(args.limit));
          }
          if (name === 'get_portal_record') {
            const found = typeof args.source_id === 'string' ? recordBySource.get(args.source_id) : undefined;
            return found ? [found] : [];
          }
          return [];
        },
      });

      const accessed = new Map(result.accessedRecords.map((record) => [record.sourceId, record]));
      const citations = result.sourceIds
        .map((sourceId) => accessed.get(sourceId))
        .filter((record): record is PortalRecord => Boolean(record))
        .filter((record, index, all) => all.findIndex((candidate) => candidate.sourceId === record.sourceId) === index)
        .map(citation);
      const assistantContent = citations.length > 0 || result.answer === NOT_FOUND_ANSWER
        ? result.answer
        : NOT_FOUND_ANSWER;

      const persisted = await repo.persistTurn({
        userId: scope.userId,
        tenantId: scope.tenantId,
        conversationId,
        requestId,
        userContent: content,
        assistantContent,
        citations: assistantContent === NOT_FOUND_ANSWER ? [] : citations,
      });
      if (!persisted) throw new NotFoundError('Conversation not found');
      streamCompleted(reply, persisted);
    } catch (error) {
      if (!abortController.signal.aborted) {
        const completed = await repo.getCompletedTurn(
          scope.userId,
          scope.tenantId,
          conversationId,
          requestId,
        );
        if (completed) {
          streamCompleted(reply, completed);
          return;
        }
        const message = error instanceof Error && error.message.includes('lookup limit')
          ? error.message
          : 'The assistant is temporarily unavailable. Please try again.';
        streamEvent(reply, { type: 'error', message, retryable: true });
      }
    } finally {
      if (!reply.raw.writableEnded) reply.raw.end();
    }
  });
}
