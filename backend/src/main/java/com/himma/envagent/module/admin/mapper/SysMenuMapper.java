package com.himma.envagent.module.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.admin.entity.SysMenuEntity;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface SysMenuMapper extends BaseMapper<SysMenuEntity> {

    @Select("""
            SELECT DISTINCT m.*
            FROM sys_menus m
            JOIN sys_role_menus rm ON rm.menu_id = m.id
            JOIN sys_roles r ON r.id = rm.role_id
            WHERE r.code = #{roleCode}
              AND r.enabled = TRUE
              AND m.visible = TRUE
            ORDER BY m.sort_order ASC, m.id ASC
            """)
    List<SysMenuEntity> selectVisibleByRoleCode(@Param("roleCode") String roleCode);
}
