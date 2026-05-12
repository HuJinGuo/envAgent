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
    <div className="relative overflow-hidden rounded border border-dashed border-[#dcdfe6] bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded border border-[#d9ecff] bg-[#ecf5ff] text-[#409eff]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-[#303133]">{props.title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#606266]">{props.description}</p>
      {props.action ? <div className="mt-6">{props.action}</div> : null}
    </div>
  );
}
