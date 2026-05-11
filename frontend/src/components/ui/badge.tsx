import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Badge(props: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]',
        props.tone === 'good' && 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
        props.tone === 'warn' && 'border-amber-300/25 bg-amber-300/10 text-amber-50',
        (!props.tone || props.tone === 'neutral') && 'border-white/12 bg-white/[0.05] text-white/60'
      )}
    >
      {props.children}
    </span>
  );
}
