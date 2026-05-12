import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, MessageSquareText, RefreshCw, Search, SendHorizontal } from 'lucide-react';
import { createConversation, fetchConversationMessages, fetchConversations, renameConversation, streamConversationMessage, type ChatWorkspace, type ConversationMessage, type ConversationRecord } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, getLatestReferences, PageSkeleton } from './shared';

export function ChatPage(props: {
  workspace?: ChatWorkspace;
  workspaceLoading: boolean;
  workspaceError: unknown;
  search: string;
  onSearch: (value: string) => void;
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const deferredSearch = useDeferredValue(props.search);
  const abortRef = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [references, setReferences] = useState<ChatWorkspace['references']>(props.workspace?.references ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations
  });

  const messagesQuery = useQuery({
    queryKey: ['conversation-messages', props.sessionId],
    queryFn: () => fetchConversationMessages(props.sessionId!),
    enabled: Boolean(props.sessionId)
  });

  const upsertConversationCache = (conversation: ConversationRecord) => {
    queryClient.setQueryData(
      ['conversations'],
      (
        current:
          | {
              code?: number;
              msg?: string;
              data?: ConversationRecord[];
            }
          | undefined
      ) => {
        const nextData = [
          conversation,
          ...(current?.data ?? []).filter((item) => item.id !== conversation.id)
        ];

        return current
          ? {
              ...current,
              data: nextData
            }
          : {
              code: 0,
              msg: 'ok',
              data: nextData
            };
      }
    );
  };

  const createConversationMutation = useMutation({
    mutationFn: () => createConversation({ title: '新建会话' }),
    onSuccess: (response) => {
      upsertConversationCache(response.data);
      props.onSessionChange(response.data.id);
      setMessages([]);
      setReferences([]);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const renameConversationMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, { title }),
    onSuccess: (response) => {
      upsertConversationCache(response.data);
      setRenameDraft(response.data.title);
      setIsRenaming(false);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const sessions = useMemo(() => {
    const source = conversationsQuery.data?.data ?? [];
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) {
      return source;
    }

    return source.filter((item) => item.title.toLowerCase().includes(keyword));
  }, [conversationsQuery.data, deferredSearch]);

  const selectedConversation = useMemo(() => {
    const allSessions = conversationsQuery.data?.data ?? [];
    return allSessions.find((item) => item.id === props.sessionId) ?? null;
  }, [conversationsQuery.data, props.sessionId]);

  useEffect(() => {
    const allSessions = conversationsQuery.data?.data ?? [];
    if (!allSessions.length) {
      if (props.sessionId) {
        props.onSessionChange(null);
      }
      return;
    }

    if (!props.sessionId) {
      props.onSessionChange(allSessions[0].id);
      return;
    }

    if (!allSessions.some((item) => item.id === props.sessionId)) {
      props.onSessionChange(allSessions[0].id);
    }
  }, [conversationsQuery.data, props.onSessionChange, props.sessionId]);

  useEffect(() => {
    setIsRenaming(false);
    setRenameDraft(selectedConversation?.title ?? '');
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!isRenaming && selectedConversation) {
      setRenameDraft(selectedConversation.title);
    }
  }, [isRenaming, selectedConversation]);

  useEffect(() => {
    if (isStreaming) {
      return;
    }

    if (!props.sessionId) {
      setMessages([]);
      setReferences(props.workspace?.references ?? []);
      return;
    }

    const nextMessages = messagesQuery.data?.data ?? [];
    setMessages(nextMessages);
    const nextReferences = getLatestReferences(nextMessages);
    setReferences(nextReferences.length ? nextReferences : (props.workspace?.references ?? []));
  }, [isStreaming, messagesQuery.data, props.sessionId, props.workspace]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const question = content.trim();
      if (!question) {
        return;
      }

      const createdConversation = props.sessionId
        ? null
        : await createConversation({ title: question.slice(0, 18) || '新建会话' });
      const conversationId = props.sessionId ?? createdConversation!.data.id;

      if (createdConversation) {
        upsertConversationCache(createdConversation.data);
      }

      if (!props.sessionId) {
        props.onSessionChange(conversationId);
      }

      const userMessageId = `local-user-${Date.now()}`;
      const assistantMessageId = `local-assistant-${Date.now()}`;

      setMessages((current) =>
        conversationId === props.sessionId
          ? [
              ...current,
              { id: userMessageId, role: 'user', content: question },
              { id: assistantMessageId, role: 'assistant', content: '', citations: [] }
            ]
          : [
              { id: userMessageId, role: 'user', content: question },
              { id: assistantMessageId, role: 'assistant', content: '', citations: [] }
            ]
      );
      setReferences([]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamConversationMessage(
          conversationId,
          { content: question },
          {
            onDelta: (delta) => {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantMessageId
                    ? {
                        ...item,
                        content: `${item.content}${delta}`
                      }
                    : item
                )
              );
            },
            onSources: (nextSources) => {
              setReferences(nextSources);
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantMessageId
                    ? {
                        ...item,
                        citations: nextSources.map((source) => source.title),
                        sources: nextSources
                      }
                    : item
                )
              );
            },
            onDone: () => {
              setIsStreaming(false);
            }
          },
          controller.signal
        );
      } catch (error) {
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: item.content || `请求失败：${getErrorMessage(error)}`
                }
              : item
          )
        );
        setIsStreaming(false);
        throw error;
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
        await queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      }
    }
  });

  const isInitialLoading =
    conversationsQuery.isLoading || (props.workspaceLoading && !props.workspace && !conversationsQuery.data);

  const submitRename = () => {
    const title = renameDraft.trim();
    if (!selectedConversation || !title || title === selectedConversation.title) {
      setIsRenaming(false);
      setRenameDraft(selectedConversation?.title ?? '');
      return;
    }

    renameConversationMutation.mutate({ id: selectedConversation.id, title });
  };

  if (isInitialLoading) {
    return <PageSkeleton blocks={7} />;
  }

  if (conversationsQuery.error && !(conversationsQuery.data?.data?.length ?? 0)) {
    return <EmptyState icon={MessageSquareText} title="会话列表加载失败" description={getErrorMessage(conversationsQuery.error)} />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_260px]">
      <Panel
        title="会话列表"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input className="pl-11" value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="搜索会话" />
          </div>
          {selectedConversation ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/36">当前会话</div>
                  <div className="mt-1 truncate text-sm text-white">{selectedConversation.title}</div>
                </div>
                {!isRenaming ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isStreaming || renameConversationMutation.isPending}
                    onClick={() => {
                      setRenameDraft(selectedConversation.title);
                      setIsRenaming(true);
                    }}
                  >
                    重命名
                  </Button>
                ) : null}
              </div>
              {isRenaming ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={renameDraft}
                    maxLength={255}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        submitRename();
                      }

                      if (event.key === 'Escape') {
                        setIsRenaming(false);
                        setRenameDraft(selectedConversation.title);
                      }
                    }}
                    placeholder="输入新的会话标题"
                  />
                  <Button size="sm" disabled={!renameDraft.trim() || renameConversationMutation.isPending} onClick={submitRename}>
                    {renameConversationMutation.isPending ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={renameConversationMutation.isPending}
                    onClick={() => {
                      setIsRenaming(false);
                      setRenameDraft(selectedConversation.title);
                    }}
                  >
                    取消
                  </Button>
                </div>
              ) : null}
              {renameConversationMutation.error ? (
                <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
                  {getErrorMessage(renameConversationMutation.error)}
                </div>
              ) : null}
            </div>
          ) : null}
          <Button
            className="w-full"
            variant="secondary"
            disabled={createConversationMutation.isPending || isStreaming || renameConversationMutation.isPending}
            onClick={() => createConversationMutation.mutate()}
          >
            <MessageSquareText className="h-4 w-4" />
            {createConversationMutation.isPending ? '创建中...' : '新建会话'}
          </Button>
          {(createConversationMutation.error || conversationsQuery.error) && !sessions.length ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
              {getErrorMessage(createConversationMutation.error ?? conversationsQuery.error)}
            </div>
          ) : null}
          <div className="space-y-2">
            {sessions.length ? (
              sessions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => props.onSessionChange(item.id)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    props.sessionId === item.id
                      ? 'border-[#d7ff64]/45 bg-[#d7ff64]/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                  )}
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-white/38">{item.group}</div>
                  <div className="mt-2 text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-2 text-xs text-white/45">{item.updatedAt}</div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/50">
                暂无会话，点击上方按钮创建新会话。
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="AI 智能问答" description="消息区已接入真实消息列表与 SSE 流式回答，来源事件同步右侧引用面板。">
        <div className="flex min-h-[620px] flex-col">
          <div className="flex flex-wrap gap-2">
            {(props.workspace?.scopes ?? []).map((scope) => (
              <Badge key={scope.id} tone={scope.enabled ? 'good' : 'neutral'}>
                {scope.label}
              </Badge>
            ))}
          </div>

          {messagesQuery.error && props.sessionId ? (
            <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
              {getErrorMessage(messagesQuery.error)}
            </div>
          ) : null}

          <div className="mt-5 flex-1 space-y-4">
            {messagesQuery.isLoading && props.sessionId && !messages.length ? (
              <PageSkeleton blocks={2} />
            ) : messages.length ? (
              messages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={cn(
                      'max-w-[76%] rounded-[24px] px-5 py-4 text-sm leading-7',
                      message.role === 'user'
                        ? 'bg-[#1f6fb6] text-white'
                        : 'border border-white/10 bg-white/[0.03] text-white'
                    )}
                  >
                    <div>{message.content || (isStreaming && message.role === 'assistant' ? '...' : '暂无内容')}</div>
                    {message.citations?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.citations.map((cite) => (
                          <span key={`${message.id}-${cite}`} className="rounded-full border border-[#8ed3ff]/30 bg-[#0f314a] px-3 py-1 text-xs text-[#b6e4ff]">
                            {cite}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.02] px-6 text-center text-sm leading-7 text-white/48">
                选择一个会话后即可加载消息；没有会话时可以直接新建并发送问题。
              </div>
            )}
          </div>

          <div className="mt-5 rounded-[28px] border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap gap-2">
              {(props.workspace?.suggestions ?? []).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDraft(item)}
                  className="rounded-full border border-white/12 px-3 py-1 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
            {sendMutation.error ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
                {getErrorMessage(sendMutation.error)}
              </div>
            ) : null}
            <div className="mt-4 flex gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && draft.trim() && !sendMutation.isPending) {
                    event.preventDefault();
                    setDraft('');
                    sendMutation.mutate(draft);
                  }
                }}
                className="min-h-[108px] flex-1 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                placeholder="输入问题，发送后会消费 /api/v1/conversations/{id}/messages 的流式事件。"
              />
              <Button
                className="self-end px-5"
                disabled={!draft.trim() || sendMutation.isPending}
                onClick={() => {
                  const nextDraft = draft;
                  setDraft('');
                  sendMutation.mutate(nextDraft);
                }}
              >
                <SendHorizontal className="h-4 w-4" />
                {sendMutation.isPending ? '发送中...' : '发送'}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="来源引用" description="右侧面板优先展示 SSE `sources` 事件，历史消息若带来源也会同步恢复。">
        <div className="space-y-3">
          {references.length ? (
            references.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-white/58">{item.excerpt || '当前来源未返回摘录。'}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/42">
                  <span>{item.source}</span>
                  <span>{Math.round(item.score * 100)}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-[#4cc3ff]" style={{ width: `${Math.max(8, Math.round(item.score * 100))}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm leading-7 text-white/48">
              当前还没有引用来源。发送问题后如果流中返回 `sources` 事件，这里会即时更新。
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

