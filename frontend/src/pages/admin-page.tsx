import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Database, Edit3, Eye, Layers, Plus, Settings, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  createAdminDictItem,
  createAdminKnowledgeBase,
  createAdminMenu,
  createAdminModel,
  createAdminRole,
  createAdminVendor,
  deleteAdminDictItem,
  deleteAdminKnowledgeBase,
  deleteAdminMenu,
  deleteAdminModel,
  deleteAdminRole,
  deleteAdminVendor,
  fetchAdminDictItems,
  fetchAdminKnowledgeBases,
  fetchAdminMenus,
  fetchAdminModels,
  fetchAdminRoles,
  fetchAdminVendors,
  replaceAdminRoleMenus,
  updateAdminDictItem,
  updateAdminKnowledgeBase,
  updateAdminMenu,
  updateAdminModel,
  updateAdminRole,
  updateAdminVendor,
  type AdminDictionaryRecord,
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
import { adminTabMeta, type AdminTab } from '../lib/admin-tabs';
import { fallbackWorkspaceRoutes } from '../lib/workspace-routes';
import { getErrorMessage, PageSkeleton } from './shared';

const PAGE_SIZE = 10;

type AdminRecord =
  | AdminRoleRecord
  | AdminMenuRecord
  | AdminDictionaryRecord
  | AdminKnowledgeBaseRecord
  | AdminVendorRecord
  | AdminModelRecord;

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
  helpText?: string;
  span?: 1 | 2;
};

type ModalState =
  | { mode: 'create'; tab: AdminTab }
  | { mode: 'edit' | 'detail'; tab: AdminTab; record: AdminRecord }
  | null;

type RoleMenuState = {
  role: AdminRoleRecord;
  selectedMenuIds: string[];
} | null;

type SelectOption = {
  label: string;
  value: string;
};

const tabs: Array<{ id: AdminTab; label: string; icon: typeof ShieldCheck }> = [
  { id: 'roles', label: '角色管理', icon: ShieldCheck },
  { id: 'menus', label: '菜单管理', icon: Layers },
  { id: 'knowledgeBases', label: '知识库管理', icon: Database },
  { id: 'vendors', label: '厂商管理', icon: Settings },
  { id: 'models', label: '模型管理', icon: Settings },
  { id: 'dictionaries', label: '业务字典', icon: Settings }
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
    { key: 'code', label: '菜单编码', placeholder: 'menus' },
    { key: 'name', label: '菜单名称', placeholder: '菜单管理' },
    { key: 'title', label: '显示标题', placeholder: '菜单管理' },
    { key: 'path', label: '路由路径', placeholder: '/admin/menus' },
    { key: 'parentId', label: '上级菜单' },
    { key: 'component', label: '页面组件', placeholder: 'AdminView' },
    { key: 'icon', label: '图标', placeholder: 'Layers' },
    { key: 'redirect', label: '重定向', placeholder: '/admin/users' },
    { key: 'sortOrder', label: '排序', placeholder: '30' },
    { key: 'visible', label: '可见性', placeholder: 'true' }
  ],
  knowledgeBases: [
    { key: 'code', label: '知识库编码', placeholder: 'kb-law' },
    { key: 'name', label: '知识库名称' },
    { key: 'description', label: '描述' },
    { key: 'sortOrder', label: '排序' }
  ],
  vendors: [
    { key: 'code', label: '厂商编码', placeholder: 'openai' },
    { key: 'name', label: '厂商名称' },
    { key: 'endpoint', label: '接口地址' },
    { key: 'apiKey', label: 'API Key', type: 'password', helpText: '编辑时留空则保持当前密钥不变。', span: 2 },
    { key: 'description', label: '描述', placeholder: '用于区分厂商接入能力与用途', span: 2 },
    { key: 'status', label: '状态', placeholder: 'ACTIVE' },
    { key: 'sortOrder', label: '排序' }
  ],
  models: [
    { key: 'code', label: '模型编码', placeholder: 'gpt-4o-mini' },
    { key: 'name', label: '模型名称' },
    { key: 'vendorId', label: '所属厂商' },
    { key: 'modelType', label: '模型类型' },
    { key: 'contextWindow', label: '上下文窗口' },
    { key: 'status', label: '状态' },
    { key: 'sortOrder', label: '排序' }
  ],
  dictionaries: [
    { key: 'dictType', label: '字典类型', placeholder: 'COMMON_STATUS' },
    { key: 'dictLabel', label: '字典标签', placeholder: '启用' },
    { key: 'dictValue', label: '字典值', placeholder: 'ACTIVE' },
    { key: 'description', label: '描述', span: 2 },
    { key: 'status', label: '状态' },
    { key: 'sortOrder', label: '排序' }
  ]
};

export function AdminPage(props: { activeTab?: AdminTab } = {}) {
  const queryClient = useQueryClient();
  const activeTab = props.activeTab ?? 'roles';
  const [pageByTab, setPageByTab] = useState<Record<AdminTab, number>>({
    roles: 1,
    menus: 1,
    knowledgeBases: 1,
    vendors: 1,
    models: 1,
    dictionaries: 1
  });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [modalState, setModalState] = useState<ModalState>(null);
  const [roleMenuState, setRoleMenuState] = useState<RoleMenuState>(null);
  const [expandedMenuIds, setExpandedMenuIds] = useState<string[]>([]);

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
  const dictItemsQuery = useQuery({
    queryKey: ['admin-management', 'dict-items'],
    queryFn: fetchAdminDictItems
  });
  const modelsQuery = useQuery({
    queryKey: ['admin-management', 'models'],
    queryFn: fetchAdminModels
  });

  const menuTree = menusQuery.data?.data ?? [];
  const flattenedMenus = useMemo(() => flattenMenuTree(menuTree), [menuTree]);
  const dictItems = dictItemsQuery.data?.data ?? [];
  const vendors = vendorsQuery.data?.data ?? [];
  const recordsByTab = useMemo<Record<AdminTab, AdminRecord[]>>(
    () => ({
      roles: rolesQuery.data?.data ?? [],
      menus: flattenedMenus,
      knowledgeBases: knowledgeBasesQuery.data?.data ?? [],
      vendors,
      models: modelsQuery.data?.data ?? [],
      dictionaries: dictItems
    }),
    [dictItems, flattenedMenus, knowledgeBasesQuery.data, modelsQuery.data, rolesQuery.data, vendors]
  );

  const activeRecords = recordsByTab[activeTab];
  const currentPage = pageByTab[activeTab];
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / PAGE_SIZE));
  const pagedRecords = useMemo(
    () => activeRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [activeRecords, currentPage]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setPageByTab((current) => ({ ...current, [activeTab]: totalPages }));
    }
  }, [activeTab, currentPage, totalPages]);

  useEffect(() => {
    if (!modalState) {
      return;
    }
    if (modalState.mode === 'create') {
      setFormValues(buildEmptyValues(modalState.tab));
      return;
    }
    setFormValues(recordToFormValues(modalState.tab, modalState.record));
  }, [modalState]);

  useEffect(() => {
    setExpandedMenuIds(collectExpandableMenuIds(menuTree));
  }, [menuTree]);

  const isLoading =
    rolesQuery.isLoading ||
    menusQuery.isLoading ||
    knowledgeBasesQuery.isLoading ||
    vendorsQuery.isLoading ||
    dictItemsQuery.isLoading ||
    modelsQuery.isLoading;
  const firstError =
    rolesQuery.error ?? menusQuery.error ?? knowledgeBasesQuery.error ?? vendorsQuery.error ?? dictItemsQuery.error ?? modelsQuery.error;

  const statusOptions = useMemo(() => buildDictOptions(dictItems, 'COMMON_STATUS'), [dictItems]);
  const modelTypeOptions = useMemo(() => buildDictOptions(dictItems, 'MODEL_TYPE'), [dictItems]);
  const vendorOptions = useMemo<SelectOption[]>(
    () => vendors.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id })),
    [vendors]
  );
  const dictTypeOptions = useMemo<SelectOption[]>(
    () =>
      Array.from(new Set(dictItems.map((item) => item.dictType)))
        .filter(Boolean)
        .map((item) => ({ label: item, value: item })),
    [dictItems]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modalState || modalState.mode === 'detail') {
        return null;
      }
      const payload = buildPayload(modalState.tab, formValues);
      if (modalState.mode === 'edit') {
        return updateRecord(modalState.tab, modalState.record.id, payload);
      }
      return createRecord(modalState.tab, payload);
    },
    onSuccess: async () => {
      if (!modalState || modalState.mode === 'detail') {
        return;
      }
      await invalidateAdmin(queryClient, modalState.tab);
      if (modalState.tab === 'menus') {
        await queryClient.invalidateQueries({ queryKey: ['admin-navigation'] });
      }
      setModalState(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ tab, id }: { tab: AdminTab; id: string }) => deleteRecord(tab, id),
    onSuccess: async (_, variables) => {
      await invalidateAdmin(queryClient, variables.tab);
      if (variables.tab === 'menus') {
        await queryClient.invalidateQueries({ queryKey: ['admin-navigation'] });
      }
    }
  });

  const roleMenuMutation = useMutation({
    mutationFn: ({ id, menuIds }: { id: string; menuIds: string[] }) => replaceAdminRoleMenus(id, menuIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'roles'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-navigation'] });
      setRoleMenuState(null);
    }
  });

  if (isLoading) {
    return <PageSkeleton blocks={5} />;
  }

  if (firstError) {
    return <EmptyState icon={Settings} title="基础管理加载失败" description={getErrorMessage(firstError)} />;
  }

  const meta = adminTabMeta[activeTab];

  return (
    <>
      <Panel
        title={meta.title}
        description={meta.description}
        action={
          <Button size="sm" onClick={() => setModalState({ mode: 'create', tab: activeTab })}>
            <Plus className="h-4 w-4" />
            新增
          </Button>
        }
      >
        <div className="workspace-table">
          <table className="w-full text-left text-sm">
            <thead>{renderTableHead(activeTab)}</thead>
            {activeTab === 'menus' ? (
              <tbody>
                {menuTree.length ? (
                  menuTree.map((record) => (
                    <MenuTreeRow
                      key={record.id}
                      item={record}
                      expandedMenuIds={expandedMenuIds}
                      onToggleExpand={(menuId) =>
                        setExpandedMenuIds((current) =>
                          current.includes(menuId) ? current.filter((item) => item !== menuId) : [...current, menuId]
                        )
                      }
                      buildHandlers={(menu) => ({
                        onDetail: () => setModalState({ mode: 'detail', tab: activeTab, record: menu }),
                        onEdit: () => setModalState({ mode: 'edit', tab: activeTab, record: menu }),
                        onDelete: () => deleteMutation.mutate({ tab: activeTab, id: menu.id }),
                        onRoleMenus: () => undefined
                      })}
                      deletePending={deleteMutation.isPending}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#94a3b8]">
                      暂无数据。
                    </td>
                  </tr>
                )}
              </tbody>
            ) : (
              <tbody>
                {pagedRecords.map((record) =>
                  renderTableRow(
                    activeTab,
                    record,
                    flattenedMenus,
                    {
                      onDetail: () => setModalState({ mode: 'detail', tab: activeTab, record }),
                      onEdit: () => setModalState({ mode: 'edit', tab: activeTab, record }),
                      onDelete: () => deleteMutation.mutate({ tab: activeTab, id: record.id }),
                      onRoleMenus: () => {
                        if ('menuIds' in record) {
                          setRoleMenuState({
                            role: record,
                            selectedMenuIds: [...record.menuIds]
                          });
                        }
                      }
                    },
                    deleteMutation.isPending
                  )
                )}
                {!pagedRecords.length ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'roles' || activeTab === 'vendors' || activeTab === 'models' ? 7 : 6}
                      className="px-4 py-8 text-center text-sm text-[#94a3b8]"
                    >
                      暂无数据。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            )}
          </table>
        </div>

        {activeTab === 'menus' ? null : (
          <PaginationFooter
            page={currentPage}
            total={activeRecords.length}
            totalPages={totalPages}
            onPrev={() => setPageByTab((current) => ({ ...current, [activeTab]: Math.max(1, current[activeTab] - 1) }))}
            onNext={() => setPageByTab((current) => ({ ...current, [activeTab]: Math.min(totalPages, current[activeTab] + 1) }))}
          />
        )}
      </Panel>

      {modalState?.mode === 'detail' ? (
        <RecordDetailModal
          title={`${tabLabel(modalState.tab)}详情`}
          rows={buildDetailRows(modalState.tab, modalState.record, flattenedMenus)}
          onClose={() => setModalState(null)}
        />
      ) : null}

      {modalState && modalState.mode !== 'detail' && modalState.tab === 'menus' ? (
        <MenuFormModal
          mode={modalState.mode}
          values={formValues}
          menuOptions={buildParentMenuOptions(menuTree, modalState.mode === 'edit' ? modalState.record.id : null)}
          savePending={saveMutation.isPending}
          error={saveMutation.error}
          onChange={(key, value) => setFormValues((current) => ({ ...current, [key]: value }))}
          onClose={() => setModalState(null)}
          onSubmit={() => saveMutation.mutate()}
        />
      ) : null}

      {modalState && modalState.mode !== 'detail' && modalState.tab !== 'menus' ? (
        <RecordFormModal
          tab={modalState.tab}
          mode={modalState.mode}
          title={modalState.mode === 'create' ? `新增${tabLabel(modalState.tab)}` : `编辑${tabLabel(modalState.tab)}`}
          description=""
          fields={fields[modalState.tab]}
          values={formValues}
          selectOptionsByField={buildFieldOptions(modalState.tab, {
            statusOptions,
            modelTypeOptions,
            vendorOptions,
            dictTypeOptions
          })}
          savePending={saveMutation.isPending}
          error={saveMutation.error}
          onChange={(key, value) => setFormValues((current) => ({ ...current, [key]: value }))}
          onClose={() => setModalState(null)}
          onSubmit={() => saveMutation.mutate()}
        />
      ) : null}

      {roleMenuState ? (
        <RoleMenusModal
          role={roleMenuState.role}
          menuTree={menuTree}
          selectedMenuIds={roleMenuState.selectedMenuIds}
          savePending={roleMenuMutation.isPending}
          error={roleMenuMutation.error}
          onToggle={(menuId) =>
            setRoleMenuState((current) =>
              current
                ? {
                    ...current,
                    selectedMenuIds: current.selectedMenuIds.includes(menuId)
                      ? current.selectedMenuIds.filter((item) => item !== menuId)
                      : [...current.selectedMenuIds, menuId]
                  }
                : current
            )
          }
          onClose={() => setRoleMenuState(null)}
          onSubmit={() => roleMenuMutation.mutate({ id: roleMenuState.role.id, menuIds: roleMenuState.selectedMenuIds })}
        />
      ) : null}
    </>
  );
}

function renderTableHead(tab: AdminTab) {
  if (tab === 'roles') {
    return (
      <tr>
        <th className="px-4 py-3">角色名称</th>
        <th className="px-4 py-3">角色编码</th>
        <th className="px-4 py-3">状态</th>
        <th className="px-4 py-3">排序</th>
        <th className="px-4 py-3">关联菜单</th>
        <th className="px-4 py-3">描述</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  if (tab === 'menus') {
    return (
      <tr>
        <th className="px-4 py-3">菜单名称</th>
        <th className="px-4 py-3">路由路径</th>
        <th className="px-4 py-3">类型</th>
        <th className="px-4 py-3">组件</th>
        <th className="px-4 py-3">可见性</th>
        <th className="px-4 py-3">排序</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  if (tab === 'knowledgeBases') {
    return (
      <tr>
        <th className="px-4 py-3">名称</th>
        <th className="px-4 py-3">编码</th>
        <th className="px-4 py-3">文档数</th>
        <th className="px-4 py-3">排序</th>
        <th className="px-4 py-3">描述</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  if (tab === 'vendors') {
    return (
      <tr>
        <th className="px-4 py-3">名称</th>
        <th className="px-4 py-3">编码</th>
        <th className="px-4 py-3">状态</th>
        <th className="px-4 py-3">接口地址</th>
        <th className="px-4 py-3">API Key</th>
        <th className="px-4 py-3">排序</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  if (tab === 'dictionaries') {
    return (
      <tr>
        <th className="px-4 py-3">字典类型</th>
        <th className="px-4 py-3">字典标签</th>
        <th className="px-4 py-3">字典值</th>
        <th className="px-4 py-3">状态</th>
        <th className="px-4 py-3">排序</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  return (
    <tr>
      <th className="px-4 py-3">名称</th>
      <th className="px-4 py-3">编码</th>
      <th className="px-4 py-3">厂商</th>
      <th className="px-4 py-3">模型类型</th>
      <th className="px-4 py-3">状态</th>
      <th className="px-4 py-3">排序</th>
      <th className="px-4 py-3 text-right">操作</th>
    </tr>
  );
}

function MenuTreeRow(props: {
  item: AdminMenuRecord;
  expandedMenuIds: string[];
  buildHandlers: (record: AdminMenuRecord) => {
    onDetail: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onRoleMenus: () => void;
  };
  deletePending: boolean;
  depth?: number;
  onToggleExpand: (menuId: string) => void;
}) {
  const depth = props.depth ?? 0;
  const hasChildren = props.item.children.length > 0;
  const expanded = props.expandedMenuIds.includes(props.item.id);
  const handlers = props.buildHandlers(props.item);

  return (
    <>
      <tr>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 18 }}>
            {hasChildren ? (
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-[#94a3b8] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
                onClick={() => props.onToggleExpand(props.item.id)}
                aria-label={expanded ? '折叠菜单' : '展开菜单'}
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="inline-block h-6 w-6" />
            )}
            <div>
              <div className="font-medium text-[#334155]">{props.item.name}</div>
              <div className="mt-1 text-xs text-[#94a3b8]">{props.item.code}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{props.item.path || '--'}</td>
        <td className="px-4 py-3 text-[#64748b]">{describeMenuKind(props.item)}</td>
        <td className="px-4 py-3 text-[#64748b]">{props.item.component || '--'}</td>
        <td className="px-4 py-3">
          <Badge tone={props.item.visible ? 'good' : 'warn'}>{props.item.visible ? '显示' : '隐藏'}</Badge>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{props.item.sortOrder}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={props.deletePending} />
          </div>
        </td>
      </tr>

      {hasChildren && expanded
        ? props.item.children.map((child) => (
            <MenuTreeRow
              key={child.id}
              item={child}
              depth={depth + 1}
              expandedMenuIds={props.expandedMenuIds}
              onToggleExpand={props.onToggleExpand}
              buildHandlers={props.buildHandlers}
              deletePending={props.deletePending}
            />
          ))
        : null}
    </>
  );
}

function renderTableRow(
  tab: AdminTab,
  record: AdminRecord,
  flattenedMenus: AdminMenuRecord[],
  handlers: {
    onDetail: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onRoleMenus: () => void;
  },
  deletePending: boolean
) {
  if (tab === 'roles') {
    const role = record as AdminRoleRecord;
    return (
      <tr key={role.id}>
        <td className="px-4 py-3 font-medium text-[#334155]">{role.name}</td>
        <td className="px-4 py-3 text-[#64748b]">{role.code}</td>
        <td className="px-4 py-3">
          <Badge tone={role.status === 'ACTIVE' ? 'good' : 'warn'}>{role.status}</Badge>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{role.sortOrder}</td>
        <td className="px-4 py-3 text-[#64748b]">{role.menuIds.length}</td>
        <td className="max-w-[280px] px-4 py-3 text-[#64748b]">{role.description || '--'}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} includeRoleMenus />
          </div>
        </td>
      </tr>
    );
  }

  if (tab === 'menus') {
    const menu = record as AdminMenuRecord;
    return (
      <tr key={menu.id}>
        <td className="px-4 py-3">
          <div className="font-medium text-[#334155]">{menu.name}</div>
          <div className="mt-1 text-xs text-[#94a3b8]">{menu.code}</div>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{menu.path}</td>
        <td className="px-4 py-3 text-[#64748b]">{findMenuName(flattenedMenus, menu.parentId) || '一级菜单'}</td>
        <td className="px-4 py-3 text-[#64748b]">{menu.component || '--'}</td>
        <td className="px-4 py-3">
          <Badge tone={menu.visible ? 'good' : 'warn'}>{menu.visible ? '显示' : '隐藏'}</Badge>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{menu.sortOrder}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} />
          </div>
        </td>
      </tr>
    );
  }

  if (tab === 'knowledgeBases') {
    const item = record as AdminKnowledgeBaseRecord;
    return (
      <tr key={item.id}>
        <td className="px-4 py-3 font-medium text-[#334155]">{item.name}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.code}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.documentCount}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.sortOrder}</td>
        <td className="max-w-[320px] px-4 py-3 text-[#64748b]">{item.description || '--'}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} />
          </div>
        </td>
      </tr>
    );
  }

  if (tab === 'vendors') {
    const item = record as AdminVendorRecord;
    return (
      <tr key={item.id}>
        <td className="px-4 py-3 font-medium text-[#334155]">{item.name}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.code}</td>
        <td className="px-4 py-3">
          <Badge tone={item.status === 'ACTIVE' ? 'good' : 'warn'}>{item.status}</Badge>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{item.endpoint || '--'}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.apiKeyMasked || '未配置'}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.sortOrder}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} />
          </div>
        </td>
      </tr>
    );
  }

  if (tab === 'dictionaries') {
    const item = record as AdminDictionaryRecord;
    return (
      <tr key={item.id}>
        <td className="px-4 py-3 font-medium text-[#334155]">{item.dictType}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.dictLabel}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.dictValue}</td>
        <td className="px-4 py-3">
          <Badge tone={item.status === 'ACTIVE' ? 'good' : 'warn'}>{item.status}</Badge>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{item.sortOrder}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} />
          </div>
        </td>
      </tr>
    );
  }

  const item = record as AdminModelRecord;
  return (
    <tr key={item.id}>
      <td className="px-4 py-3 font-medium text-[#334155]">{item.name}</td>
      <td className="px-4 py-3 text-[#64748b]">{item.code}</td>
      <td className="px-4 py-3 text-[#64748b]">{item.vendorName || item.vendorId || '--'}</td>
      <td className="px-4 py-3 text-[#64748b]">{item.modelType}</td>
      <td className="px-4 py-3">
        <Badge tone={item.status === 'ACTIVE' ? 'good' : 'warn'}>{item.status}</Badge>
      </td>
      <td className="px-4 py-3 text-[#64748b]">{item.sortOrder}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <ActionButtons handlers={handlers} deletePending={deletePending} />
        </div>
      </td>
    </tr>
  );
}

function ActionButtons(props: {
  handlers: {
    onDetail: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onRoleMenus: () => void;
  };
  deletePending: boolean;
  includeRoleMenus?: boolean;
}) {
  return (
    <>
      <Button size="sm" variant="ghost" onClick={props.handlers.onDetail}>
        <Eye className="h-4 w-4" />
        详情
      </Button>
      <Button size="sm" variant="ghost" onClick={props.handlers.onEdit}>
        <Edit3 className="h-4 w-4" />
        编辑
      </Button>
      {props.includeRoleMenus ? (
        <Button size="sm" variant="ghost" onClick={props.handlers.onRoleMenus}>
          <ShieldCheck className="h-4 w-4" />
          菜单权限
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" disabled={props.deletePending} onClick={props.handlers.onDelete}>
        <Trash2 className="h-4 w-4" />
        删除
      </Button>
    </>
  );
}

function RecordFormModal(props: {
  tab: AdminTab;
  mode: 'create' | 'edit';
  title: string;
  description: string;
  fields: FieldConfig[];
  values: Record<string, string>;
  selectOptionsByField: Record<string, SelectOption[]>;
  savePending: boolean;
  error: unknown;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[620px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">{props.title}</h3>
            <p className="mt-1 text-sm text-[#909399]">{props.description}</p>
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
            <label key={field.key} className={cn('space-y-2', (field.span === 2 || field.key === 'description') && 'sm:col-span-2')}>
              <span className="text-xs text-[#606266]">{field.label}</span>
              {props.selectOptionsByField[field.key]?.length ? (
                <select
                  value={props.values[field.key] ?? ''}
                  onChange={(event) => props.onChange(field.key, event.target.value)}
                  className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
                >
                  <option value="">请选择</option>
                  {props.selectOptionsByField[field.key].map((option) => (
                    <option key={`${field.key}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type ?? 'text'}
                  value={props.values[field.key] ?? ''}
                  onChange={(event) => props.onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                />
              )}
              {field.helpText ? (
                <span className="block text-xs leading-5 text-[#909399]">
                  {field.key === 'apiKey' && props.tab === 'vendors' && props.mode === 'create'
                    ? '新建厂商时建议立即录入 API Key，保存后列表和详情页仅展示脱敏结果。'
                    : field.helpText}
                </span>
              ) : null}
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
            {props.savePending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MenuFormModal(props: {
  mode: 'create' | 'edit';
  values: Record<string, string>;
  menuOptions: Array<{ id: string; label: string }>;
  savePending: boolean;
  error: unknown;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[760px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">{props.mode === 'create' ? '新增菜单' : '编辑菜单'}</h3>
            <p className="mt-1 text-sm text-[#909399]">菜单页面只维护目录元数据，展示和权限均由导航和角色逻辑统一接管。</p>
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
            <span className="text-xs text-[#606266]">上级菜单</span>
            <select
              value={props.values.parentId ?? ''}
              onChange={(event) => props.onChange('parentId', event.target.value)}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              <option value="">一级菜单</option>
              {props.menuOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">排序</span>
            <Input value={props.values.sortOrder ?? ''} onChange={(event) => props.onChange('sortOrder', event.target.value)} placeholder="10" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">菜单编码</span>
            <Input value={props.values.code ?? ''} onChange={(event) => props.onChange('code', event.target.value)} placeholder="users" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">菜单名称</span>
            <Input value={props.values.name ?? ''} onChange={(event) => props.onChange('name', event.target.value)} placeholder="用户管理" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">显示标题</span>
            <Input value={props.values.title ?? ''} onChange={(event) => props.onChange('title', event.target.value)} placeholder="用户管理" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">路由路径</span>
            <Input value={props.values.path ?? ''} onChange={(event) => props.onChange('path', event.target.value)} placeholder="/admin/users" />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">页面组件</span>
            <select
              value={props.values.component ?? ''}
              onChange={(event) => props.onChange('component', event.target.value)}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              <option value="">请选择组件</option>
              {fallbackWorkspaceRoutes.map((route) => (
                <option key={route.componentName} value={route.componentName}>
                  {route.componentName} · {route.meta.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">图标</span>
            <Input value={props.values.icon ?? ''} onChange={(event) => props.onChange('icon', event.target.value)} placeholder="Users" />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs text-[#606266]">重定向</span>
            <Input value={props.values.redirect ?? ''} onChange={(event) => props.onChange('redirect', event.target.value)} placeholder="/admin/users" />
          </label>

          <label className="flex items-center gap-3 rounded border border-[#dcdfe6] bg-[#fafafa] px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={(props.values.visible ?? 'true') !== 'false'}
              onChange={(event) => props.onChange('visible', event.target.checked ? 'true' : 'false')}
              className="h-4 w-4 rounded border-[#dcdfe6] text-[#409eff] focus:ring-[#409eff]"
            />
            <div>
              <div className="text-sm font-medium text-[#303133]">导航可见</div>
              <div className="text-xs text-[#909399]">关闭后菜单仍保留，但不会显示在左侧导航中。</div>
            </div>
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
          <Button onClick={props.onSubmit} disabled={props.savePending}>
            {props.savePending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecordDetailModal(props: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[720px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">{props.title}</h3>
            <p className="mt-1 text-sm text-[#909399]">详情信息以只读方式展示。</p>
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
                {props.rows.map((row) => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
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

function RoleMenusModal(props: {
  role: AdminRoleRecord;
  menuTree: AdminMenuRecord[];
  selectedMenuIds: string[];
  savePending: boolean;
  error: unknown;
  onToggle: (menuId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[760px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">菜单权限配置</h3>
            <p className="mt-1 text-sm text-[#909399]">{props.role.name} 的可访问页面将由下方菜单集合统一控制。</p>
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
          <div className="overflow-auto rounded border border-[#e2e8f0] bg-white p-3">
            {props.menuTree.map((item) => (
              <RoleMenuNode
                key={item.id}
                item={item}
                selectedMenuIds={props.selectedMenuIds}
                onToggle={props.onToggle}
              />
            ))}
          </div>
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
            {props.savePending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoleMenuNode(props: {
  item: AdminMenuRecord;
  selectedMenuIds: string[];
  onToggle: (menuId: string) => void;
  depth?: number;
}) {
  const depth = props.depth ?? 0;
  const checked = props.selectedMenuIds.includes(props.item.id);

  return (
    <div>
      <label
        className="flex items-center justify-between gap-3 border-b border-[#edf2f7] px-3 py-2.5 text-sm last:border-b-0"
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <span className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => props.onToggle(props.item.id)}
            className="h-4 w-4 rounded border-[#dcdfe6] text-[#409eff] focus:ring-[#409eff]"
          />
          <span>
            <span className="block font-medium text-[#334155]">{props.item.name}</span>
            <span className="block text-xs text-[#94a3b8]">{props.item.path || props.item.code}</span>
          </span>
        </span>
        <span className="text-xs text-[#94a3b8]">{props.item.component || '目录'}</span>
      </label>
      {props.item.children.map((child) => (
        <RoleMenuNode
          key={child.id}
          item={child}
          depth={depth + 1}
          selectedMenuIds={props.selectedMenuIds}
          onToggle={props.onToggle}
        />
      ))}
    </div>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-[148px] border-b border-[#edf2f7] bg-[#f8fafc] px-4 py-3 text-left text-[12px] font-medium text-[#64748b]">
        {props.label}
      </th>
      <td className="border-b border-[#edf2f7] px-4 py-3 text-sm leading-6 text-[#334155]">{props.value || '--'}</td>
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

function buildEmptyValues(tab: AdminTab) {
  if (tab === 'menus') {
    return {
      parentId: '',
      code: '',
      name: '',
      title: '',
      path: '',
      component: '',
      icon: '',
      redirect: '',
      sortOrder: '',
      visible: 'true'
    };
  }

  if (tab === 'dictionaries') {
    return {
      dictType: '',
      dictLabel: '',
      dictValue: '',
      description: '',
      status: 'ACTIVE',
      sortOrder: ''
    };
  }

  return Object.fromEntries(
    fields[tab].map((field) => [field.key, field.key === 'status' ? 'ACTIVE' : ''])
  );
}

function recordToFormValues(tab: AdminTab, record: AdminRecord) {
  if (tab === 'menus') {
    const menu = record as AdminMenuRecord;
    return {
      parentId: menu.parentId ?? '',
      code: menu.code ?? '',
      name: menu.name ?? '',
      title: menu.title ?? '',
      path: menu.path ?? '',
      component: menu.component ?? '',
      icon: menu.icon ?? '',
      redirect: menu.redirect ?? '',
      sortOrder: String(menu.sortOrder ?? ''),
      visible: menu.visible ? 'true' : 'false'
    };
  }

  if (tab === 'roles') {
    const role = record as AdminRoleRecord;
    return {
      code: role.code,
      name: role.name,
      description: role.description ?? '',
      status: role.status ?? 'ACTIVE',
      sortOrder: String(role.sortOrder ?? '')
    };
  }

  if (tab === 'dictionaries') {
    const item = record as AdminDictionaryRecord;
    return {
      dictType: item.dictType,
      dictLabel: item.dictLabel,
      dictValue: item.dictValue,
      description: item.description ?? '',
      status: item.status ?? 'ACTIVE',
      sortOrder: String(item.sortOrder ?? '')
    };
  }

  return Object.fromEntries(
    fields[tab].map((field) => {
      if (tab === 'vendors' && field.key === 'apiKey') {
        return [field.key, ''];
      }
      const value = (record as Record<string, unknown>)[field.key];
      return [field.key, String(value ?? '')];
    })
  );
}

function buildPayload(tab: AdminTab, values: Record<string, string>): AdminUpsertPayload {
  if (tab === 'menus') {
    return {
      parentId: normalizeIdentifier(values.parentId),
      code: values.code?.trim() ?? '',
      name: values.name?.trim() ?? '',
      title: values.title?.trim() || values.name?.trim() || '',
      path: values.path?.trim() ?? '',
      component: values.component?.trim() ?? '',
      icon: values.icon?.trim() ?? '',
      redirect: values.redirect?.trim() ?? '',
      sortOrder: parseNullableNumber(values.sortOrder),
      visible: values.visible !== 'false'
    };
  }

  if (tab === 'roles') {
    return {
      code: values.code?.trim() ?? '',
      name: values.name?.trim() ?? '',
      description: values.description?.trim() ?? '',
      sortOrder: parseNullableNumber(values.sortOrder),
      enabled: !isDisabledStatus(values.status ?? 'ACTIVE')
    };
  }

  if (tab === 'vendors') {
    return {
      code: values.code?.trim() ?? '',
      name: values.name?.trim() ?? '',
      endpoint: values.endpoint?.trim() ?? '',
      baseUrl: values.endpoint?.trim() ?? '',
      apiKey: values.apiKey?.trim() ?? '',
      description: values.description?.trim() ?? '',
      sortOrder: parseNullableNumber(values.sortOrder),
      enabled: !isDisabledStatus(values.status ?? 'ACTIVE')
    };
  }

  if (tab === 'models') {
    return {
      code: values.code?.trim() ?? '',
      name: values.name?.trim() ?? '',
      vendorId: normalizeIdentifier(values.vendorId),
      modelType: values.modelType?.trim() ?? 'CHAT',
      contextWindow: parseNullableNumber(values.contextWindow),
      sortOrder: parseNullableNumber(values.sortOrder),
      enabled: !isDisabledStatus(values.status ?? 'ACTIVE')
    };
  }

  if (tab === 'dictionaries') {
    return {
      dictType: values.dictType?.trim() ?? '',
      dictLabel: values.dictLabel?.trim() ?? '',
      dictValue: values.dictValue?.trim() ?? '',
      description: values.description?.trim() ?? '',
      sortOrder: parseNullableNumber(values.sortOrder),
      enabled: !isDisabledStatus(values.status ?? 'ACTIVE')
    };
  }

  return {
    code: values.code?.trim() ?? '',
    name: values.name?.trim() ?? '',
    description: values.description?.trim() ?? '',
    sortOrder: parseNullableNumber(values.sortOrder)
  };
}

function createRecord(tab: AdminTab, payload: AdminUpsertPayload) {
  if (tab === 'roles') return createAdminRole(payload);
  if (tab === 'menus') return createAdminMenu(payload);
  if (tab === 'knowledgeBases') return createAdminKnowledgeBase(payload);
  if (tab === 'vendors') return createAdminVendor(payload);
  if (tab === 'dictionaries') return createAdminDictItem(payload);
  return createAdminModel(payload);
}

function updateRecord(tab: AdminTab, id: string, payload: AdminUpsertPayload) {
  if (tab === 'roles') return updateAdminRole(id, payload);
  if (tab === 'menus') return updateAdminMenu(id, payload);
  if (tab === 'knowledgeBases') return updateAdminKnowledgeBase(id, payload);
  if (tab === 'vendors') return updateAdminVendor(id, payload);
  if (tab === 'dictionaries') return updateAdminDictItem(id, payload);
  return updateAdminModel(id, payload);
}

function deleteRecord(tab: AdminTab, id: string) {
  if (tab === 'roles') return deleteAdminRole(id);
  if (tab === 'menus') return deleteAdminMenu(id);
  if (tab === 'knowledgeBases') return deleteAdminKnowledgeBase(id);
  if (tab === 'vendors') return deleteAdminVendor(id);
  if (tab === 'dictionaries') return deleteAdminDictItem(id);
  return deleteAdminModel(id);
}

function invalidateAdmin(queryClient: ReturnType<typeof useQueryClient>, tab: AdminTab) {
  const key = tab === 'knowledgeBases' ? 'knowledge-bases' : tab === 'dictionaries' ? 'dict-items' : tab;
  return queryClient.invalidateQueries({ queryKey: ['admin-management', key] });
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

function collectExpandableMenuIds(items: AdminMenuRecord[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.children.length) {
      ids.push(item.id, ...collectExpandableMenuIds(item.children));
    }
  }
  return ids;
}

function buildParentMenuOptions(items: AdminMenuRecord[], currentId: string | null, depth = 0): Array<{ id: string; label: string }> {
  const options: Array<{ id: string; label: string }> = [];
  for (const item of items) {
    if (item.id === currentId) {
      continue;
    }
    options.push({
      id: item.id,
      label: `${'　'.repeat(depth)}${item.name} (${item.code})`
    });
    options.push(...buildParentMenuOptions(item.children, currentId, depth + 1));
  }
  return options;
}

function findMenuName(items: AdminMenuRecord[], id?: string | null): string {
  if (!id) {
    return '';
  }
  for (const item of items) {
    if (item.id === id) {
      return item.name;
    }
    const child = findMenuName(item.children, id);
    if (child) {
      return child;
    }
  }
  return '';
}

function buildDetailRows(tab: AdminTab, record: AdminRecord, flattenedMenus: AdminMenuRecord[]) {
  if (tab === 'roles') {
    const role = record as AdminRoleRecord;
    return [
      { label: '角色名称', value: role.name },
      { label: '角色编码', value: role.code },
      { label: '状态', value: role.status },
      { label: '排序', value: String(role.sortOrder) },
      { label: '关联菜单', value: describeRoleMenus(role.menuIds, flattenedMenus) },
      { label: '描述', value: role.description || '--' }
    ];
  }

  if (tab === 'menus') {
    const menu = record as AdminMenuRecord;
    return [
      { label: '菜单名称', value: menu.name },
      { label: '菜单编码', value: menu.code },
      { label: '显示标题', value: menu.title },
      { label: '路由路径', value: menu.path },
      { label: '上级菜单', value: findMenuName(flattenedMenus, menu.parentId) || '一级菜单' },
      { label: '页面组件', value: menu.component || '--' },
      { label: '图标', value: menu.icon || '--' },
      { label: '重定向', value: menu.redirect || '--' },
      { label: '可见性', value: menu.visible ? '显示' : '隐藏' }
    ];
  }

  if (tab === 'knowledgeBases') {
    const item = record as AdminKnowledgeBaseRecord;
    return [
      { label: '知识库名称', value: item.name },
      { label: '知识库编码', value: item.code },
      { label: '文档数量', value: String(item.documentCount) },
      { label: '排序', value: String(item.sortOrder) },
      { label: '描述', value: item.description || '--' }
    ];
  }

  if (tab === 'vendors') {
    const item = record as AdminVendorRecord;
    return [
      { label: '厂商名称', value: item.name },
      { label: '厂商编码', value: item.code },
      { label: '状态', value: item.status },
      { label: '接口地址', value: item.endpoint || '--' },
      { label: 'API Key', value: item.apiKeyMasked || '未配置' },
      { label: '描述', value: item.description || '--' },
      { label: '排序', value: String(item.sortOrder) }
    ];
  }

  if (tab === 'dictionaries') {
    const item = record as AdminDictionaryRecord;
    return [
      { label: '字典类型', value: item.dictType },
      { label: '字典标签', value: item.dictLabel },
      { label: '字典值', value: item.dictValue },
      { label: '状态', value: item.status },
      { label: '描述', value: item.description || '--' },
      { label: '排序', value: String(item.sortOrder) }
    ];
  }

  const item = record as AdminModelRecord;
  return [
    { label: '模型名称', value: item.name },
    { label: '模型编码', value: item.code },
    { label: '模型类型', value: item.modelType },
    { label: '所属厂商', value: item.vendorName || item.vendorId || '--' },
    { label: '上下文窗口', value: String(item.contextWindow || '--') },
    { label: '状态', value: item.status },
    { label: '排序', value: String(item.sortOrder) }
  ];
}

function describeRoleMenus(menuIds: string[], flattenedMenus: AdminMenuRecord[]) {
  const names = menuIds
    .map((menuId) => findMenuName(flattenedMenus, menuId))
    .filter(Boolean);
  return names.length ? names.join('、') : '未配置';
}

function describeMenuKind(menu: AdminMenuRecord) {
  return menu.children.length > 0 || !menu.component ? '目录' : '菜单';
}

function buildDictOptions(items: AdminDictionaryRecord[], dictType: string): SelectOption[] {
  return items
    .filter((item) => item.dictType === dictType && item.status === 'ACTIVE')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({
      label: `${item.dictLabel} (${item.dictValue})`,
      value: item.dictValue
    }));
}

function buildFieldOptions(
  tab: AdminTab,
  options: {
    statusOptions: SelectOption[];
    modelTypeOptions: SelectOption[];
    vendorOptions: SelectOption[];
    dictTypeOptions: SelectOption[];
  }
): Record<string, SelectOption[]> {
  if (tab === 'vendors') {
    return { status: options.statusOptions };
  }
  if (tab === 'models') {
    return {
      vendorId: options.vendorOptions,
      modelType: options.modelTypeOptions,
      status: options.statusOptions
    };
  }
  if (tab === 'dictionaries') {
    return { status: options.statusOptions };
  }
  return {};
}

function normalizeIdentifier(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

function parseNullableNumber(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDisabledStatus(value: string) {
  return ['DISABLED', 'INACTIVE', 'DELETED', '停用', '禁用'].includes(value.trim().toUpperCase());
}
