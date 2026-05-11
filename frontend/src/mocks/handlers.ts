import { delay, http, HttpResponse } from 'msw';
import type {
  AgentWorkspace,
  ApiResponse,
  ChatWorkspace,
  DashboardSnapshot,
  KnowledgeWorkspace,
  LoginResponse,
  MonitorWorkspace,
  SourceWorkspace,
  SystemHealthPayload,
  UserProfile,
  UsersWorkspace
} from '../lib/api';

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
    { id: 'ts1', label: '问答闭环', value: '稳定运行', note: 'SSE 来源引用待接后端 payload' },
    { id: 'ts2', label: '知识入库', value: '解析中 9 份', note: '切片与向量化串行调度' },
    { id: 'ts3', label: '权限体系', value: '基础完成', note: 'RBAC 页面层尚未接真接口' }
  ]
};

const chatWorkspace: ChatWorkspace = {
  sessions: [
    { id: 's1', title: '鑫达化工近 30 天 COD 趋势分析', group: '今天', updatedAt: '14:32' },
    { id: 's2', title: 'GB 8978 二级标准适用范围', group: '今天', updatedAt: '13:48' },
    { id: 's3', title: '现场检查笔录辅助生成', group: '昨天', updatedAt: '17:06' },
    { id: 's4', title: '排污许可到期企业筛查', group: '更早', updatedAt: '周一' }
  ],
  scopes: [
    { id: 'kb1', label: '法规标准库', enabled: true },
    { id: 'kb2', label: '排污许可证库', enabled: true },
    { id: 'kb3', label: '监测日报库', enabled: false }
  ],
  suggestions: [
    '对近 30 天 COD 超标情况做摘要',
    '列出许可即将到期的重点企业',
    '根据监测数据生成现场核查建议',
    '解释 GB 8978 二级标准适用条件'
  ],
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: '请分析鑫达化工近 30 天 COD 超标情况，并给出执法建议。'
    },
    {
      id: 'm2',
      role: 'assistant',
      content:
        '根据调取的监测数据和知识库法规，近 30 天共监测 28 次，其中 6 次超标，最高值 186 mg/L，出现在 5 月 8 日。企业属于化工行业，执行 GB 8978-1996《污水综合排放标准》二级限值，COD 应不高于 150 mg/L。建议启动现场核查程序，并要求企业限期整改。',
      citations: ['GB 8978', '监测日报 2026-05', '排污许可证副本']
    }
  ],
  references: [
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
      source: '许可证库',
      score: 0.82
    }
  ]
};

const knowledgeWorkspace: KnowledgeWorkspace = {
  summary: [
    { id: 'k1', label: '知识库总量', value: '213 份', note: '本周新增 12 份' },
    { id: 'k2', label: '解析队列', value: '9 份', note: '3 份等待切片' },
    { id: 'k3', label: '向量切片', value: '18,420 段', note: '当前维度 1536' }
  ],
  categories: [
    { id: 'all', label: '全部', count: 213 },
    { id: 'law', label: '法规标准', count: 88 },
    { id: 'permit', label: '许可证', count: 46 },
    { id: 'monitor', label: '监测日报', count: 54 },
    { id: 'internal', label: '内部文件', count: 25 }
  ],
  documents: [
    {
      id: 'd1',
      name: 'GB 8978-1996 污水综合排放标准.pdf',
      category: '法规标准',
      size: '2.4 MB',
      chunks: 114,
      uploadedAt: '今天 09:20',
      status: '已入库'
    },
    {
      id: 'd2',
      name: '鑫达化工 2026-05 在线监测日报.xlsx',
      category: '监测日报',
      size: '1.1 MB',
      chunks: 36,
      uploadedAt: '今天 11:42',
      status: '解析中'
    },
    {
      id: 'd3',
      name: '排污许可证到期提醒名单.docx',
      category: '许可证',
      size: '480 KB',
      chunks: 18,
      uploadedAt: '昨天 16:05',
      status: '待切片'
    },
    {
      id: 'd4',
      name: '突发环境事件应急预案手册.pdf',
      category: '内部文件',
      size: '4.8 MB',
      chunks: 202,
      uploadedAt: '周一 10:16',
      status: '已入库'
    }
  ]
};

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

function success<T>(data: T) {
  const body: ApiResponse<T> = {
    code: 0,
    msg: 'ok',
    data
  };

  return HttpResponse.json(body);
}

export const handlers = [
  http.get('/api/system/health', async () => {
    await delay(180);
    return success(healthPayload);
  }),
  http.post('/api/v1/auth/login', async ({ request }) => {
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
  http.get('/api/v1/auth/me', async ({ request }) => {
    await delay(160);
    const auth = request.headers.get('Authorization');

    if (auth === `Bearer ${fakeToken}`) {
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
  http.get('/api/mock/dashboard', async () => {
    await delay(200);
    return success(dashboard);
  }),
  http.get('/api/mock/chat', async () => {
    await delay(220);
    return success(chatWorkspace);
  }),
  http.get('/api/mock/knowledge', async () => {
    await delay(260);
    return success(knowledgeWorkspace);
  }),
  http.get('/api/mock/source', async () => {
    await delay(200);
    return success(sourceWorkspace);
  }),
  http.get('/api/mock/agent', async () => {
    await delay(230);
    return success(agentWorkspace);
  }),
  http.get('/api/mock/monitor', async () => {
    await delay(220);
    return success(monitorWorkspace);
  }),
  http.get('/api/mock/users', async () => {
    await delay(200);
    return success(usersWorkspace);
  })
];
