import { Check, UserPlus, Users } from 'lucide-react';
import type { UserRecord, UsersWorkspace } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, InfoTile, PageSkeleton } from './shared';

export function UsersPage(props: {
  data?: UsersWorkspace;
  isLoading: boolean;
  error: unknown;
  selectedUser: UserRecord | null;
  onSelect: (id: string) => void;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={5} />;
  }

  if (props.error) {
    return <EmptyState icon={Users} title="用户管理加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data || !props.selectedUser) {
    return null;
  }

  const workspace = props.data;
  const selectedUser = props.selectedUser;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Panel
        title="用户列表"
        description="按设计文档中的三类角色组织，并保留最近登录、部门和状态字段。"
        action={
          <Button size="sm">
            <UserPlus className="h-4 w-4" />
            新增用户
          </Button>
        }
      >
        <div className="space-y-3">
          {workspace.users.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelect(item.id)}
              className={cn(
                'w-full rounded-[24px] border px-4 py-4 text-left transition',
                selectedUser.id === item.id
                  ? 'border-[#d7ff64]/45 bg-[#d7ff64]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#173544] text-sm font-semibold text-[#b6e4ff]">
                  {item.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <Badge tone={item.status === '启用' ? 'good' : 'warn'}>{item.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-white/55">
                    {item.role} · {item.dept}
                  </div>
                  <div className="mt-2 text-xs text-white/42">{item.lastLogin}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="选中用户" description="当前页保留角色、部门和状态概览，便于后续接管理接口。">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="姓名" value={selectedUser.name} />
            <InfoTile label="角色" value={selectedUser.role} />
            <InfoTile label="部门" value={selectedUser.dept} />
            <InfoTile label="最后登录" value={selectedUser.lastLogin} tone="good" />
          </div>
        </Panel>

        <Panel title="角色权限矩阵" description="直接对应原型中的功能矩阵，帮助确认页面级权限边界。">
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">功能模块</th>
                  <th className="px-4 py-3 font-medium">执法人员</th>
                  <th className="px-4 py-3 font-medium">监测分析员</th>
                  <th className="px-4 py-3 font-medium">管理层</th>
                </tr>
              </thead>
              <tbody>
                {workspace.permissions.map((item) => (
                  <tr key={item.module} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{item.module}</td>
                    <td className="px-4 py-3 text-center">{item.inspector ? <Check className="mx-auto h-4 w-4 text-emerald-300" /> : <span className="text-white/25">—</span>}</td>
                    <td className="px-4 py-3 text-center">{item.analyst ? <Check className="mx-auto h-4 w-4 text-emerald-300" /> : <span className="text-white/25">—</span>}</td>
                    <td className="px-4 py-3 text-center">{item.manager ? <Check className="mx-auto h-4 w-4 text-emerald-300" /> : <span className="text-white/25">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

