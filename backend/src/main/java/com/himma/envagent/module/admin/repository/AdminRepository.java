package com.himma.envagent.module.admin.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.module.admin.entity.AdminKnowledgeBaseEntity;
import com.himma.envagent.module.admin.entity.AiModelEntity;
import com.himma.envagent.module.admin.entity.ModelVendorEntity;
import com.himma.envagent.module.admin.entity.SysDictItemEntity;
import com.himma.envagent.module.admin.entity.SysMenuEntity;
import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.entity.SysRoleMenuEntity;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.mapper.UserMapper;
import com.himma.envagent.module.admin.mapper.AdminKnowledgeBaseMapper;
import com.himma.envagent.module.admin.mapper.AiModelMapper;
import com.himma.envagent.module.admin.mapper.ModelVendorMapper;
import com.himma.envagent.module.admin.mapper.SysDictItemMapper;
import com.himma.envagent.module.admin.mapper.SysMenuMapper;
import com.himma.envagent.module.admin.mapper.SysRoleMapper;
import com.himma.envagent.module.admin.mapper.SysRoleMenuMapper;
import com.himma.envagent.common.support.SnowflakeIdGenerator;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

@Repository
public class AdminRepository {

    private final SysRoleMapper roleMapper;
    private final SysMenuMapper menuMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final UserMapper userMapper;
    private final ModelVendorMapper vendorMapper;
    private final AiModelMapper modelMapper;
    private final SysDictItemMapper dictItemMapper;
    private final AdminKnowledgeBaseMapper knowledgeBaseMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public AdminRepository(SysRoleMapper roleMapper, SysMenuMapper menuMapper, SysRoleMenuMapper roleMenuMapper,
                           UserMapper userMapper,
                           ModelVendorMapper vendorMapper, AiModelMapper modelMapper,
                           SysDictItemMapper dictItemMapper,
                           AdminKnowledgeBaseMapper knowledgeBaseMapper,
                           SnowflakeIdGenerator snowflakeIdGenerator) {
        this.roleMapper = roleMapper;
        this.menuMapper = menuMapper;
        this.roleMenuMapper = roleMenuMapper;
        this.userMapper = userMapper;
        this.vendorMapper = vendorMapper;
        this.modelMapper = modelMapper;
        this.dictItemMapper = dictItemMapper;
        this.knowledgeBaseMapper = knowledgeBaseMapper;
        this.snowflakeIdGenerator = snowflakeIdGenerator;
    }

    public List<SysRoleEntity> roles() {
        return roleMapper.selectList(new LambdaQueryWrapper<SysRoleEntity>()
                .orderByAsc(SysRoleEntity::getSortOrder)
                .orderByAsc(SysRoleEntity::getId));
    }

    public Optional<SysRoleEntity> roleById(Long id) {
        return Optional.ofNullable(roleMapper.selectById(id));
    }

    public Optional<SysRoleEntity> roleByCode(String code) {
        return Optional.ofNullable(roleMapper.selectOne(new LambdaQueryWrapper<SysRoleEntity>()
                .eq(SysRoleEntity::getCode, code)));
    }

    public SysRoleEntity saveRole(SysRoleEntity entity) {
        if (entity.getId() == null) {
            roleMapper.insert(entity);
        } else {
            roleMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteRole(Long id) {
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenuEntity>().eq(SysRoleMenuEntity::getRoleId, id));
        roleMapper.deleteById(id);
    }

    public List<SysMenuEntity> menus() {
        return menuMapper.selectList(new LambdaQueryWrapper<SysMenuEntity>()
                .orderByAsc(SysMenuEntity::getSortOrder)
                .orderByAsc(SysMenuEntity::getId));
    }

    public List<SysMenuEntity> visibleMenusByRole(String roleCode) {
        return menuMapper.selectVisibleByRoleCode(roleCode);
    }

    public Optional<SysMenuEntity> menuById(Long id) {
        return Optional.ofNullable(menuMapper.selectById(id));
    }

    public Optional<SysMenuEntity> menuByCode(String code) {
        return Optional.ofNullable(menuMapper.selectOne(new LambdaQueryWrapper<SysMenuEntity>()
                .eq(SysMenuEntity::getCode, code)));
    }

    public SysMenuEntity saveMenu(SysMenuEntity entity) {
        if (entity.getId() == null) {
            menuMapper.insert(entity);
        } else {
            menuMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteMenu(Long id) {
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenuEntity>().eq(SysRoleMenuEntity::getMenuId, id));
        menuMapper.deleteById(id);
    }

    public void replaceRoleMenus(Long roleId, Collection<Long> menuIds) {
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenuEntity>().eq(SysRoleMenuEntity::getRoleId, roleId));
        for (Long menuId : menuIds) {
            addRoleMenuIfMissing(roleId, menuId);
        }
    }

    public void addRoleMenuIfMissing(Long roleId, Long menuId) {
        Long count = roleMenuMapper.selectCount(new LambdaQueryWrapper<SysRoleMenuEntity>()
                .eq(SysRoleMenuEntity::getRoleId, roleId)
                .eq(SysRoleMenuEntity::getMenuId, menuId));
        if (count != null && count > 0) {
            return;
        }
        SysRoleMenuEntity entity = new SysRoleMenuEntity();
        entity.setRoleId(roleId);
        entity.setMenuId(menuId);
        roleMenuMapper.insert(entity);
    }

    public List<Long> menuIdsByRoleId(Long roleId) {
        return roleMenuMapper.selectList(new LambdaQueryWrapper<SysRoleMenuEntity>()
                        .eq(SysRoleMenuEntity::getRoleId, roleId))
                .stream()
                .map(SysRoleMenuEntity::getMenuId)
                .sorted()
                .toList();
    }

    public List<UserEntity> users() {
        return userMapper.selectList(new LambdaQueryWrapper<UserEntity>()
                .orderByAsc(UserEntity::getId));
    }

    public Optional<UserEntity> userById(Long id) {
        return Optional.ofNullable(userMapper.selectById(id));
    }

    public Optional<UserEntity> userByUsername(String username) {
        return Optional.ofNullable(userMapper.selectOne(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getUsername, username)
                .last("limit 1")));
    }

    public UserEntity saveUser(UserEntity entity) {
        if (entity.getId() == null) {
            userMapper.insert(entity);
        } else {
            userMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteUser(Long id) {
        userMapper.deleteById(id);
    }

    public List<SysDictItemEntity> dictItems() {
        return dictItemMapper.selectList(new LambdaQueryWrapper<SysDictItemEntity>()
                .orderByAsc(SysDictItemEntity::getDictType)
                .orderByAsc(SysDictItemEntity::getSortOrder)
                .orderByAsc(SysDictItemEntity::getId));
    }

    public List<SysDictItemEntity> dictItemsByType(String dictType) {
        return dictItemMapper.selectList(new LambdaQueryWrapper<SysDictItemEntity>()
                .eq(SysDictItemEntity::getDictType, dictType)
                .orderByAsc(SysDictItemEntity::getSortOrder)
                .orderByAsc(SysDictItemEntity::getId));
    }

    public Optional<SysDictItemEntity> dictItemById(Long id) {
        return Optional.ofNullable(dictItemMapper.selectById(id));
    }

    public Optional<SysDictItemEntity> dictItemByTypeAndValue(String dictType, String dictValue) {
        return Optional.ofNullable(dictItemMapper.selectOne(new LambdaQueryWrapper<SysDictItemEntity>()
                .eq(SysDictItemEntity::getDictType, dictType)
                .eq(SysDictItemEntity::getDictValue, dictValue)
                .last("limit 1")));
    }

    public SysDictItemEntity saveDictItem(SysDictItemEntity entity) {
        if (entity.getId() == null) {
            dictItemMapper.insert(entity);
        } else {
            dictItemMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteDictItem(Long id) {
        dictItemMapper.deleteById(id);
    }

    public List<ModelVendorEntity> vendors() {
        return vendorMapper.selectList(new LambdaQueryWrapper<ModelVendorEntity>()
                .orderByAsc(ModelVendorEntity::getSortOrder)
                .orderByAsc(ModelVendorEntity::getId));
    }

    public Optional<ModelVendorEntity> vendorByCode(String code) {
        return Optional.ofNullable(vendorMapper.selectOne(new LambdaQueryWrapper<ModelVendorEntity>()
                .eq(ModelVendorEntity::getCode, code)));
    }

    public Optional<ModelVendorEntity> vendorById(Long id) {
        return Optional.ofNullable(vendorMapper.selectById(id));
    }

    public ModelVendorEntity saveVendor(ModelVendorEntity entity) {
        if (entity.getId() == null) {
            vendorMapper.insert(entity);
        } else {
            vendorMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteVendor(Long id) {
        vendorMapper.deleteById(id);
    }

    public List<AiModelEntity> models() {
        return modelMapper.selectList(new LambdaQueryWrapper<AiModelEntity>()
                .orderByAsc(AiModelEntity::getSortOrder)
                .orderByAsc(AiModelEntity::getId));
    }

    public Optional<AiModelEntity> modelById(Long id) {
        return Optional.ofNullable(modelMapper.selectById(id));
    }

    public AiModelEntity saveModel(AiModelEntity entity) {
        if (entity.getId() == null) {
            modelMapper.insert(entity);
        } else {
            modelMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteModel(Long id) {
        modelMapper.deleteById(id);
    }


    public List<AdminKnowledgeBaseEntity> knowledgeBases() {
        return knowledgeBaseMapper.selectList(new LambdaQueryWrapper<AdminKnowledgeBaseEntity>()
                .orderByAsc(AdminKnowledgeBaseEntity::getSortOrder)
                .orderByAsc(AdminKnowledgeBaseEntity::getId));
    }

    public AdminKnowledgeBaseEntity saveKnowledgeBase(AdminKnowledgeBaseEntity entity) {
        if (entity.getId() == null) {
            knowledgeBaseMapper.insert(entity);
        } else {
            knowledgeBaseMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteKnowledgeBase(Long id) {
        knowledgeBaseMapper.deleteById(id);
    }

}
