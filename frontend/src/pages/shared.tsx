import type { ConversationMessage } from '../lib/api';
import { ApiError } from '../lib/api';
import { cn } from '../lib/utils';

export function TopStat(props: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{props.label}</p>
      <div className="mt-2 text-lg font-semibold text-white">{props.value}</div>
      <p className="mt-1 text-xs text-white/45">{props.note}</p>
    </div>
  );
}

export function MetricCard(props: { label: string; value: string; note: string; accent: 'blue' | 'emerald' | 'lime' | 'amber' }) {
  return (
    <div className="rounded border border-[#dcdfe6] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="text-sm text-[#606266]">{props.label}</div>
      <div className={cn('mt-3 text-3xl font-semibold', accentClass(props.accent))}>{props.value}</div>
      <div className="mt-2 text-sm text-[#909399]">{props.note}</div>
    </div>
  );
}

export function InfoTile(props: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div
      className={cn(
        'rounded border p-4',
        props.tone === 'good' && 'border-[#c2e7b0] bg-[#f0f9eb]',
        props.tone === 'warn' && 'border-[#f3d19e] bg-[#fdf6ec]',
        !props.tone && 'border-[#dcdfe6] bg-white'
      )}
    >
      <div className="text-[11px] uppercase tracking-normal text-[#909399]">{props.label}</div>
      <div className="mt-3 break-all text-sm leading-6 text-[#303133]">{props.value}</div>
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

export function StatusDot(props: { status: 'done' | 'running' | 'pending' }) {
  return (
    <span
      className={cn(
        'mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
        props.status === 'done' && 'bg-emerald-400/18 text-emerald-100',
        props.status === 'running' && 'bg-amber-300/18 text-amber-50',
        props.status === 'pending' && 'bg-white/10 text-white/45'
      )}
    >
      {props.status === 'done' ? '✓' : props.status === 'running' ? '•' : '·'}
    </span>
  );
}

export function PageSkeleton(props: { blocks: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: props.blocks }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
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
    return 'text-[#409eff]';
  }

  if (accent === 'emerald') {
    return 'text-[#67c23a]';
  }

  if (accent === 'amber') {
    return 'text-[#e6a23c]';
  }

  return 'text-[#409eff]';
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

