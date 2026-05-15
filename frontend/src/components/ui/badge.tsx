import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Badge(props: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2.5 py-1 text-[12px] font-medium uppercase tracking-normal',
        props.tone === 'good' && 'border-[#c2e7b0] bg-[#f0f9eb] text-[#529b2e]',
        props.tone === 'warn' && 'border-[#f3d19e] bg-[#fdf6ec] text-[#b88230]',
        props.tone === 'bad' && 'border-[#fbc4c4] bg-[#fef0f0] text-[#f56c6c]',
        (!props.tone || props.tone === 'neutral') && 'border-[#d9ecff] bg-[#ecf5ff] text-[#409eff]'
      )}
    >
      {props.children}
    </span>
  );
}
