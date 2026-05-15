package com.himma.envagent.module.admin.service;

import com.himma.envagent.module.admin.entity.AgentToolEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.rag.service.ModelGateway;
import jakarta.annotation.Nullable;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ToolEmbeddingService {

    private final AdminRepository adminRepository;
    private final ModelGateway modelGateway;

    public ToolEmbeddingService(AdminRepository adminRepository, ModelGateway modelGateway) {
        this.adminRepository = adminRepository;
        this.modelGateway = modelGateway;
    }

    @Async
    public void reembed(Long toolId) {
        AgentToolEntity entity = adminRepository.toolById(toolId).orElse(null);
        if (entity == null) {
            return;
        }
        try {
            List<float[]> embeddings = modelGateway.embed(List.of(buildEmbeddingText(entity)));
            String embedding = embeddings.isEmpty() ? null : formatEmbedding(embeddings.get(0));
            entity.setEmbedding(embedding);
            entity.setEmbeddingStatus("READY");
            entity.setEmbeddingError(null);
            entity.setUpdatedAt(LocalDateTime.now());
            adminRepository.updateToolEmbedding(entity);
        } catch (Exception exception) {
            entity.setEmbeddingStatus("FAILED");
            entity.setEmbeddingError(exception.getMessage());
            entity.setUpdatedAt(LocalDateTime.now());
            adminRepository.updateToolEmbedding(entity);
        }
    }

    private String buildEmbeddingText(AgentToolEntity entity) {
        return """
                工具名称：%s
                工具描述：%s
                参数定义：%s
                所属分组：%s
                标签：%s
                版本：%s
                """.formatted(
                safe(entity.getName()),
                safe(entity.getDescription()),
                safe(entity.getParametersSchema()),
                safe(entity.getToolGroup()),
                safe(entity.getTags()),
                safe(entity.getVersion())
        );
    }

    private String safe(@Nullable String value) {
        return value == null ? "" : value.trim();
    }

    private String formatEmbedding(float[] embedding) {
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
}
