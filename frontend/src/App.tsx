import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  BarChart3,
  Bot,
  Building2,
  ChevronRight,
  Database,
  Gauge,
  LogOut,
  MessageSquareText,
  ShieldCheck,
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
  type LoginRequest
} from './lib/api';
import { cn } from './lib/utils';
import { useSessionStore, type WorkspaceSection } from './store/session-store';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { EmptyState } from './components/ui/empty-state';
import { Input } from './components/ui/input';
import { DashboardPage } from './pages/dashboard-page';
import { ChatPage } from './pages/chat-page';
import { KnowledgePage } from './pages/knowledge-page';
import { SourcePage } from './pages/source-page';
import { AgentPage } from './pages/agent-page';
import { MonitorPage } from './pages/monitor-page';
import { UsersPage } from './pages/users-page';
import { getErrorMessage, TopStat } from './pages/shared';

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
    description: '围绕文档上传、切片、向量化与状态跟踪组织页面，支撑知识入库与检索管理。',
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

const sectionRoles: Record<WorkspaceSection, Array<'INSPECTOR' | 'ANALYST' | 'ADMIN'>> = {
  dash: ['INSPECTOR', 'ANALYST', 'ADMIN'],
  chat: ['INSPECTOR', 'ANALYST', 'ADMIN'],
  kb: ['ANALYST', 'ADMIN'],
  source: ['INSPECTOR', 'ANALYST', 'ADMIN'],
  agent: ['ANALYST', 'ADMIN'],
  monitor: ['ADMIN'],
  users: ['ADMIN']
};

function isWorkspaceSection(value: string): value is WorkspaceSection {
  return value in pageMeta;
}

function canAccessSection(section: WorkspaceSection, role?: string | null) {
  return !role || sectionRoles[section].includes(role as 'INSPECTOR' | 'ANALYST' | 'ADMIN');
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
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const hasSession = Boolean(token);
  const sessionRole = storedUser?.role ?? null;

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    staleTime: 60_000
  });

  const meQuery = useQuery({
    queryKey: ['current-user', token],
    queryFn: fetchCurrentUser,
    enabled: hasSession,
    retry: false
  });

  const dashboardQuery = useQuery({
    queryKey: ['workspace-dashboard', token],
    queryFn: fetchDashboardSnapshot,
    staleTime: 60_000,
    enabled: hasSession
  });

  const chatQuery = useQuery({
    queryKey: ['workspace-chat', token],
    queryFn: fetchChatWorkspace,
    staleTime: 60_000,
    enabled: hasSession
  });

  const knowledgeQuery = useQuery({
    queryKey: ['workspace-knowledge', token],
    queryFn: fetchKnowledgeWorkspace,
    staleTime: 60_000,
    enabled: hasSession && canAccessSection('kb', sessionRole)
  });

  const sourceQuery = useQuery({
    queryKey: ['workspace-source', token],
    queryFn: fetchSourceWorkspace,
    staleTime: 60_000,
    enabled: hasSession
  });

  const agentQuery = useQuery({
    queryKey: ['workspace-agent', token],
    queryFn: fetchAgentWorkspace,
    staleTime: 60_000,
    enabled: hasSession && canAccessSection('agent', sessionRole)
  });

  const monitorQuery = useQuery({
    queryKey: ['workspace-monitor', token],
    queryFn: fetchMonitorWorkspace,
    staleTime: 60_000,
    enabled: hasSession && canAccessSection('monitor', sessionRole)
  });

  const usersQuery = useQuery({
    queryKey: ['workspace-users', token],
    queryFn: fetchUsersWorkspace,
    staleTime: 60_000,
    enabled: hasSession && canAccessSection('users', sessionRole)
  });

  const activeUser = meQuery.data?.data ?? storedUser;
  const activeRole = activeUser?.role ?? null;
  const activeSection = isWorkspaceSection(selectedSection) ? selectedSection : 'dash';
  const visibleNavItems = navItems.filter((item) => canAccessSection(item, activeRole));

  const clearProtectedQueries = () => {
    queryClient.removeQueries({ queryKey: ['current-user'] });
    queryClient.removeQueries({ queryKey: ['workspace-dashboard'] });
    queryClient.removeQueries({ queryKey: ['workspace-chat'] });
    queryClient.removeQueries({ queryKey: ['workspace-knowledge'] });
    queryClient.removeQueries({ queryKey: ['workspace-source'] });
    queryClient.removeQueries({ queryKey: ['workspace-agent'] });
    queryClient.removeQueries({ queryKey: ['workspace-monitor'] });
    queryClient.removeQueries({ queryKey: ['workspace-users'] });
    queryClient.removeQueries({ queryKey: ['conversations'] });
    queryClient.removeQueries({ queryKey: ['conversation-messages'] });
    queryClient.removeQueries({ queryKey: ['knowledge-bases'] });
    queryClient.removeQueries({ queryKey: ['documents'] });
  };

  useEffect(() => {
    if (meQuery.data?.data) {
      setUser(meQuery.data.data);
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      clearProtectedQueries();
      clearSession();
    }
  }, [clearProtectedQueries, clearSession, meQuery.error]);

  useEffect(() => {
    if (!hasSession) {
      setChatSessionId(null);
      setEnterpriseId(null);
      setUserId(null);
    }
  }, [hasSession]);

  useEffect(() => {
    if (!canAccessSection(activeSection, activeRole) && visibleNavItems.length) {
      setSelectedSection(visibleNavItems[0]);
    }
  }, [activeRole, activeSection, setSelectedSection, visibleNavItems]);

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
      void queryClient.invalidateQueries({ queryKey: ['workspace-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-chat'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-knowledge'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-source'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-agent'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-monitor'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-users'] });
    }
  });
  const meta = pageMeta[activeSection];

  const selectedEnterprise = useMemo(() => {
    const enterprises = sourceQuery.data?.data.enterprises ?? [];
    return enterprises.find((item) => item.id === enterpriseId) ?? enterprises[0] ?? null;
  }, [enterpriseId, sourceQuery.data]);

  const selectedUser = useMemo(() => {
    const users = usersQuery.data?.data.users ?? [];
    return users.find((item) => item.id === userId) ?? users[0] ?? null;
  }, [userId, usersQuery.data]);

  const handleLogout = () => {
    clearSession();
    clearProtectedQueries();
  };

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
              {visibleNavItems.map((id) => {
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

          <div className="mt-5 space-y-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-4 md:mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.22em] text-white/40">账户</span>
              <Badge tone={activeUser ? 'good' : 'neutral'}>{activeUser ? '已登录' : '待认证'}</Badge>
            </div>
            {activeUser ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{activeUser.username}</div>
                    <div className="text-xs text-white/55">{activeUser.role}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
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
          {!hasSession ? (
            <EmptyState
              icon={ShieldCheck}
              title="请先登录"
              description="完成认证后即可进入环境监管工作区。"
            />
          ) : null}

          {hasSession && activeSection === 'dash' ? (
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

          {hasSession && activeSection === 'chat' ? (
            <ChatPage
              workspace={chatQuery.data?.data}
              workspaceLoading={chatQuery.isLoading}
              workspaceError={chatQuery.error}
              search={chatSearch}
              onSearch={setChatSearch}
              sessionId={chatSessionId}
              onSessionChange={setChatSessionId}
            />
          ) : null}

          {hasSession && activeSection === 'kb' ? (
            <KnowledgePage
              data={knowledgeQuery.data?.data}
              isLoading={knowledgeQuery.isLoading}
              error={knowledgeQuery.error}
            />
          ) : null}

          {hasSession && activeSection === 'source' ? (
            <SourcePage
              data={sourceQuery.data?.data}
              isLoading={sourceQuery.isLoading}
              error={sourceQuery.error}
              selectedEnterprise={selectedEnterprise}
              onSelect={setEnterpriseId}
            />
          ) : null}

          {hasSession && activeSection === 'agent' ? (
            <AgentPage data={agentQuery.data?.data} isLoading={agentQuery.isLoading} error={agentQuery.error} />
          ) : null}

          {hasSession && activeSection === 'monitor' ? (
            <MonitorPage
              data={monitorQuery.data?.data}
              isLoading={monitorQuery.isLoading}
              error={monitorQuery.error}
              health={healthQuery.data?.data}
            />
          ) : null}

          {hasSession && activeSection === 'users' ? (
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


function pageHint(id: WorkspaceSection) {
  if (id === 'dash') return '总览';
  if (id === 'chat') return 'RAG 问答';
  if (id === 'kb') return '上传与入库';
  if (id === 'source') return '企业档案';
  if (id === 'agent') return '任务流';
  if (id === 'monitor') return 'Token 与日志';
  return 'RBAC';
}

export default App;

