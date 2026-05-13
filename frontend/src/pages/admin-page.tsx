import { useEffect, useMemo, useState } from 'react';
import { Database, Edit3, Layers, Plus, Save, Settings, ShieldCheck, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminKnowledgeBase,
  createAdminMenu,
  createAdminModel,
  createAdminRole,
  createAdminVendor,
  deleteAdminKnowledgeBase,
  deleteAdminMenu,
  deleteAdminModel,
  deleteAdminRole,
  deleteAdminVendor,
  fetchAdminKnowledgeBases,
  fetchAdminMenus,
  fetchAdminModels,
  fetchAdminRoles,
  fetchAdminVendors,
  updateAdminKnowledgeBase,
  updateAdminMenu,
  updateAdminModel,
  updateAdminRole,
  updateAdminVendor,
  type AdminKnowledgeBaseRecord,
  type AdminMenuRecord,
  type AdminModelRecord,
  type AdminRoleRecord,
  type AdminUpsertPayload,
  type AdminVendorRecord
} from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, PageSkeleton } from './shared';

type AdminTab = 'roles' | 'menus' | 'knowledgeBases' | 'vendors' | 'models';
type AdminRecord =
  | AdminRoleRecord
  | AdminMenuRecord
  | AdminKnowledgeBaseRecord
  | AdminVendorRecord
  | AdminModelRecord;

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
};

type ModalState = {
  mode: 'create' | 'edit';
  tab: AdminTab;
} | null;

const tabs: Array<{ id: AdminTab; label: string; icon: typeof ShieldCheck }> = [
  { id: 'roles', label: '角色管理', icon: ShieldCheck },
  { id: 'menus', label: '菜单管理', icon: Layers },
  { id: 'knowledgeBases', label: '知识库管理', icon: Database },
  { id: 'vendors', label: '厂商管理', icon: Settings },
  { id: 'models', label: '模型管理', icon: Settings }
];

const fields: Record<AdminTab, FieldConfig[]> = {
  roles: [
    { key: 'code', label: '角色编码', placeholder: 'ADMIN' },
    { key: 'name', label: '角色名称', placeholder: '系统管理员' },
    { key: 'description', label: '描述' },
    { key: 'status', label: '状态', placeholder: 'ACTIVE' },
    { key: 'sortOrder', label: '排序', placeholder: '10' }
  ],
  menus: [
    { key: 'code', label: '菜单编码', placeholder: 'admin' },
    { key: 'name', label: '菜单名称', placeholder: '基础管理' },
    { key: 'section', label: '前端 Section', placeholder: 'admin' },
    { key: 'path', label: '路由路径', placeholder: '/admin' },
    { key: 'parentId', label: '父节点 ID', placeholder: '留空表示一级菜单' },
    { key: 'icon', label: '图标', placeholder: 'Settings' },
    { key: 'status', label: '状态', placeholder: 'ACTIVE' },
    { key: 'sortOrder', label: '排序', placeholder: '90' }
  ],
  knowledgeBases: [
    { key: 'code', label: '知识库编码', placeholder: 'kb-law' },
    { key: 'name', label: '知识库名称' },
    { key: 'description', label: '描述' },
    { key: 'status', label: '状态', placeholder: 'ACTIVE' },
    { key: 'sortOrder', label: '排序' }
  ],
  vendors: [
    { key: 'code', label: '厂商编码', placeholder: 'openai' },
    { key: 'name', label: '厂商名称' },
    { key: 'endpoint', label: '接口地址' },
    { key: 'status', label: '状态', placeholder: 'ACTIVE' },
    { key: 'sortOrder', label: '排序' }
  ],
  models: [
    { key: 'code', label: '模型编码', placeholder: 'gpt-4o-mini' },
    { key: 'name', label: '模型名称' },
    { key: 'vendorId', label: '厂商 ID' },
    { key: 'modelType', label: '模型类型', placeholder: 'CHAT / EMBEDDING' },
    { key: 'contextWindow', label: '上下文窗口' },
    { key: 'status', label: '状态', placeholder: 'ACTIVE' },
    { key: 'sortOrder', label: '排序' }
  ]
};

export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('roles');
  const [selectedIds, setSelectedIds] = useState<Record<AdminTab, string | null>>({
    roles: null,
    menus: null,
    knowledgeBases: null,
    vendors: null,
    models: null
  });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [modalState, setModalState] = useState<ModalState>(null);

  const rolesQuery = useQuery({
    queryKey: ['admin-management', 'roles'],
    queryFn: fetchAdminRoles
  });
  const menusQuery = useQuery({
    queryKey: ['admin-management', 'menus'],
    queryFn: fetchAdminMenus
  });
  const knowledgeBasesQuery = useQuery({
    queryKey: ['admin-management', 'knowledge-bases'],
    queryFn: fetchAdminKnowledgeBases
  });
  const vendorsQuery = useQuery({
    queryKey: ['admin-management', 'vendors'],
    queryFn: fetchAdminVendors
  });
  const modelsQuery = useQuery({
    queryKey: ['admin-management', 'models'],
    queryFn: fetchAdminModels
  });

  const menuTree = menusQuery.data?.data ?? [];
  const flattenedMenus = useMemo(() => flattenMenuTree(menuTree), [menuTree]);
  const recordsByTab = useMemo<Record<AdminTab, AdminRecord[]>>(
    () => ({
      roles: rolesQuery.data?.data ?? [],
      menus: flattenedMenus,
      knowledgeBases: knowledgeBasesQuery.data?.data ?? [],
      vendors: vendorsQuery.data?.data ?? [],
      models: modelsQuery.data?.data ?? []
    }),
    [flattenedMenus, knowledgeBasesQuery.data, modelsQuery.data, rolesQuery.data, vendorsQuery.data]
  );

  const activeRecords = recordsByTab[activeTab];
  const selectedRecord = activeRecords.find((item) => item.id === selectedIds[activeTab]) ?? activeRecords[0] ?? null;
  const isLoading =
    rolesQuery.isLoading ||
    menusQuery.isLoading ||
    knowledgeBasesQuery.isLoading ||
    vendorsQuery.isLoading ||
    modelsQuery.isLoading;
  const firstError =
    rolesQuery.error ?? menusQuery.error ?? knowledgeBasesQuery.error ?? vendorsQuery.error ?? modelsQuery.error;
  const activeFieldConfig = fields[activeTab];
  const activeModalTab = modalState?.tab ?? activeTab;
  const modalFields = fields[activeModalTab];
  const modalRecord = modalState?.mode === 'edit' ? selectedRecord : null;

  useEffect(() => {
    if (!selectedIds[activeTab] && activeRecords[0]) {
      setSelectedIds((current) => ({ ...current, [activeTab]: activeRecords[0].id }));
    }
  }, [activeRecords, activeTab, selectedIds]);

  useEffect(() => {
    if (!modalState) {
      return;
    }
    if (modalState.mode === 'create') {
      setFormValues(buildEmptyValues(modalState.tab));
      return;
    }
    if (selectedRecord) {
      setFormValues(recordToFormValues(modalState.tab, selectedRecord));
    }
  }, [modalState, selectedRecord]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modalState) {
        return null;
      }
      const payload = buildPayload(modalState.tab, formValues);
      if (modalState.mode === 'edit' && selectedRecord) {
        return updateRecord(modalState.tab, selectedRecord.id, payload);
      }
      return createRecord(modalState.tab, payload);
    },
    onSuccess: async (response) => {
      await invalidateAdmin(queryClient, activeModalTab);
      if (response && typeof response === 'object' && 'data' in response) {
        const item = response.data as { id?: string | number } | null;
        if (item?.id != null) {
          setSelectedIds((current) => ({ ...current, [activeModalTab]: String(item.id) }));
        }
      }
      setModalState(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { id: string; tab: AdminTab } | null) => {
      if (!payload) {
        return null;
      }
      return deleteRecord(payload.tab, payload.id);
    },
    onSuccess: async () => {
      setSelectedIds((current) => ({ ...current, [activeTab]: null }));
      await invalidateAdmin(queryClient, activeTab);
    }
  });

  if (isLoading) {
    return <PageSkeleton blocks={5} />;
  }

  if (firstError) {
    return <EmptyState icon={Settings} title="基础管理加载失败" description={getErrorMessage(firstError)} />;
  }

  return (
    <>
      <div className="space-y-5">
        <Panel title="基础管理" description="维护角色、个性化菜单、知识库、模型厂商和模型元数据。">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded border px-3 text-sm transition',
                    active
                      ? 'border-[#409eff] bg-[#ecf5ff] text-[#409eff]'
                      : 'border-[#dcdfe6] bg-white text-[#606266] hover:border-[#409eff] hover:text-[#409eff]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </Panel>

        {activeTab === 'menus' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_340px]">
            <Panel
              title="左侧菜单树"
              description="直接映射系统左侧导航结构。单击节点可查看元数据，新增和编辑都通过弹窗完成。"
              action={
                <Button size="sm" onClick={() => setModalState({ mode: 'create', tab: 'menus' })}>
                  <Plus className="h-4 w-4" />
                  新增菜单
                </Button>
              }
            >
              {menuTree.length ? (
                <div className="space-y-2">
                  {menuTree.map((item) => (
                    <MenuTreeNode
                      key={item.id}
                      item={item}
                      selectedId={selectedIds.menus}
                      onSelect={(id) => setSelectedIds((current) => ({ ...current, menus: id }))}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Layers} title="暂无菜单" description="当前没有可管理的左侧菜单节点。" />
              )}
            </Panel>

            <Panel
              title="节点信息"
              description="当前节点的编码、Section、路由和显示状态。结构调整通过菜单树和弹窗表单完成。"
              action={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedRecord}
                    onClick={() => selectedRecord && setModalState({ mode: 'edit', tab: 'menus' })}
                  >
                    <Edit3 className="h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedRecord || deleteMutation.isPending}
                    onClick={() => selectedRecord && deleteMutation.mutate({ id: selectedRecord.id, tab: 'menus' })}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending ? '删除中...' : '删除'}
                  </Button>
                </div>
              }
            >
              {selectedRecord ? (
                <div className="space-y-3">
                  <DetailRow label="菜单名称" value={displayName(selectedRecord)} />
                  <DetailRow label="菜单编码" value={displayCode(selectedRecord)} />
                  <DetailRow label="Section" value={'section' in selectedRecord ? selectedRecord.section : '--'} />
                  <DetailRow label="路由路径" value={'path' in selectedRecord ? selectedRecord.path : '--'} />
                  <DetailRow label="父节点" value={'parentId' in selectedRecord ? selectedRecord.parentId || '一级菜单' : '--'} />
                  <DetailRow label="图标" value={'icon' in selectedRecord ? selectedRecord.icon || '--' : '--'} />
                  <div className="rounded border border-[#dcdfe6] bg-[#fafafa] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-normal text-[#909399]">显示状态</div>
                    <div className="mt-3">
                      <Badge tone={displayStatus(selectedRecord) === 'ACTIVE' ? 'good' : 'neutral'}>{displayStatus(selectedRecord)}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Layers} title="请选择菜单节点" description="从左侧树结构中选中一个节点后，可查看或编辑其配置。" />
              )}
            </Panel>
          </div>
        ) : (
          <Panel
            title={tabs.find((item) => item.id === activeTab)?.label ?? '管理列表'}
            description="列表数据来自基础管理接口；新增和编辑统一通过弹窗处理。"
            action={
              <Button size="sm" onClick={() => setModalState({ mode: 'create', tab: activeTab })}>
                <Plus className="h-4 w-4" />
                新增
              </Button>
            }
          >
            <div className="overflow-hidden rounded border border-[#dcdfe6]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3">名称</th>
                    <th className="px-4 py-3">编码</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">排序</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((item) => (
                    <tr
                      key={item.id}
                      className={cn('transition', selectedRecord?.id === item.id && 'bg-[#ecf5ff]')}
                      onClick={() => setSelectedIds((current) => ({ ...current, [activeTab]: item.id }))}
                    >
                      <td className="px-4 py-3 font-medium text-[#303133]">{displayName(item)}</td>
                      <td className="px-4 py-3">{displayCode(item)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={displayStatus(item) === 'ACTIVE' ? 'good' : 'neutral'}>{displayStatus(item)}</Badge>
                      </td>
                      <td className="px-4 py-3">{String(item.sortOrder ?? 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedIds((current) => ({ ...current, [activeTab]: item.id }));
                              setModalState({ mode: 'edit', tab: activeTab });
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deleteMutation.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedIds((current) => ({ ...current, [activeTab]: item.id }));
                              deleteMutation.mutate({ id: item.id, tab: activeTab });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {modalState ? (
        <AdminModal
          title={modalState.mode === 'create' ? `新增${tabLabel(modalState.tab)}` : `编辑${tabLabel(modalState.tab)}`}
          fields={modalFields}
          values={formValues}
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

function AdminModal(props: {
  title: string;
  fields: FieldConfig[];
  values: Record<string, string>;
  savePending: boolean;
  error: unknown;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[560px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">{props.title}</h3>
            <p className="mt-1 text-sm text-[#909399]">保存后会立即刷新当前管理列表。</p>
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
          {props.fields.map((field) => (
            <label key={field.key} className={cn('block space-y-2', field.key === 'description' && 'sm:col-span-2')}>
              <span className="text-xs text-[#606266]">{field.label}</span>
              <Input
                value={props.values[field.key] ?? ''}
                onChange={(event) => props.onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}
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
          <Button onClick={props.onSubmit} disabled={props.savePending}>
            <Save className="h-4 w-4" />
            {props.savePending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MenuTreeNode(props: {
  item: AdminMenuRecord;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const depth = props.depth ?? 0;
  const selected = props.selectedId === props.item.id;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => props.onSelect(props.item.id)}
        className={cn(
          'flex w-full items-center justify-between rounded border px-4 py-3 text-left transition',
          selected
            ? 'border-[#409eff] bg-[#ecf5ff]'
            : 'border-[#dcdfe6] bg-white hover:border-[#bfdcff] hover:bg-[#f8fbff]'
        )}
        style={{ marginLeft: depth * 18 }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#303133]">{props.item.name}</span>
            <Badge tone={displayStatus(props.item) === 'ACTIVE' ? 'good' : 'neutral'}>{displayStatus(props.item)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#909399]">
            <span>{props.item.code}</span>
            <span>{props.item.path}</span>
            <span>{props.item.section}</span>
          </div>
        </div>
        <div className="text-right text-xs text-[#909399]">
          <div>#{props.item.sortOrder}</div>
          <div>{props.item.children.length} 子项</div>
        </div>
      </button>
      {props.item.children.length ? (
        <div className="space-y-2">
          {props.item.children.map((child) => (
            <MenuTreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={props.selectedId}
              onSelect={props.onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#dcdfe6] bg-[#fafafa] px-4 py-3">
      <div className="text-[11px] uppercase tracking-normal text-[#909399]">{props.label}</div>
      <div className="mt-3 break-all text-sm leading-6 text-[#303133]">{props.value || '--'}</div>
    </div>
  );
}

function buildEmptyValues(tab: AdminTab) {
  return Object.fromEntries(fields[tab].map((field) => [field.key, '']));
}

function recordToFormValues(tab: AdminTab, record: AdminRecord) {
  return Object.fromEntries(
    fields[tab].map((field) => {
      const value = (record as unknown as Record<string, unknown>)[field.key];
      return [field.key, Array.isArray(value) ? value.join(',') : String(value ?? '')];
    })
  );
}

function buildPayload(tab: AdminTab, values: Record<string, string>): AdminUpsertPayload {
  const payload: AdminUpsertPayload = {};
  for (const field of fields[tab]) {
    const value = values[field.key]?.trim() ?? '';
    if (['sortOrder', 'contextWindow', 'vendorId', 'parentId'].includes(field.key)) {
      payload[field.key] = value ? Number(value) : null;
    } else {
      payload[field.key] = value;
    }
  }

  if (tab === 'menus') {
    payload.title = String(payload.name ?? payload.code ?? '');
    payload.component = `${String(payload.section || payload.code || 'Admin')}View`;
    payload.redirect = '';
    payload.visible = !isDisabledStatus(String(payload.status ?? 'ACTIVE'));
  }

  if (tab === 'vendors') {
    payload.baseUrl = payload.endpoint;
    payload.enabled = !isDisabledStatus(String(payload.status ?? 'ACTIVE'));
  }

  if (tab === 'roles' || tab === 'models') {
    payload.enabled = !isDisabledStatus(String(payload.status ?? 'ACTIVE'));
  }

  if (tab === 'knowledgeBases') {
    delete payload.status;
  }

  return payload;
}

function isDisabledStatus(value: string) {
  return ['DISABLED', 'INACTIVE', 'DELETED', '停用', '禁用'].includes(value.trim().toUpperCase());
}

function createRecord(tab: AdminTab, payload: AdminUpsertPayload) {
  if (tab === 'roles') return createAdminRole(payload);
  if (tab === 'menus') return createAdminMenu(payload);
  if (tab === 'knowledgeBases') return createAdminKnowledgeBase(payload);
  if (tab === 'vendors') return createAdminVendor(payload);
  return createAdminModel(payload);
}

function updateRecord(tab: AdminTab, id: string, payload: AdminUpsertPayload) {
  if (tab === 'roles') return updateAdminRole(id, payload);
  if (tab === 'menus') return updateAdminMenu(id, payload);
  if (tab === 'knowledgeBases') return updateAdminKnowledgeBase(id, payload);
  if (tab === 'vendors') return updateAdminVendor(id, payload);
  return updateAdminModel(id, payload);
}

function deleteRecord(tab: AdminTab, id: string) {
  if (tab === 'roles') return deleteAdminRole(id);
  if (tab === 'menus') return deleteAdminMenu(id);
  if (tab === 'knowledgeBases') return deleteAdminKnowledgeBase(id);
  if (tab === 'vendors') return deleteAdminVendor(id);
  return deleteAdminModel(id);
}

function invalidateAdmin(queryClient: ReturnType<typeof useQueryClient>, tab: AdminTab) {
  const key = tab === 'knowledgeBases' ? 'knowledge-bases' : tab;
  return queryClient.invalidateQueries({ queryKey: ['admin-management', key] });
}

function displayName(record: AdminRecord) {
  return record.name;
}

function displayCode(record: AdminRecord) {
  return record.code;
}

function displayStatus(record: AdminRecord) {
  return 'status' in record ? record.status : 'ACTIVE';
}

function tabLabel(tab: AdminTab) {
  return tabs.find((item) => item.id === tab)?.label ?? '配置';
}

function flattenMenuTree(items: AdminMenuRecord[]): AdminMenuRecord[] {
  const flattened: AdminMenuRecord[] = [];
  for (const item of items) {
    flattened.push(item);
    if (item.children.length) {
      flattened.push(...flattenMenuTree(item.children));
    }
  }
  return flattened;
}
