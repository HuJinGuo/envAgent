package com.himma.envagent.module.knowledge.service;

import com.himma.envagent.module.knowledge.domain.DocumentRecord;
import com.himma.envagent.module.knowledge.domain.DocumentStatus;
import com.himma.envagent.module.knowledge.repository.DocumentChunkRepository;
import com.himma.envagent.module.knowledge.repository.DocumentRepository;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.ChunkPayload;
import com.himma.envagent.module.rag.service.ModelGateway;
import com.himma.envagent.module.rag.service.RagService;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class DocumentIngestionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final ModelGateway modelGateway;
    private final RagService ragService;

    public DocumentIngestionService(
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentTextExtractor documentTextExtractor,
            ModelGateway modelGateway,
            RagService ragService
    ) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentTextExtractor = documentTextExtractor;
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
            String text = normalize(documentTextExtractor.extract(Path.of(document.storagePath()), document.filename()));
            List<String> chunks = splitIntoChunks(text);
            if (chunks.isEmpty()) {
                throw new IllegalStateException("document content is empty");
            }

            // embedding 和 chunk 一一对应，后面会一起回写到 document_chunks 表。
            List<float[]> embeddings = modelGateway.embed(chunks);
            List<ChunkPayload> payloads = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++) {
                String content = chunks.get(i);
                payloads.add(new ChunkPayload(
                        content,
                        i,
                        Math.max(1, content.length() / 4),
                        ragService.formatEmbedding(embeddings.get(i))
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

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\u0000", "")
                .replaceAll("\\r\\n?", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private List<String> splitIntoChunks(String text) {
        List<String> chunks = new ArrayList<>();
        if (text.isBlank()) {
            return chunks;
        }
        int start = 0;
        int chunkSize = 900;
        int overlap = 120;
        while (start < text.length()) {
            int end = Math.min(text.length(), start + chunkSize);
            int breakAt = findBreakPosition(text, start, end);
            String chunk = text.substring(start, breakAt).trim();
            if (!chunk.isEmpty()) {
                chunks.add(chunk);
            }
            if (breakAt >= text.length()) {
                break;
            }
            // overlap 让相邻片段共享少量上下文，减少答案跨片段时的信息断裂。
            start = Math.max(breakAt - overlap, start + 1);
        }
        return chunks;
    }

    private int findBreakPosition(String text, int start, int end) {
        // 优先在段落或句子边界切，尽量避免把一句话从中间硬截断。
        int paragraph = text.lastIndexOf("\n\n", end);
        if (paragraph > start + 200) {
            return paragraph;
        }
        int sentence = Math.max(text.lastIndexOf('。', end), text.lastIndexOf('\n', end));
        if (sentence > start + 200) {
            return sentence + 1;
        }
        return end;
    }
}
