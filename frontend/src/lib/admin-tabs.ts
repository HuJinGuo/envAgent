export type AdminTab = 'roles' | 'menus' | 'knowledgeBases' | 'vendors' | 'models' | 'dictionaries';

export const adminTabPaths: Record<AdminTab, string> = {
  roles: '/admin/roles',
  menus: '/admin/menus',
  knowledgeBases: '/admin/knowledge-bases',
  vendors: '/admin/vendors',
  models: '/admin/models',
  dictionaries: '/admin/dictionaries'
};

export const adminTabMeta: Record<
  AdminTab,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  roles: {
    label: '角色管理',
    title: '角色管理',
    description: '维护角色编码、名称、状态与排序，所有新增和修改统一通过弹窗完成。'
  },
  menus: {
    label: '菜单管理',
    title: '菜单管理',
    description: '维护左侧导航目录树与菜单元数据，新增和编辑统一通过弹窗完成。'
  },
  knowledgeBases: {
    label: '知识库管理',
    title: '知识库管理',
    description: '集中维护知识库基础信息，列表展示与弹窗操作分离。'
  },
  vendors: {
    label: '厂商管理',
    title: '厂商管理',
    description: '维护模型厂商、接口地址和启用状态，采用后台列表加弹窗编辑方式。'
  },
  models: {
    label: '模型管理',
    title: '模型管理',
    description: '维护模型编码、类型、上下文窗口等元数据，避免在页内堆叠复杂表单。'
  },
  dictionaries: {
    label: '业务字典',
    title: '业务字典',
    description: '集中维护状态、模型类型等通用字典项，供基础管理页面统一复用。'
  }
};

export function resolveAdminTab(pathname: string): AdminTab {
  if (pathname.startsWith('/admin/menus')) {
    return 'menus';
  }
  if (pathname.startsWith('/admin/knowledge-bases')) {
    return 'knowledgeBases';
  }
  if (pathname.startsWith('/admin/vendors')) {
    return 'vendors';
  }
  if (pathname.startsWith('/admin/models')) {
    return 'models';
  }
  if (pathname.startsWith('/admin/dictionaries')) {
    return 'dictionaries';
  }
  return 'roles';
}
