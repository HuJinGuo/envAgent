# 环境监管 AI 助手平台实施计划

> 来源文档：`/Users/himma/github/liheroAgent/envAgent/env_ai_platform_design_doc.docx`
> 当前状态：仅有设计文档，`envAgent/` 目录下尚无前后端代码骨架。

## 1. 目标重述

目标：把设计文档落成一个可逐步交付的环境监管 AI 助手平台，优先打通 RAG 问答主链路，再逐步补齐 Agent、监控、用户管理、行业工具代理。

范围：
- 包含：后端骨架、前端骨架、认证、知识库上传/解析/向量化、会话问答、SSE 回答、来源引用、基础角色权限、Agent 任务工作台骨架。
- 暂不包含：真实环保外部平台对接、完整生产级监控、复杂报表模板、完整组织/审批流。

验证：
- 后端：`mvn test`、Swagger 可打开、关键 API 可 `curl`
- 前端：`npm run build`
- 数据库：关键表存在、pgvector 索引存在
- RAG：至少能上传文档、完成切片向量化、问答时返回引用来源
- SSE：前端可收到流式回答和 sources/done 事件

## 2. 对设计文档的工程解读

该文档本质上是“完整产品蓝图”，不是按开发依赖顺序写的。真正落地时应按下面顺序重排：

1. 基础工程与认证
2. 知识库文档链路
3. 会话与 SSE 问答链路
4. RAG 检索排序与来源引用
5. Agent 任务框架
6. 监控统计
7. 用户管理
8. 污染源档案工具代理
9. 仪表盘整合

原因：
- Chat、Knowledge、Agent、Monitor 都依赖统一用户/权限/日志/LLMService。
- 文档明确 MVP 核心是一二期，即 RAG 问答完整链路。
- 污染源档案和真实工具接入对外部依赖最重，应后置。

## 3. 推荐实施分期

### Milestone A：项目基础骨架与环境初始化

目标：先让项目可启动、可连接数据库、可跑通前后端开发链路。

交付物：
- `backend/` Spring Boot 3 工程
- `frontend/` React + TS + Vite 工程
- PostgreSQL + pgvector + Redis 本地配置
- 基础 README 与 `.env.example`
- 统一响应体、异常处理、配置类、健康检查接口

完成标志：
- 后端启动成功
- 前端构建成功
- `/api/system/health` 返回配置概览

### Milestone B：认证与角色权限基础

目标：补齐文档里所有模块依赖的身份体系。

当前执行策略：先按文档说明落地“简化认证 + 固定测试用户”，优先打通 `/api/v1/auth/login`、`/api/v1/auth/me`、JWT 过滤与最小角色信息透传；登出、改密、完整 RBAC 细分规则在本里程碑后半段补齐。

交付物：
- `users` 表
- 登录/登出/当前用户/改密接口
- JWT 鉴权过滤器
- Spring Security 基础 RBAC
- 三类角色：执法人员 / 监测分析员 / 管理层

完成标志：
- `/auth/login` 可签发 token
- 受保护接口无 token 拒绝，有 token 放行
- 角色访问控制可验证

说明：
- 若想最快出 MVP，可先做“简化认证 + 固定测试用户”，后续再补完整用户管理。
- 当前建议拆成 5 个连续切片：
  1. users 领域模型与测试用户初始化
  2. `/api/v1/auth/login`
  3. `/api/v1/auth/me`
  4. JWT 过滤与 SecurityConfig 改造
  5. 集成测试与 curl 验证

当前状态：Milestone A 已完成并验证，Milestone B 进行中。

当前固定测试用户规划：
- `inspector` / `Env@123456` / `INSPECTOR`
- `analyst` / `Env@123456` / `ANALYST`
- `admin` / `Env@123456` / `ADMIN`

这些账号仅用于开发阶段联调，后续在用户管理模块替换为正式管理流程。

### Milestone C：知识库上传与文档管理

目标：先做文档资产层，为 RAG 提供内容来源。

交付物：
- `knowledge_bases`、`documents`、`document_chunks`、`async_tasks` 表
- 文档上传接口 `POST /documents/upload`
- 文档列表/详情/状态轮询/删除
- 前端知识库页面：分类、搜索、上传区、文档表格、状态徽章

完成标志：
- PDF/DOCX/TXT 能上传
- 文档状态能从 PENDING -> PROCESSING -> READY/FAILED 变化
- 前端能轮询看到状态变化

说明：
- 文档设计里写 Apache Tika + PDFBox，建议实现时采用：
  - DOCX：优先结构化解析
  - PDF/TXT：统一文本抽取接口
- 文件存储可先走本地磁盘，后续再抽象对象存储。

### Milestone D：文档解析、切片、向量化异步链路

目标：把上传后的文档真正变成可检索数据。

交付物：
- 文档解析服务
- 段落感知切片器（目标 512 token，重叠 50 token）
- Embedding 调用封装
- `document_chunks.embedding` 批量写入
- pgvector ivfflat 索引
- 失败重试与错误落库

完成标志：
- 至少 1 份文档解析成功并生成 chunk
- `chunk_count` 正确写回
- 数据库中能看到向量数据与索引

风险：
- token 切片策略不要一开始就过度复杂，先按字符/段落近似实现，再演进到 tokenizer 精切。

### Milestone E：会话管理与 SSE 问答主链路

目标：完成 MVP 最核心的“问答体验”。

交付物：
- `conversations`、`messages` 表
- 会话列表、创建、删除、重命名、消息列表接口
- `POST /conversations/{id}/messages` SSE 流式输出
- 前端 Chat 页面三栏工作台
- 会话列表按时间分组
- 空状态建议问题
- 消息气泡 + 流式渲染

完成标志：
- 前端能新建会话并发送问题
- 后端能流式回传 `delta`、`sources`、`done`
- 问答记录可持久化并重新加载

说明：
- 设计文档写“四栏”，实际描述只有三栏。工程上按三栏实现即可：左会话、中对话、右引用。

### Milestone F：RAG 检索与来源引用

目标：让回答真正基于知识库，而非裸 LLM。

交付物：
- 查询向量生成
- pgvector 余弦检索 Top-N
- PostgreSQL 全文检索 Top-N
- RRF 融合排序
- 相似度阈值过滤
- Prompt 组装与引用来源结构化输出

完成标志：
- 问题命中文档时，返回回答与来源片段
- `sources` 事件包含 `docId/docName/excerpt/similarity`
- 前端右栏能展示来源卡片

建议：
- 先做“纯向量检索 + Top5 来源返回”跑通，再补全文检索与 RRF。
- 否则一次做满，调试成本高。

### Milestone G：Agent 任务工作台骨架

目标：补足作品集中的 Agent 能力展示，但先做框架，不急着做复杂自治。

交付物：
- `agent_tasks` 表
- `AgentTool` 接口、`ToolRegistry`
- 工具状态列表接口
- 新建任务接口
- 任务详情与 SSE 日志接口
- 前端 Agent 页面三栏布局
- 占位工具 2~3 个（法规库检索、企业搜索、许可证查询可先 mock）

完成标志：
- 可提交任务
- 可看到步骤状态：意图识别 -> 知识检索 -> 工具调用 -> 生成报告
- 可推送实时日志

建议：
- 先做规则路由或假意图分类，后续再升级为 LLM JSON 分类。

### Milestone H：监控、日志、费用统计

目标：补齐平台治理能力。

交付物：
- `llm_call_logs` 表
- LLM 调用日志埋点
- 费用换算服务
- Monitor 页面概览、趋势、调用记录
- Dashboard 基础统计卡片

完成标志：
- 每次问答/embedding/agent 调用都能落日志
- Monitor 页面可看到最近调用明细和基础趋势

### Milestone I：用户管理与角色矩阵

目标：补足管理端闭环。

交付物：
- 用户列表、新增、编辑、状态切换、删除
- 用户页面两列布局
- 权限矩阵展示

完成标志：
- 管理层角色可管理用户
- 其他角色受限

### Milestone J：污染源档案与真实工具接入

目标：接入行业特征能力，提升作品集含金量。

交付物：
- `/sources` 代理接口
- 企业列表/详情/排口/监测数据
- 前端污染源档案页面
- 至少 1 个真实外部工具接入

完成标志：
- 页面能查询并展示外部工具返回数据
- 工具异常时有明确降级提示

## 4. MVP 边界建议

如果目标是“最快做出能演示、能写进简历、能继续扩展”的版本，MVP 建议只做到：

必须做：
- Milestone A 基础骨架
- Milestone B 简化认证
- Milestone C 文档管理
- Milestone D 解析与向量化
- Milestone E 会话与 SSE
- Milestone F RAG 检索与来源引用

可延后：
- 完整用户管理
- 完整系统监控
- 污染源档案真实对接
- Word 报告导出
- 复杂 Agent 工具编排

原因：
- 这已经完整覆盖“Java 后端 + AI 应用后端”的核心能力：认证、异步、文件处理、向量检索、SSE、Prompt/RAG、前后端联调。
- 也是最适合面试与作品集展示的闭环。

## 5. 推荐的数据表落地顺序

按依赖顺序建表：
1. `users`
2. `knowledge_bases`
3. `documents`
4. `document_chunks`
5. `conversations`
6. `messages`
7. `async_tasks`
8. `llm_call_logs`
9. `agent_tasks`
10. `prompt_templates`

说明：
- `sources` 模块按文档要求不本地持久化企业档案，因此不必先建企业主表。

## 6. 推荐的最小目录结构

```text
envAgent/
  backend/
    src/main/java/...
    src/main/resources/
  frontend/
    src/
  docs/
    plans/
  storage/
    uploads/
```

后端建议先按模块分包：
- `auth`
- `chat`
- `knowledge`
- `rag`
- `agent`
- `monitor`
- `user`
- `common`

## 7. 关键设计取舍

### 7.1 文档中的“完整蓝图”不要一次做满
先做 RAG 主链路，再做 Agent 壳层，否则会同时卡在：
- 认证
- 文档解析
- embedding
- SSE
- 工具协议
- 报告导出

### 7.2 Prompt 模板表可先落表、后启用后台编辑
先保证业务链路；不要一开始就做完整 Prompt 管理 UI。

### 7.3 污染源档案先 mock，再接真平台
原因是外部接口鉴权、限流、字段稳定性都可能拖慢整体进度。

### 7.4 监控数据先从业务日志反推
不要先做复杂 BI，先能看调用日志、token、费用即可。

## 8. 建议执行顺序（适合连续开发）

### 第一阶段：先做可运行骨架
- A 基础骨架
- B 简化认证

### 第二阶段：做知识库资产层
- C 文档管理
- D 文档解析/向量化

### 第三阶段：做问答演示闭环
- E 会话与 SSE
- F RAG 检索与引用来源

### 第四阶段：做作品集加分项
- G Agent 任务工作台
- H 监控

### 第五阶段：做行业特色
- J 污染源档案与真实工具接入
- I 用户管理可插在 H/J 之间，视后台管理优先级而定

## 9. 下一步可直接执行的首批任务

1. 在 `envAgent/` 下创建 `backend/`、`frontend/`、`docs/`、`storage/uploads/` 目录。
2. 初始化 Spring Boot 3 后端骨架，加入 PostgreSQL、Redis、MyBatis Plus、pgvector、Spring Security、OpenAPI 依赖。
3. 初始化 React + TypeScript + Vite 前端骨架，先做基础布局壳。
4. 建立第一版 `schema.sql`，先只含 `users`、`knowledge_bases`、`documents`、`document_chunks`、`conversations`、`messages`、`async_tasks`。
5. 先完成 `/api/system/health` 与 `/auth/login` 两个最小入口，验证工程链路。

## 10. 当前判断

这是一个很适合你做作品集的题目，因为它同时覆盖：
- Spring Boot 工程组织
- 权限认证
- 异步任务
- 文档处理
- RAG 检索
- SSE 流式输出
- Agent 工具编排
- 行业场景接口代理

但如果不控范围，最容易失控在“把设计稿当成一期全做完”。
正确做法就是：先把一二期合并成一个可演示 MVP，再逐步补三四五期。
