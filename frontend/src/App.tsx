import { Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import { ChevronRight, LogOut, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  type NavigationItem,
  fetchAdminNavigation,
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
import { useSessionStore } from './store/session-store';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { EmptyState } from './components/ui/empty-state';
import { Input } from './components/ui/input';
import {
  fallbackWorkspaceRoutes,
  getWorkspaceRouteByPath,
  normalizeWorkspacePath,
  resolveWorkspaceRoute,
  type WorkspaceRouteDefinition,
  type WorkspaceRouteKey
} from './lib/workspace-routes';
import { getErrorMessage, PageSkeleton, TopStat } from './pages/shared';

type VisibleNavigationItem = {
  id: string;
  label: string;
  path: string;
  route: WorkspaceRouteDefinition;
  children: VisibleNavigationItem[];
  sortOrder: number;
};

type WorkspaceRenderContext = {
  dashboardQuery: any;
  healthQuery: any;
  chatQuery: any;
  chatSearch: string;
  setChatSearch: (value: string) => void;
  chatSessionId: string | null;
  setChatSessionId: (id: string | null) => void;
  knowledgeQuery: any;
  sourceQuery: any;
  selectedEnterprise: unknown;
  setEnterpriseId: (id: string | null) => void;
  agentQuery: any;
  monitorQuery: any;
  usersQuery: any;
  selectedUser: unknown;
  setUserId: (id: string | null) => void;
};

const routePropBuilders: Record<WorkspaceRouteKey, (context: WorkspaceRenderContext) => Record<string, unknown>> = {
  dash: (context) => ({
    dashboard: context.dashboardQuery.data?.data,
    dashboardLoading: context.dashboardQuery.isLoading,
    dashboardError: context.dashboardQuery.error,
    health: context.healthQuery.data?.data,
    healthLoading: context.healthQuery.isLoading,
    healthError: context.healthQuery.error,
    onRefresh: () => {
      void context.dashboardQuery.refetch();
      void context.healthQuery.refetch();
    }
  }),
  chat: (context) => ({
    workspace: context.chatQuery.data?.data,
    workspaceLoading: context.chatQuery.isLoading,
    workspaceError: context.chatQuery.error,
    search: context.chatSearch,
    onSearch: context.setChatSearch,
    sessionId: context.chatSessionId,
    onSessionChange: context.setChatSessionId
  }),
  kb: (context) => ({
    data: context.knowledgeQuery.data?.data,
    isLoading: context.knowledgeQuery.isLoading,
    error: context.knowledgeQuery.error
  }),
  source: (context) => ({
    data: context.sourceQuery.data?.data,
    isLoading: context.sourceQuery.isLoading,
    error: context.sourceQuery.error,
    selectedEnterprise: context.selectedEnterprise,
    onSelect: context.setEnterpriseId
  }),
  agent: (context) => ({
    data: context.agentQuery.data?.data,
    isLoading: context.agentQuery.isLoading,
    error: context.agentQuery.error
  }),
  monitor: (context) => ({
    data: context.monitorQuery.data?.data,
    isLoading: context.monitorQuery.isLoading,
    error: context.monitorQuery.error,
    health: context.healthQuery.data?.data
  }),
  users: (context) => ({
    data: context.usersQuery.data?.data,
    isLoading: context.usersQuery.isLoading,
    error: context.usersQuery.error,
    selectedUser: context.selectedUser,
    onSelect: context.setUserId
  }),
  admin: () => ({})
};

function getCurrentPathname() {
  if (typeof window === 'undefined') {
    return '/';
  }
  return normalizeWorkspacePath(window.location.pathname, '/');
}

function navigateToPath(path: string, replace = false) {
  if (typeof window === 'undefined') {
    return;
  }
  const nextPath = normalizeWorkspacePath(path, '/');
  if (window.location.pathname === nextPath) {
    return;
  }
  window.history[replace ? 'replaceState' : 'pushState'](null, '', nextPath);
  window.dispatchEvent(new Event('codex:navigate'));
}

function canAccessRoles(roles: string[], role?: string | null) {
  if (!roles.length) {
    return true;
  }
  return !role || roles.includes(role);
}

function isVisibleStatus(status: string) {
  return !['DISABLED', 'INACTIVE', 'DELETED'].includes(status.trim().toUpperCase());
}

function flattenNavigationItems(items: VisibleNavigationItem[]): VisibleNavigationItem[] {
  const flattened: VisibleNavigationItem[] = [];
  for (const item of items) {
    flattened.push(item);
    if (item.children.length) {
      flattened.push(...flattenNavigationItems(item.children));
    }
  }
  return flattened;
}

function resolveNavigationTree(items: NavigationItem[], role?: string | null): VisibleNavigationItem[] {
  return items
    .map((item) => {
      const route = resolveWorkspaceRoute(item.section);
      if (!route || !item.visible || !isVisibleStatus(item.status) || !canAccessRoles(item.roles, role)) {
        return null;
      }

      return {
        id: item.id,
        label: item.label || item.name || route.meta.label,
        path: normalizeWorkspacePath(item.path, route.defaultPath),
        route,
        sortOrder: item.sortOrder,
        children: resolveNavigationTree(item.children, role)
      } satisfies VisibleNavigationItem;
    })
    .filter((item): item is VisibleNavigationItem => Boolean(item))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildFallbackNavigation(role?: string | null) {
  return fallbackWorkspaceRoutes
    .filter((route) => canAccessRoles(route.defaultRoles, role))
    .map(
      (route, index) =>
        ({
          id: `fallback-${route.key}`,
          label: route.meta.label,
          path: route.defaultPath,
          route,
          sortOrder: index,
          children: []
        }) satisfies VisibleNavigationItem
    );
}

function useBrowserPathname() {
  const [pathname, setPathname] = useState(getCurrentPathname);

  useEffect(() => {
    const syncPathname = () => setPathname(getCurrentPathname());
    window.addEventListener('popstate', syncPathname);
    window.addEventListener('codex:navigate', syncPathname);
    return () => {
      window.removeEventListener('popstate', syncPathname);
      window.removeEventListener('codex:navigate', syncPathname);
    };
  }, []);

  return pathname;
}

function App() {
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.token);
  const storedUser = useSessionStore((state) => state.user);
  const setSession = useSessionStore((state) => state.setSession);
  const setUser = useSessionStore((state) => state.setUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const credentials = useSessionStore((state) => state.credentials);
  const setCredential = useSessionStore((state) => state.setCredential);
  const pathname = useBrowserPathname();
  const [isSwitching, startTransition] = useTransition();
  const [chatSearch, setChatSearch] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const hasSession = Boolean(token);
  const persistedRole = storedUser?.role ?? null;
  const fallbackRoute = getWorkspaceRouteByPath(pathname);
  const fallbackRouteKey = fallbackRoute?.key ?? 'dash';

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

  const navigationQuery = useQuery({
    queryKey: ['admin-navigation', token],
    queryFn: fetchAdminNavigation,
    staleTime: 60_000,
    enabled: hasSession,
    retry: false
  });

  const activeUser = meQuery.data?.data ?? storedUser;
  const activeRole = activeUser?.role ?? persistedRole;
  const fallbackNavigation = useMemo(() => buildFallbackNavigation(activeRole), [activeRole]);
  const visibleNavTree = useMemo(() => {
    if (navigationQuery.data?.data?.length) {
      const resolvedTree = resolveNavigationTree(navigationQuery.data.data, activeRole);
      if (resolvedTree.length) {
        return resolvedTree;
      }
    }
    return fallbackNavigation;
  }, [activeRole, fallbackNavigation, navigationQuery.data]);
  const visibleNavItems = useMemo(() => flattenNavigationItems(visibleNavTree), [visibleNavTree]);
  const activeNavItem = visibleNavItems.find((item) => item.path === pathname) ?? null;
  const activeRoute = activeNavItem?.route ?? fallbackRoute;
  const activeRouteKey = activeRoute?.key ?? fallbackRouteKey;

  const dashboardQuery = useQuery({
    queryKey: ['workspace-dashboard', token],
    queryFn: fetchDashboardSnapshot,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'dash'
  });

  const chatQuery = useQuery({
    queryKey: ['workspace-chat', token],
    queryFn: fetchChatWorkspace,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'chat'
  });

  const knowledgeQuery = useQuery({
    queryKey: ['workspace-knowledge', token],
    queryFn: fetchKnowledgeWorkspace,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'kb'
  });

  const sourceQuery = useQuery({
    queryKey: ['workspace-source', token],
    queryFn: fetchSourceWorkspace,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'source'
  });

  const agentQuery = useQuery({
    queryKey: ['workspace-agent', token],
    queryFn: fetchAgentWorkspace,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'agent'
  });

  const monitorQuery = useQuery({
    queryKey: ['workspace-monitor', token],
    queryFn: fetchMonitorWorkspace,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'monitor'
  });

  const usersQuery = useQuery({
    queryKey: ['workspace-users', token],
    queryFn: fetchUsersWorkspace,
    staleTime: 60_000,
    enabled: hasSession && activeRouteKey === 'users'
  });

  const clearProtectedQueries = () => {
    queryClient.removeQueries({ queryKey: ['current-user'] });
    queryClient.removeQueries({ queryKey: ['workspace-dashboard'] });
    queryClient.removeQueries({ queryKey: ['workspace-chat'] });
    queryClient.removeQueries({ queryKey: ['workspace-knowledge'] });
    queryClient.removeQueries({ queryKey: ['workspace-source'] });
    queryClient.removeQueries({ queryKey: ['workspace-agent'] });
    queryClient.removeQueries({ queryKey: ['workspace-monitor'] });
    queryClient.removeQueries({ queryKey: ['workspace-users'] });
    queryClient.removeQueries({ queryKey: ['admin-navigation'] });
    queryClient.removeQueries({ queryKey: ['admin-management'] });
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
    if (!hasSession || !visibleNavItems.length || activeNavItem) {
      return;
    }
    navigateToPath(visibleNavItems[0].path, true);
  }, [activeNavItem, hasSession, visibleNavItems]);

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

  const activeMeta = activeNavItem?.route.meta ?? activeRoute?.meta ?? fallbackWorkspaceRoutes[0].meta;
  const activeLabel = activeNavItem?.label ?? activeMeta.label;
  const ActiveComponent = activeRoute?.Component ?? null;
  const renderContext: WorkspaceRenderContext = {
    dashboardQuery,
    healthQuery,
    chatQuery,
    chatSearch,
    setChatSearch,
    chatSessionId,
    setChatSessionId,
    knowledgeQuery,
    sourceQuery,
    selectedEnterprise,
    setEnterpriseId,
    agentQuery,
    monitorQuery,
    usersQuery,
    selectedUser,
    setUserId
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
              {visibleNavTree.map((item) => (
                <SidebarNavNode
                  key={item.id}
                  item={item}
                  activePath={pathname}
                  onSelect={(path) =>
                    startTransition(() => {
                      navigateToPath(path);
                    })
                  }
                />
              ))}
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
                <Badge tone="neutral">{activeLabel}</Badge>
                <Badge tone={healthQuery.data?.data.status === 'UP' ? 'good' : 'warn'}>
                  {healthQuery.data?.data.status ?? '未连接'}
                </Badge>
                {isSwitching ? <span className="text-xs text-white/40">视图切换中</span> : null}
              </div>
              <div>
                <h1 className="font-display text-3xl text-white md:text-5xl">{activeMeta.title}</h1>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-white/58 md:text-base">{activeMeta.description}</p>
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

          {hasSession && ActiveComponent ? (
            <Suspense fallback={<PageSkeleton blocks={6} />}>
              <ActiveComponent {...routePropBuilders[activeRouteKey](renderContext)} />
            </Suspense>
          ) : null}

          {hasSession && !ActiveComponent ? (
            <EmptyState
              icon={TriangleAlert}
              title="菜单未匹配到页面"
              description={`当前路径 ${pathname} 没有对应的前端页面注册，请检查菜单管理中的 path / section / component 配置。`}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function SidebarNavNode(props: {
  item: VisibleNavigationItem;
  activePath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const depth = props.depth ?? 0;
  const active = props.activePath === props.item.path;

  return (
    <div className="space-y-2">
      <SidebarNavButton
        route={props.item.route}
        label={props.item.label}
        hint={props.item.path}
        active={active}
        depth={depth}
        onSelect={() => props.onSelect(props.item.path)}
      />
      {props.item.children.length ? (
        <div className="space-y-2">
          {props.item.children.map((child) => (
            <SidebarNavNode
              key={child.id}
              item={child}
              depth={depth + 1}
              activePath={props.activePath}
              onSelect={props.onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNavButton(props: {
  route: WorkspaceRouteDefinition;
  label: string;
  hint: string;
  active: boolean;
  onSelect: () => void;
  depth?: number;
}) {
  const Icon = props.route.meta.icon;
  return (
    <button
      type="button"
      onClick={props.onSelect}
      className={cn(
        'flex min-w-[198px] items-center justify-between rounded-2xl border px-3 py-3 text-left transition md:w-full md:min-w-0',
        props.active
          ? 'border-[#d7ff64]/50 bg-[#d7ff64]/12 text-white'
          : 'border-white/10 bg-white/[0.03] text-white/68 hover:border-white/18 hover:bg-white/[0.05]'
      )}
      style={{ marginLeft: (props.depth ?? 0) * 14 }}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20">
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-medium">{props.label}</span>
          <span className="block text-xs text-white/42">{props.hint}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </button>
  );
}

export default App;
