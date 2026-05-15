package com.himma.envagent.module.agent.tool.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.agent.tool.entity.AgentToolEntity;
import com.himma.envagent.module.agent.tool.repository.AgentToolRepository;
import com.himma.envagent.module.agent.tool.repository.row.AgentToolSearchRow;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolItem;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolRequest;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolSearchRequest;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolSearchResultItem;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.rag.service.ModelGateway;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgentToolService {

    private final AgentToolRepository toolRepository;
    private final ToolEmbeddingService toolEmbeddingService;
    private final AdminRepository adminRepository;
    private final ModelGateway modelGateway;
    private final WorkspaceAccessService workspaceAccessService;

    public AgentToolService(AgentToolRepository toolRepository,
                            ToolEmbeddingService toolEmbeddingService,
                            AdminRepository adminRepository,
                            ModelGateway modelGateway,
                            WorkspaceAccessService workspaceAccessService) {
        this.toolRepository = toolRepository;
        this.toolEmbeddingService = toolEmbeddingService;
        this.adminRepository = adminRepository;
        this.modelGateway = modelGateway;
        this.workspaceAccessService = workspaceAccessService;
    }

    public List<ToolItem> list(Authentication authentication) {
        requireAdmin(authentication);
        return toolRepository.findAll().stream().map(this::toItem).toList();
    }

    @Transactional
    public ToolItem create(Authentication authentication, ToolRequest request) {
        requireAdmin(authentication);
        toolRepository.findByName(request.name().trim()).ifPresent((tool) -> {
            throw new BusinessException(409, "工具名称已存在");
        });
        AgentToolEntity entity = apply(new AgentToolEntity(), request);
        entity.setEmbeddingStatus("PENDING");
        entity.setEmbeddingError(null);
        AgentToolEntity saved = toolRepository.save(entity);
        toolEmbeddingService.reembed(saved.getId());
        return toItem(saved);
    }

    @Transactional
    public ToolItem update(Authentication authentication, Long id, ToolRequest request) {
        requireAdmin(authentication);
        AgentToolEntity entity = toolRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "工具不存在"));
        toolRepository.findByName(request.name().trim())
                .filter((tool) -> !tool.getId().equals(id))
                .ifPresent((tool) -> {
                    throw new BusinessException(409, "工具名称已存在");
                });
        boolean shouldReembed = coreChanged(entity, request);
        AgentToolEntity updated = apply(entity, request);
        if (shouldReembed) {
            updated.setEmbeddingStatus("PENDING");
            updated.setEmbeddingError(null);
        }
        AgentToolEntity saved = toolRepository.save(updated);
        if (shouldReembed) {
            toolEmbeddingService.reembed(saved.getId());
        }
        return toItem(saved);
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        requireAdmin(authentication);
        toolRepository.deleteById(id);
    }

    @Transactional
    public void replaceRoles(Authentication authentication, Long id, List<Long> roleIds) {
        requireAdmin(authentication);
        toolRepository.findById(id).orElseThrow(() -> new BusinessException(404, "工具不存在"));
        for (Long roleId : roleIds) {
            adminRepository.roleById(roleId)
                    .orElseThrow(() -> new BusinessException(400, "存在无效角色ID: " + roleId));
        }
        toolRepository.replaceRoles(id, roleIds);
    }

    public List<ToolSearchResultItem> testSearch(Authentication authentication, ToolSearchRequest request) {
        requireAdmin(authentication);
        List<float[]> embeddings = modelGateway.embed(List.of(request.query().trim()));
        if (embeddings.isEmpty()) {
            throw new BusinessException(500, "工具检索向量生成失败");
        }
        Long roleId = null;
        if (request.roleCode() != null && !request.roleCode().isBlank()) {
            roleId = adminRepository.roleByCode(request.roleCode().trim())
                    .orElseThrow(() -> new BusinessException(400, "角色编码不存在"))
                    .getId();
        }
        String queryVector = formatEmbedding(embeddings.get(0));
        int limit = request.limit() == null || request.limit() <= 0 ? 8 : Math.min(request.limit(), 20);
        return rankSearchResults(queryVector, embeddings.get(0), request.groupName(), roleId, limit);
    }

    /** 给 AgentToolBootstrap 用的内部接口：插入或更新一个工具种子定义。 */
    @Transactional
    public AgentToolEntity ensureSeedTool(String name, String description, String parametersSchema,
                                          String groupName, List<String> tags, String version) {
        AgentToolEntity entity = toolRepository.findByName(name).orElseGet(AgentToolEntity::new);
        boolean createMode = entity.getId() == null;
        entity.setName(name);
        entity.setDescription(description);
        entity.setParametersSchema(parametersSchema);
        entity.setToolGroup(groupName);
        entity.setTags(joinTags(tags));
        entity.setVersion(version);
        entity.setEnabled(true);
        entity.setHitCount(entity.getHitCount() == null ? 0L : entity.getHitCount());
        entity.setCallCount(entity.getCallCount() == null ? 0L : entity.getCallCount());
        entity.setSuccessCount(entity.getSuccessCount() == null ? 0L : entity.getSuccessCount());
        entity.setEmbeddingStatus(entity.getEmbeddingStatus() == null ? "PENDING" : entity.getEmbeddingStatus());
        entity.setUpdatedAt(LocalDateTime.now());
        AgentToolEntity saved = toolRepository.save(entity);
        if (createMode || saved.getEmbedding() == null || saved.getEmbedding().isBlank()) {
            toolEmbeddingService.reembed(saved.getId());
        }
        return saved;
    }

    public void ensureSeedRole(Long toolId, Long roleId) {
        toolRepository.addRoleIfMissing(toolId, roleId);
    }

    private void requireAdmin(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "Agent 工具", UserRole.ADMIN);
    }

    private AgentToolEntity apply(AgentToolEntity entity, ToolRequest request) {
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setParametersSchema(request.parametersSchema());
        entity.setToolGroup(request.toolGroup() == null ? null : request.toolGroup().trim());
        entity.setTags(joinTags(request.tags()));
        entity.setVersion(request.version() == null || request.version().isBlank() ? "1.0.0" : request.version().trim());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setHitCount(entity.getHitCount() == null ? 0L : entity.getHitCount());
        entity.setCallCount(entity.getCallCount() == null ? 0L : entity.getCallCount());
        entity.setSuccessCount(entity.getSuccessCount() == null ? 0L : entity.getSuccessCount());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private boolean coreChanged(AgentToolEntity entity, ToolRequest request) {
        return !normalizeText(entity.getName()).equals(normalizeText(request.name()))
                || !normalizeText(entity.getDescription()).equals(normalizeText(request.description()))
                || !normalizeText(entity.getParametersSchema()).equals(normalizeText(request.parametersSchema()));
    }

    private ToolItem toItem(AgentToolEntity entity) {
        List<Long> roleIds = toolRepository.roleIdsByToolId(entity.getId());
        List<SysRoleEntity> roles = roleIds.stream()
                .map(adminRepository::roleById)
                .flatMap(Optional::stream)
                .toList();
        long callCount = entity.getCallCount() == null ? 0L : entity.getCallCount();
        long successCount = entity.getSuccessCount() == null ? 0L : entity.getSuccessCount();
        double successRate = callCount == 0 ? 0D : (double) successCount / (double) callCount;
        return new ToolItem(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getParametersSchema(),
                entity.getToolGroup(),
                splitTags(entity.getTags()),
                entity.getVersion(),
                entity.getEnabled(),
                entity.getEmbeddingStatus(),
                entity.getEmbeddingError(),
                entity.getHitCount() == null ? 0L : entity.getHitCount(),
                callCount,
                successCount,
                successRate,
                roleIds,
                roles.stream().map(SysRoleEntity::getCode).toList(),
                roles.stream().map(SysRoleEntity::getName).toList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private List<ToolSearchResultItem> rankSearchResults(String queryVector, float[] queryEmbedding,
                                                         String groupName, Long roleId, int limit) {
        List<AgentToolSearchRow> vectorResults =
                toolRepository.searchByVector(queryVector, normalizeNullable(groupName), roleId, limit);
        if (!vectorResults.isEmpty()) {
            return vectorResults.stream()
                    .map((item) -> new ToolSearchResultItem(
                            item.getId(),
                            item.getName(),
                            item.getToolGroup(),
                            item.getDescription(),
                            item.getScore() == null ? 0D : item.getScore(),
                            item.getEmbeddingStatus(),
                            roleCodes(item.getId()),
                            roleNames(item.getId()),
                            splitTags(item.getTags())
                    ))
                    .toList();
        }
        return toolRepository.findAll().stream()
                .filter((tool) -> Boolean.TRUE.equals(tool.getEnabled()))
                .filter((tool) -> "READY".equalsIgnoreCase(normalizeText(tool.getEmbeddingStatus())))
                .filter((tool) -> groupName == null || groupName.isBlank() || normalizeText(groupName).equals(normalizeText(tool.getToolGroup())))
                .filter((tool) -> roleId == null || toolRepository.roleIdsByToolId(tool.getId()).contains(roleId))
                .map((tool) -> new ToolSearchResultItem(
                        tool.getId(),
                        tool.getName(),
                        tool.getToolGroup(),
                        tool.getDescription(),
                        cosine(queryEmbedding, parseEmbedding(tool.getEmbedding())),
                        tool.getEmbeddingStatus(),
                        roleCodes(tool.getId()),
                        roleNames(tool.getId()),
                        splitTags(tool.getTags())
                ))
                .sorted(Comparator.comparingDouble(ToolSearchResultItem::similarity).reversed())
                .limit(limit)
                .toList();
    }

    private List<String> roleCodes(Long toolId) {
        return toolRepository.roleIdsByToolId(toolId).stream()
                .map(adminRepository::roleById)
                .flatMap(Optional::stream)
                .map(SysRoleEntity::getCode)
                .toList();
    }

    private List<String> roleNames(Long toolId) {
        return toolRepository.roleIdsByToolId(toolId).stream()
                .map(adminRepository::roleById)
                .flatMap(Optional::stream)
                .map(SysRoleEntity::getName)
                .toList();
    }

    private static String joinTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return "";
        }
        return tags.stream()
                .map(AgentToolService::normalizeText)
                .filter((item) -> !item.isBlank())
                .distinct()
                .collect(Collectors.joining(","));
    }

    private static List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }
        return List.of(tags.split(",")).stream()
                .map(String::trim)
                .filter((item) -> !item.isBlank())
                .toList();
    }

    private static String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeNullable(String value) {
        String normalized = normalizeText(value);
        return normalized.isBlank() ? null : normalized;
    }

    private static String formatEmbedding(float[] embedding) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(embedding[i]);
        }
        builder.append(']');
        return builder.toString();
    }

    private static float[] parseEmbedding(String value) {
        if (value == null || value.isBlank()) {
            return new float[0];
        }
        String trimmed = value.trim();
        String body = trimmed.startsWith("[") && trimmed.endsWith("]")
                ? trimmed.substring(1, trimmed.length() - 1)
                : trimmed;
        if (body.isBlank()) {
            return new float[0];
        }
        String[] parts = body.split(",");
        float[] vector = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            vector[i] = Float.parseFloat(parts[i].trim());
        }
        return vector;
    }

    private static double cosine(float[] left, float[] right) {
        int length = Math.min(left.length, right.length);
        double dot = 0D;
        double leftNorm = 0D;
        double rightNorm = 0D;
        for (int i = 0; i < length; i++) {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }
        if (leftNorm == 0D || rightNorm == 0D) {
            return 0D;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }
}
