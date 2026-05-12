import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150',
        'placeholder:text-[#c0c4cc] focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]',
        props.className
      )}
    />
  );
}
