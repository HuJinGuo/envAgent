import { AlertTriangle, RefreshCw, Server } from 'lucide-react';
import type { DashboardSnapshot, SystemHealthPayload } from '../lib/api';
import { formatPercent } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { BarRow, getErrorMessage, InfoTile, MetricCard, PageSkeleton } from './shared';

export function DashboardPage(props: {
  dashboard?: DashboardSnapshot;
  dashboardLoading: boolean;
  dashboardError: unknown;
  health?: SystemHealthPayload;
  healthLoading: boolean;
  healthError: unknown;
  onRefresh: () => void;
}) {
  if (props.dashboardLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.dashboardError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="仪表盘加载失败"
        description={getErrorMessage(props.dashboardError)}
        action={
          <Button variant="secondary" onClick={props.onRefresh}>
            <RefreshCw className="h-4 w-4" />
            重试
          </Button>
        }
      />
    );
  }

  if (!props.dashboard) {
    return null;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="今日 AI 问答"
          value={String(props.dashboard.todayQuestions)}
          note={`满意率 ${formatPercent(props.dashboard.satisfactionRate)}`}
          accent="blue"
        />
        <MetricCard
          label="知识库文档"
          value={String(props.dashboard.knowledgeDocuments)}
          note={`本周新增 ${props.dashboard.newDocumentsWeek} 份`}
          accent="emerald"
        />
        <MetricCard
          label="Agent 任务"
          value={String(props.dashboard.activeAgentTasks)}
          note={`${props.dashboard.completedAgentTasks} 已完成 · ${props.dashboard.activeAgentTasks - props.dashboard.completedAgentTasks} 进行中`}
          accent="lime"
        />
        <MetricCard
          label="今日 Token 费用"
          value={`¥${props.dashboard.todayTokenCost}`}
          note={`本月累计 ¥${props.dashboard.monthTokenCost}`}
          accent="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="最近问答记录"
          description="围绕执法与监测的高频提问组织，后续可直接接会话列表接口。"
          action={
            <Button variant="ghost" size="sm" onClick={props.onRefresh}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          }
        >
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">问题摘要</th>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {props.dashboard.recentQuestions.map((item) => (
                  <tr key={item.id} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{item.summary}</td>
                    <td className="px-4 py-3 text-white/62">{item.user}</td>
                    <td className="px-4 py-3 text-white/45">{item.timeAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="知识库使用分布" description="文档里的知识库使用比例页签被压缩为趋势条，更适合首页扫描。">
          <div className="space-y-4">
            {props.dashboard.knowledgeUsage.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.percent} color={item.color} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="当前交付物" description="对应设计文档里一期、二期的必做内容，把状态压到首页。">
          <div className="space-y-3">
            {props.dashboard.taskStatus.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-white/55">{item.note}</p>
                  </div>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="系统健康摘录" description="展示当前服务、模型与检索阈值等运行状态。">
          {props.healthLoading ? (
            <PageSkeleton blocks={3} />
          ) : props.healthError ? (
            <EmptyState icon={Server} title="健康信息读取失败" description={getErrorMessage(props.healthError)} />
          ) : props.health ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="服务名" value={props.health.service} />
              <InfoTile label="状态" value={props.health.status} tone="good" />
              <InfoTile label="Chat Model" value={props.health.chatModel} />
              <InfoTile label="Embedding" value={props.health.embeddingModel} />
              <InfoTile label="Base URL" value={props.health.openAiBaseUrl} />
              <InfoTile label="相似阈值" value={String(props.health.similarityThreshold)} tone="warn" />
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

