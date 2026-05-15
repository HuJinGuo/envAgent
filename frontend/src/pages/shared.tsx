import type { ConversationMessage } from '../lib/api';
import { ApiError } from '../lib/api';
import { cn } from '../lib/utils';

export function TopStat(props: { label: string; value: string; note: string }) {
  return (
    <div className="rounded border border-[#e2e8f0] bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#94a3b8]">{props.label}</p>
      <div className="mt-1 text-base font-semibold text-[#1f2937]">{props.value}</div>
      <p className="mt-1 truncate text-xs text-[#64748b]">{props.note}</p>
    </div>
  );
}

export function MetricCard(props: { label: string; value: string; note: string; accent: 'blue' | 'emerald' | 'lime' | 'amber' }) {
  return (
    <div className="rounded border border-[#e2e8f0] bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#94a3b8]">{props.label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className={cn('text-[28px] font-semibold leading-none', accentClass(props.accent))}>{props.value}</div>
        <div className="max-w-[60%] text-right text-xs leading-5 text-[#64748b]">{props.note}</div>
      </div>
    </div>
  );
}

export function InfoTile(props: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div
      className={cn(
        'rounded border p-4',
        props.tone === 'good' && 'border-[#b7e4c7] bg-[#edfdf3]',
        props.tone === 'warn' && 'border-[#f7d9a4] bg-[#fff9ed]',
        !props.tone && 'border-[#dcdfe6] bg-white'
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#94a3b8]">{props.label}</div>
      <div className="mt-2 break-all text-sm leading-6 text-[#334155]">{props.value}</div>
    </div>
  );
}

export function BarRow(props: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-sm text-[#606266]">{props.label}</div>
      <div className="h-2 flex-1 rounded-full bg-[#ebeef5]">
        <div className="h-2 rounded-full" style={{ width: `${props.value}%`, background: props.color }} />
      </div>
      <div className="w-12 text-right text-sm text-[#909399]">{props.value}%</div>
    </div>
  );
}

export function StatusDot(props: { status: 'done' | 'running' | 'pending' | 'failed' }) {
  return (
    <span
      className={cn(
        'mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
        props.status === 'done' && 'bg-emerald-400/18 text-emerald-100',
        props.status === 'running' && 'bg-amber-300/18 text-amber-50',
        props.status === 'pending' && 'bg-white/10 text-white/45',
        props.status === 'failed' && 'bg-red-400/18 text-red-300'
      )}
    >
      {props.status === 'done' ? '✓' : props.status === 'running' ? '•' : props.status === 'failed' ? '✗' : '·'}
    </span>
  );
}

export function PageSkeleton(props: { blocks: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: props.blocks }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded border border-[#e2e8f0] bg-white" />
      ))}
    </div>
  );
}

export function getLatestReferences(messages: ConversationMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index];
    if (item.role === 'assistant' && item.sources?.length) {
      return item.sources;
    }
  }

  return [];
}

export function statusTone(value: string) {
  if (value === '已入库') {
    return 'good' as const;
  }

  if (value === '解析中' || value === '失败') {
    return 'warn' as const;
  }

  return 'neutral' as const;
}

function accentClass(accent: 'blue' | 'emerald' | 'lime' | 'amber') {
  if (accent === 'blue') {
    return 'text-[#2563eb]';
  }

  if (accent === 'emerald') {
    return 'text-[#16a34a]';
  }

  if (accent === 'amber') {
    return 'text-[#d97706]';
  }

  return 'text-[#0f766e]';
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '请求失败，请稍后再试。';
}
