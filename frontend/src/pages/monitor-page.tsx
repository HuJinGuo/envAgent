import { AlertTriangle, BarChart3, Server } from 'lucide-react';
import type { MonitorWorkspace, SystemHealthPayload } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { BarRow, getErrorMessage, InfoTile, MetricCard, PageSkeleton } from './shared';

export function MonitorPage(props: {
  data?: MonitorWorkspace;
  isLoading: boolean;
  error: unknown;
  health?: SystemHealthPayload;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.error) {
    return <EmptyState icon={BarChart3} title="系统监控加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data) {
    return null;
  }

  const data = props.data;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="服务可用率" value={data.availability} note="近 30 天" accent="emerald" />
        <MetricCard label="平均响应时长" value={data.averageLatency} note="问答 1.8s · Embedding 0.4s" accent="blue" />
        <MetricCard label="今日 Token 消耗" value={data.todayTokens.toLocaleString()} note="输入 + 输出合计" accent="lime" />
        <MetricCard label="本月累计费用" value={data.monthCost} note="较上月下降 12%" accent="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="7 日 Token 趋势" description="按日汇总模型调用量，便于观察资源消耗波动。">
          <div className="flex h-44 items-end gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            {data.trend.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className={cn('w-full rounded-t-xl', index === data.trend.length - 1 ? 'bg-[#d7ff64]' : 'bg-[#4cc3ff]')} style={{ height: `${value}%` }} />
                <span className="text-xs text-white/38">{index === data.trend.length - 1 ? '今天' : `5/${5 + index}`}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {data.breakdown.map((item) => (
              <BarRow key={item.id} label={item.label} value={item.percent} color={item.color} />
            ))}
          </div>
        </Panel>

        <Panel title="服务与模型状态" description="结合真实 health 接口，把配置字段放进监控场景里。">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="服务状态" value={props.health?.status ?? '--'} tone={props.health?.status === 'UP' ? 'good' : 'warn'} />
            <InfoTile label="Chat Model" value={props.health?.chatModel ?? '--'} />
            <InfoTile label="Embedding" value={props.health?.embeddingModel ?? '--'} />
            <InfoTile label="向量维度" value={props.health ? String(props.health.vectorDimensions) : '--'} />
          </div>
        </Panel>
      </div>

      <Panel title="最近调用记录" description="这一块对应文档里的调用日志和 Token 统计表。">
        <div className="overflow-hidden rounded-[24px] border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">模型</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">输入</th>
                <th className="px-4 py-3 font-medium">输出</th>
                <th className="px-4 py-3 font-medium">耗时</th>
                <th className="px-4 py-3 font-medium">费用</th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {props.data.recentCalls.map((item) => (
                <tr key={item.id} className="border-t border-white/8">
                  <td className="px-4 py-3 text-white/45">{item.time}</td>
                  <td className="px-4 py-3 text-white/62">{item.user}</td>
                  <td className="px-4 py-3 text-white/62">{item.model}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.type === 'Agent' ? 'warn' : 'neutral'}>{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-white/62">{item.inputTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/62">{item.outputTokens?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-3 text-white/62">{item.duration}</td>
                  <td className="px-4 py-3 text-white/62">{item.cost}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.status === '成功' ? 'good' : 'warn'}>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

