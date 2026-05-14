import { Bot, Clock3, FileText, SendHorizontal } from 'lucide-react';
import type { AgentWorkspace } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, PageSkeleton, StatusDot } from './shared';

export function AgentPage(props: { data?: AgentWorkspace; isLoading: boolean; error: unknown }) {
  if (props.isLoading) {
    return <PageSkeleton blocks={7} />;
  }

  if (props.error) {
    return <EmptyState icon={Bot} title="Agent 页面加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_240px]">
      <div className="space-y-4">
        <Panel title="新建任务" description="用自然语言发起任务，后续直接接后端 Agent 编排接口。">
          <textarea
            className="min-h-[110px] w-full rounded border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            defaultValue="生成鑫达化工本月废水超标情况说明，并附上执法建议。"
          />
          <Button className="mt-4 w-full">
            <Bot className="h-4 w-4" />
            执行任务
          </Button>
        </Panel>

        <Panel title="任务历史" description="保留任务列表和状态，适配后续回放与审计场景。">
          <div className="space-y-0 rounded border border-[#e2e8f0]">
            {props.data.history.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white">{item.title}</div>
                </div>
                <Badge tone={item.status === '完成' ? 'good' : 'warn'}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="执行流程" description="沿用文档里的四段式流程：意图识别、知识检索、工具调用、报告生成。">
          <div className="overflow-hidden rounded border border-[#e2e8f0] bg-white">
            {props.data.flow.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[32px_minmax(0,180px)_24px_minmax(0,1fr)] items-start gap-3 border-b border-[#edf2f7] px-4 py-3 last:border-b-0">
                <div className="text-sm font-semibold text-[#94a3b8]">{String(index + 1).padStart(2, '0')}</div>
                <div className="text-sm font-semibold text-[#334155]">{item.label}</div>
                <StatusDot status={item.status} />
                <div className="text-sm leading-6 text-[#64748b]">{item.description}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="执行日志" description="执行日志区保留为后续 SSE 推送与工具结果回放的载体。">
          <div className="space-y-3 rounded border border-white/10 bg-black/15 p-4">
            {props.data.logs.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm leading-6 text-white/68">
                <StatusDot status={item.status} />
                <span>{item.line}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="可用工具" description="体现三期要求中的工具调用框架。">
          <div className="space-y-0 rounded border border-[#e2e8f0]">
            {props.data.tools.map((item) => (
              <div key={item.id} className="border-b border-[#edf2f7] px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{item.name}</div>
                  <Badge tone={item.status === 'available' ? 'good' : 'neutral'}>
                    {item.status === 'available' ? '可用' : '待接入'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-white/55">{item.description}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="输出结果" description="导出与复制入口将直接挂在这里。">
          <div className="rounded border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">
            {props.data.outputPreview}
          </div>
          <Button className="mt-4 w-full" variant="ghost" disabled>
            <FileText className="h-4 w-4" />
            导出报告
          </Button>
        </Panel>
      </div>
    </div>
  );
}
