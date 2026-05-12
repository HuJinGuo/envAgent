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
    <section
      className={cn(
        'relative overflow-hidden rounded border border-[#dcdfe6] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-6',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#409eff] before:content-[""]',
        className
      )}
    >
      <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="h-1 w-14 rounded bg-[#409eff]" />
          <h2 className="text-xl font-semibold leading-tight text-[#303133] md:text-[1.375rem]">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-6 text-[#606266]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
