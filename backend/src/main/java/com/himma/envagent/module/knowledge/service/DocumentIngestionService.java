package com.himma.envagent.module.knowledge.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.himma.envagent.module.knowledge.domain.DocumentBlock;
import com.himma.envagent.module.knowledge.domain.DocumentRecord;
import com.himma.envagent.module.knowledge.domain.DocumentStatus;
import com.himma.envagent.module.knowledge.repository.DocumentChunkRepository;
import com.himma.envagent.module.knowledge.repository.DocumentRepository;
import com.himma.envagent.module.knowledge.service.StructureAwareChunker.StructuredChunk;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.ChunkPayload;
import com.himma.envagent.module.rag.service.ModelGateway;
import com.himma.envagent.module.rag.service.RagService;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * 文档入库服务：解析 → 结构感知切片 → embedding → 落库 document_chunks。
 *
 * <p>新版相比旧版（PDFBox 抽纯文本 + 字符滑窗）做了几件事：
 * <ul>
 *   <li>解析阶段输出 {@link DocumentBlock} 列表，保留标题、段落、表格的结构。</li>
 *   <li>切片阶段调用 {@link StructureAwareChunker}，每个 chunk 都附带「标题路径 + 类型 + 页码」。</li>
 *   <li>metadata 用 Jackson 序列化成 JSON 字符串，落到 document_chunks.metadata（JSONB）。</li>
 * </ul>
 */
@Service
public class DocumentIngestionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final StructureAwareChunker structureAwareChunker;
    private final ModelGateway modelGateway;
    private final RagService ragService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DocumentIngestionService(
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentTextExtractor documentTextExtractor,
            StructureAwareChunker structureAwareChunker,
            ModelGateway modelGateway,
            RagService ragService
    ) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentTextExtractor = documentTextExtractor;
        this.structureAwareChunker = structureAwareChunker;
        this.modelGateway = modelGateway;
        this.ragService = ragService;
    }

    @Async
    public void ingest(long documentId) {
        // 上传接口先落库，再异步做解析/切片/向量化，避免用户请求长时间阻塞。
        documentRepository.updateStatus(documentId, DocumentStatus.PROCESSING, 0, null);
        try {
            DocumentRecord document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new IllegalStateException("document not found: " + documentId));

            // 1. 结构化抽取：把原始文档变成 HEADING/PARAGRAPH/TABLE 等语义块。
            List<DocumentBlock> blocks = documentTextExtractor.extract(
                    Path.of(document.storagePath()), document.filename());

            // 2. 结构感知切片：表格保持原子性，正文按章节聚合，每个 chunk 都带 metadata。
            List<StructuredChunk> structuredChunks = structureAwareChunker.chunk(blocks);
            if (structuredChunks.isEmpty()) {
                throw new IllegalStateException("document content is empty");
            }

            // 3. 仅向量化「正文」字段；embedding 与 chunk 一一对应。
            List<String> contents = structuredChunks.stream().map(StructuredChunk::content).toList();
            List<float[]> embeddings = modelGateway.embed(contents);

            // 4. 组装 ChunkPayload：把 metadata Map 序列化成 JSON，给下游 Repository 直接写 JSONB。
            List<ChunkPayload> payloads = new ArrayList<>(structuredChunks.size());
            for (int i = 0; i < structuredChunks.size(); i++) {
                StructuredChunk chunk = structuredChunks.get(i);
                payloads.add(new ChunkPayload(
                        chunk.content(),
                        i,
                        chunk.tokenCount(),
                        ragService.formatEmbedding(embeddings.get(i)),
                        chunk.chunkType(),
                        toJson(chunk.toMetadata())
                ));
            }

            documentChunkRepository.replaceChunks(documentId, payloads);
            documentRepository.updateStatus(documentId, DocumentStatus.READY, payloads.size(), null);
        } catch (Exception exception) {
            // 入库失败时先删掉半成品切片，保证文档状态和切片数据一致。
            documentChunkRepository.deleteByDocumentId(documentId);
            documentRepository.updateStatus(documentId, DocumentStatus.FAILED, 0, exception.getMessage());
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            // metadata 是我们自己构造的纯 Map/List/String，理论上不会失败；保底返回空对象。
            return "{}";
        }
    }
}
