import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  History,
  Loader2,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useServices } from '@/services/context';
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantStreamEvent,
} from '@/services/types';
import { useSessionStore } from '@/store/session';

const STARTERS = [
  'Which risks need the most attention?',
  'Summarize our open support tickets.',
  'What devices are due for replacement?',
];

interface FailedTurn {
  content: string;
  requestId: string;
}

function pendingMessage(conversationId: string, role: 'user' | 'assistant', content: string): AssistantMessage {
  return {
    id: `pending-${role}-${crypto.randomUUID()}`,
    conversationId,
    role,
    content,
    citations: [],
    createdAt: new Date().toISOString(),
  };
}

export function AssistantWidget() {
  const { assistant } = useServices();
  const { activeTenantId, switchTenant } = useSessionStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AssistantConversation | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedTurn, setFailedTurn] = useState<FailedTurn | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    abortRef.current?.abort();
    setOpen(false);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setError(null);
    setFailedTurn(null);
    assistant.status(activeTenantId)
      .then((status) => active && setEnabled(status.enabled))
      .catch(() => active && setEnabled(false));
    return () => {
      active = false;
    };
  }, [activeTenantId, assistant]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  const loadMessages = useCallback(async (conversation: AssistantConversation) => {
    setLoading(true);
    setError(null);
    try {
      const nextMessages = await assistant.listMessages(activeTenantId, conversation.id);
      setActiveConversation(conversation);
      setMessages(nextMessages);
    } catch {
      setError('Conversation history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, assistant]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let next = await assistant.listConversations(activeTenantId);
      if (next.length === 0) {
        next = [await assistant.createConversation(activeTenantId)];
      }
      setConversations(next);
      const selected = activeConversation
        ? next.find((conversation) => conversation.id === activeConversation.id) ?? next[0]
        : next[0];
      await loadMessages(selected);
    } catch {
      setError('The assistant could not be opened.');
      setLoading(false);
    }
  }, [activeConversation, activeTenantId, assistant, loadMessages]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      abortRef.current?.abort();
      return;
    }
    setHistoryOpen(false);
    void loadConversations();
  }

  async function createConversation() {
    if (sending) return;
    setLoading(true);
    setError(null);
    try {
      const conversation = await assistant.createConversation(activeTenantId);
      setConversations((current) => [conversation, ...current]);
      setActiveConversation(conversation);
      setMessages([]);
      setHistoryOpen(false);
      setFailedTurn(null);
    } catch {
      setError('A new conversation could not be created.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteConversation(conversation: AssistantConversation) {
    if (sending || !window.confirm(`Delete “${conversation.title}”?`)) return;
    try {
      await assistant.deleteConversation(activeTenantId, conversation.id);
      let remaining = conversations.filter((item) => item.id !== conversation.id);
      if (remaining.length === 0) remaining = [await assistant.createConversation(activeTenantId)];
      setConversations(remaining);
      if (activeConversation?.id === conversation.id) await loadMessages(remaining[0]);
    } catch {
      setError('The conversation could not be deleted.');
    }
  }

  async function refreshAfterCompletion(conversationId: string) {
    const [nextConversations, nextMessages] = await Promise.all([
      assistant.listConversations(activeTenantId),
      assistant.listMessages(activeTenantId, conversationId),
    ]);
    setConversations(nextConversations);
    setActiveConversation(nextConversations.find((item) => item.id === conversationId) ?? null);
    setMessages(nextMessages);
  }

  async function send(contentValue: string, requestId: string = crypto.randomUUID()) {
    const content = contentValue.trim();
    if (!content || !activeConversation || sending) return;

    const conversationId = activeConversation.id;
    const userPending = pendingMessage(conversationId, 'user', content);
    const assistantPending = pendingMessage(conversationId, 'assistant', '');
    setInput('');
    setError(null);
    setFailedTurn(null);
    setSending(true);
    setMessages((current) => [...current, userPending, assistantPending]);

    const abortController = new AbortController();
    abortRef.current = abortController;
    let completed = false;
    const handleEvent = (event: AssistantStreamEvent) => {
      if (event.type === 'message.delta') {
        setMessages((current) => current.map((message) =>
          message.id === assistantPending.id
            ? { ...message, content: message.content + event.delta }
            : message));
      } else if (event.type === 'message.completed') {
        completed = true;
        setMessages((current) => current.map((message) =>
          message.id === assistantPending.id ? event.message : message));
      } else {
        setError(event.message);
        setFailedTurn(event.retryable ? { content, requestId } : null);
      }
    };

    try {
      await assistant.sendMessage(activeTenantId, conversationId, {
        content,
        requestId,
        currentPath: `${location.pathname}${location.search}`,
      }, handleEvent, abortController.signal);
      if (completed) await refreshAfterCompletion(conversationId);
      else if (!abortController.signal.aborted) {
        setMessages((current) => current.filter((message) =>
          message.id !== assistantPending.id && message.id !== userPending.id));
        setFailedTurn({ content, requestId });
      }
    } catch (sendError) {
      if (!abortController.signal.aborted) {
        setMessages((current) => current.filter((message) =>
          message.id !== assistantPending.id && message.id !== userPending.id));
        setError(sendError instanceof Error ? sendError.message : 'The assistant is temporarily unavailable.');
        setFailedTurn({ content, requestId });
      }
    } finally {
      if (abortRef.current === abortController) abortRef.current = null;
      setSending(false);
    }
  }

  function openCitation(href: string, tenantId?: string) {
    if (tenantId && tenantId !== activeTenantId) switchTenant(tenantId);
    navigate(href);
    setOpen(false);
  }

  if (!enabled) return null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-xl"
        onClick={() => handleOpenChange(true)}
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[420px] [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Portal AI assistant</SheetTitle>
          <SheetDescription className="sr-only">
            Ask questions about portal data available to your signed-in account.
          </SheetDescription>

          <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            {historyOpen ? (
              <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(false)} aria-label="Back to conversation">
                <ArrowLeft />
              </Button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {historyOpen ? 'Conversations' : activeConversation?.title ?? 'Portal assistant'}
              </div>
              <div className="text-xs text-muted-foreground">Answers from your permitted portal data</div>
            </div>
            {!historyOpen && (
              <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(true)} aria-label="Conversation history">
                <History />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => void createConversation()} aria-label="New conversation">
              <Plus />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleOpenChange(false)} aria-label="Close assistant">
              <span className="text-xl leading-none" aria-hidden>×</span>
            </Button>
          </div>

          {historyOpen ? (
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-4">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg border p-3 transition-colors',
                      activeConversation?.id === conversation.id && 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setHistoryOpen(false);
                        void loadMessages(conversation);
                      }}
                    >
                      <div className="truncate text-sm font-medium">{conversation.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(conversation.updatedAt).toLocaleString()}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => void deleteConversation(conversation)}
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 p-4">
                  {loading && messages.length === 0 ? (
                    <div className="flex justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h2 className="mt-4 font-semibold">What would you like to know?</h2>
                      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                        I can search and summarize the portal records available to your account.
                      </p>
                      <div className="mt-6 space-y-2">
                        {STARTERS.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            className="w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                            onClick={() => void send(starter)}
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn(
                          'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm',
                          message.role === 'user'
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md bg-muted text-foreground',
                        )}>
                          {message.role === 'assistant' && !message.content && sending ? (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> Searching your portal…
                            </span>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{message.content}</div>
                          )}
                          {message.citations.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
                              {message.citations.map((source) => (
                                <button
                                  key={source.sourceId}
                                  type="button"
                                  className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2 py-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
                                  onClick={() => openCitation(source.href, source.tenantId)}
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{source.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t bg-background p-3">
                {error && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <span>{error}</span>
                    {failedTurn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-destructive hover:text-destructive"
                        onClick={() => void send(failedTurn.content, failedTurn.requestId)}
                        disabled={sending}
                      >
                        <RotateCcw /> Retry
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void send(input);
                      }
                    }}
                    maxLength={4_000}
                    rows={1}
                    placeholder="Ask about your portal data…"
                    className="max-h-32 min-h-10 resize-none"
                    disabled={!activeConversation || sending}
                    aria-label="Message the portal assistant"
                  />
                  <Button
                    size="icon"
                    className="shrink-0"
                    disabled={!input.trim() || !activeConversation || sending}
                    onClick={() => void send(input)}
                    aria-label="Send message"
                  >
                    {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  </Button>
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  AI answers may be incomplete. Open cited records to verify important details.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
