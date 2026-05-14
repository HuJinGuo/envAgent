import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  BarChart3,
  Bot,
  Building2,
  Database,
  Gauge,
  MessageSquareText,
  Settings,
  Users,
  type LucideIcon
} from 'lucide-react';

export type WorkspaceRouteKey = 'dash' | 'chat' | 'kb' | 'source' | 'agent' | 'monitor' | 'users' | 'admin';

export type WorkspaceRouteDefinition = {
  key: WorkspaceRouteKey;
  componentName: string;
  aliases?: string[];
  defaultPath: string;
  defaultRoles: string[];
  meta: {
    label: string;
    title: string;
    description: string;
    icon: LucideIcon;
    hint: string;
  };
  Component: LazyExoticComponent<ComponentType<any>>;
};

const DashboardPage = lazy(() => import('../pages/dashboard-page').then((module) => ({ default: module.DashboardPage })));
const ChatPage = lazy(() => import('../pages/chat-page').then((module) => ({ default: module.ChatPage })));
const KnowledgePage = lazy(() => import('../pages/knowledge-page').then((module) => ({ default: module.KnowledgePage })));
const SourcePage = lazy(() => import('../pages/source-page').then((module) => ({ default: module.SourcePage })));
const AgentPage = lazy(() => import('../pages/agent-page').then((module) => ({ default: module.AgentPage })));
const MonitorPage = lazy(() => import('../pages/monitor-page').then((module) => ({ default: module.MonitorPage })));
const UsersPage = lazy(() => import('../pages/users-page').then((module) => ({ default: module.UsersPage })));
const AdminPage = lazy(() => import('../pages/admin-page').then((module) => ({ default: module.AdminPage })));

export const workspaceRouteRegistry: Record<WorkspaceRouteKey, WorkspaceRouteDefinition> = {
  dash: {
    key: 'dash',
    componentName: 'DashboardView',
    aliases: ['DashView'],
    defaultPath: '/dashboard',
    defaultRoles: ['INSPECTOR', 'ANALYST', 'ADMIN'],
    meta: {
      label: '仪表盘',
      title: '环境监管工作台概览',
      description: '汇总问答、知识库、Agent 与系统状态，先承接 MVP 与二期功能的全局入口。',
      icon: Gauge,
      hint: '总览'
    },
    Component: DashboardPage
  },
  chat: {
    key: 'chat',
    componentName: 'ChatView',
    defaultPath: '/chat',
    defaultRoles: ['INSPECTOR', 'ANALYST', 'ADMIN'],
    meta: {
      label: '智能问答',
      title: 'RAG 问答主工作区',
      description: '保留会话、知识库范围、引用来源和输入面板，按文档要求为后续 SSE 对话预留结构。',
      icon: MessageSquareText,
      hint: 'RAG 问答'
    },
    Component: ChatPage
  },
  kb: {
    key: 'kb',
    componentName: 'KnowledgeView',
    defaultPath: '/knowledge',
    defaultRoles: ['ANALYST', 'ADMIN'],
    meta: {
      label: '知识库',
      title: '知识库管理与上传',
      description: '围绕文档上传、切片、向量化与状态跟踪组织页面，支撑知识入库与检索管理。',
      icon: Database,
      hint: '上传与入库'
    },
    Component: KnowledgePage
  },
  source: {
    key: 'source',
    componentName: 'SourceView',
    defaultPath: '/source',
    defaultRoles: ['INSPECTOR', 'ANALYST', 'ADMIN'],
    meta: {
      label: '污染源档案',
      title: '企业档案与监测风险',
      description: '把企业许可、在线监测、风险等级和合规备注编排成执法与分析共用的档案页。',
      icon: Building2,
      hint: '企业档案'
    },
    Component: SourcePage
  },
  agent: {
    key: 'agent',
    componentName: 'AgentView',
    defaultPath: '/agent',
    defaultRoles: ['ANALYST', 'ADMIN'],
    meta: {
      label: 'Agent 任务',
      title: 'Agent 任务工作台',
      description: '聚焦任务发起、执行流、工具可用性和输出预览，贴合三期规划中的工具调用框架。',
      icon: Bot,
      hint: '任务流'
    },
    Component: AgentPage
  },
  monitor: {
    key: 'monitor',
    componentName: 'MonitorView',
    defaultPath: '/monitor',
    defaultRoles: ['ADMIN'],
    meta: {
      label: '系统监控',
      title: '模型调用与服务监控',
      description: '围绕 Token、调用记录、可用性和响应时延组织，后续可直接替换为真实观测接口。',
      icon: BarChart3,
      hint: 'Token 与日志'
    },
    Component: MonitorPage
  },
  users: {
    key: 'users',
    componentName: 'UsersView',
    defaultPath: '/admin/users',
    defaultRoles: ['ADMIN'],
    meta: {
      label: '用户管理',
      title: '用户与权限矩阵',
      description: '以角色权限为主线呈现内部使用者结构，服务管理层对权限边界的确认。',
      icon: Users,
      hint: 'RBAC'
    },
    Component: UsersPage
  },
  admin: {
    key: 'admin',
    componentName: 'AdminView',
    defaultPath: '/admin/roles',
    defaultRoles: ['ADMIN'],
    meta: {
      label: '基础管理',
      title: '基础管理配置中心',
      description: '集中维护角色、菜单、知识库、厂商和模型配置，为后端可配置导航与权限体系预留接口。',
      icon: Settings,
      hint: '配置中心'
    },
    Component: AdminPage
  }
};

const workspaceRouteKeys = Object.keys(workspaceRouteRegistry) as WorkspaceRouteKey[];
const componentRouteRegistry = workspaceRouteKeys.reduce<Record<string, WorkspaceRouteDefinition>>((accumulator, key) => {
  const route = workspaceRouteRegistry[key];
  accumulator[route.componentName.toLowerCase()] = route;
  for (const alias of route.aliases ?? []) {
    accumulator[alias.toLowerCase()] = route;
  }
  return accumulator;
}, {});

export const fallbackWorkspaceRoutes = workspaceRouteKeys.map((key) => workspaceRouteRegistry[key]);

export function isWorkspaceRouteKey(value: string): value is WorkspaceRouteKey {
  return workspaceRouteKeys.includes(value as WorkspaceRouteKey);
}

export function normalizeWorkspaceSection(value: string) {
  const normalized = value.trim();
  if (normalized === 'dashboard') {
    return 'dash';
  }
  if (normalized === 'knowledge') {
    return 'kb';
  }
  return normalized;
}

export function normalizeWorkspacePath(path: string | null | undefined, fallback = '/') {
  const raw = (path ?? '').trim() || fallback;
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  if (withLeadingSlash === '/') {
    return '/';
  }
  return withLeadingSlash.replace(/\/+$/, '');
}

export function getWorkspaceRouteByPath(path: string) {
  const normalizedPath = normalizeWorkspacePath(path, '/');
  return fallbackWorkspaceRoutes.find((route) => normalizeWorkspacePath(route.defaultPath) === normalizedPath) ?? null;
}

export function resolveWorkspaceRoute(section?: string | null, component?: string | null) {
  const normalizedSection = normalizeWorkspaceSection(section ?? '');
  const componentKey = (component ?? '').trim().toLowerCase();
  if (componentKey && componentRouteRegistry[componentKey]) {
    return componentRouteRegistry[componentKey];
  }
  if (isWorkspaceRouteKey(normalizedSection)) {
    return workspaceRouteRegistry[normalizedSection];
  }
  return null;
}
