import { delay, http, HttpResponse } from 'msw';
import type {
  AdminDictionaryRecord,
  AdminKnowledgeBaseRecord,
  AdminMenuRecord,
  AdminModelRecord,
  AdminRoleRecord,
  AdminUserRecord,
  AdminVendorRecord,
  AgentWorkspace,
  ApiResponse,
  ChatWorkspace,
  DashboardSnapshot,
  KnowledgeDocumentChunk,
  KnowledgeWorkspace,
  LoginResponse,
  MonitorWorkspace,
  ReferenceCard,
  SourceWorkspace,
  SystemHealthPayload,
  UserProfile,
  UsersWorkspace
} from '../lib/api';
import { apiRoutes } from '../lib/api';

const adminUser: UserProfile = {
  id: 1,
  username: 'admin',
  role: 'ADMIN',
  dept: '生态环境局监测中心',
  status: 'ACTIVE'
};

const fakeToken = 'mock-token-admin';

const healthPayload: SystemHealthPayload = {
  service: 'env-agent-backend',
  status: 'UP',
  openAiBaseUrl: 'http://127.0.0.1:11434/v1',
  chatModel: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  vectorDimensions: 1536,
  similarityThreshold: 0.65
};

const dashboard: DashboardSnapshot = {
  todayQuestions: 38,
  satisfactionRate: 0.94,
  knowledgeDocuments: 213,
  newDocumentsWeek: 12,
  activeAgentTasks: 6,
  completedAgentTasks: 3,
  todayTokenCost: 0.82,
  monthTokenCost: 24.6,
  recentQuestions: [
    { id: 'q1', summary: '鑫达化工 COD 近 30 天趋势', user: '张析', timeAgo: '10 分钟前' },
    { id: 'q2', summary: 'GB 16297 无组织排放标准', user: '王检', timeAgo: '32 分钟前' },
    { id: 'q3', summary: '生成上月废水监测报告', user: '张析', timeAgo: '1 小时前' },
    { id: 'q4', summary: '氨氮超标原因分析', user: '陈局', timeAgo: '2 小时前' },
    { id: 'q5', summary: '许可证有效期核查', user: '李工', timeAgo: '3 小时前' }
  ],
  knowledgeUsage: [
    { label: '环保法规', percent: 78, color: '#4cc3ff' },
    { label: '排放标准', percent: 65, color: '#d7ff64' },
    { label: '内部文件', percent: 42, color: '#7be3c6' }
  ],
  taskStatus: [
    { id: 'ts1', label: '问答闭环', value: '稳定运行', note: 'SSE 与 sources 事件已提供 mock' },
    { id: 'ts2', label: '知识入库', value: '解析中 2 份', note: 'upload/status mock 可轮询' },
    { id: 'ts3', label: '权限体系', value: '基础完成', note: 'RBAC 页面层仍沿用既有 mock' }
  ]
};

type MockKnowledgeBase = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

type MockDocument = {
  id: string;
  name: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'READY' | 'PROCESSING' | 'PENDING';
};

type MockConversation = {
  id: string;
  title: string;
  updatedAt: string;
};

type MockMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: ReferenceCard[];
};

let knowledgeBases: MockKnowledgeBase[] = [
  {
    id: 'kb-law',
    name: '法规标准库',
    description: '国家与地方生态环境法规',
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-12T09:20:00.000Z'
  },
  {
    id: 'kb-permit',
    name: '排污许可证库',
    description: '许可证文本和摘要',
    createdAt: '2026-05-02T09:00:00.000Z',
    updatedAt: '2026-05-11T16:05:00.000Z'
  },
  {
    id: 'kb-monitor',
    name: '监测日报库',
    description: '企业在线监测日报',
    createdAt: '2026-05-03T09:00:00.000Z',
    updatedAt: '2026-05-12T11:42:00.000Z'
  }
];

let documents: MockDocument[] = [
  {
    id: '761245880001000001',
    name: 'GB 8978-1996 污水综合排放标准.pdf',
    knowledgeBaseId: 'kb-law',
    knowledgeBaseName: '法规标准库',
    sizeBytes: 2_516_582,
    chunkCount: 114,
    createdAt: '2026-05-12T09:20:00.000Z',
    updatedAt: '2026-05-12T09:25:00.000Z',
    status: 'READY'
  },
  {
    id: '761245880001000002',
    name: '鑫达化工 2026-05 在线监测日报.xlsx',
    knowledgeBaseId: 'kb-monitor',
    knowledgeBaseName: '监测日报库',
    sizeBytes: 1_153_433,
    chunkCount: 12,
    createdAt: '2026-05-12T11:42:00.000Z',
    updatedAt: '2026-05-12T11:42:00.000Z',
    status: 'PROCESSING'
  },
  {
    id: '761245880001000003',
    name: '排污许可证到期提醒名单.docx',
    knowledgeBaseId: 'kb-permit',
    knowledgeBaseName: '排污许可证库',
    sizeBytes: 491_520,
    chunkCount: 0,
    createdAt: '2026-05-11T16:05:00.000Z',
    updatedAt: '2026-05-11T16:05:00.000Z',
    status: 'PENDING'
  }
];

const documentChecks = new Map<string, number>();

let conversations: MockConversation[] = [
  { id: 's1', title: '鑫达化工近 30 天 COD 趋势分析', updatedAt: '2026-05-12T14:32:00.000Z' },
  { id: 's2', title: 'GB 8978 二级标准适用范围', updatedAt: '2026-05-12T13:48:00.000Z' },
  { id: 's3', title: '现场检查笔录辅助生成', updatedAt: '2026-05-11T17:06:00.000Z' }
];

const baseReferences: ReferenceCard[] = [
  {
    id: 'r1',
    title: 'GB 8978-1996 污水综合排放标准',
    excerpt: '化工行业执行二级限值时，COD 排放浓度应满足 150 mg/L 要求。',
    source: '法规标准库',
    score: 0.94
  },
  {
    id: 'r2',
    title: '鑫达化工 2026 年 5 月在线监测日报',
    excerpt: '5 月 8 日 10:15 监测到 COD 186 mg/L，为本月峰值。',
    source: '监测日报库',
    score: 0.89
  },
  {
    id: 'r3',
    title: '鑫达化工排污许可证摘要',
    excerpt: '废水排口 DW001，许可执行标准引用 GB 8978-1996 二级限值。',
    source: '排污许可证库',
    score: 0.82
  }
];

const conversationMessages = new Map<string, MockMessage[]>([
  [
    's1',
    [
      {
        id: 'm1',
        role: 'user',
        content: '请分析鑫达化工近 30 天 COD 超标情况，并给出执法建议。',
        createdAt: '2026-05-12T14:31:00.000Z'
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          '根据调取的监测数据和知识库法规，近 30 天共监测 28 次，其中 6 次超标，最高值 186 mg/L，出现在 5 月 8 日。企业执行 GB 8978-1996 二级限值，建议启动现场核查并核验预处理设施运行记录。',
        createdAt: '2026-05-12T14:32:00.000Z',
        sources: baseReferences
      }
    ]
  ],
  [
    's2',
    [
      {
        id: 'm3',
        role: 'user',
        content: 'GB 8978 二级标准适用于哪些场景？',
        createdAt: '2026-05-12T13:47:00.000Z'
      },
      {
        id: 'm4',
        role: 'assistant',
        content: '二级标准主要适用于未纳入特别行业一级限值但需满足综合排放要求的场景，具体仍需结合行业、区域和许可证约束判定。',
        createdAt: '2026-05-12T13:48:00.000Z',
        sources: [baseReferences[0]]
      }
    ]
  ],
  [
    's3',
    [
      {
        id: 'm5',
        role: 'user',
        content: '生成现场检查笔录提纲。',
        createdAt: '2026-05-11T17:04:00.000Z'
      },
      {
        id: 'm6',
        role: 'assistant',
        content: '建议围绕排口、在线监测、台账、药剂投加、应急措施五个部分展开记录。',
        createdAt: '2026-05-11T17:06:00.000Z'
      }
    ]
  ]
]);

const sourceWorkspace: SourceWorkspace = {
  enterprises: [
    {
      id: 'e1',
      name: '鑫达化工有限公司',
      industry: '化工',
      licenseCode: '91330100...2021',
      permits: 2,
      devices: 3,
      riskLevel: '重点',
      permitStatus: '有效',
      monitorStatus: '超标',
      location: '滨江工业园 A3 区',
      contacts: '环保负责人 周明 / 138****1203',
      latestEvent: '5 月 8 日 COD 峰值 186 mg/L，建议发起现场核查',
      complianceNotes: ['近 30 天 6 次超标', '废水排口 DW001 波动增大', '建议核查预处理设施运行记录']
    },
    {
      id: 'e2',
      name: '宏达金属制品有限公司',
      industry: '金属制品',
      licenseCode: '91330100...2022',
      permits: 1,
      devices: 2,
      riskLevel: '一般',
      permitStatus: '即将到期',
      monitorStatus: '正常',
      location: '临港制造基地 7 号楼',
      contacts: '安环主管 徐楠 / 139****6532',
      latestEvent: '排污许可证 21 天后到期，建议启动续证提醒',
      complianceNotes: ['在线监测正常', '许可证即将到期', '需补齐上季度台账归档']
    },
    {
      id: 'e3',
      name: '东方纺织印染厂',
      industry: '纺织印染',
      licenseCode: '91330100...2023',
      permits: 3,
      devices: 2,
      riskLevel: '重点',
      permitStatus: '有效',
      monitorStatus: '正常',
      location: '钱塘新区纺织园',
      contacts: '企业联络人 何俊 / 137****9008',
      latestEvent: '本周未见异常波动，排水色度稳定',
      complianceNotes: ['近 7 天无超标', '印染废水夜间流量正常', '可作为同行业对标样本']
    }
  ]
};

const agentWorkspace: AgentWorkspace = {
  history: [
    { id: 'a1', title: '鑫达化工合规检查', status: '完成' },
    { id: 'a2', title: '上月废水汇总报告', status: '进行中' },
    { id: 'a3', title: '华能 SO2 超标分析', status: '进行中' },
    { id: 'a4', title: 'GB 16297 适用核查', status: '完成' }
  ],
  flow: [
    { id: 'f1', label: '意图识别', status: 'done', description: '归类为合规检查任务' },
    { id: 'f2', label: '知识检索', status: 'done', description: '匹配 GB 8978、HJ 91.1 等 4 份文档' },
    { id: 'f3', label: '工具调用', status: 'running', description: '查询在线监控与许可证信息' },
    { id: 'f4', label: '报告生成', status: 'pending', description: '等待数据与结论汇总' }
  ],
  logs: [
    { id: 'l1', status: 'done', line: '意图识别 -> 合规检查任务，启动工作流' },
    { id: 'l2', status: 'done', line: '知识库检索 -> 匹配 GB 8978、HJ 91.1 等 4 份文档' },
    { id: 'l3', status: 'running', line: '工具调用 -> 查询在线监控数据（DW001，近 30 天）' },
    { id: 'l4', status: 'pending', line: '待执行 -> 查询排污许可证信息' },
    { id: 'l5', status: 'pending', line: '待执行 -> 生成超标风险说明与建议' }
  ],
  tools: [
    { id: 't1', name: '在线监控数据', description: '废水 / 废气实时数据', status: 'available' },
    { id: 't2', name: '排污许可证查询', description: '企业许可信息与有效期', status: 'available' },
    { id: 't3', name: '法规库检索', description: '法规标准与内部制度', status: 'coming-soon' },
    { id: 't4', name: '气象数据', description: '扩散条件与天气影响', status: 'coming-soon' }
  ],
  outputPreview: '任务完成后，报告将在这里展示，支持复制摘要和导出 Word。'
};

const monitorWorkspace: MonitorWorkspace = {
  availability: '99.8%',
  averageLatency: '1.24s',
  todayTokens: 48200,
  monthCost: '¥24.6',
  trend: [45, 60, 38, 72, 55, 48, 82],
  breakdown: [
    { id: 'b1', label: '问答调用', percent: 64, color: '#4cc3ff' },
    { id: 'b2', label: 'Agent 任务', percent: 28, color: '#d7ff64' },
    { id: 'b3', label: 'Embedding', percent: 8, color: '#7be3c6' }
  ],
  recentCalls: [
    {
      id: 'c1',
      time: '14:32:10',
      user: '张析',
      model: 'claude-sonnet',
      type: '问答',
      inputTokens: 1840,
      outputTokens: 1020,
      duration: '1.2s',
      cost: '¥0.04',
      status: '成功'
    },
    {
      id: 'c2',
      time: '14:28:44',
      user: '王检',
      model: 'claude-sonnet',
      type: 'Agent',
      inputTokens: 5120,
      outputTokens: 3200,
      duration: '4.6s',
      cost: '¥0.18',
      status: '成功'
    },
    {
      id: 'c3',
      time: '14:15:02',
      user: '张析',
      model: 'embedding',
      type: '向量化',
      inputTokens: 12400,
      outputTokens: null,
      duration: '0.8s',
      cost: '¥0.01',
      status: '成功'
    },
    {
      id: 'c4',
      time: '13:42:17',
      user: '李工',
      model: 'claude-sonnet',
      type: 'Agent',
      inputTokens: 4880,
      outputTokens: 2640,
      duration: '5.2s',
      cost: '¥0.16',
      status: '超时'
    }
  ]
};

const usersWorkspace: UsersWorkspace = {
  users: [
    { id: 'u1', name: '陈局长', initials: '陈', role: '管理层', dept: '局办公室', lastLogin: '今天 09:12', status: '启用' },
    { id: 'u2', name: '张析', initials: '张', role: '监测分析员', dept: '监测科', lastLogin: '今天 14:30', status: '启用' },
    { id: 'u3', name: '王检', initials: '王', role: '执法人员', dept: '执法大队', lastLogin: '今天 11:45', status: '启用' },
    { id: 'u4', name: '李工', initials: '李', role: '执法人员', dept: '执法大队', lastLogin: '昨天 16:20', status: '启用' }
  ],
  permissions: [
    { module: 'AI 智能问答', inspector: true, analyst: true, manager: true },
    { module: '知识库查询', inspector: true, analyst: true, manager: true },
    { module: '知识库上传', inspector: false, analyst: true, manager: true },
    { module: '污染源档案', inspector: true, analyst: true, manager: true },
    { module: 'Agent 任务', inspector: false, analyst: true, manager: true },
    { module: '系统监控', inspector: false, analyst: false, manager: true },
    { module: '用户管理', inspector: false, analyst: false, manager: true }
  ]
};

let adminRoles: AdminRoleRecord[] = [
  { id: 'role-admin', code: 'ADMIN', name: '系统管理员', description: '拥有全部配置与运维权限', status: 'ACTIVE', sortOrder: 10, menuIds: ['menu-dash', 'menu-chat', 'menu-source', 'menu-kb', 'menu-agent', 'menu-monitor', 'menu-admin', 'menu-users', 'menu-admin-roles', 'menu-admin-menus', 'menu-admin-kbs', 'menu-admin-vendors', 'menu-admin-models', 'menu-admin-dictionaries'] },
  { id: 'role-analyst', code: 'ANALYST', name: '监测分析员', description: '可使用问答、知识库和 Agent', status: 'ACTIVE', sortOrder: 20, menuIds: ['menu-dash', 'menu-chat', 'menu-source', 'menu-kb', 'menu-agent'] },
  { id: 'role-inspector', code: 'INSPECTOR', name: '执法人员', description: '可访问问答与污染源档案', status: 'ACTIVE', sortOrder: 30, menuIds: ['menu-dash', 'menu-chat', 'menu-source'] }
];

let adminUsers: AdminUserRecord[] = [
  { id: 'user-admin', username: 'admin', roleCode: 'ADMIN', roleName: '系统管理员', dept: '信息中心', status: 'ACTIVE', lastLoginAt: '2026-05-13 09:12', createdAt: '2026-05-01 09:00', updatedAt: '2026-05-13 09:12' },
  { id: 'user-analyst', username: 'analyst', roleCode: 'ANALYST', roleName: '监测分析员', dept: '监测中心', status: 'ACTIVE', lastLoginAt: '2026-05-13 14:30', createdAt: '2026-05-01 09:00', updatedAt: '2026-05-13 14:30' },
  { id: 'user-inspector', username: 'inspector', roleCode: 'INSPECTOR', roleName: '执法人员', dept: '执法科', status: 'ACTIVE', lastLoginAt: '2026-05-13 11:45', createdAt: '2026-05-01 09:00', updatedAt: '2026-05-13 11:45' }
];

let adminMenus: AdminMenuRecord[] = [
  { id: 'menu-dash', code: 'dash', name: '仪表盘', title: '仪表盘', path: '/dashboard', section: 'dash', icon: 'Gauge', parentId: '', sortOrder: 10, status: 'ACTIVE', visible: true, roles: ['INSPECTOR', 'ANALYST', 'ADMIN'], component: 'DashboardView', redirect: '', children: [] },
  { id: 'menu-chat', code: 'chat', name: '智能问答', title: '智能问答', path: '/chat', section: 'chat', icon: 'MessageSquareText', parentId: '', sortOrder: 20, status: 'ACTIVE', visible: true, roles: ['INSPECTOR', 'ANALYST', 'ADMIN'], component: 'ChatView', redirect: '', children: [] },
  { id: 'menu-source', code: 'source', name: '污染源档案', title: '污染源档案', path: '/source', section: 'source', icon: 'Building2', parentId: '', sortOrder: 30, status: 'ACTIVE', visible: true, roles: ['INSPECTOR', 'ANALYST', 'ADMIN'], component: 'SourceView', redirect: '', children: [] },
  { id: 'menu-kb', code: 'kb', name: '知识库', title: '知识库', path: '/knowledge', section: 'kb', icon: 'Database', parentId: '', sortOrder: 40, status: 'ACTIVE', visible: true, roles: ['ANALYST', 'ADMIN'], component: 'KnowledgeView', redirect: '', children: [] },
  { id: 'menu-agent', code: 'agent', name: 'Agent 任务', title: 'Agent 任务', path: '/agent', section: 'agent', icon: 'Bot', parentId: '', sortOrder: 50, status: 'ACTIVE', visible: true, roles: ['ANALYST', 'ADMIN'], component: 'AgentView', redirect: '', children: [] },
  { id: 'menu-monitor', code: 'monitor', name: '系统监控', title: '系统监控', path: '/monitor', section: 'monitor', icon: 'BarChart3', parentId: '', sortOrder: 60, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'MonitorView', redirect: '', children: [] },
  { id: 'menu-admin', code: 'admin', name: '基础管理', title: '基础管理', path: '/admin', section: 'admin', icon: 'Settings', parentId: '', sortOrder: 70, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: '', redirect: '/admin/users', children: [] },
  { id: 'menu-users', code: 'users', name: '用户管理', title: '用户管理', path: '/admin/users', section: 'users', icon: 'Users', parentId: 'menu-admin', sortOrder: 10, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'UsersView', redirect: '', children: [] },
  { id: 'menu-admin-roles', code: 'roles', name: '角色管理', title: '角色管理', path: '/admin/roles', section: 'admin', icon: 'ShieldCheck', parentId: 'menu-admin', sortOrder: 20, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'AdminView', redirect: '', children: [] },
  { id: 'menu-admin-menus', code: 'menus', name: '菜单管理', title: '菜单管理', path: '/admin/menus', section: 'admin', icon: 'Layers', parentId: 'menu-admin', sortOrder: 30, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'AdminView', redirect: '', children: [] },
  { id: 'menu-admin-kbs', code: 'knowledge-bases', name: '知识库管理', title: '知识库管理', path: '/admin/knowledge-bases', section: 'admin', icon: 'Database', parentId: 'menu-admin', sortOrder: 40, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'AdminView', redirect: '', children: [] },
  { id: 'menu-admin-vendors', code: 'vendors', name: '厂商管理', title: '厂商管理', path: '/admin/vendors', section: 'admin', icon: 'Settings', parentId: 'menu-admin', sortOrder: 50, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'AdminView', redirect: '', children: [] },
  { id: 'menu-admin-models', code: 'models', name: '模型管理', title: '模型管理', path: '/admin/models', section: 'admin', icon: 'Settings2', parentId: 'menu-admin', sortOrder: 60, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'AdminView', redirect: '', children: [] },
  { id: 'menu-admin-dictionaries', code: 'dictionaries', name: '业务字典', title: '业务字典', path: '/admin/dictionaries', section: 'admin', icon: 'BookText', parentId: 'menu-admin', sortOrder: 70, status: 'ACTIVE', visible: true, roles: ['ADMIN'], component: 'AdminView', redirect: '', children: [] }
];

let adminKnowledgeBases: AdminKnowledgeBaseRecord[] = knowledgeBases.map((item, index) => ({
  id: item.id,
  code: item.id,
  name: item.name,
  description: item.description ?? '',
  status: 'ACTIVE',
  sortOrder: (index + 1) * 10,
  documentCount: documents.filter((document) => document.knowledgeBaseId === item.id).length
}));

let adminVendors: AdminVendorRecord[] = [
  {
    id: 'vendor-openai',
    code: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    apiKeyMasked: 'sk-****demo',
    description: '云端通用模型接入',
    status: 'ACTIVE',
    sortOrder: 10
  },
  {
    id: 'vendor-local',
    code: 'local',
    name: '本地兼容服务',
    endpoint: 'http://127.0.0.1:11434/v1',
    apiKeyMasked: '',
    description: '本地兼容 OpenAI 协议的推理服务',
    status: 'ACTIVE',
    sortOrder: 20
  }
];

const vendorSecrets = new Map<string, string>([['vendor-openai', 'sk-live-demo']]);

let adminDictItems: AdminDictionaryRecord[] = [
  { id: 'dict-status-active', dictType: 'COMMON_STATUS', dictLabel: '启用', dictValue: 'ACTIVE', description: '通用启用状态', status: 'ACTIVE', sortOrder: 10 },
  { id: 'dict-status-disabled', dictType: 'COMMON_STATUS', dictLabel: '停用', dictValue: 'DISABLED', description: '通用停用状态', status: 'ACTIVE', sortOrder: 20 },
  { id: 'dict-model-chat', dictType: 'MODEL_TYPE', dictLabel: '对话模型', dictValue: 'CHAT', description: '聊天问答与推理模型', status: 'ACTIVE', sortOrder: 10 },
  { id: 'dict-model-embedding', dictType: 'MODEL_TYPE', dictLabel: '向量模型', dictValue: 'EMBEDDING', description: '文本向量化与召回模型', status: 'ACTIVE', sortOrder: 20 }
];

let adminModels: AdminModelRecord[] = [
  { id: 'model-chat', code: 'gpt-4o-mini', name: 'GPT-4o Mini', vendorId: 'vendor-openai', vendorName: 'OpenAI', modelType: 'CHAT', contextWindow: 128000, status: 'ACTIVE', sortOrder: 10 },
  { id: 'model-embedding', code: 'text-embedding-3-small', name: 'Text Embedding 3 Small', vendorId: 'vendor-openai', vendorName: 'OpenAI', modelType: 'EMBEDDING', contextWindow: 8191, status: 'ACTIVE', sortOrder: 20 }
];

function success<T>(data: T) {
  const body: ApiResponse<T> = {
    code: 0,
    msg: 'ok',
    data
  };

  return HttpResponse.json(body);
}

function requireAuth(auth: string | null) {
  return auth === `Bearer ${fakeToken}`;
}

function formatRelativeGroup(updatedAt: string) {
  const date = new Date(updatedAt);
  const now = new Date('2026-05-12T15:00:00.000Z');
  const startA = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startB = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((startA.getTime() - startB.getTime()) / 86_400_000);
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  return '更早';
}

function latestConversationReferences() {
  const firstConversation = conversations[0];
  const messages = firstConversation ? conversationMessages.get(firstConversation.id) ?? [] : [];
  const assistant = [...messages].reverse().find((item) => item.role === 'assistant' && item.sources?.length);
  return assistant?.sources ?? baseReferences;
}

function buildChatWorkspace(): ChatWorkspace {
  const firstConversation = conversations[0];
  const currentMessages = firstConversation ? conversationMessages.get(firstConversation.id) ?? [] : [];
  return {
    sessions: conversations.map((item) => ({
      id: item.id,
      title: item.title,
      group: formatRelativeGroup(item.updatedAt),
      updatedAt: new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.updatedAt))
    })),
    scopes: [
      { id: 'kb-law', label: '法规标准库', enabled: true },
      { id: 'kb-permit', label: '排污许可证库', enabled: true },
      { id: 'kb-monitor', label: '监测日报库', enabled: true }
    ],
    suggestions: [
      '对近 30 天 COD 超标情况做摘要',
      '列出许可即将到期的重点企业',
      '根据监测数据生成现场核查建议',
      '解释 GB 8978 二级标准适用条件'
    ],
    messages: currentMessages.map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      citations: item.sources?.map((source) => source.title)
    })),
    references: latestConversationReferences()
  };
}

function buildKnowledgeWorkspace(): KnowledgeWorkspace {
  const totalChunks = documents.reduce((sum, item) => sum + item.chunkCount, 0);
  const processing = documents.filter((item) => item.status !== 'READY').length;
  return {
    summary: [
      { id: 'k1', label: '知识库总量', value: `${documents.length} 份`, note: '与 documents mock 同步' },
      { id: 'k2', label: '解析队列', value: `${processing} 份`, note: processing ? '轮询 status 可见状态变化' : '当前无处理中任务' },
      { id: 'k3', label: '向量切片', value: `${totalChunks.toLocaleString()} 段`, note: '按 mock 文档切片数聚合' }
    ],
    categories: [
      { id: 'all', label: '全部', count: documents.length },
      ...knowledgeBases.map((item) => ({
        id: item.id,
        label: item.name,
        count: documents.filter((document) => document.knowledgeBaseId === item.id).length
      }))
    ],
    documents: documents.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.knowledgeBaseName,
      size: formatBytes(item.sizeBytes),
      sizeBytes: item.sizeBytes,
      chunks: item.chunkCount,
      uploadedAt: new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
        new Date(item.createdAt)
      ),
      status: item.status === 'READY' ? 'READY' : item.status === 'PROCESSING' ? 'PROCESSING' : 'PENDING',
      statusLabel: item.status === 'READY' ? '已入库' : item.status === 'PROCESSING' ? '解析中' : '待切片',
      isTerminal: item.status === 'READY',
      knowledgeBaseId: item.knowledgeBaseId,
      knowledgeBaseName: item.knowledgeBaseName
    }))
  };
}

function buildMockDocumentChunks(document: MockDocument): KnowledgeDocumentChunk[] {
  const chunkTotal = Math.max(document.chunkCount || 0, document.status === 'READY' ? 6 : 0);
  return Array.from({ length: chunkTotal }).map((_, index) => {
    const chunkIndex = index + 1;
    const chunkType = document.name.endsWith('.xlsx') && chunkIndex % 3 === 0 ? 'table' : 'text';
    const headingPath =
      document.knowledgeBaseId === 'kb-law'
        ? ['第二章 排放限值', '4.2 水污染物浓度控制']
        : document.knowledgeBaseId === 'kb-monitor'
          ? ['监测日报', 'COD 日报记录']
          : ['许可证附件', '到期提醒'];
    return {
      id: `${BigInt(document.id) + BigInt(chunkIndex)}`,
      documentId: document.id,
      documentName: document.name,
      knowledgeBaseId: document.knowledgeBaseId,
      knowledgeBaseName: document.knowledgeBaseName,
      content:
        chunkType === 'table'
          ? `企业名称 | 日期 | 指标 | 数值\n--- | --- | --- | ---\n鑫达化工 | 2026-05-${String((chunkIndex % 9) + 1).padStart(2, '0')} | COD | ${120 + chunkIndex} mg/L`
          : `${document.name} 第 ${chunkIndex} 段内容预览。该切片用于展示文档在入库后被拆分、向量化以及后续检索命中的基础信息。`,
      chunkIndex,
      tokenCount: 180 + chunkIndex * 7,
      chunkType,
      pageNo: (chunkIndex % 8) + 1,
      headingPath,
      metadataJson: JSON.stringify({
        chunkType,
        headingPath,
        pageNo: (chunkIndex % 8) + 1
      }),
      embeddingDimensions: document.status === 'READY' ? 1536 : 0,
      embeddingPreview: document.status === 'READY' ? '[0.0182, -0.0921, 0.4470, 0.1035, -0.2204, 0.0088, 0.1523, -0.0419, ...]' : '',
      createdAt: new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(document.updatedAt))
    };
  });
}

function syncMenuRolesFromRoleBindings() {
  adminMenus = adminMenus.map((menu) => ({
    ...menu,
    roles: adminRoles.filter((role) => role.menuIds.includes(menu.id)).map((role) => role.code)
  }));
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function upsertById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
}

function createAdminItem<T extends { id: string; code: string; name: string; status: string; sortOrder: number }>(
  prefix: string,
  payload: Partial<T>,
  defaults: T
) {
  return {
    ...defaults,
    ...payload,
    id: String(payload.id ?? nextId(prefix)),
    code: String(payload.code ?? defaults.code),
    name: String(payload.name ?? defaults.name),
    status: String(payload.status ?? defaults.status),
    sortOrder: Number(payload.sortOrder ?? defaults.sortOrder)
  } as T;
}

function maskVendorApiKey(apiKey: string) {
  const normalized = apiKey.trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 8) {
    return `${normalized[0]}***${normalized[normalized.length - 1]}`;
  }
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function resolveVendorName(vendorId: string) {
  return adminVendors.find((item) => item.id === vendorId)?.name ?? '';
}

function menuTree(items: AdminMenuRecord[]): AdminMenuRecord[] {
  const sorted = [...items].sort((left, right) => left.sortOrder - right.sortOrder);
  const byParent = new Map<string, AdminMenuRecord[]>();
  for (const item of sorted) {
    const key = item.parentId || '';
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  const build = (parentId: string): AdminMenuRecord[] =>
    (byParent.get(parentId) ?? []).map((item) => ({
      ...item,
      children: build(item.id)
    }));
  return build('');
}

function conversationAnswer(question: string) {
  const text =
    `结合知识库与监测数据，针对“${question}”，建议先定位对应企业、时间范围和排口，再交叉核对法规标准、许可证要求与在线监测记录。当前 mock 流会返回摘要、超标判断和执法建议三段内容，便于前端验证边收边渲染与来源面板刷新。`;

  const sources = question.includes('许可证')
    ? [baseReferences[2], baseReferences[0]]
    : question.includes('监测')
      ? [baseReferences[1], baseReferences[0]]
      : baseReferences;

  return {
    text,
    sources
  };
}

function createEventStream(parts: Array<{ delayMs: number; chunk: string }>) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let elapsed = 0;
      parts.forEach((part) => {
        elapsed += part.delayMs;
        setTimeout(() => {
          controller.enqueue(encoder.encode(part.chunk));
        }, elapsed);
      });
      setTimeout(() => controller.close(), elapsed + 30);
    }
  });
}

export const handlers = [
  http.get(apiRoutes.systemHealth, async () => {
    await delay(180);
    return success(healthPayload);
  }),
  http.post(apiRoutes.login, async ({ request }) => {
    await delay(320);
    const payload = (await request.json()) as { username?: string; password?: string };

    if (payload.username === 'admin' && payload.password === 'Env@123456') {
      const body: LoginResponse = {
        token: fakeToken,
        tokenType: 'Bearer',
        expiresIn: 28800,
        user: adminUser
      };

      return success(body);
    }

    return HttpResponse.json(
      {
        code: 40101,
        msg: '用户名或密码错误',
        data: null
      },
      { status: 401 }
    );
  }),
  http.get(apiRoutes.currentUser, async ({ request }) => {
    await delay(160);
    if (requireAuth(request.headers.get('Authorization'))) {
      return success(adminUser);
    }

    return HttpResponse.json(
      {
        code: 40100,
        msg: '未登录或令牌无效',
        data: null
      },
      { status: 401 }
    );
  }),
  http.get(apiRoutes.admin.navigation, async () => {
    await delay(180);
    return success(menuTree(adminMenus));
  }),
  http.get(apiRoutes.admin.users, async () => {
    await delay(160);
    return success([...adminUsers]);
  }),
  http.post(apiRoutes.admin.users, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminUserRecord> & { password?: string };
    const roleCode = String(payload.roleCode ?? 'INSPECTOR');
    const role = adminRoles.find((item) => item.code === roleCode);
    const item: AdminUserRecord = {
      id: nextId('user'),
      username: String(payload.username ?? 'new-user'),
      roleCode,
      roleName: role?.name ?? roleCode,
      dept: String(payload.dept ?? ''),
      status: String(payload.status ?? 'ACTIVE'),
      lastLoginAt: '--',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    adminUsers = [item, ...adminUsers];
    return success(item);
  }),
  http.put(`${apiRoutes.admin.users}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminUserRecord> & { password?: string };
    const roleCode = String(payload.roleCode ?? '');
    const role = adminRoles.find((item) => item.code === roleCode);
    adminUsers = adminUsers.map((item) =>
      item.id === id
        ? {
            ...item,
            ...payload,
            roleCode: roleCode || item.roleCode,
            roleName: role?.name ?? item.roleName,
            updatedAt: new Date().toISOString()
          }
        : item
    );
    return success(adminUsers.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.users}/:id`, async ({ params }) => {
    await delay(140);
    adminUsers = adminUsers.filter((item) => item.id !== String(params.id));
    return success(null);
  }),
  http.get(apiRoutes.admin.roles, async () => {
    await delay(160);
    return success([...adminRoles].sort((a, b) => a.sortOrder - b.sortOrder));
  }),
  http.post(apiRoutes.admin.roles, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminRoleRecord>;
    const item = createAdminItem('role', payload, {
      id: '',
      code: 'ROLE_NEW',
      name: '新角色',
      description: '',
      status: 'ACTIVE',
      sortOrder: adminRoles.length * 10 + 10,
      menuIds: []
    });
    adminRoles = [item, ...adminRoles];
    return success(item);
  }),
  http.put(`${apiRoutes.admin.roles}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminRoleRecord>;
    adminRoles = upsertById(adminRoles, id, payload);
    return success(adminRoles.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.roles}/:id`, async ({ params }) => {
    await delay(140);
    adminRoles = adminRoles.filter((item) => item.id !== String(params.id));
    syncMenuRolesFromRoleBindings();
    return success(null);
  }),
  http.put(`${apiRoutes.admin.roles}/:id/menus`, async ({ params, request }) => {
    await delay(180);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as { menuIds?: Array<string | number> };
    adminRoles = adminRoles.map((item) =>
      item.id === id
        ? {
            ...item,
            menuIds: (payload.menuIds ?? []).map((menuId) => String(menuId))
          }
        : item
    );
    syncMenuRolesFromRoleBindings();
    return success(null);
  }),
  http.get(apiRoutes.admin.menus, async () => {
    await delay(160);
    return success(menuTree(adminMenus));
  }),
  http.post(apiRoutes.admin.menus, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminMenuRecord>;
    const component = String(payload.component ?? `${String(payload.code ?? 'dash')}View`);
    const sectionFromComponent = component.replace(/View$/i, '').toLowerCase();
    const item = createAdminItem('menu', payload, {
      id: '',
      code: 'menu-new',
      name: '新菜单',
      path: '',
      section: String(payload.section ?? sectionFromComponent ?? payload.code ?? 'dash'),
      icon: '',
      parentId: '',
      sortOrder: adminMenus.length * 10 + 10,
      status: 'ACTIVE',
      visible: true,
      roles: [],
      title: String(payload.name ?? '新菜单'),
      component,
      redirect: '',
      children: []
    });
    adminMenus = [item, ...adminMenus];
    syncMenuRolesFromRoleBindings();
    return success(item);
  }),
  http.put(`${apiRoutes.admin.menus}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminMenuRecord>;
    adminMenus = upsertById(adminMenus, id, payload);
    syncMenuRolesFromRoleBindings();
    return success(adminMenus.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.menus}/:id`, async ({ params }) => {
    await delay(140);
    adminMenus = adminMenus.filter((item) => item.id !== String(params.id));
    adminRoles = adminRoles.map((role) => ({
      ...role,
      menuIds: role.menuIds.filter((menuId) => menuId !== String(params.id))
    }));
    syncMenuRolesFromRoleBindings();
    return success(null);
  }),
  http.get(apiRoutes.admin.knowledgeBases, async () => {
    await delay(160);
    return success([...adminKnowledgeBases].sort((a, b) => a.sortOrder - b.sortOrder));
  }),
  http.post(apiRoutes.admin.knowledgeBases, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminKnowledgeBaseRecord>;
    const item = createAdminItem('kb', payload, {
      id: '',
      code: 'kb-new',
      name: '新知识库',
      description: '',
      status: 'ACTIVE',
      sortOrder: adminKnowledgeBases.length * 10 + 10,
      documentCount: 0
    });
    adminKnowledgeBases = [item, ...adminKnowledgeBases];
    return success(item);
  }),
  http.put(`${apiRoutes.admin.knowledgeBases}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminKnowledgeBaseRecord>;
    adminKnowledgeBases = upsertById(adminKnowledgeBases, id, payload);
    return success(adminKnowledgeBases.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.knowledgeBases}/:id`, async ({ params }) => {
    await delay(140);
    adminKnowledgeBases = adminKnowledgeBases.filter((item) => item.id !== String(params.id));
    return success(null);
  }),
  http.get(apiRoutes.admin.dictItems, async () => {
    await delay(160);
    return success([...adminDictItems].sort((a, b) => a.dictType.localeCompare(b.dictType) || a.sortOrder - b.sortOrder));
  }),
  http.post(apiRoutes.admin.dictItems, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminDictionaryRecord> & { enabled?: boolean };
    const item = {
      id: nextId('dict'),
      dictType: String(payload.dictType ?? 'COMMON_STATUS'),
      dictLabel: String(payload.dictLabel ?? '新字典'),
      dictValue: String(payload.dictValue ?? `DICT_${adminDictItems.length + 1}`),
      description: String(payload.description ?? ''),
      status: payload.enabled === false ? 'DISABLED' : String(payload.status ?? 'ACTIVE'),
      sortOrder: Number(payload.sortOrder ?? adminDictItems.length * 10 + 10)
    } satisfies AdminDictionaryRecord;
    adminDictItems = [item, ...adminDictItems];
    return success(item);
  }),
  http.put(`${apiRoutes.admin.dictItems}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminDictionaryRecord> & { enabled?: boolean };
    adminDictItems = adminDictItems.map((item) =>
      item.id === id
        ? {
            ...item,
            ...payload,
            dictType: String(payload.dictType ?? item.dictType),
            dictLabel: String(payload.dictLabel ?? item.dictLabel),
            dictValue: String(payload.dictValue ?? item.dictValue),
            description: String(payload.description ?? item.description ?? ''),
            status: payload.enabled === undefined ? String(payload.status ?? item.status) : payload.enabled ? 'ACTIVE' : 'DISABLED',
            sortOrder: Number(payload.sortOrder ?? item.sortOrder)
          }
        : item
    );
    return success(adminDictItems.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.dictItems}/:id`, async ({ params }) => {
    await delay(140);
    adminDictItems = adminDictItems.filter((item) => item.id !== String(params.id));
    return success(null);
  }),
  http.get(apiRoutes.admin.vendors, async () => {
    await delay(160);
    return success([...adminVendors].sort((a, b) => a.sortOrder - b.sortOrder));
  }),
  http.post(apiRoutes.admin.vendors, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminVendorRecord> & {
      baseUrl?: string;
      apiKey?: string;
      enabled?: boolean;
    };
    const item = createAdminItem('vendor', payload, {
      id: '',
      code: 'vendor-new',
      name: '新厂商',
      endpoint: String(payload.endpoint ?? payload.baseUrl ?? ''),
      apiKeyMasked: '',
      description: String(payload.description ?? ''),
      status: payload.enabled === false ? 'DISABLED' : 'ACTIVE',
      sortOrder: adminVendors.length * 10 + 10
    });
    item.endpoint = String(payload.endpoint ?? payload.baseUrl ?? item.endpoint);
    item.description = String(payload.description ?? item.description ?? '');
    item.status = payload.enabled === false ? 'DISABLED' : String(payload.status ?? item.status);
    if (payload.apiKey && payload.apiKey.trim()) {
      vendorSecrets.set(item.id, payload.apiKey.trim());
      item.apiKeyMasked = maskVendorApiKey(payload.apiKey.trim());
    }
    adminVendors = [item, ...adminVendors];
    return success(item);
  }),
  http.put(`${apiRoutes.admin.vendors}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminVendorRecord> & {
      baseUrl?: string;
      apiKey?: string;
      enabled?: boolean;
    };
    adminVendors = adminVendors.map((item) =>
      item.id === id
        ? {
            ...item,
            ...payload,
            endpoint: String(payload.endpoint ?? payload.baseUrl ?? item.endpoint),
            description: String(payload.description ?? item.description ?? ''),
            status: payload.enabled === undefined ? String(payload.status ?? item.status) : payload.enabled ? 'ACTIVE' : 'DISABLED',
            apiKeyMasked:
              payload.apiKey && payload.apiKey.trim()
                ? maskVendorApiKey(payload.apiKey.trim())
                : item.apiKeyMasked
          }
        : item
    );
    if (payload.apiKey && payload.apiKey.trim()) {
      vendorSecrets.set(id, payload.apiKey.trim());
    }
    return success(adminVendors.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.vendors}/:id`, async ({ params }) => {
    await delay(140);
    const id = String(params.id);
    adminVendors = adminVendors.filter((item) => item.id !== id);
    vendorSecrets.delete(id);
    return success(null);
  }),
  http.get(apiRoutes.admin.models, async () => {
    await delay(160);
    return success([...adminModels].sort((a, b) => a.sortOrder - b.sortOrder));
  }),
  http.post(apiRoutes.admin.models, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminModelRecord> & { enabled?: boolean };
    const item = createAdminItem('model', payload, {
      id: '',
      code: 'model-new',
      name: '新模型',
      vendorId: '',
      vendorName: '',
      modelType: 'CHAT',
      contextWindow: 0,
      status: 'ACTIVE',
      sortOrder: adminModels.length * 10 + 10
    });
    item.vendorId = String(payload.vendorId ?? item.vendorId);
    item.vendorName = resolveVendorName(item.vendorId);
    item.modelType = String(payload.modelType ?? item.modelType);
    item.contextWindow = Number(payload.contextWindow ?? item.contextWindow);
    item.status = payload.enabled === false ? 'DISABLED' : String(payload.status ?? item.status);
    adminModels = [item, ...adminModels];
    return success(item);
  }),
  http.put(`${apiRoutes.admin.models}/:id`, async ({ params, request }) => {
    await delay(160);
    const id = String(params.id);
    const payload = (await request.json().catch(() => ({}))) as Partial<AdminModelRecord> & { enabled?: boolean };
    adminModels = adminModels.map((item) =>
      item.id === id
        ? {
            ...item,
            ...payload,
            vendorId: String(payload.vendorId ?? item.vendorId),
            vendorName: resolveVendorName(String(payload.vendorId ?? item.vendorId)),
            modelType: String(payload.modelType ?? item.modelType),
            contextWindow: Number(payload.contextWindow ?? item.contextWindow),
            status: payload.enabled === undefined ? String(payload.status ?? item.status) : payload.enabled ? 'ACTIVE' : 'DISABLED',
            sortOrder: Number(payload.sortOrder ?? item.sortOrder)
          }
        : item
    );
    return success(adminModels.find((item) => item.id === id) ?? null);
  }),
  http.delete(`${apiRoutes.admin.models}/:id`, async ({ params }) => {
    await delay(140);
    adminModels = adminModels.filter((item) => item.id !== String(params.id));
    return success(null);
  }),
  http.get(apiRoutes.knowledgeBases, async () => {
    await delay(180);
    return success(
      knowledgeBases.map((item) => ({
        ...item,
        documentCount: documents.filter((document) => document.knowledgeBaseId === item.id).length
      }))
    );
  }),
  http.get(apiRoutes.documents, async ({ request }) => {
    await delay(220);
    const url = new URL(request.url);
    const knowledgeBaseId = url.searchParams.get('knowledgeBaseId');
    const filtered = knowledgeBaseId ? documents.filter((item) => item.knowledgeBaseId === knowledgeBaseId) : documents;
    return success(filtered);
  }),
  http.post(apiRoutes.documentsUpload, async ({ request }) => {
    await delay(260);
    const formData = await request.formData();
    const uploadedFiles = [
      ...formData.getAll('file').filter((item): item is File => item instanceof File),
      ...formData.getAll('files').filter((item): item is File => item instanceof File)
    ];
    const knowledgeBaseId = String(formData.get('kbId') ?? formData.get('knowledgeBaseId') ?? knowledgeBases[0]?.id ?? '');
    const knowledgeBase =
      knowledgeBases.find((item) => item.id === knowledgeBaseId) ??
      knowledgeBases[0] ?? {
        id: 'kb-default',
        name: '默认知识库',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    if (!uploadedFiles.length) {
      return HttpResponse.json({ code: 40000, msg: '上传文件不能为空', data: null }, { status: 400 });
    }

    const now = new Date().toISOString();
    const created = uploadedFiles.map((file, index) => ({
      id: nextId(`doc${index}`),
      name: file.name,
      knowledgeBaseId: knowledgeBase.id,
      knowledgeBaseName: knowledgeBase.name,
      sizeBytes: file.size || 256_000,
      chunkCount: 0,
      createdAt: now,
      updatedAt: now,
      status: 'PENDING' as const
    }));

    documents = [...created, ...documents];
    knowledgeBases = knowledgeBases.map((item) =>
      item.id === knowledgeBase.id
        ? {
            ...item,
            updatedAt: now
          }
        : item
    );

    return success(created[0]);
  }),
  http.get(`${apiRoutes.documents}/:id`, async ({ params }) => {
    await delay(140);
    const document = documents.find((item) => item.id === params.id);
    if (!document) {
      return HttpResponse.json({ code: 40400, msg: '文档不存在', data: null }, { status: 404 });
    }
    return success(document);
  }),
  http.get(`${apiRoutes.documents}/:id/status`, async ({ params }) => {
    await delay(150);
    const document = documents.find((item) => item.id === params.id);
    if (!document) {
      return HttpResponse.json({ code: 40400, msg: '文档不存在', data: null }, { status: 404 });
    }

    const checks = (documentChecks.get(document.id) ?? 0) + 1;
    documentChecks.set(document.id, checks);

    if (document.status === 'PENDING' && checks >= 1) {
      document.status = 'PROCESSING';
      document.updatedAt = new Date().toISOString();
    } else if (document.status === 'PROCESSING' && checks >= 2) {
      document.status = 'READY';
      document.chunkCount = document.chunkCount || 24;
      document.updatedAt = new Date().toISOString();
    }

    return success(document);
  }),
  http.get(`${apiRoutes.documents}/:id/chunks`, async ({ params }) => {
    await delay(180);
    const document = documents.find((item) => item.id === params.id);
    if (!document) {
      return HttpResponse.json({ code: 40400, msg: '文档不存在', data: null }, { status: 404 });
    }
    return success(buildMockDocumentChunks(document));
  }),
  http.get(apiRoutes.conversations, async () => {
    await delay(160);
    return success(conversations);
  }),
  http.post(apiRoutes.conversations, async ({ request }) => {
    await delay(180);
    const payload = (await request.json().catch(() => ({}))) as { title?: string };
    const conversation: MockConversation = {
      id: nextId('conversation'),
      title: payload.title?.trim() || '新建会话',
      updatedAt: new Date().toISOString()
    };
    conversations = [conversation, ...conversations];
    conversationMessages.set(conversation.id, []);
    return success(conversation);
  }),
  http.put(`${apiRoutes.conversations}/:id/title`, async ({ params, request }) => {
    await delay(120);
    const payload = (await request.json()) as { title?: string };
    const target = conversations.find((item) => item.id === params.id);
    if (!target) {
      return HttpResponse.json({ code: 40400, msg: '会话不存在', data: null }, { status: 404 });
    }
    target.title = payload.title?.trim() || target.title;
    target.updatedAt = new Date().toISOString();
    return success(target);
  }),
  http.delete(`${apiRoutes.conversations}/:id`, async ({ params }) => {
    await delay(120);
    conversations = conversations.filter((item) => item.id !== params.id);
    conversationMessages.delete(String(params.id));
    return success(null);
  }),
  http.get(`${apiRoutes.conversations}/:id/messages`, async ({ params }) => {
    await delay(180);
    return success(conversationMessages.get(String(params.id)) ?? []);
  }),
  http.post(`${apiRoutes.conversations}/:id/messages`, async ({ params, request }) => {
    const conversationId = String(params.id);
    const payload = (await request.json()) as { content?: string };
    const question = payload.content?.trim() || '请给出环境执法建议。';
    const answer = conversationAnswer(question);
    const now = new Date().toISOString();
    const userMessage: MockMessage = {
      id: nextId('user'),
      role: 'user',
      content: question,
      createdAt: now
    };
    const assistantMessage: MockMessage = {
      id: nextId('assistant'),
      role: 'assistant',
      content: answer.text,
      createdAt: new Date(Date.now() + 1000).toISOString(),
      sources: answer.sources
    };

    const currentMessages = conversationMessages.get(conversationId) ?? [];
    conversationMessages.set(conversationId, [...currentMessages, userMessage, assistantMessage]);

    conversations = conversations
      .map((item) =>
        item.id === conversationId
          ? {
              ...item,
              title: item.title === '新建会话' ? question.slice(0, 18) : item.title,
              updatedAt: now
            }
          : item
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const deltas = [
      answer.text.slice(0, 34),
      answer.text.slice(34, 76),
      answer.text.slice(76)
    ].filter(Boolean);

    const stream = createEventStream([
      { delayMs: 120, chunk: `event: delta\ndata: ${JSON.stringify({ delta: deltas[0] })}\n\n` },
      { delayMs: 220, chunk: `event: delta\ndata: ${JSON.stringify({ delta: deltas[1] ?? '' })}\n\n` },
      { delayMs: 180, chunk: `event: sources\ndata: ${JSON.stringify({ sources: answer.sources })}\n\n` },
      { delayMs: 220, chunk: `event: delta\ndata: ${JSON.stringify({ delta: deltas[2] ?? '' })}\n\n` },
      { delayMs: 80, chunk: 'event: done\ndata: {"done":true}\n\n' }
    ]);

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  }),
  http.get(apiRoutes.workspaces.dashboard, async () => {
    await delay(200);
    return success(dashboard);
  }),
  http.get(apiRoutes.workspaces.chat, async () => {
    await delay(220);
    return success(buildChatWorkspace());
  }),
  http.get(apiRoutes.workspaces.knowledge, async () => {
    await delay(220);
    return success(buildKnowledgeWorkspace());
  }),
  http.get(apiRoutes.workspaces.source, async () => {
    await delay(200);
    return success(sourceWorkspace);
  }),
  http.get(apiRoutes.workspaces.agent, async () => {
    await delay(230);
    return success(agentWorkspace);
  }),
  http.get(apiRoutes.workspaces.monitor, async () => {
    await delay(220);
    return success(monitorWorkspace);
  }),
  http.get(apiRoutes.workspaces.users, async () => {
    await delay(200);
    return success(usersWorkspace);
  })
];
