import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border-[#d7ff64]/60 bg-[#d7ff64] px-4 py-3 text-[#10211f] hover:bg-[#e7ff9e] shadow-[0_14px_40px_rgba(215,255,100,0.14)]',
        secondary: 'border-white/15 bg-white/8 px-4 py-3 text-white hover:bg-white/12',
        ghost: 'border-white/10 bg-transparent px-4 py-3 text-white/72 hover:bg-white/[0.05]'
      },
      size: {
        default: 'h-11',
        sm: 'h-9 rounded-xl px-3 text-xs',
        lg: 'h-12 px-5'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default'
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
