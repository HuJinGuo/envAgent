import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bot, CheckCircle2, Clock, FileText, Loader2, SendHorizontal, XCircle } from 'lucide-react';
import {
  type AgentTask,
  type AgentTaskDetail,
  type AgentTaskLog,
  type AgentWorkspace,
  createAgentTask,
  fetchAgentTaskDetail,
  fetchAgentTasks,
  streamAgentTask
} from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { cn } from '../lib/utils';
import { getErrorMessage, PageSkeleton } from './shared';

const STEPS = [
  { key: 'INTENT', label: '意图识别', hint: '解析任务类型' },
  { key: 'KNOWLEDGE', label: '知识检索', hint: '检索知识库片段' },
  { key: 'TOOL_CALL', label: '工具调用', hint: '调用外部数据工具' },
  { key: 'REPORT', label: '生成报告', hint: 'LLM 汇总输出' }
] as const;

type StepStatus = 'done' | 'running' | 'pending' | 'failed';

function deriveStepStatus(stepKey: string, logs: AgentTaskLog[]): StepStatus {
  const stepLogs = logs.filter((l) => l.step === stepKey);
  if (stepLogs.some((l) => l.status === 'failed')) return 'failed';
  if (stepLogs.some((l) => l.status === 'done')) return 'done';
  if (stepLogs.some((l) => l.status === 'running')) return 'running';
  return 'pending';
}

function taskBadgeTone(status: string): 'good' | 'warn' | 'bad' | 'neutral' {
  if (status === 'DONE') return 'good';
  if (status === 'RUNNING' || status === 'PENDING') return 'warn';
  if (status === 'FAILED') return 'bad';
  return 'neutral';
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '等待中',
  RUNNING: '执行中',
  DONE: '已完成',
  FAILED: '失败'
};

function formatRelativeTime(input: string): string {
  if (!input) return '';
  // 后端返回格式 MM-dd HH:mm:ss
  return input.length > 5 ? input.slice(0, 14) : input;
}

export function AgentPage(props: { data?: AgentWorkspace; isLoading: boolean; error: unknown }) {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [streamLogs, setStreamLogs] = useState<AgentTaskLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'output'>('logs');
  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const tasksQuery = useQuery({
    queryKey: ['agent-tasks'],
    queryFn: fetchAgentTasks,
    refetchInterval: isStreaming ? false : 10_000
  });

  const detailQuery = useQuery({
    queryKey: ['agent-task', selectedTaskId],
    queryFn: () => fetchAgentTaskDetail(selectedTaskId!),
    enabled: Boolean(selectedTaskId) && !isStreaming,
    staleTime: 5_000
  });

  const selectedDetail: AgentTaskDetail | undefined = isStreaming
    ? undefined
    : detailQuery.data?.data;

  const displayLogs: AgentTaskLog[] = isStreaming ? streamLogs : selectedDetail?.logs ?? [];

  const displayTask: AgentTask | undefined = useMemo(() => {
    if (isStreaming) {
      return tasksQuery.data?.data?.find((t) => t.id === selectedTaskId);
    }
    return selectedDetail?.task;
  }, [isStreaming, selectedDetail, selectedTaskId, tasksQuery.data]);

  const createMutation = useMutation({
    mutationFn: (text: string) => createAgentTask(text),
    onSuccess: (res) => {
      const task = res.data;
      setSelectedTaskId(task.id);
      setStreamLogs([]);
      setActiveTab('logs');
      setInstruction('');
      void queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      startStream(task.id);
    }
  });

  function startStream(taskId: string) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsStreaming(true);

    streamAgentTask(
      taskId,
      {
        onLog: (log) => setStreamLogs((prev) => [...prev, log]),
        onDone: () => {
          setIsStreaming(false);
          setActiveTab('output');
          void queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
          void queryClient.invalidateQueries({ queryKey: ['agent-task', taskId] });
        },
        onError: () => {
          setIsStreaming(false);
          setActiveTab('output');
          void queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
          void queryClient.invalidateQueries({ queryKey: ['agent-task', taskId] });
        }
      },
      ctrl.signal
    ).catch(() => setIsStreaming(false));
  }

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayLogs, activeTab]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!selectedTaskId && tasksQuery.data?.data?.length) {
      setSelectedTaskId(tasksQuery.data.data[0].id);
    }
  }, [selectedTaskId, tasksQuery.data]);

  if (props.isLoading && !tasksQuery.data) return <PageSkeleton blocks={5} />;
  if (props.error) return <EmptyState icon={Bot} title="Agent 页面加载失败" description={getErrorMessage(props.error)} />;

  const tasks = tasksQuery.data?.data ?? [];
  const tools = props.data?.tools ?? [];
  const canSubmit = instruction.trim().length > 0 && !createMutation.isPending && !isStreaming;

  const stepStatuses = STEPS.map((step) => deriveStepStatus(step.key, displayLogs));

  return (
    <div className="space-y-4">
      {/* 顶部：任务发起栏 */}
      <Panel
        title="发起新任务"
        action={
          isStreaming ? (
            <span className="flex items-center gap-2 text-sm text-amber-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              任务执行中
            </span>
          ) : null
        }
      >
        <div className="flex gap-3">
          <textarea
            className="min-h-[88px] flex-1 resize-none rounded border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8] focus:border-[#2563eb]"
            placeholder="例：生成鑫达化工本月废水超标情况说明，并附上执法建议。"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                createMutation.mutate(instruction.trim());
              }
            }}
          />
          <div className="flex flex-col justify-between">
            <Button
              className="min-w-[120px]"
              disabled={!canSubmit}
              onClick={() => createMutation.mutate(instruction.trim())}
            >
              <SendHorizontal className="h-4 w-4" />
              {createMutation.isPending ? '提交中' : '执行任务'}
            </Button>
            <span className="text-xs text-[#94a3b8]">⌘/Ctrl + Enter</span>
          </div>
        </div>
        {createMutation.error ? (
          <p className="mt-2 text-xs text-red-500">{getErrorMessage(createMutation.error)}</p>
        ) : null}
      </Panel>

      {/* 三栏主体 */}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
        {/* 左栏：任务历史 */}
        <Panel title="任务历史" contentClassName="space-y-2">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#94a3b8]">暂无任务，发起一个试试</p>
          ) : (
            <div className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isActive = task.id === selectedTaskId;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      if (task.id === selectedTaskId) return;
                      setSelectedTaskId(task.id);
                      setStreamLogs([]);
                      setActiveTab(task.status === 'DONE' || task.status === 'FAILED' ? 'output' : 'logs');
                      setIsStreaming(false);
                      abortRef.current?.abort();
                      if (task.status === 'RUNNING' || task.status === 'PENDING') {
                        startStream(task.id);
                      }
                    }}
                    className={cn(
                      'group w-full rounded-md border px-3 py-2.5 text-left transition',
                      isActive
                        ? 'border-[#bfdbfe] bg-[#eff6ff]'
                        : 'border-transparent bg-[#f8fafc] hover:border-[#e2e8f0] hover:bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-xs font-mono', isActive ? 'text-[#2563eb]' : 'text-[#94a3b8]')}>
                        #{task.id.slice(-6)}
                      </span>
                      <Badge tone={taskBadgeTone(task.status)}>{STATUS_LABELS[task.status] ?? task.status}</Badge>
                    </div>
                    <p className={cn('mt-1 line-clamp-2 text-sm leading-5', isActive ? 'text-[#1f2937]' : 'text-[#475569]')}>
                      {task.instruction}
                    </p>
                    <p className="mt-1 text-[11px] text-[#94a3b8]">{formatRelativeTime(task.createdAt)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        {/* 中栏：当前任务流水线 + 内容区 */}
        <div className="space-y-4">
          {displayTask ? (
            <Panel
              title={`任务 #${displayTask.id.slice(-6)}`}
              action={
                <div className="flex items-center gap-2">
                  {displayTask.status === 'RUNNING' || displayTask.status === 'PENDING' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : null}
                  <Badge tone={taskBadgeTone(displayTask.status)}>
                    {STATUS_LABELS[displayTask.status] ?? displayTask.status}
                  </Badge>
                </div>
              }
            >
              <StepPipeline steps={STEPS} statuses={stepStatuses} />
            </Panel>
          ) : (
            <Panel title="选择任务">
              <EmptyState icon={Bot} title="尚未选择任务" />
            </Panel>
          )}

          {displayTask ? (
            <Panel
              title=""
              className="overflow-hidden"
              contentClassName="p-0"
            >
              <div className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-2">
                <div className="flex gap-1">
                  <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
                    实时日志
                    <span className="ml-1.5 rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] text-[#64748b]">
                      {displayLogs.length}
                    </span>
                  </TabButton>
                  <TabButton
                    active={activeTab === 'output'}
                    onClick={() => setActiveTab('output')}
                    disabled={displayTask.status === 'PENDING'}
                  >
                    输出结果
                    {displayTask.status === 'DONE' ? (
                      <CheckCircle2 className="ml-1.5 h-3.5 w-3.5 text-emerald-500" />
                    ) : displayTask.status === 'FAILED' ? (
                      <XCircle className="ml-1.5 h-3.5 w-3.5 text-red-500" />
                    ) : null}
                  </TabButton>
                </div>
                {isStreaming ? (
                  <span className="flex items-center gap-1.5 text-xs text-amber-500">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    SSE 推送中
                  </span>
                ) : null}
              </div>

              <div className="max-h-[420px] min-h-[280px] overflow-y-auto bg-[#0b1220] px-4 py-3 font-mono text-[13px] leading-6">
                {activeTab === 'logs' ? (
                  <LogList logs={displayLogs} endRef={logsEndRef} />
                ) : (
                  <OutputView task={displayTask} />
                )}
              </div>
            </Panel>
          ) : null}
        </div>

        {/* 右栏：工具 + 任务信息 */}
        <div className="space-y-4">
          <Panel title="可用工具" contentClassName="space-y-2">
            {tools.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">加载中...</p>
            ) : (
              tools.map((tool) => (
                <div
                  key={tool.id}
                  className="rounded-md border border-[#edf2f7] bg-[#f8fafc] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#1f2937]">{tool.name}</span>
                    <Badge tone={tool.status === 'available' ? 'good' : 'neutral'}>
                      {tool.status === 'available' ? '可用' : '待接入'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">{tool.description}</p>
                </div>
              ))
            )}
          </Panel>

          {displayTask ? (
            <Panel title="任务信息">
              <dl className="space-y-2.5 text-sm">
                <InfoRow label="任务 ID" value={displayTask.id} mono />
                <InfoRow label="状态" value={STATUS_LABELS[displayTask.status] ?? displayTask.status} />
                {displayTask.currentStep ? (
                  <InfoRow
                    label="当前步骤"
                    value={STEPS.find((s) => s.key === displayTask.currentStep)?.label ?? displayTask.currentStep}
                  />
                ) : null}
                <InfoRow label="创建时间" value={displayTask.createdAt} />
                <InfoRow label="更新时间" value={displayTask.updatedAt} />
              </dl>
              {displayTask.status === 'DONE' && displayTask.output ? (
                <Button
                  className="mt-3 w-full"
                  variant="ghost"
                  onClick={() => {
                    const blob = new Blob([displayTask.output!], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `agent-report-${displayTask.id}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  下载报告
                </Button>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepPipeline(props: { steps: typeof STEPS; statuses: StepStatus[] }) {
  return (
    <div className="flex items-center">
      {props.steps.map((step, index) => {
        const status = props.statuses[index];
        const nextStatus = props.statuses[index + 1];
        const isLast = index === props.steps.length - 1;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <StepIndicator status={status} index={index + 1} />
              <div className="text-center">
                <div
                  className={cn(
                    'text-xs font-medium',
                    status === 'done' && 'text-emerald-600',
                    status === 'running' && 'text-amber-600',
                    status === 'failed' && 'text-red-600',
                    status === 'pending' && 'text-[#94a3b8]'
                  )}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-[#94a3b8]">{step.hint}</div>
              </div>
            </div>
            {!isLast ? (
              <div className="mx-2 mb-7 h-0.5 flex-1 rounded bg-[#e2e8f0]">
                <div
                  className={cn(
                    'h-full rounded transition-all',
                    status === 'done' ? 'w-full bg-emerald-400' : '',
                    status === 'running' && nextStatus !== 'done' ? 'w-1/2 bg-amber-400' : '',
                    status === 'failed' ? 'w-full bg-red-400' : ''
                  )}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StepIndicator(props: { status: StepStatus; index: number }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold';
  if (props.status === 'done') {
    return (
      <span className={cn(base, 'border-emerald-400 bg-emerald-50 text-emerald-600')}>
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }
  if (props.status === 'running') {
    return (
      <span className={cn(base, 'border-amber-400 bg-amber-50 text-amber-600')}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }
  if (props.status === 'failed') {
    return (
      <span className={cn(base, 'border-red-400 bg-red-50 text-red-600')}>
        <XCircle className="h-4 w-4" />
      </span>
    );
  }
  return <span className={cn(base, 'border-[#e2e8f0] bg-white text-[#94a3b8]')}>{props.index}</span>;
}

function TabButton(props: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(
        'inline-flex items-center rounded px-3 py-1.5 text-sm font-medium transition',
        props.active
          ? 'bg-[#eff6ff] text-[#2563eb]'
          : 'text-[#64748b] hover:bg-[#f8fafc]',
        props.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
      )}
    >
      {props.children}
    </button>
  );
}

function LogList(props: { logs: AgentTaskLog[]; endRef: React.MutableRefObject<HTMLDivElement | null> }) {
  if (props.logs.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-white/30">
        <Clock className="mr-2 h-4 w-4" />
        等待日志输出...
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {props.logs.map((log, i) => (
        <div key={log.id || i} className="flex items-start gap-2.5">
          <span className="shrink-0 text-white/30">{log.createdAt || ''}</span>
          <span className={cn('shrink-0 font-semibold', stepColor(log.step))}>[{log.step}]</span>
          <span className={cn('shrink-0', statusColor(log.status))}>●</span>
          <span className="break-all text-white/85">{log.line}</span>
        </div>
      ))}
      <div
        ref={(el) => {
          props.endRef.current = el;
        }}
      />
    </div>
  );
}

function OutputView(props: { task: AgentTask }) {
  if (props.task.status === 'PENDING') {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-white/30">
        任务尚未开始执行
      </div>
    );
  }
  if (props.task.status === 'RUNNING') {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-white/40">
        <Loader2 className="h-6 w-6 animate-spin" />
        任务执行中，请等待报告生成...
      </div>
    );
  }
  if (props.task.status === 'FAILED') {
    return (
      <div className="rounded border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
        <div className="mb-2 flex items-center gap-2 font-semibold text-red-400">
          <AlertCircle className="h-4 w-4" />
          任务执行失败
        </div>
        {props.task.errorMsg ?? '未知错误'}
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/85">
      {props.task.output ?? '无输出内容'}
    </pre>
  );
}

function InfoRow(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-xs text-[#94a3b8]">{props.label}</dt>
      <dd
        className={cn(
          'truncate text-right text-[#1f2937]',
          props.mono && 'font-mono text-xs'
        )}
        title={props.value}
      >
        {props.value}
      </dd>
    </div>
  );
}

function stepColor(step: string): string {
  switch (step) {
    case 'INTENT': return 'text-sky-400';
    case 'KNOWLEDGE': return 'text-violet-400';
    case 'TOOL_CALL': return 'text-cyan-400';
    case 'REPORT': return 'text-lime-400';
    case 'SYSTEM': return 'text-red-400';
    default: return 'text-white/50';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'done': return 'text-emerald-400';
    case 'running': return 'text-amber-400';
    case 'failed': return 'text-red-400';
    default: return 'text-white/30';
  }
}
