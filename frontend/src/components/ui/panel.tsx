import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, description, action, children, className }: PanelProps) {
  return (
    <section className={cn('rounded-[32px] border border-white/10 bg-[#091417]/85 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] md:p-6', className)}>
      <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-white">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-6 text-white/55">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
