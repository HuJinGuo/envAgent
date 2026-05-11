import { useSessionStore } from '../store/session-store';

export type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

export type UserProfile = {
  id: number;
  username: string;
  role: string;
  dept?: string;
  status: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
};

export type SystemHealthPayload = {
  service: string;
  status: string;
  openAiBaseUrl: string;
  chatModel: string;
  embeddingModel: string;
  vectorDimensions: number;
  similarityThreshold: number;
};

export type DashboardSnapshot = {
  todayQuestions: number;
  satisfactionRate: number;
  knowledgeDocuments: number;
  newDocumentsWeek: number;
  activeAgentTasks: number;
  completedAgentTasks: number;
  todayTokenCost: number;
  monthTokenCost: number;
  recentQuestions: Array<{
    id: string;
    summary: string;
    user: string;
    timeAgo: string;
  }>;
  knowledgeUsage: Array<{
    label: string;
    percent: number;
    color: string;
  }>;
  taskStatus: Array<{
    id: string;
    label: string;
    value: string;
    note: string;
  }>;
};

export type ChatSession = {
  id: string;
  title: string;
  group: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
};

export type ReferenceCard = {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  score: number;
};

export type ChatWorkspace = {
  sessions: ChatSession[];
  scopes: Array<{
    id: string;
    label: string;
    enabled: boolean;
  }>;
  suggestions: string[];
  messages: ChatMessage[];
  references: ReferenceCard[];
};

export type KnowledgeDocument = {
  id: string;
  name: string;
  category: string;
  size: string;
  chunks: number;
  uploadedAt: string;
  status: '已入库' | '解析中' | '待切片';
};

export type KnowledgeWorkspace = {
  summary: Array<{
    id: string;
    label: string;
    value: string;
    note: string;
  }>;
  categories: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  documents: KnowledgeDocument[];
};

export type EnterpriseRecord = {
  id: string;
  name: string;
  industry: string;
  licenseCode: string;
  permits: number;
  devices: number;
  riskLevel: '一般' | '重点';
  permitStatus: '有效' | '即将到期';
  monitorStatus: '正常' | '超标';
  location: string;
  contacts: string;
  latestEvent: string;
  complianceNotes: string[];
};

export type SourceWorkspace = {
  enterprises: EnterpriseRecord[];
};

export type AgentWorkspace = {
  history: Array<{
    id: string;
    title: string;
    status: '完成' | '进行中';
  }>;
  flow: Array<{
    id: string;
    label: string;
    status: 'done' | 'running' | 'pending';
    description: string;
  }>;
  logs: Array<{
    id: string;
    status: 'done' | 'running' | 'pending';
    line: string;
  }>;
  tools: Array<{
    id: string;
    name: string;
    description: string;
    status: 'available' | 'coming-soon';
  }>;
  outputPreview: string;
};

export type MonitorCallRecord = {
  id: string;
  time: string;
  user: string;
  model: string;
  type: string;
  inputTokens: number;
  outputTokens: number | null;
  duration: string;
  cost: string;
  status: '成功' | '超时';
};

export type MonitorWorkspace = {
  availability: string;
  averageLatency: string;
  todayTokens: number;
  monthCost: string;
  trend: number[];
  breakdown: Array<{
    id: string;
    label: string;
    percent: number;
    color: string;
  }>;
  recentCalls: MonitorCallRecord[];
};

export type UserRecord = {
  id: string;
  name: string;
  initials: string;
  role: '执法人员' | '监测分析员' | '管理层';
  dept: string;
  lastLogin: string;
  status: '启用' | '停用';
};

export type UsersWorkspace = {
  users: UserRecord[];
  permissions: Array<{
    module: string;
    inspector: boolean;
    analyst: boolean;
    manager: boolean;
  }>;
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(path: string) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const token = useSessionStore.getState().token;
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || payload.code !== 0) {
    const message =
      (payload && typeof payload.msg === 'string' && payload.msg) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export function fetchSystemHealth() {
  return request<SystemHealthPayload>('/api/system/health');
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchCurrentUser() {
  return request<UserProfile>('/api/v1/auth/me');
}

export function fetchDashboardSnapshot() {
  return request<DashboardSnapshot>('/api/mock/dashboard');
}

export function fetchChatWorkspace() {
  return request<ChatWorkspace>('/api/mock/chat');
}

export function fetchKnowledgeWorkspace() {
  return request<KnowledgeWorkspace>('/api/mock/knowledge');
}

export function fetchSourceWorkspace() {
  return request<SourceWorkspace>('/api/mock/source');
}

export function fetchAgentWorkspace() {
  return request<AgentWorkspace>('/api/mock/agent');
}

export function fetchMonitorWorkspace() {
  return request<MonitorWorkspace>('/api/mock/monitor');
}

export function fetchUsersWorkspace() {
  return request<UsersWorkspace>('/api/mock/users');
}
