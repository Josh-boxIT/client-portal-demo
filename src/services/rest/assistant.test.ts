import { afterEach, describe, expect, it, vi } from 'vitest';
import { restAssistantService } from './assistant';
import type { AssistantStreamEvent } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assistant REST service', () => {
  it('parses SSE events split across response chunks', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'event: message.delta\ndata: {"type":"message.delta","del',
      'ta":"Hello "}\n\nevent: message.delta\ndata: {"type":"message.delta","delta":"world"}\n\n',
      'event: message.completed\ndata: {"type":"message.completed","message":{"id":"m1","conversationId":"c1","role":"assistant","content":"Hello world","citations":[],"createdAt":"2026-07-20T00:00:00.000Z"}}\n\n',
    ];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })));

    const events: AssistantStreamEvent[] = [];
    await restAssistantService.sendMessage(
      'brightwater',
      'c1',
      { content: 'Hi', requestId: 'r1' },
      (event) => events.push(event),
    );

    expect(events).toEqual([
      { type: 'message.delta', delta: 'Hello ' },
      { type: 'message.delta', delta: 'world' },
      {
        type: 'message.completed',
        message: {
          id: 'm1',
          conversationId: 'c1',
          role: 'assistant',
          content: 'Hello world',
          citations: [],
          createdAt: '2026-07-20T00:00:00.000Z',
        },
      },
    ]);
  });

  it('surfaces JSON API errors before reading a stream', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'assistant_disabled', message: 'Assistant is not configured' },
    }), { status: 503, headers: { 'Content-Type': 'application/json' } })));

    await expect(restAssistantService.sendMessage(
      'brightwater',
      'c1',
      { content: 'Hi', requestId: 'r1' },
      () => undefined,
    )).rejects.toMatchObject({ status: 503, code: 'assistant_disabled' });
  });
});
