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
    description: ''
  },
  menus: {
    label: '菜单管理',
    title: '菜单管理',
    description: ''
  },
  knowledgeBases: {
    label: '知识库管理',
    title: '知识库管理',
    description: ''
  },
  vendors: {
    label: '厂商管理',
    title: '厂商管理',
    description: ''
  },
  models: {
    label: '模型管理',
    title: '模型管理',
    description: ''
  },
  dictionaries: {
    label: '业务字典',
    title: '业务字典',
    description: ''
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
