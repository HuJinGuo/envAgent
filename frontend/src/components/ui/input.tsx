import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition',
        'placeholder:text-white/28 focus:border-[#d7ff64]/40 focus:bg-black/28',
        props.className
      )}
    />
  );
}
