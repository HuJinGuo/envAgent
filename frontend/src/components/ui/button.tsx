import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded border text-sm font-medium transition duration-150 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border-[#409eff] bg-[#409eff] px-4 py-2 text-white shadow-[0_1px_2px_rgba(64,158,255,0.18)] hover:border-[#337ecc] hover:bg-[#337ecc]',
        secondary:
          'border-[#dcdfe6] bg-white px-4 py-2 text-[#606266] hover:border-[#409eff] hover:bg-[#ecf5ff] hover:text-[#409eff]',
        ghost: 'border-transparent bg-transparent px-4 py-2 text-[#606266] hover:bg-[#ecf5ff] hover:text-[#409eff]'
      },
      size: {
        default: 'h-10',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-5'
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
