import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, MoreHorizontal, PencilLine, Search, SendHorizontal, Trash2 } from 'lucide-react';
import { createConversation, deleteConversation, fetchConversationMessages, fetchConversations, renameConversation, streamConversationMessage, type ChatWorkspace, type ConversationMessage, type ConversationRecord } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Panel } from '../components/ui/panel';
import { RichContent } from '../components/ui/rich-content';
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
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [references, setReferences] = useState<ChatWorkspace['references']>(props.workspace?.references ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<{ id: string; title: string } | null>(null);
  const [deleteState, setDeleteState] = useState<ConversationRecord | null>(null);

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

  const removeConversationCache = (conversationId: string) => {
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
        if (!current) {
          return current;
        }

        return {
          ...current,
          data: (current.data ?? []).filter((item) => item.id !== conversationId)
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
      setRenameState(null);
      setMenuOpenId(null);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: async (_, deletedId) => {
      const remaining = sessions.filter((item) => item.id !== deletedId);
      removeConversationCache(deletedId);
      if (props.sessionId === deletedId) {
        props.onSessionChange(remaining[0]?.id ?? null);
        setMessages([]);
        setReferences(props.workspace?.references ?? []);
      }
      setDeleteState(null);
      setMenuOpenId(null);
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

  const groupedSessions = useMemo(() => groupConversations(sessions), [sessions]);

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

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-conversation-menu-root="true"]')) {
        return;
      }
      setMenuOpenId(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [isStreaming, messages]);

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
              { id: assistantMessageId, role: 'assistant', content: '', citations: [], reasoning: '' }
            ]
          : [
              { id: userMessageId, role: 'user', content: question },
              { id: assistantMessageId, role: 'assistant', content: '', citations: [], reasoning: '' }
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
            onReasoning: (reasoning) => {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantMessageId
                    ? {
                        ...item,
                        reasoning: item.reasoning ? `${item.reasoning}\n${reasoning}`.trim() : reasoning
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

  if (isInitialLoading) {
    return <PageSkeleton blocks={7} />;
  }

  if (conversationsQuery.error && !(conversationsQuery.data?.data?.length ?? 0)) {
    return <EmptyState icon={MessageSquareText} title="会话列表加载失败" description={getErrorMessage(conversationsQuery.error)} />;
  }

  return (
    <div className="grid gap-4 xl:h-[calc(100vh-112px)] xl:grid-cols-[280px_minmax(0,1fr)]">
      <Panel
        title="记忆列表"
        // description="只展示历史记录，按时间分组并支持上下滚动浏览。"
        className="xl:flex xl:min-h-0 xl:flex-col"
        contentClassName="xl:flex-1 xl:min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input className="pl-11" value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="搜索会话" />
          </div>
          <Button
            className="w-full"
            variant="secondary"
            disabled={createConversationMutation.isPending || isStreaming}
            onClick={() => createConversationMutation.mutate()}
          >
            <MessageSquareText className="h-4 w-4" />
            {createConversationMutation.isPending ? '创建中...' : '新建会话'}
          </Button>
          {(createConversationMutation.error || conversationsQuery.error) && !sessions.length ? (
            <div className="rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
              {getErrorMessage(createConversationMutation.error ?? conversationsQuery.error)}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#dbe7f3] bg-[#fbfdff]">
            {sessions.length ? (
              <div className="chat-scrollbar h-full overflow-y-auto px-2 py-2.5">
                <div className="space-y-4">
                  {groupedSessions.map((group) => (
                    <section key={group.label} className="space-y-1.5">
                      <div className="flex items-center justify-between px-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">{group.label}</div>
                        <div className="text-[11px] text-[#c0cad7]">{group.items.length}</div>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              'rounded-[16px] p-[1px] transition',
                              props.sessionId === item.id
                                ? 'bg-[linear-gradient(135deg,#60a5fa_0%,#93c5fd_45%,#dbeafe_100%)] shadow-[0_10px_30px_rgba(59,130,246,0.14)]'
                                : 'bg-transparent'
                            )}
                          >
                            <div
                              data-conversation-menu-root="true"
                              className={cn(
                                'relative flex items-start gap-2 rounded-[15px] border px-2.5 py-2 transition',
                                props.sessionId === item.id
                                  ? 'border-transparent bg-white'
                                  : 'border-transparent bg-transparent hover:border-[#dbe7f3] hover:bg-white'
                              )}
                            >
                              <button
                                type="button"
                                className="min-w-0 flex-1 rounded-[12px] px-2 py-1.5 text-left"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  props.onSessionChange(item.id);
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-[#334155]">{item.title}</div>
                                    <div className="mt-1 line-clamp-2 pr-2 text-xs leading-5 text-[#94a3b8]">
                                      {item.preview || '继续当前话题，保留上下文与知识库命中结果。'}
                                    </div>
                                  </div>
                                  {/*<div className="shrink-0 pt-0.5 text-[11px] text-[#94a3b8]">{item.updatedAt}</div>*/}
                                </div>
                              </button>
                              <div className="relative shrink-0 pt-1">
                                <button
                                  type="button"
                                  className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border transition',
                                    menuOpenId === item.id
                                      ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]'
                                      : 'border-transparent bg-transparent text-[#94a3b8] hover:border-[#dbe7f3] hover:bg-white hover:text-[#475569]'
                                  )}
                                  aria-label={`操作 ${item.title}`}
                                  onClick={() => setMenuOpenId((current) => (current === item.id ? null : item.id))}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {menuOpenId === item.id ? (
                                  <div className="absolute right-0 top-10 z-20 min-w-[132px] overflow-hidden rounded-[12px] border border-[#dbe7f3] bg-white py-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.14)]">
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#334155] transition hover:bg-[#f8fbff]"
                                      disabled={renameConversationMutation.isPending || deleteConversationMutation.isPending}
                                      onClick={() => {
                                        setRenameState({ id: item.id, title: item.title });
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <PencilLine className="h-4 w-4 text-[#64748b]" />
                                      重命名
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#dc2626] transition hover:bg-[#fff5f5]"
                                      disabled={deleteConversationMutation.isPending}
                                      onClick={() => {
                                        setDeleteState(item);
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      删除记录
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-[#94a3b8]">
                暂无会话，点击上方按钮创建新会话。
              </div>
            )}
          </div>
        </div>
      </Panel>

      {renameState ? (
        <ConversationRenameModal
          initialTitle={renameState.title}
          pending={renameConversationMutation.isPending}
          error={renameConversationMutation.error}
          onClose={() => setRenameState(null)}
          onConfirm={(title) => renameConversationMutation.mutate({ id: renameState.id, title })}
        />
      ) : null}

      {deleteState ? (
        <ConversationDeleteModal
          conversation={deleteState}
          pending={deleteConversationMutation.isPending}
          error={deleteConversationMutation.error}
          onClose={() => setDeleteState(null)}
          onConfirm={() => deleteConversationMutation.mutate(deleteState.id)}
        />
      ) : null}

      <Panel
        title="AI 智能问答"
        description="按问答主工作台方式组织消息流，压缩外围信息，把主要视线还给对话内容。"
        className="xl:flex xl:min-h-0 xl:flex-col"
        contentClassName="xl:flex-1 xl:min-h-0"
      >
        <div className="flex h-full min-h-[620px] flex-col xl:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#dbe7f3] bg-[#f8fbff] px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#94a3b8]">当前会话</div>
              <div className="mt-1 truncate text-base font-semibold text-[#334155]">
                {selectedConversation?.title ?? '新对话'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(props.workspace?.scopes ?? []).map((scope) => (
                <Badge key={scope.id} tone={scope.enabled ? 'good' : 'neutral'}>
                  {scope.label}
                </Badge>
              ))}
              <button
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition',
                  references.length
                    ? 'border-[#bfdbfe] bg-white text-[#2563eb] hover:bg-[#eff6ff]'
                    : 'border-[#dbe7f3] bg-white text-[#94a3b8]'
                )}
                onClick={() => references.length && setShowReferences((current) => !current)}
              >
                来源引用 {references.length}
              </button>
            </div>
          </div>

          {messagesQuery.error && props.sessionId ? (
            <div className="mt-4 rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
              {getErrorMessage(messagesQuery.error)}
            </div>
          ) : null}

          {showReferences && references.length ? (
            <div className="mt-4 overflow-hidden rounded-[14px] border border-[#dbe7f3] bg-white">
              <div className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-3">
                <div className="text-sm font-medium text-[#334155]">命中来源</div>
                <button
                  type="button"
                  className="text-xs text-[#94a3b8] transition hover:text-[#2563eb]"
                  onClick={() => setShowReferences(false)}
                >
                  收起
                </button>
              </div>
              <div className="chat-scrollbar max-h-[180px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">来源内容</th>
                      <th className="px-4 py-3">渠道</th>
                      <th className="px-4 py-3 text-right">命中度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {references.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-[#334155]">{item.title}</div>
                          <div className="mt-1 text-xs leading-6 text-[#64748b]">{item.excerpt || '当前来源未返回摘录。'}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-[#64748b]">{item.source}</td>
                        <td className="px-4 py-3 text-right align-top text-[#334155]">{Math.round(item.score * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div
            ref={messagesViewportRef}
            className="chat-scrollbar mt-4 flex-1 overflow-y-auto rounded-[16px] border border-[#dbe7f3] bg-[#f8fbff] p-4 xl:min-h-0"
          >
            {messagesQuery.isLoading && props.sessionId && !messages.length ? (
              <PageSkeleton blocks={2} />
            ) : messages.length ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={cn(
                        'rounded-[16px] border px-4 py-3 text-sm leading-7 shadow-none',
                        message.role === 'user'
                          ? 'max-w-[78%] border-[#1f6fb6] bg-[#1f6fb6] text-white'
                          : 'max-w-[90%] border-[#dbe7f3] bg-white text-[#334155] xl:max-w-[88%]'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="mb-3">
                          <ThinkingPanel reasoning={message.reasoning} active={isStreaming && message.id === messages[messages.length - 1]?.id} />
                        </div>
                      ) : null}
                      {message.role === 'assistant' ? (
                        <RichContent
                          className="rich-content"
                          content={message.content || (isStreaming ? '...' : '暂无内容')}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content || '暂无内容'}
                        </div>
                      )}
                      {message.citations?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.citations.map((cite) => (
                            <span key={`${message.id}-${cite}`} className="rounded-full border border-[#dbe7f3] bg-[#f8fbff] px-3 py-1 text-xs text-[#4b5563]">
                              {cite}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-[16px] border border-dashed border-[#d6dee8] bg-white px-6 text-center">
                <div className="text-base font-medium text-[#334155]">开始一段新的问答</div>
                <div className="mt-2 max-w-[520px] text-sm leading-7 text-[#94a3b8]">
                  选择一个会话继续上下文，或者直接新建会话并输入问题。常用问题可以从下方快捷提示中快速填充。
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 shrink-0 rounded-[16px] border border-[#dbe7f3] bg-white p-3.5">
            <div className="flex flex-wrap gap-2">
              {(props.workspace?.suggestions ?? []).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDraft(item)}
                  className="rounded-full border border-[#dbe7f3] bg-[#f8fbff] px-3 py-1 text-sm text-[#64748b] transition hover:border-[#bfdbfe] hover:bg-[#eff6ff] hover:text-[#2563eb]"
                >
                  {item}
                </button>
              ))}
            </div>
            {sendMutation.error ? (
              <div className="mt-4 rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
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
                className="min-h-[104px] flex-1 resize-none rounded border border-[#dbe7f3] bg-[#fbfdff] px-4 py-3 text-sm text-[#334155] outline-none transition focus:border-[#93c5fd] focus:bg-white"
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
    </div>
  );
}

function groupConversations(items: ConversationRecord[]) {
  const map = new Map<string, ConversationRecord[]>();
  for (const item of items) {
    const group = item.group || '更早';
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group)!.push(item);
  }
  return Array.from(map.entries()).map(([label, groupedItems]) => ({
    label,
    items: groupedItems
  }));
}

function ThinkingPanel(props: { reasoning?: string; active: boolean }) {
  if (!props.active && !props.reasoning?.trim()) {
    return null;
  }

  return (
    <div className="thinking-panel">
      <div className="thinking-panel__header">
        <div className="thinking-panel__badge">
          <span className="thinking-panel__pulse" />
          <span>{props.reasoning?.trim() ? '思考过程' : '正在思考'}</span>
        </div>
        {props.active ? (
          <div className="thinking-panel__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>
      {props.reasoning?.trim() ? (
        <div className="thinking-panel__body">
          <RichContent className="rich-content rich-content--thinking" content={props.reasoning} />
        </div>
      ) : (
        <div className="thinking-panel__placeholder">
          正在整理检索结果、归并上下文并生成回答，后端接入思考流事件后这里会实时展示具体过程。
        </div>
      )}
    </div>
  );
}

function ConversationRenameModal(props: {
  initialTitle: string;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (title: string) => void;
}) {
  const [title, setTitle] = useState(props.initialTitle);

  useEffect(() => {
    setTitle(props.initialTitle);
  }, [props.initialTitle]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded border border-[#dbe7f3] bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-[#1f2937]">重命名会话</div>
            <div className="mt-1 text-sm leading-6 text-[#64748b]">修改这条问答记录的标题，便于后续检索和归档。</div>
          </div>
          <button
            type="button"
            className="rounded border border-[#e2e8f0] px-2.5 py-1 text-sm text-[#64748b] transition hover:border-[#cbd5e1] hover:text-[#334155]"
            onClick={props.onClose}
          >
            关闭
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-[#334155]">会话标题</div>
          <Input
            autoFocus
            value={title}
            maxLength={255}
            placeholder="请输入新的会话标题"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing && title.trim()) {
                event.preventDefault();
                props.onConfirm(title.trim());
              }
            }}
          />
        </div>
        {props.error ? (
          <div className="mt-4 rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
            {getErrorMessage(props.error)}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={props.onClose} disabled={props.pending}>
            取消
          </Button>
          <Button onClick={() => props.onConfirm(title.trim())} disabled={!title.trim() || props.pending}>
            {props.pending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConversationDeleteModal(props: {
  conversation: ConversationRecord;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded border border-[#dbe7f3] bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
        <div className="text-base font-semibold text-[#1f2937]">删除会话记录</div>
        <div className="mt-2 text-sm leading-6 text-[#64748b]">
          删除后，这条问答记录及其历史消息将不再展示。
        </div>
        <div className="mt-4 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-sm text-[#334155]">
          {props.conversation.title}
        </div>
        {props.error ? (
          <div className="mt-4 rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
            {getErrorMessage(props.error)}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={props.onClose} disabled={props.pending}>
            取消
          </Button>
          <Button
            className="border-[#dc2626] bg-[#dc2626] hover:border-[#b91c1c] hover:bg-[#b91c1c]"
            onClick={props.onConfirm}
            disabled={props.pending}
          >
            {props.pending ? '删除中...' : '确认删除'}
          </Button>
        </div>
      </div>
    </div>
  );
}
