const cards = [
  { title: '当前阶段', value: 'Milestone A', note: '项目骨架初始化' },
  { title: '后端目标', value: 'Spring Boot 3', note: '先完成 health 与 auth 入口' },
  { title: '前端目标', value: 'React + Vite', note: '先搭基础工作台壳' },
  { title: 'MVP 核心', value: 'RAG 闭环', note: '上传 -> 向量化 -> SSE 问答' }
];

function App() {
  return (
    <div className="page">
      <aside className="sidebar">
        <div className="logo">EA</div>
        <nav className="nav">
          <button className="nav-item active">仪</button>
          <button className="nav-item">问</button>
          <button className="nav-item">知</button>
          <button className="nav-item">企</button>
          <button className="nav-item">代</button>
          <button className="nav-item">监</button>
        </nav>
        <div className="user-badge">管</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>环境监管 AI 助手平台</h1>
            <p>先落地可运行骨架，再逐步打通知识库、问答和 Agent。</p>
          </div>
          <span className="role">管理层</span>
        </header>

        <section className="card-grid">
          {cards.map((card) => (
            <article key={card.title} className="stat-card">
              <span className="stat-title">{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="workspace-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>实施切片</h2>
              <span>进行中</span>
            </div>
            <ul className="timeline">
              <li>初始化 backend / frontend / storage 目录</li>
              <li>落地 Spring Boot 3 + PostgreSQL + Redis 配置</li>
              <li>提供 /api/system/health 健康检查</li>
              <li>准备 auth 与 schema 下一步开发</li>
            </ul>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>MVP 范围</h2>
              <span>文档已确认</span>
            </div>
            <ul className="check-list">
              <li>知识库上传与状态轮询</li>
              <li>文档解析、切片、向量化</li>
              <li>会话管理与 SSE 流式回答</li>
              <li>来源引用面板与相似度展示</li>
            </ul>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>下一步</h2>
              <span>Milestone B</span>
            </div>
            <p className="next-text">
              完成 health 验证后，继续补简化认证、用户表和第一版 schema 导入。
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
