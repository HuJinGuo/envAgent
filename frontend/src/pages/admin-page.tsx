import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ChevronRight, Database, Edit3, Eye, Layers, Plus, Search, Settings, ShieldCheck, Trash2, WandSparkles, Wrench, X } from 'lucide-react';
import {
  createAdminMonitorData,
  createAdminDictItem,
  createAdminKnowledgeBase,
  createAdminMenu,
  createAdminModel,
  createAdminTool,
  createAdminRole,
  createAdminStation,
  createAdminVendor,
  deleteAdminMonitorData,
  deleteAdminDictItem,
  deleteAdminKnowledgeBase,
  deleteAdminMenu,
  deleteAdminModel,
  deleteAdminTool,
  deleteAdminRole,
  deleteAdminStation,
  deleteAdminVendor,
  fetchAdminDictItems,
  fetchAdminKnowledgeBases,
  fetchAdminMenus,
  fetchAdminMonitorData,
  fetchAdminMonitorDataParams,
  fetchAdminModels,
  fetchAdminTools,
  fetchAdminRoles,
  fetchAdminStations,
  fetchAdminVendors,
  replaceAdminRoleMenus,
  replaceAdminToolRoles,
  simulateAdminMonitorData,
  testAdminTools,
  updateAdminMonitorData,
  updateAdminDictItem,
  updateAdminKnowledgeBase,
  updateAdminMenu,
  updateAdminModel,
  updateAdminTool,
  updateAdminRole,
  updateAdminStation,
  updateAdminVendor,
  type AdminDictionaryRecord,
  type AdminKnowledgeBaseRecord,
  type AdminMenuRecord,
  type AdminMonitorDataRecord,
  type AdminModelRecord,
  type AdminToolRecord,
  type MonitorParamTemplate,
  type AdminRoleRecord,
  type AdminStationRecord,
  type AdminUpsertPayload,
  type AdminVendorRecord,
  type ToolSearchResult
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
const ALL_STATIONS_VALUE = 'ALL';

type AdminRecord =
  | AdminRoleRecord
  | AdminMenuRecord
  | AdminDictionaryRecord
  | AdminKnowledgeBaseRecord
  | AdminVendorRecord
  | AdminModelRecord
  | AdminToolRecord
  | AdminStationRecord
  | AdminMonitorDataRecord;

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'datetime-local' | 'textarea';
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

type ToolRoleState = {
  tool: AdminToolRecord;
  selectedRoleIds: string[];
} | null;

type SimulateRangeValue = {
  paramCode: string;
  paramName: string;
  minValue: string;
  maxValue: string;
};

type SimulateModalState = {
  mn: string;
  dataTime: string;
  ranges: SimulateRangeValue[];
} | null;

type MonitorDataGroupRow = {
  id: string;
  mn: string;
  mnName: string;
  dataTime: string;
  detailIds: Partial<Record<MonitorParamCode, string>>;
  totalPhosphorus: string;
  totalNitrogen: string;
  ammoniaNitrogen: string;
  codmn: string;
  ph: string;
  waterLevel: string;
  flow: string;
  velocity: string;
};

type MonitorParamCode = 'TP' | 'TN' | 'NH3N' | 'CODMN' | 'PH' | 'WL' | 'Q' | 'VS';

type MonitorGroupField = {
  paramCode: MonitorParamCode;
  paramName: string;
  value: string;
  recordId?: string;
};

type MonitorDataGroupModalState = {
  id: string;
  mn: string;
  mnName: string;
  dataTime: string;
  fields: MonitorGroupField[];
} | null;

type ToolSearchState = {
  query: string;
  roleCode: string;
  groupName: string;
  results: ToolSearchResult[];
} | null;

type SelectOption = {
  label: string;
  value: string;
};

const MONITOR_PARAM_META: Array<{ code: MonitorParamCode; name: string }> = [
  { code: 'TP', name: '总磷' },
  { code: 'TN', name: '总氮' },
  { code: 'NH3N', name: '氨氮' },
  { code: 'CODMN', name: '高猛' },
  { code: 'PH', name: 'ph' },
  { code: 'WL', name: '水位' },
  { code: 'Q', name: '流量' },
  { code: 'VS', name: '流速' }
];

const tabs: Array<{ id: AdminTab; label: string; icon: typeof ShieldCheck }> = [
  { id: 'roles', label: '角色管理', icon: ShieldCheck },
  { id: 'menus', label: '菜单管理', icon: Layers },
  { id: 'knowledgeBases', label: '知识库管理', icon: Database },
  { id: 'vendors', label: '厂商管理', icon: Settings },
  { id: 'models', label: '模型管理', icon: Settings },
  { id: 'dictionaries', label: '业务字典', icon: Settings },
  { id: 'tools', label: '工具管理', icon: Wrench },
  { id: 'stations', label: '站点管理', icon: Database },
  { id: 'monitorData', label: '监测数据', icon: Database }
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
  ],
  tools: [
    { key: 'name', label: '工具名', placeholder: 'weather_lookup' },
    { key: 'toolGroup', label: '所属分组', placeholder: 'environment' },
    { key: 'version', label: '版本号', placeholder: '1.0.0' },
    { key: 'status', label: '状态' },
    { key: 'tags', label: '标签', placeholder: '天气,气象,出行', span: 2 },
    { key: 'description', label: '描述', type: 'textarea', placeholder: '说明工具的适用场景、输入输出和边界。', span: 2 },
    { key: 'parametersSchema', label: '参数 Schema', type: 'textarea', placeholder: '{ \"type\": \"object\" }', span: 2 }
  ],
  stations: [
    { key: 'stationId', label: '站点编码', placeholder: 'TH-WX-001' },
    { key: 'mn', label: 'MN 编号', placeholder: '320200A001' },
    { key: 'mnName', label: '点位名称', placeholder: '太湖梅梁湖心', span: 2 },
    { key: 'lat', label: '纬度', placeholder: '31.4382' },
    { key: 'lng', label: '经度', placeholder: '120.2096' },
    { key: 'st', label: '站点类型', placeholder: '21' }
  ],
  monitorData: [
    { key: 'mn', label: 'MN 编号', placeholder: '320200A001' },
    { key: 'paramCode', label: '参数编码', placeholder: 'TN' },
    { key: 'paramName', label: '参数名称', placeholder: '总氮' },
    { key: 'value', label: '监测值', placeholder: '1.568' },
    { key: 'dataTime', label: '监测时间', placeholder: '2026-05-15T08:00', type: 'datetime-local', span: 2 }
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
    dictionaries: 1,
    tools: 1,
    stations: 1,
    monitorData: 1
  });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [modalState, setModalState] = useState<ModalState>(null);
  const [roleMenuState, setRoleMenuState] = useState<RoleMenuState>(null);
  const [toolRoleState, setToolRoleState] = useState<ToolRoleState>(null);
  const [simulateModalState, setSimulateModalState] = useState<SimulateModalState>(null);
  const [monitorGroupModalState, setMonitorGroupModalState] = useState<MonitorDataGroupModalState>(null);
  const [toolSearchState, setToolSearchState] = useState<ToolSearchState>(null);
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
  const toolsQuery = useQuery({
    queryKey: ['admin-management', 'tools'],
    queryFn: fetchAdminTools
  });
  const stationsQuery = useQuery({
    queryKey: ['admin-management', 'stations'],
    queryFn: fetchAdminStations
  });
  const monitorDataQuery = useQuery({
    queryKey: ['admin-management', 'monitor-data'],
    queryFn: fetchAdminMonitorData
  });
  const monitorDataParamsQuery = useQuery({
    queryKey: ['admin-management', 'monitor-data-params'],
    queryFn: fetchAdminMonitorDataParams
  });

  const menuTree = menusQuery.data?.data ?? [];
  const flattenedMenus = useMemo(() => flattenMenuTree(menuTree), [menuTree]);
  const dictItems = dictItemsQuery.data?.data ?? [];
  const vendors = vendorsQuery.data?.data ?? [];
  const stationNameByMn = useMemo(
    () => new Map((stationsQuery.data?.data ?? []).map((item) => [item.mn, item.mnName])),
    [stationsQuery.data]
  );
  const monitorDataGroups = useMemo(
    () => groupMonitorDataRows(monitorDataQuery.data?.data ?? [], stationNameByMn),
    [monitorDataQuery.data, stationNameByMn]
  );
  const recordsByTab = useMemo<Record<AdminTab, AdminRecord[]>>(
    () => ({
      roles: rolesQuery.data?.data ?? [],
      menus: flattenedMenus,
      knowledgeBases: knowledgeBasesQuery.data?.data ?? [],
      vendors,
      models: modelsQuery.data?.data ?? [],
      tools: toolsQuery.data?.data ?? [],
      dictionaries: dictItems,
      stations: stationsQuery.data?.data ?? [],
      monitorData: monitorDataQuery.data?.data ?? []
    }),
    [dictItems, flattenedMenus, knowledgeBasesQuery.data, modelsQuery.data, monitorDataQuery.data, rolesQuery.data, stationsQuery.data, toolsQuery.data, vendors]
  );

  const activeRecords = recordsByTab[activeTab];
  const currentPage = pageByTab[activeTab];
  const monitorDataPagedGroups = useMemo(
    () => monitorDataGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, monitorDataGroups]
  );
  const totalRecords = activeTab === 'monitorData' ? monitorDataGroups.length : activeRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
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
    modelsQuery.isLoading ||
    toolsQuery.isLoading ||
    stationsQuery.isLoading ||
    monitorDataQuery.isLoading ||
    monitorDataParamsQuery.isLoading;
  const firstError =
    rolesQuery.error ??
    menusQuery.error ??
    knowledgeBasesQuery.error ??
    vendorsQuery.error ??
    dictItemsQuery.error ??
    modelsQuery.error ??
    toolsQuery.error ??
    stationsQuery.error ??
    monitorDataQuery.error ??
    monitorDataParamsQuery.error;

  const statusOptions = useMemo(() => buildDictOptions(dictItems, 'COMMON_STATUS'), [dictItems]);
  const modelTypeOptions = useMemo(() => buildDictOptions(dictItems, 'MODEL_TYPE'), [dictItems]);
  const stationMnOptions = useMemo<SelectOption[]>(
    () => [
      { label: '全部站点', value: ALL_STATIONS_VALUE },
      ...(stationsQuery.data?.data ?? []).map((item) => ({ label: `${item.mnName} (${item.mn})`, value: item.mn }))
    ],
    [stationsQuery.data]
  );
  const vendorOptions = useMemo<SelectOption[]>(
    () => vendors.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id })),
    [vendors]
  );
  const roleOptions = useMemo<SelectOption[]>(
    () => (rolesQuery.data?.data ?? []).map((item) => ({ label: `${item.name} (${item.code})`, value: item.id })),
    [rolesQuery.data]
  );
  const roleCodeOptions = useMemo<SelectOption[]>(
    () => (rolesQuery.data?.data ?? []).map((item) => ({ label: `${item.name} (${item.code})`, value: item.code })),
    [rolesQuery.data]
  );
  const toolGroupOptions = useMemo<SelectOption[]>(
    () =>
      Array.from(new Set((toolsQuery.data?.data ?? []).map((item) => item.toolGroup)))
        .filter(Boolean)
        .map((item) => ({ label: item, value: item })),
    [toolsQuery.data]
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

  const toolRoleMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) => replaceAdminToolRoles(id, roleIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'tools'] });
      setToolRoleState(null);
    }
  });

  const toolSearchMutation = useMutation({
    mutationFn: (payload: AdminUpsertPayload) => testAdminTools(payload),
    onSuccess: (response) => {
      setToolSearchState((current) => (current ? { ...current, results: response.data } : current));
    }
  });

  const simulateMutation = useMutation({
    mutationFn: (payload: AdminUpsertPayload) => simulateAdminMonitorData(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'monitor-data'] });
      setSimulateModalState(null);
    }
  });

  const monitorGroupSaveMutation = useMutation({
    mutationFn: async (payload: MonitorDataGroupModalState) => {
      if (!payload) {
        return null;
      }
      await Promise.all(
        payload.fields.map((field) => {
          const requestPayload = {
            mn: payload.mn,
            paramCode: field.paramCode,
            paramName: field.paramName,
            value: parseNullableNumber(field.value),
            dataTime: normalizeDateTimeText(payload.dataTime)
          };
          return field.recordId ? updateAdminMonitorData(field.recordId, requestPayload) : createAdminMonitorData(requestPayload);
        })
      );
      return null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'monitor-data'] });
      setMonitorGroupModalState(null);
    }
  });

  const monitorGroupDeleteMutation = useMutation({
    mutationFn: async (record: MonitorDataGroupRow) => {
      const ids = Object.values(record.detailIds).filter(Boolean) as string[];
      await Promise.all(ids.map((id) => deleteAdminMonitorData(id)));
      return null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-management', 'monitor-data'] });
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
          <div className="flex gap-2">
            {activeTab === 'monitorData' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setSimulateModalState({
                    mn: stationMnOptions[0]?.value ?? ALL_STATIONS_VALUE,
                    dataTime: formatDateTimeInput(new Date()),
                    ranges: (monitorDataParamsQuery.data?.data ?? []).map((item) => ({
                      paramCode: item.paramCode,
                      paramName: item.paramName,
                      minValue: String(item.minValue),
                      maxValue: String(item.maxValue)
                    }))
                  })
                }
              >
                <WandSparkles className="h-4 w-4" />
                模拟数据
              </Button>
            ) : null}
            {activeTab === 'tools' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setToolSearchState({
                    query: '',
                    roleCode: '',
                    groupName: '',
                    results: []
                  })
                }
              >
                <Search className="h-4 w-4" />
                试搜索
              </Button>
            ) : null}
            {activeTab !== 'monitorData' ? (
              <Button size="sm" onClick={() => setModalState({ mode: 'create', tab: activeTab })}>
                <Plus className="h-4 w-4" />
                新增
              </Button>
            ) : null}
          </div>
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
                ) : activeTab === 'monitorData' ? (
              <tbody>
                {monitorDataPagedGroups.map((record) =>
                  renderMonitorDataGroupRow(record, {
                    onEdit: () => setMonitorGroupModalState(buildMonitorGroupModalState(record)),
                    onDelete: () => monitorGroupDeleteMutation.mutate(record)
                  }, monitorGroupDeleteMutation.isPending)
                )}
                {!monitorDataPagedGroups.length ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-[#94a3b8]">
                      暂无数据。
                    </td>
                  </tr>
                ) : null}
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
                        if ('roleIds' in record && activeTab === 'tools') {
                          setToolRoleState({
                            tool: record,
                            selectedRoleIds: [...record.roleIds]
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
                      colSpan={activeTab === 'roles' || activeTab === 'vendors' || activeTab === 'models' || activeTab === 'tools' || activeTab === 'stations' ? 7 : 6}
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
            total={totalRecords}
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
          description={modalState.tab === 'roles' ? '角色权限通过菜单授权控制，菜单分配请使用列表中的“菜单权限”。' : '保存后将刷新当前管理列表。'}
          fields={fields[modalState.tab]}
          values={formValues}
          selectOptionsByField={buildFieldOptions(modalState.tab, {
            statusOptions,
            modelTypeOptions,
            vendorOptions,
            dictTypeOptions,
            stationMnOptions
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

      {toolRoleState ? (
        <ToolRolesModal
          tool={toolRoleState.tool}
          roleOptions={roleOptions}
          selectedRoleIds={toolRoleState.selectedRoleIds}
          savePending={toolRoleMutation.isPending}
          error={toolRoleMutation.error}
          onToggle={(roleId) =>
            setToolRoleState((current) =>
              current
                ? {
                    ...current,
                    selectedRoleIds: current.selectedRoleIds.includes(roleId)
                      ? current.selectedRoleIds.filter((item) => item !== roleId)
                      : [...current.selectedRoleIds, roleId]
                  }
                : current
            )
          }
          onClose={() => setToolRoleState(null)}
          onSubmit={() => toolRoleMutation.mutate({ id: toolRoleState.tool.id, roleIds: toolRoleState.selectedRoleIds })}
        />
      ) : null}

      {simulateModalState ? (
        <MonitorDataSimulateModal
          values={simulateModalState}
          stationOptions={stationMnOptions}
          savePending={simulateMutation.isPending}
          error={simulateMutation.error}
          onClose={() => setSimulateModalState(null)}
          onChange={(next) => setSimulateModalState(next)}
          onSubmit={() =>
            simulateMutation.mutate({
              mn: simulateModalState.mn,
              dataTime: normalizeDateTimeText(simulateModalState.dataTime),
              ranges: simulateModalState.ranges.map((item) => ({
                paramCode: item.paramCode,
                paramName: item.paramName,
                minValue: parseNullableNumber(item.minValue),
                maxValue: parseNullableNumber(item.maxValue)
              }))
            })
          }
        />
      ) : null}

      {monitorGroupModalState ? (
        <MonitorDataGroupEditModal
          values={monitorGroupModalState}
          savePending={monitorGroupSaveMutation.isPending}
          error={monitorGroupSaveMutation.error}
          onClose={() => setMonitorGroupModalState(null)}
          onChange={(next) => setMonitorGroupModalState(next)}
          onSubmit={() => monitorGroupSaveMutation.mutate(monitorGroupModalState)}
        />
      ) : null}

      {toolSearchState ? (
        <ToolSearchModal
          values={toolSearchState}
          roleCodeOptions={roleCodeOptions}
          groupOptions={toolGroupOptions}
          searchPending={toolSearchMutation.isPending}
          error={toolSearchMutation.error}
          onClose={() => setToolSearchState(null)}
          onChange={(next) => setToolSearchState(next)}
          onSubmit={() =>
            toolSearchMutation.mutate({
              query: toolSearchState.query.trim(),
              roleCode: toolSearchState.roleCode || null,
              groupName: toolSearchState.groupName || null
            })
          }
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

  if (tab === 'stations') {
    return (
      <tr>
        <th className="px-4 py-3">点位名称</th>
        <th className="px-4 py-3">站点编码</th>
        <th className="px-4 py-3">MN 编号</th>
        <th className="px-4 py-3">经纬度</th>
        <th className="px-4 py-3">ST</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  if (tab === 'tools') {
    return (
      <tr>
        <th className="px-4 py-3">工具名</th>
        <th className="px-4 py-3">分组</th>
        <th className="px-4 py-3">状态</th>
        <th className="px-4 py-3">向量状态</th>
        <th className="px-4 py-3">权限角色</th>
        <th className="px-4 py-3">统计</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    );
  }

  if (tab === 'monitorData') {
    return (
      <tr>
        <th className="px-4 py-3">站点名称</th>
        <th className="px-4 py-3">MN 编号</th>
        <th className="px-4 py-3">监测时间</th>
        <th className="px-4 py-3">总磷</th>
        <th className="px-4 py-3">总氮</th>
        <th className="px-4 py-3">氨氮</th>
        <th className="px-4 py-3">高猛</th>
        <th className="px-4 py-3">ph</th>
        <th className="px-4 py-3">水位</th>
        <th className="px-4 py-3">流量</th>
        <th className="px-4 py-3">流速</th>
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

  if (tab === 'stations') {
    const item = record as AdminStationRecord;
    return (
      <tr key={item.id}>
        <td className="px-4 py-3 font-medium text-[#334155]">{item.mnName}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.stationId}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.mn}</td>
        <td className="px-4 py-3 text-[#64748b]">
          {item.lat}, {item.lng}
        </td>
        <td className="px-4 py-3 text-[#64748b]">{item.st}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} />
          </div>
        </td>
      </tr>
    );
  }

  if (tab === 'tools') {
    const item = record as AdminToolRecord;
    return (
      <tr key={item.id}>
        <td className="px-4 py-3">
          <div className="font-medium text-[#334155]">{item.name}</div>
          <div className="mt-1 text-xs text-[#94a3b8]">{item.version || '--'}</div>
        </td>
        <td className="px-4 py-3 text-[#64748b]">{item.toolGroup || '--'}</td>
        <td className="px-4 py-3">
          <Badge tone={item.status === 'ACTIVE' ? 'good' : 'warn'}>{item.status}</Badge>
        </td>
        <td className="px-4 py-3">
          <Badge tone={resolveEmbeddingTone(item.embeddingStatus)}>{item.embeddingStatus || '--'}</Badge>
        </td>
        <td className="max-w-[220px] px-4 py-3 text-[#64748b]">{item.roleNames.length ? item.roleNames.join('、') : '未绑定'}</td>
        <td className="px-4 py-3 text-[#64748b]">
          <div className="space-y-1">
            <div>命中 {item.hitCount}</div>
            <div>调用 {item.callCount}</div>
            <div>成功率 {formatPercent(item.successRate)}</div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <ActionButtons handlers={handlers} deletePending={deletePending} includeRoleMenus roleActionLabel="角色权限" />
          </div>
        </td>
      </tr>
    );
  }

  if (tab === 'monitorData') {
    const item = record as AdminMonitorDataRecord;
    return (
      <tr key={item.id}>
        <td className="px-4 py-3 text-[#334155]">{item.mn}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.paramCode}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.paramName}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.value}</td>
        <td className="px-4 py-3 text-[#64748b]">{item.dataTime}</td>
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

function renderMonitorDataGroupRow(
  record: MonitorDataGroupRow,
  handlers: {
    onEdit: () => void;
    onDelete: () => void;
  },
  deletePending: boolean
) {
  return (
    <tr key={record.id}>
      <td className="px-4 py-3 font-medium text-[#334155]">{record.mnName}</td>
      <td className="px-4 py-3 font-medium text-[#334155]">{record.mn}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.dataTime}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.totalPhosphorus}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.totalNitrogen}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.ammoniaNitrogen}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.codmn}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.ph}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.waterLevel}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.flow}</td>
      <td className="px-4 py-3 text-[#64748b]">{record.velocity}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={handlers.onEdit}>
            <Edit3 className="h-4 w-4" />
            修改
          </Button>
          <Button size="sm" variant="ghost" disabled={deletePending} onClick={handlers.onDelete}>
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
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
  roleActionLabel?: string;
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
          {props.roleActionLabel ?? '菜单权限'}
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
                field.type === 'textarea' ? (
                  <textarea
                    value={props.values[field.key] ?? ''}
                    onChange={(event) => props.onChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={field.key === 'parametersSchema' ? 10 : 4}
                    className="w-full rounded border border-[#dcdfe6] bg-white px-3 py-2 text-sm leading-6 text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
                  />
                ) : (
                  <Input
                    type={field.type ?? 'text'}
                    value={props.values[field.key] ?? ''}
                    onChange={(event) => props.onChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                  />
                )
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

function MonitorDataSimulateModal(props: {
  values: SimulateModalState;
  stationOptions: SelectOption[];
  savePending: boolean;
  error: unknown;
  onClose: () => void;
  onChange: (next: SimulateModalState) => void;
  onSubmit: () => void;
}) {
  if (!props.values) {
    return null;
  }
  const values = props.values;

  const updateRange = (index: number, key: 'minValue' | 'maxValue', value: string) => {
    props.onChange({
      ...values,
      ranges: values.ranges.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[880px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">模拟监测数据</h3>
            <p className="mt-1 text-sm text-[#909399]">选择站点 MN、监测时间和各参数浓度范围，一次生成该时刻的一组监测数据。</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 border-b border-[#ebeef5] px-5 py-5 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs text-[#606266]">绑定站点 MN</span>
            <select
              value={values.mn}
              onChange={(event) => props.onChange({ ...values, mn: event.target.value })}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              <option value="">请选择站点</option>
              {props.stationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[#606266]">监测时间点</span>
            <Input
              type="datetime-local"
              value={values.dataTime}
              onChange={(event) => props.onChange({ ...values, dataTime: event.target.value })}
            />
          </label>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-5 py-5">
          <div className="workspace-table">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">参数编码</th>
                  <th className="px-4 py-3">参数名称</th>
                  <th className="px-4 py-3">最小值</th>
                  <th className="px-4 py-3">最大值</th>
                </tr>
              </thead>
              <tbody>
                {values.ranges.map((item, index) => (
                  <tr key={item.paramCode}>
                    <td className="px-4 py-3 text-[#334155]">{item.paramCode}</td>
                    <td className="px-4 py-3 text-[#334155]">{item.paramName}</td>
                    <td className="px-4 py-3">
                      <Input value={item.minValue} onChange={(event) => updateRange(index, 'minValue', event.target.value)} />
                    </td>
                    <td className="px-4 py-3">
                      <Input value={item.maxValue} onChange={(event) => updateRange(index, 'maxValue', event.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            {props.savePending ? '生成中...' : '生成数据'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonitorDataGroupEditModal(props: {
  values: MonitorDataGroupModalState;
  savePending: boolean;
  error: unknown;
  onClose: () => void;
  onChange: (next: MonitorDataGroupModalState) => void;
  onSubmit: () => void;
}) {
  if (!props.values) {
    return null;
  }
  const values = props.values;

  const updateField = (paramCode: MonitorParamCode, value: string) => {
    props.onChange({
      ...values,
      fields: values.fields.map((field) => (field.paramCode === paramCode ? { ...field, value } : field))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[820px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">修改监测数据</h3>
            <p className="mt-1 text-sm text-[#909399]">
              {values.mnName}（{values.mn}）在 {values.dataTime} 的监测数据组。
            </p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-5 py-5">
          <div className="workspace-table">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">参数编码</th>
                  <th className="px-4 py-3">参数名称</th>
                  <th className="px-4 py-3">监测值</th>
                </tr>
              </thead>
              <tbody>
                {values.fields.map((field) => (
                  <tr key={field.paramCode}>
                    <td className="px-4 py-3 text-[#334155]">{field.paramCode}</td>
                    <td className="px-4 py-3 text-[#334155]">{field.paramName}</td>
                    <td className="px-4 py-3">
                      <Input value={field.value} onChange={(event) => updateField(field.paramCode, event.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function ToolRolesModal(props: {
  tool: AdminToolRecord;
  roleOptions: SelectOption[];
  selectedRoleIds: string[];
  savePending: boolean;
  error: unknown;
  onToggle: (roleId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[720px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">工具角色权限</h3>
            <p className="mt-1 text-sm text-[#909399]">{props.tool.name} 可被哪些角色或 agent 间接调用，由这里统一控制。</p>
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
          <div className="grid gap-3 sm:grid-cols-2">
            {props.roleOptions.map((role) => {
              const checked = props.selectedRoleIds.includes(role.value);
              return (
                <label key={role.value} className="flex items-start gap-3 rounded border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => props.onToggle(role.value)}
                    className="mt-1 h-4 w-4 rounded border-[#dcdfe6] text-[#409eff] focus:ring-[#409eff]"
                  />
                  <span className="text-sm text-[#334155]">{role.label}</span>
                </label>
              );
            })}
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

function ToolSearchModal(props: {
  values: NonNullable<ToolSearchState>;
  roleCodeOptions: SelectOption[];
  groupOptions: SelectOption[];
  searchPending: boolean;
  error: unknown;
  onClose: () => void;
  onChange: (next: NonNullable<ToolSearchState>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[980px] rounded border border-[#dcdfe6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#ebeef5] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">工具试搜索</h3>
            <p className="mt-1 text-sm text-[#909399]">输入一句查询话术，验证当前工具描述和参数 schema 是否足够让检索排序命中正确工具。</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 border-b border-[#ebeef5] px-5 py-5 sm:grid-cols-[2fr,1fr,1fr,auto] sm:items-end">
          <label className="space-y-2">
            <span className="text-xs text-[#606266]">检索 Query</span>
            <Input
              value={props.values.query}
              onChange={(event) => props.onChange({ ...props.values, query: event.target.value })}
              placeholder="例如：发邮件通知运维人员"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs text-[#606266]">角色过滤</span>
            <select
              value={props.values.roleCode}
              onChange={(event) => props.onChange({ ...props.values, roleCode: event.target.value })}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              <option value="">全部角色</option>
              {props.roleCodeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs text-[#606266]">分组过滤</span>
            <select
              value={props.values.groupName}
              onChange={(event) => props.onChange({ ...props.values, groupName: event.target.value })}
              className="h-10 w-full rounded border border-[#dcdfe6] bg-white px-3 text-sm text-[#303133] outline-none transition duration-150 focus:border-[#409eff] focus:shadow-[0_0_0_2px_rgba(64,158,255,0.12)]"
            >
              <option value="">全部分组</option>
              {props.groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={props.onSubmit} disabled={props.searchPending || !props.values.query.trim()}>
            <Search className="h-4 w-4" />
            {props.searchPending ? '检索中...' : '开始检索'}
          </Button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-[#64748b]">
            <BarChart3 className="h-4 w-4" />
            当前返回 {props.values.results.length} 条结果，分数越高说明语义越接近。
          </div>
          <div className="workspace-table max-h-[420px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">工具名</th>
                  <th className="px-4 py-3">分组</th>
                  <th className="px-4 py-3">相似度</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">标签</th>
                  <th className="px-4 py-3">描述</th>
                </tr>
              </thead>
              <tbody>
                {props.values.results.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-[#334155]">{item.name}</td>
                    <td className="px-4 py-3 text-[#64748b]">{item.toolGroup || '--'}</td>
                    <td className="px-4 py-3 text-[#334155]">{item.similarity.toFixed(4)}</td>
                    <td className="px-4 py-3 text-[#64748b]">{item.roleNames.length ? item.roleNames.join('、') : '--'}</td>
                    <td className="px-4 py-3 text-[#64748b]">{item.tags.length ? item.tags.join('、') : '--'}</td>
                    <td className="max-w-[360px] px-4 py-3 text-[#64748b]">{item.description || '--'}</td>
                  </tr>
                ))}
                {!props.values.results.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#94a3b8]">
                      输入 query 后即可查看工具检索排序结果。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {props.error ? (
          <div className="mx-5 rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
            {getErrorMessage(props.error)}
          </div>
        ) : null}

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

  if (tab === 'tools') {
    return {
      name: '',
      toolGroup: '',
      version: '1.0.0',
      status: 'ACTIVE',
      tags: '',
      description: '',
      parametersSchema: ''
    };
  }

  if (tab === 'stations') {
    return {
      stationId: '',
      mn: '',
      mnName: '',
      lat: '',
      lng: '',
      st: '21'
    };
  }

  if (tab === 'monitorData') {
    return {
      mn: '',
      paramCode: '',
      paramName: '',
      value: '',
      dataTime: formatDateTimeInput(new Date())
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

  if (tab === 'tools') {
    const item = record as AdminToolRecord;
    return {
      name: item.name,
      toolGroup: item.toolGroup ?? '',
      version: item.version ?? '1.0.0',
      status: item.status ?? 'ACTIVE',
      tags: item.tags.join(','),
      description: item.description ?? '',
      parametersSchema: item.parametersSchema ?? ''
    };
  }

  if (tab === 'stations') {
    const item = record as AdminStationRecord;
    return {
      stationId: item.stationId,
      mn: item.mn,
      mnName: item.mnName,
      lat: String(item.lat),
      lng: String(item.lng),
      st: String(item.st)
    };
  }

  if (tab === 'monitorData') {
    const item = record as AdminMonitorDataRecord;
    return {
      mn: item.mn,
      paramCode: item.paramCode,
      paramName: item.paramName,
      value: String(item.value),
      dataTime: normalizeDateTimeText(item.dataTime)
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

  if (tab === 'tools') {
    return {
      name: values.name?.trim() ?? '',
      toolGroup: values.toolGroup?.trim() ?? '',
      version: values.version?.trim() || '1.0.0',
      tags: splitTagText(values.tags),
      description: values.description?.trim() ?? '',
      parametersSchema: values.parametersSchema?.trim() ?? '',
      enabled: !isDisabledStatus(values.status ?? 'ACTIVE')
    };
  }

  if (tab === 'stations') {
    return {
      stationId: values.stationId?.trim() ?? '',
      mn: values.mn?.trim() ?? '',
      mnName: values.mnName?.trim() ?? '',
      lat: parseNullableNumber(values.lat),
      lng: parseNullableNumber(values.lng),
      st: parseNullableNumber(values.st)
    };
  }

  if (tab === 'monitorData') {
    return {
      mn: values.mn?.trim() ?? '',
      paramCode: values.paramCode?.trim() ?? '',
      paramName: values.paramName?.trim() ?? '',
      value: parseNullableNumber(values.value),
      dataTime: normalizeDateTimeText(values.dataTime)
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
  if (tab === 'tools') return createAdminTool(payload);
  if (tab === 'stations') return createAdminStation(payload);
  if (tab === 'monitorData') return createAdminMonitorData(payload);
  return createAdminModel(payload);
}

function updateRecord(tab: AdminTab, id: string, payload: AdminUpsertPayload) {
  if (tab === 'roles') return updateAdminRole(id, payload);
  if (tab === 'menus') return updateAdminMenu(id, payload);
  if (tab === 'knowledgeBases') return updateAdminKnowledgeBase(id, payload);
  if (tab === 'vendors') return updateAdminVendor(id, payload);
  if (tab === 'dictionaries') return updateAdminDictItem(id, payload);
  if (tab === 'tools') return updateAdminTool(id, payload);
  if (tab === 'stations') return updateAdminStation(id, payload);
  if (tab === 'monitorData') return updateAdminMonitorData(id, payload);
  return updateAdminModel(id, payload);
}

function deleteRecord(tab: AdminTab, id: string) {
  if (tab === 'roles') return deleteAdminRole(id);
  if (tab === 'menus') return deleteAdminMenu(id);
  if (tab === 'knowledgeBases') return deleteAdminKnowledgeBase(id);
  if (tab === 'vendors') return deleteAdminVendor(id);
  if (tab === 'dictionaries') return deleteAdminDictItem(id);
  if (tab === 'tools') return deleteAdminTool(id);
  if (tab === 'stations') return deleteAdminStation(id);
  if (tab === 'monitorData') return deleteAdminMonitorData(id);
  return deleteAdminModel(id);
}

function invalidateAdmin(queryClient: ReturnType<typeof useQueryClient>, tab: AdminTab) {
  const key =
    tab === 'knowledgeBases'
      ? 'knowledge-bases'
      : tab === 'dictionaries'
        ? 'dict-items'
        : tab === 'tools'
          ? 'tools'
        : tab === 'monitorData'
          ? 'monitor-data'
          : tab;
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

  if (tab === 'tools') {
    const item = record as AdminToolRecord;
    return [
      { label: '工具名', value: item.name },
      { label: '所属分组', value: item.toolGroup || '--' },
      { label: '版本号', value: item.version || '--' },
      { label: '状态', value: item.status },
      { label: '向量状态', value: item.embeddingStatus || '--' },
      { label: '失败原因', value: item.embeddingError || '--' },
      { label: '权限角色', value: item.roleNames.length ? item.roleNames.join('、') : '未绑定' },
      { label: '标签', value: item.tags.length ? item.tags.join('、') : '--' },
      { label: '命中次数', value: String(item.hitCount) },
      { label: '调用次数', value: String(item.callCount) },
      { label: '成功次数', value: String(item.successCount) },
      { label: '成功率', value: formatPercent(item.successRate) },
      { label: '描述', value: item.description || '--' },
      { label: '参数 Schema', value: item.parametersSchema || '--' }
    ];
  }

  if (tab === 'stations') {
    const item = record as AdminStationRecord;
    return [
      { label: '点位名称', value: item.mnName },
      { label: '站点编码', value: item.stationId },
      { label: 'MN 编号', value: item.mn },
      { label: '纬度', value: String(item.lat) },
      { label: '经度', value: String(item.lng) },
      { label: '站点类型', value: String(item.st) }
    ];
  }

  if (tab === 'monitorData') {
    const item = record as AdminMonitorDataRecord;
    return [
      { label: 'MN 编号', value: item.mn },
      { label: '参数编码', value: item.paramCode },
      { label: '参数名称', value: item.paramName },
      { label: '监测值', value: String(item.value) },
      { label: '监测时间', value: item.dataTime }
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

function resolveEmbeddingTone(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'READY') {
    return 'good' as const;
  }
  if (normalized === 'FAILED') {
    return 'warn' as const;
  }
  return 'neutral' as const;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function splitTagText(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function buildMonitorGroupModalState(record: MonitorDataGroupRow): MonitorDataGroupModalState {
  return {
    id: record.id,
    mn: record.mn,
    mnName: record.mnName,
    dataTime: normalizeDateTimeText(record.dataTime),
    fields: MONITOR_PARAM_META.map((item) => ({
      paramCode: item.code,
      paramName: item.name,
      recordId: record.detailIds[item.code],
      value: readMonitorGroupValue(record, item.code)
    }))
  };
}

function groupMonitorDataRows(items: AdminMonitorDataRecord[], stationNameByMn: Map<string, string>): MonitorDataGroupRow[] {
  const grouped = new Map<string, MonitorDataGroupRow>();

  for (const item of items) {
    const key = `${item.mn}__${item.dataTime}`;
    const current =
      grouped.get(key) ??
      {
        id: key,
        mn: item.mn,
        mnName: stationNameByMn.get(item.mn) ?? '--',
        dataTime: item.dataTime,
        detailIds: {},
        totalPhosphorus: '--',
        totalNitrogen: '--',
        ammoniaNitrogen: '--',
        codmn: '--',
        ph: '--',
        waterLevel: '--',
        flow: '--',
        velocity: '--'
      };

    switch (item.paramCode.trim().toUpperCase()) {
      case 'TP':
        current.detailIds.TP = item.id;
        current.totalPhosphorus = formatMonitorValue(item.value);
        break;
      case 'TN':
        current.detailIds.TN = item.id;
        current.totalNitrogen = formatMonitorValue(item.value);
        break;
      case 'NH3N':
        current.detailIds.NH3N = item.id;
        current.ammoniaNitrogen = formatMonitorValue(item.value);
        break;
      case 'CODMN':
        current.detailIds.CODMN = item.id;
        current.codmn = formatMonitorValue(item.value);
        break;
      case 'PH':
        current.detailIds.PH = item.id;
        current.ph = formatMonitorValue(item.value);
        break;
      case 'WL':
        current.detailIds.WL = item.id;
        current.waterLevel = formatMonitorValue(item.value);
        break;
      case 'Q':
        current.detailIds.Q = item.id;
        current.flow = formatMonitorValue(item.value);
        break;
      case 'VS':
        current.detailIds.VS = item.id;
        current.velocity = formatMonitorValue(item.value);
        break;
      default:
        break;
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const timeDiff = new Date(right.dataTime).getTime() - new Date(left.dataTime).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return left.mn.localeCompare(right.mn, 'zh-CN');
  });
}

function readMonitorGroupValue(record: MonitorDataGroupRow, code: MonitorParamCode) {
  switch (code) {
    case 'TP':
      return record.totalPhosphorus === '--' ? '' : record.totalPhosphorus;
    case 'TN':
      return record.totalNitrogen === '--' ? '' : record.totalNitrogen;
    case 'NH3N':
      return record.ammoniaNitrogen === '--' ? '' : record.ammoniaNitrogen;
    case 'CODMN':
      return record.codmn === '--' ? '' : record.codmn;
    case 'PH':
      return record.ph === '--' ? '' : record.ph;
    case 'WL':
      return record.waterLevel === '--' ? '' : record.waterLevel;
    case 'Q':
      return record.flow === '--' ? '' : record.flow;
    case 'VS':
      return record.velocity === '--' ? '' : record.velocity;
  }
}

function buildFieldOptions(
  tab: AdminTab,
  options: {
    statusOptions: SelectOption[];
    modelTypeOptions: SelectOption[];
    vendorOptions: SelectOption[];
    dictTypeOptions: SelectOption[];
    stationMnOptions: SelectOption[];
  }
): Record<string, SelectOption[]> {
  if (tab === 'roles') {
    return { status: options.statusOptions };
  }
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
  if (tab === 'tools') {
    return { status: options.statusOptions };
  }
  if (tab === 'stations') {
    return {};
  }
  if (tab === 'monitorData') {
    return {
      mn: options.stationMnOptions
    };
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

function formatMonitorValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '--';
}

function formatDateTimeInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function normalizeDateTimeText(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }
  const normalized = trimmed.replace(' ', 'T');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function isDisabledStatus(value: string) {
  return ['DISABLED', 'INACTIVE', 'DELETED', '停用', '禁用'].includes(value.trim().toUpperCase());
}
