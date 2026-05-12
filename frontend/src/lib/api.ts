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
    return response.json().catch(() => null);
  }

  if (contentType.startsWith('text/')) {
    return response.text().catch(() => null);
  }

  return response.text().catch(() => null);
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

    if (delta) {
      handlers.onDelta?.(delta);
    }
    if (sources.length) {
      handlers.onSources?.(sources);
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
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer);
    if (event?.event === 'sources' || event?.event === 'references') {
      handlers.onSources?.(normalizeReferenceList(extractSources(event.data)));
    } else if (event?.event === 'done') {
      handlers.onDone?.(event.data);
    } else {
      const nextSources = normalizeReferenceList(extractSources(event?.data));
      if (nextSources.length) {
        handlers.onSources?.(nextSources);
      } else {
        const delta = extractDelta(event?.data);
        if (delta) {
          handlers.onDelta?.(delta);
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

export function fetchMonitorWorkspace() {
  return request<MonitorWorkspace>(apiRoutes.workspaces.monitor);
}

export function fetchUsersWorkspace() {
  return request<UsersWorkspace>(apiRoutes.workspaces.users);
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
    knowledgeBaseId:
      pickString(record, ['knowledgeBaseId', 'kbId']) || pickString(knowledgeBase, ['id', 'knowledgeBaseId'], ''),
    knowledgeBaseName:
      pickString(record, ['knowledgeBaseName']) || pickString(knowledgeBase, ['name', 'label'], '')
  };
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
    sources: sources.length ? sources : undefined
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
