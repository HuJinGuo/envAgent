import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState(props: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-white/62">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{props.title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">{props.description}</p>
      {props.action ? <div className="mt-5">{props.action}</div> : null}
    </div>
  );
}
