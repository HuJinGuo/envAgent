# 环境监管 AI 助手平台

基于设计文档 `env_ai_platform_design_doc.docx` 启动的项目骨架。

当前已完成：
- backend Spring Boot 3 基础骨架
- frontend React + TypeScript + Vite 基础骨架
- PostgreSQL `env_agent_ai` 数据库与 `vector` 扩展初始化
- 第一版 `schema.sql`
- `/api/system/health` 健康检查接口
- 项目实施计划：`docs/plans/2026-05-11-env-ai-platform-delivery-plan.md`

## 目录结构

- `backend/` 后端服务
- `frontend/` 前端页面
- `storage/uploads/` 本地上传目录
- `docs/plans/` 计划文档

## 本地依赖

- PostgreSQL: `127.0.0.1:5432` / db `env_agent_ai`
- Redis: `127.0.0.1:6379` / db `11`

## 后端启动

```bash
cd backend
mvn spring-boot:run
```

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

## 当前下一步

1. 导入 `schema.sql`
2. 完成简化认证与 `/api/v1/auth/login`、`/api/v1/auth/me`
3. 继续知识库上传与文档状态链路
