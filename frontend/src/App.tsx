import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Gauge,
  LogOut,
  MessageSquareText,
  RefreshCw,
  Search,
  SendHorizontal,
  Server,
  ShieldCheck,
  Upload,
  UserPlus,
  Users
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  fetchAgentWorkspace,
  fetchChatWorkspace,
  fetchCurrentUser,
  fetchDashboardSnapshot,
  fetchKnowledgeWorkspace,
  fetchMonitorWorkspace,
  fetchSourceWorkspace,
  fetchSystemHealth,
  fetchUsersWorkspace,
  login,
  type AgentWorkspace,
  type ChatWorkspace,
  type DashboardSnapshot,
  type EnterpriseRecord,
  type KnowledgeWorkspace,
  type LoginRequest,
  type MonitorWorkspace,
  type SourceWorkspace,
  type SystemHealthPayload,
  type UserRecord,
  type UsersWorkspace
} from './lib/api';
import { cn, formatPercent } from './lib/utils';
import { useSessionStore, type WorkspaceSection } from './store/session-store';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { EmptyState } from './components/ui/empty-state';
import { Input } from './components/ui/input';
import { Panel } from './components/ui/panel';

const pageMeta: Record<
  WorkspaceSection,
  { label: string; title: string; description: string; icon: typeof Gauge }
> = {
  dash: {
    label: '仪表盘',
    title: '环境监管工作台概览',
    description: '汇总问答、知识库、Agent 与系统状态，先承接 MVP 与二期功能的全局入口。',
    icon: Gauge
  },
  chat: {
    label: '智能问答',
    title: 'RAG 问答主工作区',
    description: '保留会话、知识库范围、引用来源和输入面板，按文档要求为后续 SSE 对话预留结构。',
    icon: MessageSquareText
  },
  kb: {
    label: '知识库',
    title: '知识库管理与上传',
    description: '围绕文档上传、切片、向量化与状态跟踪组织页面，真实上传接口落地前由 MSW 托管。',
    icon: Database
  },
  source: {
    label: '污染源档案',
    title: '企业档案与监测风险',
    description: '把企业许可、在线监测、风险等级和合规备注编排成执法与分析共用的档案页。',
    icon: Building2
  },
  agent: {
    label: 'Agent 任务',
    title: 'Agent 任务工作台',
    description: '聚焦任务发起、执行流、工具可用性和输出预览，贴合三期规划中的工具调用框架。',
    icon: Bot
  },
  monitor: {
    label: '系统监控',
    title: '模型调用与服务监控',
    description: '围绕 Token、调用记录、可用性和响应时延组织，后续可直接替换为真实观测接口。',
    icon: BarChart3
  },
  users: {
    label: '用户管理',
    title: '用户与权限矩阵',
    description: '以角色权限为主线呈现内部使用者结构，服务管理层对权限边界的确认。',
    icon: Users
  }
};

const navItems: WorkspaceSection[] = ['dash', 'chat', 'kb', 'source', 'agent', 'monitor', 'users'];
function isWorkspaceSection(value: string): value is WorkspaceSection {
  return value in pageMeta;
}

function App() {
  const queryClient = useQueryClient();
  const selectedSection = useSessionStore((state) => state.selectedSection);
  const setSelectedSection = useSessionStore((state) => state.setSelectedSection);
  const token = useSessionStore((state) => state.token);
  const storedUser = useSessionStore((state) => state.user);
  const setSession = useSessionStore((state) => state.setSession);
  const setUser = useSessionStore((state) => state.setUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const credentials = useSessionStore((state) => state.credentials);
  const setCredential = useSessionStore((state) => state.setCredential);
  const [isSwitching, startTransition] = useTransition();
  const [chatSearch, setChatSearch] = useState('');
  const deferredChatSearch = useDeferredValue(chatSearch);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const isMockMode = (import.meta.env.VITE_API_MODE ?? 'mock') !== 'real';

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    staleTime: 60_000
  });

  const meQuery = useQuery({
    queryKey: ['current-user', token],
    queryFn: fetchCurrentUser,
    enabled: Boolean(token),
    retry: false
  });

  const dashboardQuery = useQuery({
    queryKey: ['workspace-dashboard'],
    queryFn: fetchDashboardSnapshot,
    staleTime: 60_000
  });

  const chatQuery = useQuery({
    queryKey: ['workspace-chat'],
    queryFn: fetchChatWorkspace,
    staleTime: 60_000
  });

  const knowledgeQuery = useQuery({
    queryKey: ['workspace-knowledge'],
    queryFn: fetchKnowledgeWorkspace,
    staleTime: 60_000
  });

  const sourceQuery = useQuery({
    queryKey: ['workspace-source'],
    queryFn: fetchSourceWorkspace,
    staleTime: 60_000
  });

  const agentQuery = useQuery({
    queryKey: ['workspace-agent'],
    queryFn: fetchAgentWorkspace,
    staleTime: 60_000
  });

  const monitorQuery = useQuery({
    queryKey: ['workspace-monitor'],
    queryFn: fetchMonitorWorkspace,
    staleTime: 60_000
  });

  const usersQuery = useQuery({
    queryKey: ['workspace-users'],
    queryFn: fetchUsersWorkspace,
    staleTime: 60_000
  });

  useEffect(() => {
    if (meQuery.data?.data) {
      setUser(meQuery.data.data);
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      clearSession();
    }
  }, [clearSession, meQuery.error]);

  useEffect(() => {
    if (!chatSessionId && chatQuery.data?.data.sessions.length) {
      setChatSessionId(chatQuery.data.data.sessions[0].id);
    }
  }, [chatQuery.data, chatSessionId]);

  useEffect(() => {
    if (!enterpriseId && sourceQuery.data?.data.enterprises.length) {
      setEnterpriseId(sourceQuery.data.data.enterprises[0].id);
    }
  }, [enterpriseId, sourceQuery.data]);

  useEffect(() => {
    if (!userId && usersQuery.data?.data.users.length) {
      setUserId(usersQuery.data.data.users[0].id);
    }
  }, [userId, usersQuery.data]);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (response) => {
      setSession(response.data);
      void queryClient.invalidateQueries({ queryKey: ['current-user'] });
    }
  });

  const activeUser = meQuery.data?.data ?? storedUser;
  const activeSection = isWorkspaceSection(selectedSection) ? selectedSection : 'dash';
  const meta = pageMeta[activeSection];

  const filteredSessions = useMemo(() => {
    const sessions = chatQuery.data?.data.sessions ?? [];
    const keyword = deferredChatSearch.trim().toLowerCase();
    if (!keyword) {
      return sessions;
    }

    return sessions.filter((item) => item.title.toLowerCase().includes(keyword));
  }, [chatQuery.data, deferredChatSearch]);

  const selectedEnterprise = useMemo(() => {
    const enterprises = sourceQuery.data?.data.enterprises ?? [];
    return enterprises.find((item) => item.id === enterpriseId) ?? enterprises[0] ?? null;
  }, [enterpriseId, sourceQuery.data]);

  const selectedUser = useMemo(() => {
    const users = usersQuery.data?.data.users ?? [];
    return users.find((item) => item.id === userId) ?? users[0] ?? null;
  }, [userId, usersQuery.data]);

  return (
    <div className="app-shell">
      <div className="app-noise" />
      <aside className="border-b border-white/10 bg-[#081214]/92 backdrop-blur md:border-b-0 md:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d7ff64] text-[#11211e] shadow-[0_0_34px_rgba(215,255,100,0.22)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl text-white">环境监管 AI 助手</p>
                  <p className="text-xs text-white/45">Internal Operations Console</p>
                </div>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2">
              {navItems.map((id) => {
                const item = pageMeta[id];
                const Icon = item.icon;
                const active = activeSection === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      startTransition(() => {
                        setSelectedSection(id);
                      })
                    }
                    className={cn(
                      'flex min-w-[198px] items-center justify-between rounded-2xl border px-3 py-3 text-left transition md:w-full md:min-w-0',
                      active
                        ? 'border-[#d7ff64]/50 bg-[#d7ff64]/12 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/68 hover:border-white/18 hover:bg-white/[0.05]'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="block text-xs text-white/42">{pageHint(id)}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-5 hidden space-y-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-4 md:mt-auto md:block">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.22em] text-white/40">Runtime</span>
              <Badge tone={isMockMode ? 'warn' : 'good'}>{isMockMode ? 'MSW Mock' : 'Live API'}</Badge>
            </div>
            <p className="text-sm leading-6 text-white/60">
              真实后端目前确认了 `health / login / me`。其它业务页按照文档原型继续推进，并等待接口补齐后直接替换。
            </p>
            {activeUser ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{activeUser.username}</div>
                    <div className="text-xs text-white/55">{activeUser.role}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => clearSession()}>
                    <LogOut className="h-4 w-4" />
                    退出
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">用户名</span>
                  <Input
                    value={credentials.username}
                    onChange={(event) => setCredential('username', event.target.value)}
                    placeholder="admin"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">密码</span>
                  <Input
                    type="password"
                    value={credentials.password}
                    onChange={(event) => setCredential('password', event.target.value)}
                    placeholder="Env@123456"
                  />
                </label>
                {loginMutation.error ? (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
                    {getErrorMessage(loginMutation.error)}
                  </div>
                ) : null}
                <Button className="w-full" disabled={loginMutation.isPending} onClick={() => loginMutation.mutate(credentials)}>
                  <ShieldCheck className="h-4 w-4" />
                  {loginMutation.isPending ? '登录中...' : '运维认证'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="border-b border-white/10 px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="neutral">{meta.label}</Badge>
                <Badge tone={healthQuery.data?.data.status === 'UP' ? 'good' : 'warn'}>
                  {healthQuery.data?.data.status ?? '未连接'}
                </Badge>
                {isSwitching ? <span className="text-xs text-white/40">视图切换中</span> : null}
              </div>
              <div>
                <h1 className="font-display text-3xl text-white md:text-5xl">{meta.title}</h1>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-white/58 md:text-base">{meta.description}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[540px]">
              <TopStat
                label="系统状态"
                value={healthQuery.data?.data.status ?? '--'}
                note={healthQuery.isError ? 'health 接口异常' : '读取 /api/system/health'}
              />
              <TopStat
                label="当前模型"
                value={healthQuery.data?.data.chatModel ?? '--'}
                note={healthQuery.data?.data.embeddingModel ?? '等待连接'}
              />
              <TopStat
                label="向量维度"
                value={healthQuery.data ? String(healthQuery.data.data.vectorDimensions) : '--'}
                note={activeUser ? `已登录 ${activeUser.username}` : '当前未登录'}
              />
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 md:px-8 md:py-7">
          {activeSection === 'dash' ? (
            <DashboardPage
              dashboard={dashboardQuery.data?.data}
              dashboardLoading={dashboardQuery.isLoading}
              dashboardError={dashboardQuery.error}
              health={healthQuery.data?.data}
              healthLoading={healthQuery.isLoading}
              healthError={healthQuery.error}
              onRefresh={() => {
                void dashboardQuery.refetch();
                void healthQuery.refetch();
              }}
            />
          ) : null}

          {activeSection === 'chat' ? (
            <ChatPage
              data={chatQuery.data?.data}
              isLoading={chatQuery.isLoading}
              error={chatQuery.error}
              sessions={filteredSessions}
              search={chatSearch}
              onSearch={setChatSearch}
              sessionId={chatSessionId}
              onSessionChange={setChatSessionId}
            />
          ) : null}

          {activeSection === 'kb' ? (
            <KnowledgePage
              data={knowledgeQuery.data?.data}
              isLoading={knowledgeQuery.isLoading}
              error={knowledgeQuery.error}
            />
          ) : null}

          {activeSection === 'source' ? (
            <SourcePage
              data={sourceQuery.data?.data}
              isLoading={sourceQuery.isLoading}
              error={sourceQuery.error}
              selectedEnterprise={selectedEnterprise}
              onSelect={setEnterpriseId}
            />
          ) : null}

          {activeSection === 'agent' ? (
            <AgentPage data={agentQuery.data?.data} isLoading={agentQuery.isLoading} error={agentQuery.error} />
          ) : null}

          {activeSection === 'monitor' ? (
            <MonitorPage
              data={monitorQuery.data?.data}
              isLoading={monitorQuery.isLoading}
              error={monitorQuery.error}
              health={healthQuery.data?.data}
            />
          ) : null}

          {activeSection === 'users' ? (
            <UsersPage
              data={usersQuery.data?.data}
              isLoading={usersQuery.isLoading}
              error={usersQuery.error}
              selectedUser={selectedUser}
              onSelect={setUserId}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function DashboardPage(props: {
  dashboard?: DashboardSnapshot;
  dashboardLoading: boolean;
  dashboardError: unknown;
  health?: SystemHealthPayload;
  healthLoading: boolean;
  healthError: unknown;
  onRefresh: () => void;
}) {
  if (props.dashboardLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.dashboardError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="仪表盘加载失败"
        description={getErrorMessage(props.dashboardError)}
        action={
          <Button variant="secondary" onClick={props.onRefresh}>
            <RefreshCw className="h-4 w-4" />
            重试
          </Button>
        }
      />
    );
  }

  if (!props.dashboard) {
    return null;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="今日 AI 问答"
          value={String(props.dashboard.todayQuestions)}
          note={`满意率 ${formatPercent(props.dashboard.satisfactionRate)}`}
          accent="blue"
        />
        <MetricCard
          label="知识库文档"
          value={String(props.dashboard.knowledgeDocuments)}
          note={`本周新增 ${props.dashboard.newDocumentsWeek} 份`}
          accent="emerald"
        />
        <MetricCard
          label="Agent 任务"
          value={String(props.dashboard.activeAgentTasks)}
          note={`${props.dashboard.completedAgentTasks} 已完成 · ${props.dashboard.activeAgentTasks - props.dashboard.completedAgentTasks} 进行中`}
          accent="lime"
        />
        <MetricCard
          label="今日 Token 费用"
          value={`¥${props.dashboard.todayTokenCost}`}
          note={`本月累计 ¥${props.dashboard.monthTokenCost}`}
          accent="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="最近问答记录"
          description="围绕执法与监测的高频提问组织，后续可直接接会话列表接口。"
          action={
            <Button variant="ghost" size="sm" onClick={props.onRefresh}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          }
        >
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">问题摘要</th>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {props.dashboard.recentQuestions.map((item) => (
                  <tr key={item.id} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{item.summary}</td>
                    <td className="px-4 py-3 text-white/62">{item.user}</td>
                    <td className="px-4 py-3 text-white/45">{item.timeAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="知识库使用分布" description="文档里的知识库使用比例页签被压缩为趋势条，更适合首页扫描。">
          <div className="space-y-4">
            {props.dashboard.knowledgeUsage.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.percent} color={item.color} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="当前交付物" description="对应设计文档里一期、二期的必做内容，把状态压到首页。">
          <div className="space-y-3">
            {props.dashboard.taskStatus.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-white/55">{item.note}</p>
                  </div>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="系统健康摘录" description="这里保留真实后端的健康接口字段，便于前端与系统状态联动。">
          {props.healthLoading ? (
            <PageSkeleton blocks={3} />
          ) : props.healthError ? (
            <EmptyState icon={Server} title="健康信息读取失败" description={getErrorMessage(props.healthError)} />
          ) : props.health ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="服务名" value={props.health.service} />
              <InfoTile label="状态" value={props.health.status} tone="good" />
              <InfoTile label="Chat Model" value={props.health.chatModel} />
              <InfoTile label="Embedding" value={props.health.embeddingModel} />
              <InfoTile label="Base URL" value={props.health.openAiBaseUrl} />
              <InfoTile label="相似阈值" value={String(props.health.similarityThreshold)} tone="warn" />
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

function ChatPage(props: {
  data?: ChatWorkspace;
  isLoading: boolean;
  error: unknown;
  sessions: ChatWorkspace['sessions'];
  search: string;
  onSearch: (value: string) => void;
  sessionId: string | null;
  onSessionChange: (id: string) => void;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={7} />;
  }

  if (props.error) {
    return <EmptyState icon={MessageSquareText} title="问答工作区加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data) {
    return null;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_260px]">
      <Panel title="会话列表" description="按今天 / 昨天 / 更早组织，延续文档原型的左侧会话结构。">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input className="pl-11" value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="搜索会话" />
          </div>
          <Button className="w-full" variant="secondary">
            <MessageSquareText className="h-4 w-4" />
            新建会话
          </Button>
          <div className="space-y-2">
            {props.sessions.map((item) => (
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
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="AI 智能问答" description="消息区、引用标注和输入面板拆开，后续接 SSE 时改动面最小。">
        <div className="flex min-h-[620px] flex-col">
          <div className="flex flex-wrap gap-2">
            {props.data.scopes.map((scope) => (
              <Badge key={scope.id} tone={scope.enabled ? 'good' : 'neutral'}>
                {scope.label}
              </Badge>
            ))}
          </div>

          <div className="mt-5 flex-1 space-y-4">
            {props.data.messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={cn(
                    'max-w-[76%] rounded-[24px] px-5 py-4 text-sm leading-7',
                    message.role === 'user'
                      ? 'bg-[#1f6fb6] text-white'
                      : 'border border-white/10 bg-white/[0.03] text-white'
                  )}
                >
                  <div>{message.content}</div>
                  {message.citations?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.citations.map((cite) => (
                        <span key={cite} className="rounded-full border border-[#8ed3ff]/30 bg-[#0f314a] px-3 py-1 text-xs text-[#b6e4ff]">
                          {cite}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[28px] border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap gap-2">
              {props.data.suggestions.map((item) => (
                <button key={item} type="button" className="rounded-full border border-white/12 px-3 py-1 text-sm text-white/60 transition hover:border-white/25 hover:text-white">
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <textarea
                className="min-h-[108px] flex-1 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                placeholder="输入问题，后续这里将接入真实 SSE 流式问答。"
              />
              <Button className="self-end px-5">
                <SendHorizontal className="h-4 w-4" />
                发送
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="来源引用" description="单独维持一个引用侧栏，匹配二期里“引用来源面板”的要求。">
        <div className="space-y-3">
          {props.data.references.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold text-white">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-white/58">{item.excerpt}</div>
              <div className="mt-3 flex items-center justify-between text-xs text-white/42">
                <span>{item.source}</span>
                <span>{Math.round(item.score * 100)}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-[#4cc3ff]" style={{ width: `${Math.round(item.score * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function KnowledgePage(props: { data?: KnowledgeWorkspace; isLoading: boolean; error: unknown }) {
  if (props.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.error) {
    return <EmptyState icon={Database} title="知识库页面加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data) {
    return null;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {props.data.summary.map((item) => (
          <MetricCard key={item.id} label={item.label} value={item.value} note={item.note} accent="emerald" />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="文档列表" description="围绕分类、切片和入库状态进行管理，承接一期上传解析链路。">
          <div className="mb-4 flex flex-wrap gap-2">
            {props.data.categories.map((category) => (
              <Badge key={category.id} tone={category.id === 'all' ? 'good' : 'neutral'}>
                {category.label} · {category.count}
              </Badge>
            ))}
          </div>
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">文档名称</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium">大小</th>
                  <th className="px-4 py-3 font-medium">切片数</th>
                  <th className="px-4 py-3 font-medium">上传时间</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {props.data.documents.map((item) => (
                  <tr key={item.id} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{item.name}</td>
                    <td className="px-4 py-3 text-white/58">{item.category}</td>
                    <td className="px-4 py-3 text-white/58">{item.size}</td>
                    <td className="px-4 py-3 text-white/58">{item.chunks}</td>
                    <td className="px-4 py-3 text-white/45">{item.uploadedAt}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="上传入口" description="按照原型保留拖拽上传位、任务提示和文档准备说明。">
          <div className="rounded-[28px] border border-dashed border-white/14 bg-white/[0.03] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff64]/14 text-[#d7ff64]">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">拖拽文件到此处上传</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
              文档上传、解析、切片、向量化和状态查询仍在等待真实接口，这里先把交互和布局稳定下来。
            </p>
            <Button className="mt-5">
              <Upload className="h-4 w-4" />
              选择文件
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            <InfoTile label="支持格式" value="PDF / DOCX / XLSX / TXT" />
            <InfoTile label="当前策略" value="先上传后轮询异步任务" tone="warn" />
            <InfoTile label="展示要求" value="需保留状态、切片数、引用来源" tone="good" />
          </div>
        </Panel>
      </div>
    </>
  );
}

function SourcePage(props: {
  data?: SourceWorkspace;
  isLoading: boolean;
  error: unknown;
  selectedEnterprise: EnterpriseRecord | null;
  onSelect: (id: string) => void;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.error) {
    return <EmptyState icon={Building2} title="污染源档案加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data || !props.selectedEnterprise) {
    return null;
  }

  const workspace = props.data;
  const selectedEnterprise = props.selectedEnterprise;

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
      <Panel title="企业列表" description="按风险等级、许可证和在线监测状态组合成执法入口。">
        <div className="space-y-3">
          {workspace.enterprises.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelect(item.id)}
              className={cn(
                'w-full rounded-[24px] border px-4 py-4 text-left transition',
                selectedEnterprise.id === item.id
                  ? 'border-[#d7ff64]/45 bg-[#d7ff64]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{item.name}</div>
                <Badge tone={item.monitorStatus === '超标' ? 'warn' : 'good'}>{item.monitorStatus}</Badge>
              </div>
              <div className="mt-2 text-sm text-white/55">{item.industry}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={item.riskLevel === '重点' ? 'warn' : 'neutral'}>{item.riskLevel}</Badge>
                <Badge tone={item.permitStatus === '有效' ? 'good' : 'warn'}>{item.permitStatus}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={selectedEnterprise.name} description="将许可、排口、监测和合规备注拆成可扫描的档案中心。">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoTile label="行业" value={selectedEnterprise.industry} />
          <InfoTile label="许可证编号" value={selectedEnterprise.licenseCode} />
          <InfoTile label="设备数量" value={`${selectedEnterprise.devices} 套`} />
          <InfoTile label="许可证数量" value={`${selectedEnterprise.permits} 个`} />
          <InfoTile label="位置" value={selectedEnterprise.location} />
          <InfoTile label="联系人" value={selectedEnterprise.contacts} />
        </div>

        <div className="mt-5 rounded-[28px] border border-amber-300/18 bg-amber-300/10 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-100" />
            <div>
              <div className="text-sm font-semibold text-white">最新事件</div>
              <div className="mt-1 text-sm leading-6 text-white/68">{selectedEnterprise.latestEvent}</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="合规备注" description="右侧单列更适合执法场景快速比对。">
        <div className="space-y-3">
          {selectedEnterprise.complianceNotes.map((item: string) => (
            <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/68">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AgentPage(props: { data?: AgentWorkspace; isLoading: boolean; error: unknown }) {
  if (props.isLoading) {
    return <PageSkeleton blocks={7} />;
  }

  if (props.error) {
    return <EmptyState icon={Bot} title="Agent 页面加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data) {
    return null;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_250px]">
      <div className="space-y-5">
        <Panel title="新建任务" description="用自然语言发起任务，后续直接接后端 Agent 编排接口。">
          <textarea
            className="min-h-[120px] w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            defaultValue="生成鑫达化工本月废水超标情况说明，并附上执法建议。"
          />
          <Button className="mt-4 w-full">
            <Bot className="h-4 w-4" />
            执行任务
          </Button>
        </Panel>

        <Panel title="任务历史" description="保留任务列表和状态，适配后续回放与审计场景。">
          <div className="space-y-3">
            {props.data.history.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white">{item.title}</div>
                  <Badge tone={item.status === '完成' ? 'good' : 'warn'}>{item.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="执行流程" description="沿用文档里的四段式流程：意图识别、知识检索、工具调用、报告生成。">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {props.data.flow.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <StatusDot status={item.status} />
                </div>
                <div className="mt-2 text-sm leading-6 text-white/55">{item.description}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="执行日志" description="执行日志区保留为后续 SSE 推送与工具结果回放的载体。">
          <div className="space-y-3 rounded-[28px] border border-white/10 bg-black/15 p-5">
            {props.data.logs.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm leading-6 text-white/68">
                <StatusDot status={item.status} />
                <span>{item.line}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="可用工具" description="体现三期要求中的工具调用框架。">
          <div className="space-y-3">
            {props.data.tools.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{item.name}</div>
                  <Badge tone={item.status === 'available' ? 'good' : 'neutral'}>
                    {item.status === 'available' ? '可用' : '待接入'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-white/55">{item.description}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="输出结果" description="导出与复制入口将直接挂在这里。">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">
            {props.data.outputPreview}
          </div>
          <Button className="mt-4 w-full" variant="ghost" disabled>
            <FileText className="h-4 w-4" />
            导出报告
          </Button>
        </Panel>
      </div>
    </div>
  );
}

function MonitorPage(props: {
  data?: MonitorWorkspace;
  isLoading: boolean;
  error: unknown;
  health?: SystemHealthPayload;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.error) {
    return <EmptyState icon={BarChart3} title="系统监控加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data) {
    return null;
  }

  const data = props.data;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="服务可用率" value={data.availability} note="近 30 天" accent="emerald" />
        <MetricCard label="平均响应时长" value={data.averageLatency} note="问答 1.8s · Embedding 0.4s" accent="blue" />
        <MetricCard label="今日 Token 消耗" value={data.todayTokens.toLocaleString()} note="输入 + 输出合计" accent="lime" />
        <MetricCard label="本月累计费用" value={data.monthCost} note="较上月下降 12%" accent="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="7 日 Token 趋势" description="当前先用 mock 数据表现信息密度和图表容器。">
          <div className="flex h-44 items-end gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            {data.trend.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className={cn('w-full rounded-t-xl', index === data.trend.length - 1 ? 'bg-[#d7ff64]' : 'bg-[#4cc3ff]')} style={{ height: `${value}%` }} />
                <span className="text-xs text-white/38">{index === data.trend.length - 1 ? '今天' : `5/${5 + index}`}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {data.breakdown.map((item) => (
              <BarRow key={item.id} label={item.label} value={item.percent} color={item.color} />
            ))}
          </div>
        </Panel>

        <Panel title="服务与模型状态" description="结合真实 health 接口，把配置字段放进监控场景里。">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="服务状态" value={props.health?.status ?? '--'} tone={props.health?.status === 'UP' ? 'good' : 'warn'} />
            <InfoTile label="Chat Model" value={props.health?.chatModel ?? '--'} />
            <InfoTile label="Embedding" value={props.health?.embeddingModel ?? '--'} />
            <InfoTile label="向量维度" value={props.health ? String(props.health.vectorDimensions) : '--'} />
          </div>
        </Panel>
      </div>

      <Panel title="最近调用记录" description="这一块对应文档里的调用日志和 Token 统计表。">
        <div className="overflow-hidden rounded-[24px] border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">模型</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">输入</th>
                <th className="px-4 py-3 font-medium">输出</th>
                <th className="px-4 py-3 font-medium">耗时</th>
                <th className="px-4 py-3 font-medium">费用</th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {props.data.recentCalls.map((item) => (
                <tr key={item.id} className="border-t border-white/8">
                  <td className="px-4 py-3 text-white/45">{item.time}</td>
                  <td className="px-4 py-3 text-white/62">{item.user}</td>
                  <td className="px-4 py-3 text-white/62">{item.model}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.type === 'Agent' ? 'warn' : 'neutral'}>{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-white/62">{item.inputTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/62">{item.outputTokens?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-3 text-white/62">{item.duration}</td>
                  <td className="px-4 py-3 text-white/62">{item.cost}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.status === '成功' ? 'good' : 'warn'}>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function UsersPage(props: {
  data?: UsersWorkspace;
  isLoading: boolean;
  error: unknown;
  selectedUser: UserRecord | null;
  onSelect: (id: string) => void;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={5} />;
  }

  if (props.error) {
    return <EmptyState icon={Users} title="用户管理加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data || !props.selectedUser) {
    return null;
  }

  const workspace = props.data;
  const selectedUser = props.selectedUser;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Panel
        title="用户列表"
        description="按设计文档中的三类角色组织，并保留最近登录、部门和状态字段。"
        action={
          <Button size="sm">
            <UserPlus className="h-4 w-4" />
            新增用户
          </Button>
        }
      >
        <div className="space-y-3">
          {workspace.users.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelect(item.id)}
              className={cn(
                'w-full rounded-[24px] border px-4 py-4 text-left transition',
                selectedUser.id === item.id
                  ? 'border-[#d7ff64]/45 bg-[#d7ff64]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#173544] text-sm font-semibold text-[#b6e4ff]">
                  {item.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <Badge tone={item.status === '启用' ? 'good' : 'warn'}>{item.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-white/55">
                    {item.role} · {item.dept}
                  </div>
                  <div className="mt-2 text-xs text-white/42">{item.lastLogin}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="选中用户" description="当前页保留角色、部门和状态概览，便于后续接管理接口。">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="姓名" value={selectedUser.name} />
            <InfoTile label="角色" value={selectedUser.role} />
            <InfoTile label="部门" value={selectedUser.dept} />
            <InfoTile label="最后登录" value={selectedUser.lastLogin} tone="good" />
          </div>
        </Panel>

        <Panel title="角色权限矩阵" description="直接对应原型中的功能矩阵，帮助确认页面级权限边界。">
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">功能模块</th>
                  <th className="px-4 py-3 font-medium">执法人员</th>
                  <th className="px-4 py-3 font-medium">监测分析员</th>
                  <th className="px-4 py-3 font-medium">管理层</th>
                </tr>
              </thead>
              <tbody>
                {workspace.permissions.map((item) => (
                  <tr key={item.module} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{item.module}</td>
                    <td className="px-4 py-3 text-center">{item.inspector ? <Check className="mx-auto h-4 w-4 text-emerald-300" /> : <span className="text-white/25">—</span>}</td>
                    <td className="px-4 py-3 text-center">{item.analyst ? <Check className="mx-auto h-4 w-4 text-emerald-300" /> : <span className="text-white/25">—</span>}</td>
                    <td className="px-4 py-3 text-center">{item.manager ? <Check className="mx-auto h-4 w-4 text-emerald-300" /> : <span className="text-white/25">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TopStat(props: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{props.label}</p>
      <div className="mt-2 text-lg font-semibold text-white">{props.value}</div>
      <p className="mt-1 text-xs text-white/45">{props.note}</p>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; note: string; accent: 'blue' | 'emerald' | 'lime' | 'amber' }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#0b171a]/88 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
      <div className="text-sm text-white/50">{props.label}</div>
      <div className={cn('mt-3 text-3xl font-semibold', accentClass(props.accent))}>{props.value}</div>
      <div className="mt-2 text-sm text-white/45">{props.note}</div>
    </div>
  );
}

function InfoTile(props: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-4',
        props.tone === 'good' && 'border-emerald-400/20 bg-emerald-400/10',
        props.tone === 'warn' && 'border-amber-300/20 bg-amber-300/10',
        !props.tone && 'border-white/10 bg-white/[0.03]'
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">{props.label}</div>
      <div className="mt-3 break-all text-sm leading-6 text-white">{props.value}</div>
    </div>
  );
}

function BarRow(props: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-sm text-white/55">{props.label}</div>
      <div className="h-2 flex-1 rounded-full bg-white/10">
        <div className="h-2 rounded-full" style={{ width: `${props.value}%`, background: props.color }} />
      </div>
      <div className="w-12 text-right text-sm text-white/45">{props.value}%</div>
    </div>
  );
}

function StatusDot(props: { status: 'done' | 'running' | 'pending' }) {
  return (
    <span
      className={cn(
        'mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
        props.status === 'done' && 'bg-emerald-400/18 text-emerald-100',
        props.status === 'running' && 'bg-amber-300/18 text-amber-50',
        props.status === 'pending' && 'bg-white/10 text-white/45'
      )}
    >
      {props.status === 'done' ? '✓' : props.status === 'running' ? '•' : '·'}
    </span>
  );
}

function PageSkeleton(props: { blocks: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: props.blocks }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
      ))}
    </div>
  );
}

function statusTone(value: '已入库' | '解析中' | '待切片') {
  if (value === '已入库') {
    return 'good' as const;
  }

  if (value === '解析中') {
    return 'warn' as const;
  }

  return 'neutral' as const;
}

function accentClass(accent: 'blue' | 'emerald' | 'lime' | 'amber') {
  if (accent === 'blue') {
    return 'text-[#8fd3ff]';
  }

  if (accent === 'emerald') {
    return 'text-[#7be3c6]';
  }

  if (accent === 'amber') {
    return 'text-[#ffd38e]';
  }

  return 'text-[#d7ff64]';
}

function pageHint(id: WorkspaceSection) {
  if (id === 'dash') return '总览';
  if (id === 'chat') return 'RAG 问答';
  if (id === 'kb') return '上传与入库';
  if (id === 'source') return '企业档案';
  if (id === 'agent') return '任务流';
  if (id === 'monitor') return 'Token 与日志';
  return 'RBAC';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '请求失败，请稍后再试。';
}

export default App;
