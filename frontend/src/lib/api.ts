import { useSessionStore } from '../store/session-store';

export type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

export type ApiMode = 'real' | 'mock';

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

export type ConversationRecord = {
  id: string;
  title: string;
  group: string;
  updatedAt: string;
  preview?: string;
};

export type ChatSession = ConversationRecord;

export type ReferenceCard = {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  score: number;
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  citations?: string[];
  sources?: ReferenceCard[];
  reasoning?: string;
};

export type ChatMessage = ConversationMessage;

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

export type KnowledgeBase = {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type KnowledgeDocument = {
  id: string;
  name: string;
  category: string;
  size: string;
  sizeBytes: number | null;
  chunks: number;
  uploadedAt: string;
  updatedAt?: string;
  status: string;
  statusLabel: string;
  isTerminal: boolean;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  errorMessage?: string;
};

export type KnowledgeDocumentChunk = {
  id: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  chunkType: string;
  pageNo?: number | null;
  headingPath: string[];
  metadataJson: string;
  embeddingDimensions: number;
  embeddingPreview: string;
  createdAt?: string;
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

export type DocumentListParams = {
  knowledgeBaseId?: string;
};

export type UploadDocumentsRequest = {
  files: File[];
  knowledgeBaseId?: string;
};

export type UploadDocumentsResponse = {
  documents: KnowledgeDocument[];
};

export type ConversationCreateRequest = {
  title?: string;
};

export type ConversationRenameRequest = {
  title: string;
};

export type SendConversationMessageRequest = {
  content: string;
  knowledgeBaseIds?: string[];
};

export type StreamConversationHandlers = {
  onDelta?: (delta: string) => void;
  onSources?: (sources: ReferenceCard[]) => void;
  onReasoning?: (reasoning: string) => void;
  onDone?: (payload?: unknown) => void;
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
  tools: Array<{
    id: string;
    name: string;
    description: string;
    status: 'available' | 'coming-soon';
  }>;
};

export type AgentTaskStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

export type AgentTask = {
  id: string;
  instruction: string;
  status: AgentTaskStatus;
  currentStep: string | null;
  output: string | null;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentTaskLog = {
  id: string;
  taskId: string;
  step: string;
  status: string;
  line: string;
  createdAt: string;
};

export type AgentTaskDetail = {
  task: AgentTask;
  logs: AgentTaskLog[];
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

export type NavigationItem = {
  id: string;
  code: string;
  name: string;
  label: string;
  path: string;
  section: string;
  icon: string;
  component: string;
  redirect: string;
  sortOrder: number;
  status: string;
  visible: boolean;
  roles: string[];
  parentId?: string;
  children: NavigationItem[];
};

export type AdminRoleRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  sortOrder: number;
  menuIds: string[];
};

export type AdminMenuRecord = {
  id: string;
  code: string;
  name: string;
  title: string;
  path: string;
  section: string;
  icon: string;
  parentId: string;
  sortOrder: number;
  status: string;
  visible: boolean;
  roles: string[];
  component: string;
  redirect: string;
  children: AdminMenuRecord[];
};

export type AdminUserRecord = {
  id: string;
  username: string;
  roleCode: string;
  roleName: string;
  dept: string;
  status: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminKnowledgeBaseRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  sortOrder: number;
  documentCount: number;
};

export type AdminVendorRecord = {
  id: string;
  code: string;
  name: string;
  endpoint: string;
  apiKeyMasked: string;
  description: string;
  status: string;
  sortOrder: number;
};

export type AdminDictionaryRecord = {
  id: string;
  dictType: string;
  dictLabel: string;
  dictValue: string;
  description: string;
  status: string;
  sortOrder: number;
};

export type AdminModelRecord = {
  id: string;
  code: string;
  name: string;
  vendorId: string;
  vendorName: string;
  modelType: string;
  contextWindow: number;
  status: string;
  sortOrder: number;
};

export type AdminToolRecord = {
  id: string;
  name: string;
  description: string;
  parametersSchema: string;
  toolGroup: string;
  tags: string[];
  version: string;
  status: string;
  embeddingStatus: string;
  embeddingError: string;
  hitCount: number;
  callCount: number;
  successCount: number;
  successRate: number;
  roleIds: string[];
  roleCodes: string[];
  roleNames: string[];
  createdAt: string;
  updatedAt: string;
};

export type ToolSearchResult = {
  id: string;
  name: string;
  toolGroup: string;
  description: string;
  similarity: number;
  embeddingStatus: string;
  roleCodes: string[];
  roleNames: string[];
  tags: string[];
};

export type AdminStationRecord = {
  id: string;
  stationId: string;
  mn: string;
  lat: number;
  lng: number;
  mnName: string;
  st: number;
};

export type AdminMonitorDataRecord = {
  id: string;
  mn: string;
  paramCode: string;
  paramName: string;
  value: number;
  dataTime: string;
};

export type MonitorParamTemplate = {
  paramCode: string;
  paramName: string;
  minValue: number;
  maxValue: number;
};

export type AdminUpsertPayload = Record<string, unknown>;

export class ApiError extends Error {
  status: number;
  path: string;
  payload?: unknown;

  constructor(message: string, status: number, path: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.payload = payload;
  }
}

export const apiRoutes = {
  systemHealth: '/api/system/health',
  login: '/api/v1/auth/login',
  currentUser: '/api/v1/auth/me',
  knowledgeBases: '/api/v1/knowledge-bases',
  documents: '/api/v1/documents',
  documentsUpload: '/api/v1/documents/upload',
  conversations: '/api/v1/conversations',
  agentTasks: '/api/v1/agent/tasks',
  agentTools: '/api/v1/agent/tools',
  admin: {
    navigation: '/api/v1/admin/navigation',
    users: '/api/v1/admin/users',
    roles: '/api/v1/admin/roles',
    menus: '/api/v1/admin/menus',
    knowledgeBases: '/api/v1/admin/knowledge-bases',
    vendors: '/api/v1/admin/vendors',
    models: '/api/v1/admin/models',
    dictItems: '/api/v1/admin/dict-items'
  },
  agent: {
    tools: '/api/v1/agent/tools',
    toolSearch: '/api/v1/agent/tools/test-search'
  },
  business: {
    stations: '/api/v1/business/stations',
    monitorData: '/api/v1/business/monitor-data',
    monitorDataParams: '/api/v1/business/monitor-data/params',
    monitorDataSimulate: '/api/v1/business/monitor-data/simulate'
  },
  workspaces: {
    dashboard: '/api/v1/workspaces/dashboard',
    chat: '/api/v1/workspaces/chat',
    knowledge: '/api/v1/workspaces/knowledge',
    source: '/api/v1/workspaces/source',
    agent: '/api/v1/workspaces/agent',
    monitor: '/api/v1/workspaces/monitor',
    users: '/api/v1/workspaces/users'
  }
} as const;

function resolveApiMode(value: string | undefined): ApiMode {
  return value === 'mock' ? 'mock' : 'real';
}

export function getApiMode() {
  return resolveApiMode(import.meta.env.VITE_API_MODE);
}

export function isMockApiMode() {
  return getApiMode() === 'mock';
}

function buildUrl(path: string) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function buildHeaders(init?: RequestInit) {
  const token = useSessionStore.getState().token;
  const headers = new Headers(init?.headers);
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (!headers.has('Content-Type') && init?.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    return response.text().then(parseJsonWithSafeIds).catch(() => null);
  }

  if (contentType.startsWith('text/')) {
    return response.text().catch(() => null);
  }

  return response.text().catch(() => null);
}

function parseJsonWithSafeIds(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(protectLargeNumericIds(text)) as unknown;
  } catch {
    return null;
  }
}

function protectLargeNumericIds(text: string) {
  return text.replace(
    /("(?:(?:[A-Za-z0-9_]*[iI]d)|id)"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g,
    '$1"$2"'
  );
}

function isApiEnvelope<T>(payload: unknown): payload is ApiResponse<T> {
  const record = asRecord(payload);
  return Boolean(record && 'code' in record && 'data' in record);
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: buildHeaders(init)
  });

  const payload = await parseResponseBody(response);
  const envelope = isApiEnvelope<T>(payload)
    ? payload
    : response.ok
      ? ({
          code: 0,
          msg: 'ok',
          data: payload as T
        } satisfies ApiResponse<T>)
      : null;

  if (!response.ok || !envelope || envelope.code !== 0) {
    const message = getRequestErrorMessage(path, response.status, envelope ?? payload);
    throw new ApiError(message, response.status, path, envelope ?? payload);
  }

  return envelope;
}

async function requestNormalized<T>(path: string, normalize: (value: unknown) => T, init?: RequestInit) {
  const response = await request<unknown>(path, init);
  return {
    ...response,
    data: normalize(response.data)
  } satisfies ApiResponse<T>;
}

function documentDetailPath(id: string) {
  return `${apiRoutes.documents}/${id}`;
}

function documentStatusPath(id: string) {
  return `${apiRoutes.documents}/${id}/status`;
}

function documentChunksPath(id: string) {
  return `${apiRoutes.documents}/${id}/chunks`;
}

function conversationPath(id: string) {
  return `${apiRoutes.conversations}/${id}`;
}

function conversationTitlePath(id: string) {
  return `${conversationPath(id)}/title`;
}

function conversationMessagesPath(id: string) {
  return `${conversationPath(id)}/messages`;
}

export function fetchSystemHealth() {
  return request<SystemHealthPayload>(apiRoutes.systemHealth);
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>(apiRoutes.login, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchCurrentUser() {
  return request<UserProfile>(apiRoutes.currentUser);
}

export function fetchDashboardSnapshot() {
  return request<DashboardSnapshot>(apiRoutes.workspaces.dashboard);
}

export function fetchChatWorkspace() {
  return request<ChatWorkspace>(apiRoutes.workspaces.chat);
}

export function fetchKnowledgeWorkspace() {
  return request<KnowledgeWorkspace>(apiRoutes.workspaces.knowledge);
}

export function fetchKnowledgeBases() {
  return requestNormalized<KnowledgeBase[]>(apiRoutes.knowledgeBases, normalizeKnowledgeBaseList);
}

export function fetchDocuments(params?: DocumentListParams) {
  const searchParams = new URLSearchParams();

  if (params?.knowledgeBaseId) {
    searchParams.set('knowledgeBaseId', params.knowledgeBaseId);
  }

  const path = searchParams.size ? `${apiRoutes.documents}?${searchParams.toString()}` : apiRoutes.documents;
  return requestNormalized<KnowledgeDocument[]>(path, normalizeKnowledgeDocumentList);
}

export function uploadDocuments(payload: UploadDocumentsRequest) {
  const uploads = payload.files.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    if (payload.knowledgeBaseId) {
      formData.append('kbId', payload.knowledgeBaseId);
    }

    const response = await requestNormalized<KnowledgeDocument>(
      apiRoutes.documentsUpload,
      normalizeKnowledgeDocument,
      {
        method: 'POST',
        body: formData
      }
    );

    return response.data;
  });

  return Promise.all(uploads).then((documents) => ({
    code: 0,
    msg: 'ok',
    data: { documents }
  } satisfies ApiResponse<UploadDocumentsResponse>));
}

export function fetchDocumentDetail(id: string) {
  return requestNormalized<KnowledgeDocument>(documentDetailPath(id), normalizeKnowledgeDocument);
}

export function fetchDocumentStatus(id: string) {
  return requestNormalized<KnowledgeDocument>(documentStatusPath(id), normalizeKnowledgeDocument);
}

export function fetchDocumentChunks(id: string) {
  return requestNormalized<KnowledgeDocumentChunk[]>(documentChunksPath(id), normalizeKnowledgeDocumentChunkList);
}

export function deleteDocument(id: string) {
  return request<null>(documentDetailPath(id), {
    method: 'DELETE'
  });
}

export function fetchConversations() {
  return requestNormalized<ConversationRecord[]>(apiRoutes.conversations, normalizeConversationList);
}

export function createConversation(payload: ConversationCreateRequest = {}) {
  return requestNormalized<ConversationRecord>(
    apiRoutes.conversations,
    normalizeConversation,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export function renameConversation(id: string, payload: ConversationRenameRequest) {
  return requestNormalized<ConversationRecord>(
    conversationTitlePath(id),
    normalizeConversation,
    {
      method: 'PUT',
      body: JSON.stringify(payload)
    }
  );
}

export function deleteConversation(id: string) {
  return request<null>(conversationPath(id), {
    method: 'DELETE'
  });
}

export function fetchConversationMessages(id: string) {
  return requestNormalized<ConversationMessage[]>(conversationMessagesPath(id), normalizeConversationMessageList);
}

export async function streamConversationMessage(
  conversationId: string,
  payload: SendConversationMessageRequest,
  handlers: StreamConversationHandlers = {},
  signal?: AbortSignal
) {
  const response = await fetch(buildUrl(conversationMessagesPath(conversationId)), {
    method: 'POST',
    headers: buildHeaders({
      headers: {
        Accept: 'text/event-stream'
      },
      body: JSON.stringify(payload)
    }),
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const body = await parseResponseBody(response);
    throw new ApiError(
      getRequestErrorMessage(conversationMessagesPath(conversationId), response.status, body),
      response.status,
      conversationMessagesPath(conversationId),
      body
    );
  }

  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await response.json().catch(() => null);
    const data = isApiEnvelope(body) ? body.data : body;
    const delta = extractDelta(data);
    const sources = normalizeReferenceList(extractSources(data));
    const reasoning = extractReasoning(data);

    if (delta) {
      handlers.onDelta?.(delta);
    }
    if (sources.length) {
      handlers.onSources?.(sources);
    }
    if (reasoning) {
      handlers.onReasoning?.(reasoning);
    }

    handlers.onDone?.(data);
    return;
  }

  if (!response.body) {
    handlers.onDone?.();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const event = parseSseEvent(part);
      if (!event) {
        continue;
      }

      if (event.event === 'sources' || event.event === 'references') {
        handlers.onSources?.(normalizeReferenceList(extractSources(event.data)));
        continue;
      }

      if (event.event === 'reasoning' || event.event === 'thinking' || event.event === 'thought') {
        const reasoning = extractReasoning(event.data);
        if (reasoning) {
          handlers.onReasoning?.(reasoning);
        }
        continue;
      }

      if (event.event === 'done') {
        handlers.onDone?.(event.data);
        continue;
      }

      if (event.event === 'error') {
        throw new ApiError(extractErrorMessage(event.data), response.status, conversationMessagesPath(conversationId), event.data);
      }

      const nextSources = normalizeReferenceList(extractSources(event.data));
      if (nextSources.length) {
        handlers.onSources?.(nextSources);
        continue;
      }

      const delta = extractDelta(event.data);
      if (delta) {
        handlers.onDelta?.(delta);
        continue;
      }

      const reasoning = extractReasoning(event.data);
      if (reasoning) {
        handlers.onReasoning?.(reasoning);
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer);
    if (event?.event === 'sources' || event?.event === 'references') {
      handlers.onSources?.(normalizeReferenceList(extractSources(event.data)));
    } else if (event?.event === 'done') {
      handlers.onDone?.(event.data);
    } else if (event?.event === 'reasoning' || event?.event === 'thinking' || event?.event === 'thought') {
      const reasoning = extractReasoning(event.data);
      if (reasoning) {
        handlers.onReasoning?.(reasoning);
      }
    } else {
      const nextSources = normalizeReferenceList(extractSources(event?.data));
      if (nextSources.length) {
        handlers.onSources?.(nextSources);
      } else {
        const delta = extractDelta(event?.data);
        if (delta) {
          handlers.onDelta?.(delta);
        } else {
          const reasoning = extractReasoning(event?.data);
          if (reasoning) {
            handlers.onReasoning?.(reasoning);
          }
        }
      }
    }
  } else {
    handlers.onDone?.();
  }
}

export function fetchSourceWorkspace() {
  return request<SourceWorkspace>(apiRoutes.workspaces.source);
}

export function fetchAgentWorkspace() {
  return request<AgentWorkspace>(apiRoutes.workspaces.agent);
}

export function fetchAgentTasks() {
  return request<AgentTask[]>(apiRoutes.agentTasks);
}

export function fetchAgentTaskDetail(taskId: string) {
  return request<AgentTaskDetail>(`${apiRoutes.agentTasks}/${taskId}`);
}

export function createAgentTask(instruction: string) {
  return request<AgentTask>(apiRoutes.agentTasks, {
    method: 'POST',
    body: JSON.stringify({ instruction })
  });
}

export async function streamAgentTask(
  taskId: string,
  handlers: {
    onLog?: (log: AgentTaskLog) => void;
    onDone?: (output: string | null) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal
) {
  const response = await fetch(buildUrl(`${apiRoutes.agentTasks}/${taskId}/stream`), {
    method: 'GET',
    headers: buildHeaders({ headers: { Accept: 'text/event-stream' } }),
    signal
  });

  if (!response.ok || !response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const event = parseSseEvent(part);
      if (!event) continue;

      if (event.event === 'log') {
        handlers.onLog?.(event.data as AgentTaskLog);
      } else if (event.event === 'done') {
        const payload = event.data as { output?: string | null } | null;
        handlers.onDone?.(payload?.output ?? null);
        return;
      } else if (event.event === 'error') {
        const payload = event.data as { message?: string } | null;
        handlers.onError?.(payload?.message ?? 'unknown error');
        return;
      }
    }
  }
}

export function fetchMonitorWorkspace() {
  return request<MonitorWorkspace>(apiRoutes.workspaces.monitor);
}

export function fetchUsersWorkspace() {
  return request<UsersWorkspace>(apiRoutes.workspaces.users);
}

export function fetchAdminNavigation() {
  return requestNormalized<NavigationItem[]>(apiRoutes.admin.navigation, normalizeNavigationList);
}

export function fetchAdminUsers() {
  return requestNormalized<AdminUserRecord[]>(apiRoutes.admin.users, normalizeAdminUserList);
}

export function createAdminUser(payload: AdminUpsertPayload) {
  return requestNormalized<AdminUserRecord>(apiRoutes.admin.users, normalizeAdminUser, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminUser(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminUserRecord>(adminResourcePath(apiRoutes.admin.users, id), normalizeAdminUser, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminUser(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.users, id), {
    method: 'DELETE'
  });
}

export function fetchAdminRoles() {
  return requestNormalized<AdminRoleRecord[]>(apiRoutes.admin.roles, normalizeAdminRoleList);
}

export function createAdminRole(payload: AdminUpsertPayload) {
  return requestNormalized<AdminRoleRecord>(apiRoutes.admin.roles, normalizeAdminRole, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminRole(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminRoleRecord>(adminResourcePath(apiRoutes.admin.roles, id), normalizeAdminRole, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminRole(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.roles, id), {
    method: 'DELETE'
  });
}

export function replaceAdminRoleMenus(id: string, menuIds: string[]) {
  return request<null>(`${adminResourcePath(apiRoutes.admin.roles, id)}/menus`, {
    method: 'PUT',
    body: JSON.stringify({
      menuIds
    })
  });
}

export function fetchAdminMenus() {
  return requestNormalized<AdminMenuRecord[]>(apiRoutes.admin.menus, normalizeAdminMenuList);
}

export function createAdminMenu(payload: AdminUpsertPayload) {
  return requestNormalized<AdminMenuRecord>(apiRoutes.admin.menus, normalizeAdminMenu, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminMenu(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminMenuRecord>(adminResourcePath(apiRoutes.admin.menus, id), normalizeAdminMenu, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminMenu(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.menus, id), {
    method: 'DELETE'
  });
}

export function fetchAdminKnowledgeBases() {
  return requestNormalized<AdminKnowledgeBaseRecord[]>(apiRoutes.admin.knowledgeBases, normalizeAdminKnowledgeBaseList);
}

export function createAdminKnowledgeBase(payload: AdminUpsertPayload) {
  return requestNormalized<AdminKnowledgeBaseRecord>(apiRoutes.admin.knowledgeBases, normalizeAdminKnowledgeBase, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminKnowledgeBase(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminKnowledgeBaseRecord>(
    adminResourcePath(apiRoutes.admin.knowledgeBases, id),
    normalizeAdminKnowledgeBase,
    {
      method: 'PUT',
      body: JSON.stringify(payload)
    }
  );
}

export function deleteAdminKnowledgeBase(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.knowledgeBases, id), {
    method: 'DELETE'
  });
}

export function fetchAdminVendors() {
  return requestNormalized<AdminVendorRecord[]>(apiRoutes.admin.vendors, normalizeAdminVendorList);
}

export function fetchAdminDictItems() {
  return requestNormalized<AdminDictionaryRecord[]>(apiRoutes.admin.dictItems, normalizeAdminDictionaryList);
}

export function createAdminDictItem(payload: AdminUpsertPayload) {
  return requestNormalized<AdminDictionaryRecord>(apiRoutes.admin.dictItems, normalizeAdminDictionary, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminDictItem(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminDictionaryRecord>(adminResourcePath(apiRoutes.admin.dictItems, id), normalizeAdminDictionary, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminDictItem(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.dictItems, id), {
    method: 'DELETE'
  });
}

export function createAdminVendor(payload: AdminUpsertPayload) {
  return requestNormalized<AdminVendorRecord>(apiRoutes.admin.vendors, normalizeAdminVendor, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminVendor(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminVendorRecord>(adminResourcePath(apiRoutes.admin.vendors, id), normalizeAdminVendor, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminVendor(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.vendors, id), {
    method: 'DELETE'
  });
}

export function fetchAdminModels() {
  return requestNormalized<AdminModelRecord[]>(apiRoutes.admin.models, normalizeAdminModelList);
}

export function fetchAdminTools() {
  return requestNormalized<AdminToolRecord[]>(apiRoutes.agent.tools, normalizeAdminToolList);
}

export function fetchAdminStations() {
  return requestNormalized<AdminStationRecord[]>(apiRoutes.business.stations, normalizeAdminStationList);
}

export function fetchAdminMonitorData() {
  return requestNormalized<AdminMonitorDataRecord[]>(apiRoutes.business.monitorData, normalizeAdminMonitorDataList);
}

export function fetchAdminMonitorDataParams() {
  return requestNormalized<MonitorParamTemplate[]>(apiRoutes.business.monitorDataParams, normalizeMonitorParamTemplateList);
}

export function createAdminModel(payload: AdminUpsertPayload) {
  return requestNormalized<AdminModelRecord>(apiRoutes.admin.models, normalizeAdminModel, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createAdminTool(payload: AdminUpsertPayload) {
  return requestNormalized<AdminToolRecord>(apiRoutes.agent.tools, normalizeAdminTool, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminModel(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminModelRecord>(adminResourcePath(apiRoutes.admin.models, id), normalizeAdminModel, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function updateAdminTool(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminToolRecord>(adminResourcePath(apiRoutes.agent.tools, id), normalizeAdminTool, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminModel(id: string) {
  return request<null>(adminResourcePath(apiRoutes.admin.models, id), {
    method: 'DELETE'
  });
}

export function deleteAdminTool(id: string) {
  return request<null>(adminResourcePath(apiRoutes.agent.tools, id), {
    method: 'DELETE'
  });
}

export function replaceAdminToolRoles(id: string, roleIds: string[]) {
  return request<null>(`${adminResourcePath(apiRoutes.agent.tools, id)}/roles`, {
    method: 'PUT',
    body: JSON.stringify({
      roleIds
    })
  });
}

export function testAdminTools(payload: AdminUpsertPayload) {
  return requestNormalized<ToolSearchResult[]>(apiRoutes.agent.toolSearch, normalizeToolSearchResultList, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createAdminStation(payload: AdminUpsertPayload) {
  return requestNormalized<AdminStationRecord>(apiRoutes.business.stations, normalizeAdminStation, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminStation(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminStationRecord>(adminResourcePath(apiRoutes.business.stations, id), normalizeAdminStation, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminStation(id: string) {
  return request<null>(adminResourcePath(apiRoutes.business.stations, id), {
    method: 'DELETE'
  });
}

export function createAdminMonitorData(payload: AdminUpsertPayload) {
  return requestNormalized<AdminMonitorDataRecord>(apiRoutes.business.monitorData, normalizeAdminMonitorData, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminMonitorData(id: string, payload: AdminUpsertPayload) {
  return requestNormalized<AdminMonitorDataRecord>(adminResourcePath(apiRoutes.business.monitorData, id), normalizeAdminMonitorData, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminMonitorData(id: string) {
  return request<null>(adminResourcePath(apiRoutes.business.monitorData, id), {
    method: 'DELETE'
  });
}

export function simulateAdminMonitorData(payload: AdminUpsertPayload) {
  return requestNormalized<AdminMonitorDataRecord[]>(apiRoutes.business.monitorDataSimulate, normalizeAdminMonitorDataList, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function adminResourcePath(basePath: string, id: string) {
  return `${basePath}/${encodeURIComponent(id)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickValue(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function pickString(record: Record<string, unknown> | null, keys: string[], fallback = '') {
  const value = pickValue(record, keys);

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return fallback;
}

function pickNumber(record: Record<string, unknown> | null, keys: string[], fallback = 0) {
  const value = pickValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function pickNullableNumber(record: Record<string, unknown> | null, keys: string[]) {
  const value = pickValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function pickBoolean(record: Record<string, unknown> | null, keys: string[], fallback = false) {
  const value = pickValue(record, keys);

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value === 'true';
  }

  return fallback;
}

function pickStringArray(record: Record<string, unknown> | null, keys: string[], fallback: string[] = []) {
  const value = pickValue(record, keys);

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

function formatBytes(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) {
    return '--';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatConversationGroup(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return '更早';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '更早';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays <= 0) {
    return '今天';
  }

  if (diffDays === 1) {
    return '昨天';
  }

  return '更早';
}

function normalizeKnowledgeBaseList(value: unknown): KnowledgeBase[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(
        pickValue(record, ['items', 'list', 'records', 'content', 'knowledgeBases', 'data'])
      );

  return list.map((item, index) => normalizeKnowledgeBase(item, index));
}

function normalizeKnowledgeBase(value: unknown, index = 0): KnowledgeBase {
  const record = asRecord(value);
  return {
    id: pickString(record, ['id', 'knowledgeBaseId', 'kbId'], `kb-${index + 1}`),
    name: pickString(record, ['name', 'label', 'title'], `知识库 ${index + 1}`),
    description: pickString(record, ['description', 'desc'], ''),
    documentCount: pickNumber(record, ['documentCount', 'docCount', 'count', 'documents'], 0),
    status: pickString(record, ['status'], ''),
    createdAt: pickString(record, ['createdAt', 'created_at'], ''),
    updatedAt: pickString(record, ['updatedAt', 'updated_at'], '')
  };
}

function normalizeKnowledgeDocumentList(value: unknown): KnowledgeDocument[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(
        pickValue(record, ['items', 'list', 'records', 'content', 'documents', 'data'])
      );

  return list.map((item, index) => normalizeKnowledgeDocument(item, index));
}

function normalizeKnowledgeDocument(value: unknown, index = 0): KnowledgeDocument {
  const record = asRecord(value);
  const knowledgeBase = asRecord(pickValue(record, ['knowledgeBase', 'kb']));
  const sizeBytes = pickNullableNumber(record, ['sizeBytes', 'size', 'fileSize']);
  const rawStatus = pickString(record, ['status', 'documentStatus', 'state'], 'UNKNOWN');
  const normalizedStatus = normalizeDocumentStatus(rawStatus);

  return {
    id: pickString(record, ['id', 'documentId'], `doc-${index + 1}`),
    name: pickString(record, ['name', 'fileName', 'filename', 'title'], `未命名文档 ${index + 1}`),
    category:
      pickString(record, ['category', 'type', 'sourceType']) ||
      pickString(knowledgeBase, ['name', 'label'], '未分类'),
    size: typeof pickValue(record, ['sizeLabel']) === 'string' ? pickString(record, ['sizeLabel']) : formatBytes(sizeBytes),
    sizeBytes,
    chunks: pickNumber(record, ['chunks', 'chunkCount', 'segmentCount'], 0),
    uploadedAt: formatDateLabel(pickValue(record, ['uploadedAt', 'createdAt', 'created_at'])),
    updatedAt: pickString(record, ['updatedAt', 'updated_at'], ''),
    status: normalizedStatus.value,
    statusLabel: normalizedStatus.label,
    isTerminal: normalizedStatus.isTerminal,
    errorMessage: pickString(record, ['errorMessage', 'message', 'error'], ''),
    knowledgeBaseId:
      pickString(record, ['knowledgeBaseId', 'kbId']) || pickString(knowledgeBase, ['id', 'knowledgeBaseId'], ''),
    knowledgeBaseName:
      pickString(record, ['knowledgeBaseName', 'kbName']) || pickString(knowledgeBase, ['name', 'label'], '')
  };
}

function normalizeKnowledgeDocumentChunkList(value: unknown): KnowledgeDocumentChunk[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(
        pickValue(record, ['items', 'list', 'records', 'content', 'chunks', 'data'])
      );

  return list.map((item, index) => normalizeKnowledgeDocumentChunk(item, index));
}

function normalizeKnowledgeDocumentChunk(value: unknown, index = 0): KnowledgeDocumentChunk {
  const record = asRecord(value);
  const metadataJson = pickString(record, ['metadataJson', 'metadata'], '');
  const metadata = parseMetadataJson(metadataJson) ?? {};
  const headingPath = Array.isArray(metadata.headingPath)
    ? metadata.headingPath.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    id: pickString(record, ['id', 'chunkId'], `chunk-${index + 1}`),
    documentId: pickString(record, ['documentId', 'docId'], ''),
    documentName: pickString(record, ['documentName', 'filename', 'name'], ''),
    knowledgeBaseId: pickString(record, ['knowledgeBaseId', 'kbId'], ''),
    knowledgeBaseName: pickString(record, ['knowledgeBaseName', 'kbName'], ''),
    content: pickString(record, ['content', 'text'], ''),
    chunkIndex: pickNumber(record, ['chunkIndex', 'index'], index),
    tokenCount: pickNumber(record, ['tokenCount', 'tokens'], 0),
    chunkType: pickString(record, ['chunkType'], String(metadata.chunkType ?? 'text')),
    pageNo: pickNullableNumber(record, ['pageNo']) ?? pickNullableNumber(metadata, ['pageNo']),
    headingPath,
    metadataJson,
    embeddingDimensions: pickNumber(record, ['embeddingDimensions', 'dimensions'], 0),
    embeddingPreview: pickString(record, ['embeddingPreview'], ''),
    createdAt: formatDateLabel(pickValue(record, ['createdAt', 'created_at']))
  };
}

function parseMetadataJson(value: string) {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed) ?? {};
  } catch {
    return {};
  }
}

function normalizeDocumentStatus(value: string) {
  const normalized = value.trim().toUpperCase();

  if (['READY', 'COMPLETED', 'SUCCESS', 'INDEXED'].includes(normalized)) {
    return { value: 'READY', label: '已入库', isTerminal: true };
  }

  if (['FAILED', 'ERROR'].includes(normalized)) {
    return { value: 'FAILED', label: '失败', isTerminal: true };
  }

  if (['PENDING', 'QUEUED', 'WAITING', 'UPLOADED'].includes(normalized)) {
    return { value: 'PENDING', label: '待切片', isTerminal: false };
  }

  if (['PARSING', 'PROCESSING', 'EMBEDDING', 'INDEXING', 'RUNNING'].includes(normalized)) {
    return { value: 'PROCESSING', label: '解析中', isTerminal: false };
  }

  if (value === '已入库' || value === '解析中' || value === '待切片' || value === '失败') {
    return {
      value,
      label: value,
      isTerminal: value === '已入库' || value === '失败'
    };
  }

  return { value: normalized || 'UNKNOWN', label: value || '未知', isTerminal: false };
}

function normalizeNavigationList(value: unknown): NavigationItem[] {
  const record = asRecord(value);
  const rootList = Array.isArray(value)
    ? value
    : asArray(pickValue(record, ['items', 'list', 'records', 'content', 'menus', 'navigation', 'data']));

  return rootList
    .map((item, index) => normalizeNavigationItem(item, index))
    .filter((item) => item.section)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeNavigationItem(value: unknown, index = 0): NavigationItem {
  const record = asRecord(value);
  const rawCode = pickString(record, ['code', 'key'], '');
  const section = normalizeMenuSection(pickString(record, ['section'], '') || rawCode || pickString(record, ['name'], ''));
  const name = pickString(record, ['name', 'label', 'title'], section || `菜单 ${index + 1}`);
  const children = asArray(pickValue(record, ['children', 'items', 'routes']))
    .map((child, childIndex) => normalizeNavigationItem(child, childIndex))
    .filter((child) => child.section)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    id: pickString(record, ['id', 'menuId', 'navigationId'], section || `nav-${index + 1}`),
    code: rawCode || section,
    name,
    label: pickString(record, ['label', 'title'], name),
    path: pickString(record, ['path', 'route', 'url'], ''),
    section,
    icon: pickString(record, ['icon', 'iconName'], ''),
    component: pickString(record, ['component'], ''),
    redirect: pickString(record, ['redirect'], ''),
    sortOrder: pickNumber(record, ['sortOrder', 'sort', 'order', 'weight'], index),
    status: pickString(record, ['status', 'state'], 'ACTIVE'),
    visible: pickBoolean(record, ['visible', 'enabled', 'show'], true),
    roles: pickStringArray(record, ['roles', 'roleCodes', 'authorities'], []),
    parentId: pickString(record, ['parentId', 'pid'], ''),
    children
  };
}

function normalizeMenuSection(value: string) {
  const normalized = value.trim();
  if (normalized === 'dashboard') {
    return 'dash';
  }
  if (normalized === 'knowledge') {
    return 'kb';
  }
  return normalized;
}

function normalizeAdminRoleList(value: unknown): AdminRoleRecord[] {
  return normalizeAdminList(value, normalizeAdminRole);
}

function normalizeAdminRole(value: unknown, index = 0): AdminRoleRecord {
  const record = asRecord(value);
  const code = pickString(record, ['code', 'roleCode', 'key'], `ROLE_${index + 1}`);
  return {
    id: pickString(record, ['id', 'roleId'], code),
    code,
    name: pickString(record, ['name', 'roleName', 'label', 'title'], code),
    description: pickString(record, ['description', 'desc', 'remark'], ''),
    status: pickString(record, ['status', 'state'], 'ACTIVE'),
    sortOrder: pickNumber(record, ['sortOrder', 'sort', 'order'], index),
    menuIds: pickStringArray(record, ['menuIds', 'menu_ids'], [])
  };
}

function normalizeAdminUserList(value: unknown): AdminUserRecord[] {
  return normalizeAdminList(value, normalizeAdminUser);
}

function normalizeAdminUser(value: unknown, index = 0): AdminUserRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ['id', 'userId'], `user-${index + 1}`),
    username: pickString(record, ['username', 'name', 'nickname'], `用户${index + 1}`),
    roleCode: pickString(record, ['roleCode', 'role'], ''),
    roleName: pickString(record, ['roleName', 'roleLabel', 'role_name']) || pickString(record, ['roleCode', 'role'], ''),
    dept: pickString(record, ['dept', 'department'], ''),
    status: pickString(record, ['status', 'state'], 'ACTIVE'),
    lastLoginAt: formatDateLabel(pickValue(record, ['lastLoginAt', 'last_login_at'])),
    createdAt: formatDateLabel(pickValue(record, ['createdAt', 'created_at'])),
    updatedAt: formatDateLabel(pickValue(record, ['updatedAt', 'updated_at']))
  };
}

function normalizeAdminMenuList(value: unknown): AdminMenuRecord[] {
  return normalizeAdminList(value, normalizeAdminMenu);
}

function normalizeAdminMenu(value: unknown, index = 0): AdminMenuRecord {
  const item = normalizeNavigationItem(value, index);
  const record = asRecord(value);
  const children = asArray(pickValue(record, ['children', 'items', 'routes'])).map((child, childIndex) =>
    normalizeAdminMenu(child, childIndex)
  );
  return {
    id: item.id,
    code: item.code || item.section,
    name: item.name,
    title: item.label || item.name,
    path: item.path,
    section: item.section,
    icon: item.icon,
    parentId: item.parentId ?? '',
    sortOrder: item.sortOrder,
    status: item.status,
    visible: item.visible,
    roles: item.roles,
    component: pickString(record, ['component'], ''),
    redirect: pickString(record, ['redirect'], ''),
    children
  };
}

function normalizeAdminKnowledgeBaseList(value: unknown): AdminKnowledgeBaseRecord[] {
  return normalizeAdminList(value, normalizeAdminKnowledgeBase);
}

function normalizeAdminKnowledgeBase(value: unknown, index = 0): AdminKnowledgeBaseRecord {
  const base = normalizeKnowledgeBase(value, index);
  const record = asRecord(value);
  return {
    id: base.id,
    code: pickString(record, ['code', 'kbCode'], base.id),
    name: base.name,
    description: base.description ?? '',
    status: base.status || pickString(record, ['state'], 'ACTIVE'),
    sortOrder: pickNumber(record, ['sortOrder', 'sort', 'order'], index),
    documentCount: base.documentCount
  };
}

function normalizeAdminVendorList(value: unknown): AdminVendorRecord[] {
  return normalizeAdminList(value, normalizeAdminVendor);
}

function normalizeAdminDictionaryList(value: unknown): AdminDictionaryRecord[] {
  return normalizeAdminList(value, normalizeAdminDictionary);
}

function normalizeAdminDictionary(value: unknown, index = 0): AdminDictionaryRecord {
  const record = asRecord(value);
  const enabled = pickBoolean(record, ['enabled', 'statusEnabled'], true);
  const dictValue = pickString(record, ['dictValue', 'value', 'code'], `DICT_${index + 1}`);
  return {
    id: pickString(record, ['id', 'dictId'], dictValue),
    dictType: pickString(record, ['dictType', 'type'], 'COMMON_STATUS'),
    dictLabel: pickString(record, ['dictLabel', 'label', 'name'], dictValue),
    dictValue,
    description: pickString(record, ['description', 'desc', 'remark'], ''),
    status: pickString(record, ['status', 'state'], enabled ? 'ACTIVE' : 'DISABLED'),
    sortOrder: pickNumber(record, ['sortOrder', 'sort', 'order'], index)
  };
}

function normalizeAdminVendor(value: unknown, index = 0): AdminVendorRecord {
  const record = asRecord(value);
  const code = pickString(record, ['code', 'vendorCode', 'key'], `vendor-${index + 1}`);
  const enabled = pickBoolean(record, ['enabled', 'statusEnabled'], true);
  return {
    id: pickString(record, ['id', 'vendorId'], code),
    code,
    name: pickString(record, ['name', 'vendorName', 'label'], code),
    endpoint: pickString(record, ['endpoint', 'baseUrl', 'baseURL', 'url'], ''),
    apiKeyMasked: pickString(record, ['apiKeyMasked', 'maskedApiKey'], ''),
    description: pickString(record, ['description', 'desc', 'remark'], ''),
    status: pickString(record, ['status', 'state'], enabled ? 'ACTIVE' : 'DISABLED'),
    sortOrder: pickNumber(record, ['sortOrder', 'sort', 'order'], index)
  };
}

function normalizeAdminModelList(value: unknown): AdminModelRecord[] {
  return normalizeAdminList(value, normalizeAdminModel);
}

function normalizeAdminModel(value: unknown, index = 0): AdminModelRecord {
  const record = asRecord(value);
  const vendor = asRecord(pickValue(record, ['vendor', 'provider']));
  const enabled = pickBoolean(record, ['enabled', 'statusEnabled'], true);
  const code = pickString(record, ['code', 'modelCode', 'model', 'key'], `model-${index + 1}`);
  return {
    id: pickString(record, ['id', 'modelId'], code),
    code,
    name: pickString(record, ['name', 'modelName', 'label'], code),
    vendorId: pickString(record, ['vendorId', 'providerId']) || pickString(vendor, ['id', 'vendorId'], ''),
    vendorName: pickString(record, ['vendorName', 'providerName']) || pickString(vendor, ['name', 'vendorName'], ''),
    modelType: pickString(record, ['modelType', 'type', 'category'], 'CHAT'),
    contextWindow: pickNumber(record, ['contextWindow', 'contextLength', 'maxContext'], 0),
    status: pickString(record, ['status', 'state'], enabled ? 'ACTIVE' : 'DISABLED'),
    sortOrder: pickNumber(record, ['sortOrder', 'sort', 'order'], index)
  };
}

function normalizeAdminToolList(value: unknown): AdminToolRecord[] {
  return normalizeAdminList(value, normalizeAdminTool);
}

function normalizeAdminTool(value: unknown, index = 0): AdminToolRecord {
  const record = asRecord(value);
  const enabled = pickBoolean(record, ['enabled'], true);
  return {
    id: pickString(record, ['id', 'toolId'], `tool-${index + 1}`),
    name: pickString(record, ['name', 'toolName'], `工具${index + 1}`),
    description: pickString(record, ['description', 'desc'], ''),
    parametersSchema: pickString(record, ['parametersSchema', 'parameters_schema', 'parameterSchema'], ''),
    toolGroup: pickString(record, ['toolGroup', 'groupName', 'group'], ''),
    tags: pickStringArray(record, ['tags', 'tagList'], []),
    version: pickString(record, ['version'], '1.0.0'),
    status: pickString(record, ['status', 'state'], enabled ? 'ACTIVE' : 'DISABLED'),
    embeddingStatus: pickString(record, ['embeddingStatus', 'embedding_status'], 'PENDING'),
    embeddingError: pickString(record, ['embeddingError', 'embedding_error'], ''),
    hitCount: pickNumber(record, ['hitCount', 'hit_count'], 0),
    callCount: pickNumber(record, ['callCount', 'call_count'], 0),
    successCount: pickNumber(record, ['successCount', 'success_count'], 0),
    successRate: pickNumber(record, ['successRate'], 0),
    roleIds: pickStringArray(record, ['roleIds', 'role_ids'], []),
    roleCodes: pickStringArray(record, ['roleCodes', 'role_codes'], []),
    roleNames: pickStringArray(record, ['roleNames', 'role_names'], []),
    createdAt: formatDateLabel(pickValue(record, ['createdAt', 'created_at'])),
    updatedAt: formatDateLabel(pickValue(record, ['updatedAt', 'updated_at']))
  };
}

function normalizeAdminStationList(value: unknown): AdminStationRecord[] {
  return normalizeAdminList(value, normalizeAdminStation);
}

function normalizeAdminStation(value: unknown, index = 0): AdminStationRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ['id', 'stationPk'], `station-${index + 1}`),
    stationId: pickString(record, ['stationId', 'station_id', 'code'], `STATION-${index + 1}`),
    mn: pickString(record, ['mn', 'mnCode'], ''),
    lat: pickNumber(record, ['lat', 'latitude'], 0),
    lng: pickNumber(record, ['lng', 'longitude'], 0),
    mnName: pickString(record, ['mnName', 'mn_name', 'name'], ''),
    st: pickNumber(record, ['st', 'stationType'], 0)
  };
}

function normalizeAdminMonitorDataList(value: unknown): AdminMonitorDataRecord[] {
  return normalizeAdminList(value, normalizeAdminMonitorData);
}

function normalizeAdminMonitorData(value: unknown, index = 0): AdminMonitorDataRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ['id'], `monitor-data-${index + 1}`),
    mn: pickString(record, ['mn'], ''),
    paramCode: pickString(record, ['paramCode', 'param_code'], ''),
    paramName: pickString(record, ['paramName', 'param_name'], ''),
    value: pickNumber(record, ['value', 'measureValue', 'measure_value'], 0),
    dataTime: formatDateLabel(pickValue(record, ['dataTime', 'data_time']))
  };
}

function normalizeMonitorParamTemplateList(value: unknown): MonitorParamTemplate[] {
  return normalizeAdminList(value, normalizeMonitorParamTemplate);
}

function normalizeMonitorParamTemplate(value: unknown): MonitorParamTemplate {
  const record = asRecord(value);
  return {
    paramCode: pickString(record, ['paramCode', 'param_code'], ''),
    paramName: pickString(record, ['paramName', 'param_name'], ''),
    minValue: pickNumber(record, ['minValue', 'min_value'], 0),
    maxValue: pickNumber(record, ['maxValue', 'max_value'], 0)
  };
}

function normalizeToolSearchResultList(value: unknown): ToolSearchResult[] {
  return normalizeAdminList(value, (item, index) => {
    const record = asRecord(item);
    return {
      id: pickString(record, ['id', 'toolId'], `tool-search-${index + 1}`),
      name: pickString(record, ['name', 'toolName'], `工具${index + 1}`),
      toolGroup: pickString(record, ['toolGroup', 'groupName', 'group'], ''),
      description: pickString(record, ['description', 'desc'], ''),
      similarity: pickNumber(record, ['similarity', 'score'], 0),
      embeddingStatus: pickString(record, ['embeddingStatus', 'embedding_status'], ''),
      roleCodes: pickStringArray(record, ['roleCodes', 'role_codes'], []),
      roleNames: pickStringArray(record, ['roleNames', 'role_names'], []),
      tags: pickStringArray(record, ['tags', 'tagList'], [])
    } satisfies ToolSearchResult;
  });
}

function normalizeAdminList<T>(value: unknown, normalize: (item: unknown, index: number) => T): T[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(pickValue(record, ['items', 'list', 'records', 'content', 'data']));

  return list.map((item, index) => normalize(item, index));
}

function normalizeConversationList(value: unknown): ConversationRecord[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(
        pickValue(record, ['items', 'list', 'records', 'content', 'conversations', 'data'])
      );

  return list.map((item, index) => normalizeConversation(item, index));
}

function normalizeConversation(value: unknown, index = 0): ConversationRecord {
  const record = asRecord(value);
  const updatedAtRaw = pickString(record, ['updatedAt', 'updated_at', 'lastMessageAt', 'createdAt', 'created_at'], '');
  return {
    id: pickString(record, ['id', 'conversationId'], `conversation-${index + 1}`),
    title: pickString(record, ['title', 'name'], `新会话 ${index + 1}`),
    group:
      pickString(record, ['group'], '') ||
      formatConversationGroup(updatedAtRaw),
    updatedAt: formatDateLabel(updatedAtRaw),
    preview: pickString(record, ['preview', 'lastMessage', 'lastMessagePreview', 'summary'], '')
  };
}

function normalizeConversationMessageList(value: unknown): ConversationMessage[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(
        pickValue(record, ['items', 'list', 'records', 'content', 'messages', 'data'])
      );

  return list.map((item, index) => normalizeConversationMessage(item, index));
}

function normalizeConversationMessage(value: unknown, index = 0): ConversationMessage {
  const record = asRecord(value);
  const sources = normalizeReferenceList(extractSources(value));
  return {
    id: pickString(record, ['id', 'messageId'], `message-${index + 1}`),
    role: normalizeMessageRole(pickString(record, ['role', 'messageRole'], 'assistant')),
    content: pickString(record, ['content', 'text', 'answer', 'message'], ''),
    createdAt: pickString(record, ['createdAt', 'created_at'], ''),
    citations:
      asArray(pickValue(record, ['citations', 'references']))
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          const reference = asRecord(item);
          return pickString(reference, ['title', 'name', 'label'], '');
        })
        .filter(Boolean) || undefined,
    sources: sources.length ? sources : undefined,
    reasoning: extractReasoning(value) || undefined
  };
}

function normalizeMessageRole(value: string): ConversationMessage['role'] {
  if (value === 'user' || value === 'assistant' || value === 'system') {
    return value;
  }

  const normalized = value.toUpperCase();
  if (normalized === 'USER') {
    return 'user';
  }
  if (normalized === 'SYSTEM') {
    return 'system';
  }
  return 'assistant';
}

function normalizeReferenceList(value: unknown): ReferenceCard[] {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : asArray(
        pickValue(record, ['items', 'list', 'records', 'content', 'sources', 'references', 'data'])
      );

  return list.map((item, index) => {
    const source = asRecord(item);
    return {
      id: pickString(source, ['id', 'sourceId', 'chunkId', 'documentId'], `source-${index + 1}`),
      title: pickString(source, ['title', 'name', 'documentName'], `来源 ${index + 1}`),
      excerpt: pickString(source, ['excerpt', 'snippet', 'content', 'text'], ''),
      source:
        pickString(source, ['source', 'knowledgeBaseName', 'kbName']) ||
        pickString(asRecord(pickValue(source, ['knowledgeBase'])), ['name', 'label'], '知识库'),
      score: pickNumber(source, ['score', 'similarity', 'relevance'], 0)
    };
  });
}

function parseSseEvent(chunk: string) {
  const lines = chunk.split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    return null;
  }

  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const rawData = dataLines.join('\n');
  return {
    event,
    data: parseEventData(rawData)
  };
}

function parseEventData(value: string) {
  if (!value) {
    return '';
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function extractDelta(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  const record = asRecord(value);
  return pickString(record, ['delta', 'content', 'text', 'token', 'answer'], '');
}

function extractSources(value: unknown) {
  const record = asRecord(value);
  return pickValue(record, ['sources', 'references', 'sourceList', 'referenceList', 'data']) ?? value;
}

function extractReasoning(value: unknown) {
  if (typeof value === 'string') {
    return '';
  }

  const record = asRecord(value);
  return pickString(
    record,
    ['reasoning', 'thinking', 'thought', 'analysis', 'reasoningContent', 'thinkingContent'],
    ''
  );
}

function extractErrorMessage(value: unknown) {
  const record = asRecord(value);
  return pickString(record, ['message', 'msg', 'error'], '流式问答失败');
}

function getRequestErrorMessage(path: string, status: number, payload: unknown) {
  if (isApiEnvelope(payload) && typeof payload.msg === 'string' && payload.msg) {
    return payload.msg;
  }

  const record = asRecord(payload);
  const message = pickString(record, ['msg', 'message', 'error'], '');
  if (message) {
    return message;
  }

  if (status === 401) {
    return '未登录或登录已失效，请重新认证。';
  }

  if (status === 404 && path.startsWith('/api/v1/workspaces/')) {
    return `后端尚未提供接口 ${path}`;
  }

  if (status === 404 && path.startsWith('/api/v1/')) {
    return `后端尚未提供接口 ${path}`;
  }

  return `Request failed with status ${status}`;
}
