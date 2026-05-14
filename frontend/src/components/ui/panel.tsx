import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function Panel({ title, description, action, children, className, contentClassName }: PanelProps) {
  return (
    <section
      className={cn(
        'rounded border border-[#e2e8f0] bg-white p-4 md:p-5',
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[#edf2f7] pb-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold leading-tight text-[#1f2937]">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-6 text-[#64748b]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('pt-4', contentClassName)}>{children}</div>
    </section>
  );
}
