import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Eye, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminRoles,
  fetchAdminUsers,
  updateAdminUser,
  type AdminRoleRecord,
  type AdminUserRecord
} from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, PageSkeleton } from './shared';

const PAGE_SIZE = 10;

type UserModalState =
  | { mode: 'create' }
  | { mode: 'edit' | 'detail'; user: AdminUserRecord }
  | null;

type UserFormValues = {
  username: string;
  roleCode: string;
  dept: string;
  status: string;
  password: string;
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState<UserModalState>(null);
  const [formValues, setFormValues] = useState<UserFormValues>({
    username: '',
    roleCode: '',
    dept: '',
    status: 'ACTIVE',
    password: ''
  });

  const usersQuery = useQuery({
    queryKey: ['admin-management', 'users'],
    queryFn: fetchAdminUsers
  });

  const rolesQuery = useQuery({
    queryKey: ['admin-management', 'roles'],
    queryFn: fetchAdminRoles
  });

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const roles = useMemo(() => rolesQuery.data?.data ?? [], [rolesQuery.data]);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pagedUsers = useMemo(
    () => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, users]
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!modalState) {
      return;
    }

    if (modalState.mode === 'create') {
      setFormValues({
        username: '',
        roleCode: roles[0]?.code ?? 'INSPECTOR',
        dept: '',
        status: 'ACTIVE',
        password: ''
      });
      return;
    }

    setFormValues({
      username: modalState.user.username,
      roleCode: modalState.user.roleCode,
      dept: modalState.user.dept,
      status: modalState.user.status,
      password: ''
    });
  }, [modalState, roles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        username: formValues.username.trim(),
        roleCode: formValues.roleCode,
        dept: formValues.dept.trim(),
        status: formValues.status,
        password: formValues.password.trim()
      };

      if (modalState?.mode === 'edit') {
        return updateAdminUser(modalState.user.id, payload);
      }

      return createAdminUser(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'users'] });
      setModalState(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'users'] });
    }
  });

  if (usersQuery.isLoading || rolesQuery.isLoading) {
    return <PageSkeleton blocks={4} />;
  }

  if (usersQuery.error || rolesQuery.error) {
    return (
      <EmptyState
        icon={Users}
        title="用户管理加载失败"
        description={getErrorMessage(usersQuery.error ?? rolesQuery.error)}
      />
    );
  }

  return (
    <>
      <Panel
        title="用户管理"
        action={
          <Button size="sm" onClick={() => setModalState({ mode: 'create' })}>
            <UserPlus className="h-4 w-4" />
            新增用户
          </Button>
        }
      >
        <div className="workspace-table">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">用户名</th>
                <th className="px-4 py-3">部门</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">最近登录</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-[#334155]">{item.username}</td>
                  <td className="px-4 py-3 text-[#64748b]">{item.dept || '--'}</td>
                  <td className="px-4 py-3 text-[#64748b]">{item.roleName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.status === 'ACTIVE' ? 'good' : 'warn'}>
                      {item.status === 'ACTIVE' ? '启用' : '停用'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">{item.lastLoginAt || '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setModalState({ mode: 'detail', user: item })}>
                        <Eye className="h-4 w-4" />
                        详情
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setModalState({ mode: 'edit', user: item })}>
                        <Edit3 className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pagedUsers.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#94a3b8]">
                    暂无用户数据。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          page={page}
          total={users.length}
          totalPages={totalPages}
          onPrev={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
        />
      </Panel>

      {modalState?.mode === 'detail' ? (
        <UserDetailModal user={modalState.user} onClose={() => setModalState(null)} />
      ) : null}

      {modalState && modalState.mode !== 'detail' ? (
        <UserFormModal
          mode={modalState.mode}
          values={formValues}
          roles={roles}
          savePending={saveMutation.isPending}
          error={saveMutation.error}
          onChange={(key, value) => setFormValues((current) => ({ ...current, [key]: value }))}
          onClose={() => setModalState(null)}
          onSubmit={() => saveMutation.mutate()}
        />
      ) : null}
    </>
  );
}

function UserFormModal(props: {
  mode: 'create' | 'edit';
  values: UserFormValues;
  roles: AdminRoleRecord[];
  savePending: boolean;
  error: unknown;
  onChange: (key: keyof UserFormValues, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[620px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">{props.mode === 'create' ? '新增用户' : '编辑用户'}</h3>
            <p className="mt-1 text-sm text-[#909399]">用户页面不单独维护权限，实际访问能力由所选角色继承。</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs text-[#606266]">用户名</span>
            <Input value={props.values.username} onChange={(event) => props.onChange('username', event.target.value)} placeholder="zhangsan" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">所属角色</span>
            <select
              value={props.values.roleCode}
              onChange={(event) => props.onChange('roleCode', event.target.value)}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              {props.roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name} ({role.code})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">部门</span>
            <Input value={props.values.dept} onChange={(event) => props.onChange('dept', event.target.value)} placeholder="监测中心" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">状态</span>
            <select
              value={props.values.status}
              onChange={(event) => props.onChange('status', event.target.value)}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              <option value="ACTIVE">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs text-[#606266]">{props.mode === 'create' ? '初始密码' : '重置密码'}</span>
            <Input
              type="password"
              value={props.values.password}
              onChange={(event) => props.onChange('password', event.target.value)}
              placeholder={props.mode === 'create' ? '留空则使用默认密码 Env@123456' : '留空表示不修改密码'}
            />
          </label>
        </div>

        {props.error ? (
          <div className="mx-5 rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
            {getErrorMessage(props.error)}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-[#ebeef5] px-5 py-4">
          <Button variant="secondary" onClick={props.onClose}>
            取消
          </Button>
          <Button onClick={props.onSubmit} disabled={props.savePending || !props.values.username.trim() || !props.values.roleCode}>
            {props.savePending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserDetailModal(props: { user: AdminUserRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[620px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">用户详情</h3>
            <p className="mt-1 text-sm text-[#909399]">账号详情只读展示，权限能力以所属角色为准。</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="workspace-table">
            <table className="w-full text-left text-sm">
              <tbody>
                <DetailRow label="用户名" value={props.user.username} />
                <DetailRow label="角色" value={`${props.user.roleName} (${props.user.roleCode})`} />
                <DetailRow label="部门" value={props.user.dept || '--'} />
                <DetailRow label="状态" value={props.user.status === 'ACTIVE' ? '启用' : '停用'} />
                <DetailRow label="最近登录" value={props.user.lastLoginAt || '--'} />
                <DetailRow label="创建时间" value={props.user.createdAt || '--'} />
                <DetailRow label="更新时间" value={props.user.updatedAt || '--'} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#ebeef5] px-5 py-4">
          <Button variant="secondary" onClick={props.onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-[140px] border-b border-[#edf2f7] bg-[#f8fafc] px-4 py-3 text-left text-[12px] font-medium text-[#64748b]">
        {props.label}
      </th>
      <td className="border-b border-[#edf2f7] px-4 py-3 text-sm text-[#334155]">{props.value}</td>
    </tr>
  );
}

function PaginationFooter(props: {
  page: number;
  total: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-[#64748b]">
      <span>共 {props.total} 条，当前第 {props.page} / {props.totalPages} 页</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={props.page <= 1} onClick={props.onPrev}>
          上一页
        </Button>
        <Button size="sm" variant="secondary" disabled={props.page >= props.totalPages} onClick={props.onNext}>
          下一页
        </Button>
      </div>
    </div>
  );
}
