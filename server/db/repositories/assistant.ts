import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  AssistantCitation,
  AssistantConversation,
  AssistantMessage,
} from '@/services/types';
import type { AppDb } from '../client';
import { assistantConversations, assistantMessages } from '../schema';
import { newId } from './audit';

function toConversation(row: typeof assistantConversations.$inferSelect): AssistantConversation {
  return row;
}

function toMessage(row: typeof assistantMessages.$inferSelect): AssistantMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    citations: row.citations,
    createdAt: row.createdAt,
  };
}

function conversationTitle(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length <= 60 ? compact : `${compact.slice(0, 57).trimEnd()}…`;
}

export function assistantRepo(db: AppDb) {
  const ownedConversation = (userId: string, tenantId: string, conversationId: string) =>
    db.select().from(assistantConversations).where(and(
      eq(assistantConversations.id, conversationId),
      eq(assistantConversations.userId, userId),
      eq(assistantConversations.tenantId, tenantId),
    )).get();

  return {
    async listConversations(userId: string, tenantId: string): Promise<AssistantConversation[]> {
      return db.select().from(assistantConversations).where(and(
        eq(assistantConversations.userId, userId),
        eq(assistantConversations.tenantId, tenantId),
      )).orderBy(desc(assistantConversations.updatedAt)).all().map(toConversation);
    },

    async createConversation(userId: string, tenantId: string): Promise<AssistantConversation> {
      const row = db.insert(assistantConversations).values({
        id: newId('aic_'),
        userId,
        tenantId,
        title: 'New conversation',
      }).returning().get();
      return toConversation(row);
    },

    async getConversation(
      userId: string,
      tenantId: string,
      conversationId: string,
    ): Promise<AssistantConversation | undefined> {
      const row = ownedConversation(userId, tenantId, conversationId);
      return row ? toConversation(row) : undefined;
    },

    async listMessages(
      userId: string,
      tenantId: string,
      conversationId: string,
    ): Promise<AssistantMessage[] | undefined> {
      if (!ownedConversation(userId, tenantId, conversationId)) return undefined;
      return db.select().from(assistantMessages)
        .where(eq(assistantMessages.conversationId, conversationId))
        .orderBy(asc(assistantMessages.createdAt), asc(assistantMessages.id))
        .all()
        .map(toMessage);
    },

    async deleteConversation(userId: string, tenantId: string, conversationId: string): Promise<boolean> {
      const result = db.delete(assistantConversations).where(and(
        eq(assistantConversations.id, conversationId),
        eq(assistantConversations.userId, userId),
        eq(assistantConversations.tenantId, tenantId),
      )).run();
      return result.changes > 0;
    },

    async getCompletedTurn(
      userId: string,
      tenantId: string,
      conversationId: string,
      requestId: string,
    ): Promise<AssistantMessage | undefined> {
      if (!ownedConversation(userId, tenantId, conversationId)) return undefined;
      const row = db.select().from(assistantMessages).where(and(
        eq(assistantMessages.conversationId, conversationId),
        eq(assistantMessages.requestId, requestId),
        eq(assistantMessages.role, 'assistant'),
      )).get();
      return row ? toMessage(row) : undefined;
    },

    async persistTurn(input: {
      userId: string;
      tenantId: string;
      conversationId: string;
      requestId: string;
      userContent: string;
      assistantContent: string;
      citations: AssistantCitation[];
    }): Promise<AssistantMessage | undefined> {
      if (!ownedConversation(input.userId, input.tenantId, input.conversationId)) return undefined;

      return db.transaction((tx) => {
        const existing = tx.select().from(assistantMessages).where(and(
          eq(assistantMessages.conversationId, input.conversationId),
          eq(assistantMessages.requestId, input.requestId),
          eq(assistantMessages.role, 'assistant'),
        )).get();
        if (existing) return toMessage(existing);

        const conversation = tx.select().from(assistantConversations)
          .where(eq(assistantConversations.id, input.conversationId)).get()!;
        const userCreatedAt = new Date().toISOString();
        const assistantCreatedAt = new Date(Date.now() + 1).toISOString();

        tx.insert(assistantMessages).values({
          id: newId('aim_'),
          conversationId: input.conversationId,
          role: 'user',
          content: input.userContent,
          requestId: null,
          citations: [],
          createdAt: userCreatedAt,
        }).run();

        const assistant = tx.insert(assistantMessages).values({
          id: newId('aim_'),
          conversationId: input.conversationId,
          role: 'assistant',
          content: input.assistantContent,
          requestId: input.requestId,
          citations: input.citations,
          createdAt: assistantCreatedAt,
        }).returning().get();

        tx.update(assistantConversations).set({
          title: conversation.title === 'New conversation'
            ? conversationTitle(input.userContent)
            : conversation.title,
          updatedAt: assistantCreatedAt,
        }).where(eq(assistantConversations.id, input.conversationId)).run();

        return toMessage(assistant);
      });
    },
  };
}
