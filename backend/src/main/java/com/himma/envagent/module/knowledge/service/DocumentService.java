package com.himma.envagent.module.knowledge.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.knowledge.domain.DocumentRecord;
import com.himma.envagent.module.knowledge.repository.DocumentChunkRepository;
import com.himma.envagent.module.knowledge.repository.DocumentRepository;
import com.himma.envagent.module.knowledge.repository.KnowledgeBaseRepository;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.DocumentItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.DocumentStatusItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.UploadDocumentResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentService {

    private static final List<String> SUPPORTED_EXTENSIONS = List.of("pdf", "docx", "txt");
    private static final DateTimeFormatter SIZE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentIngestionService documentIngestionService;
    private final Path storageBasePath;

    public DocumentService(
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            KnowledgeBaseRepository knowledgeBaseRepository,
            DocumentIngestionService documentIngestionService,
            @Value("${app.storage.base-path:./data}") String storageBasePath
    ) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.documentIngestionService = documentIngestionService;
        this.storageBasePath = Path.of(storageBasePath).toAbsolutePath().normalize();
    }

    public List<DocumentItem> list() {
        return documentRepository.findAll().stream().map(this::toItem).toList();
    }

    public DocumentItem get(long documentId) {
        return documentRepository.findById(documentId).map(this::toItem)
                .orElseThrow(() -> new BusinessException(404, "文档不存在"));
    }

    public DocumentStatusItem getStatus(long documentId) {
        DocumentRecord record = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException(404, "文档不存在"));
        return new DocumentStatusItem(
                record.id(),
                record.status().name(),
                record.chunkCount(),
                record.errorMessage(),
                record.updatedAt()
        );
    }

    public UploadDocumentResponse upload(MultipartFile file, Long kbId, Long userId) {
        validateFile(file);
        if (kbId != null) {
            knowledgeBaseRepository.findById(kbId)
                    .orElseThrow(() -> new BusinessException(404, "知识库分类不存在"));
        }
        try {
            Files.createDirectories(storageBasePath.resolve("documents"));
            String storedName = System.currentTimeMillis() + "-" + sanitize(file.getOriginalFilename());
            Path destination = storageBasePath.resolve("documents").resolve(storedName);
            file.transferTo(destination);
            long documentId = documentRepository.insert(
                    kbId,
                    safeFilename(file.getOriginalFilename()),
                    file.getContentType(),
                    destination.toString(),
                    file.getSize(),
                    userId
            );
            documentIngestionService.ingest(documentId);
            return new UploadDocumentResponse(documentId, "PENDING", 0);
        } catch (IOException exception) {
            throw new IllegalStateException("failed to save file", exception);
        }
    }

    public void delete(long documentId) {
        DocumentRecord record = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException(404, "文档不存在"));
        documentChunkRepository.deleteByDocumentId(documentId);
        documentRepository.delete(documentId);
        if (record.storagePath() != null) {
            try {
                Files.deleteIfExists(Path.of(record.storagePath()));
            } catch (IOException ignored) {
            }
        }
    }

    public long countDocuments() {
        return documentRepository.countAll();
    }

    public long countChunks() {
        return documentChunkRepository.countAll();
    }

    public long countProcessingDocuments() {
        return documentRepository.countByStatus(com.himma.envagent.module.knowledge.domain.DocumentStatus.PROCESSING)
                + documentRepository.countByStatus(com.himma.envagent.module.knowledge.domain.DocumentStatus.PENDING);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "上传文件不能为空");
        }
        String extension = extension(file.getOriginalFilename());
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new BusinessException(400, "仅支持 pdf/docx/txt 文件");
        }
    }

    private DocumentItem toItem(DocumentRecord record) {
        return new DocumentItem(
                record.id(),
                record.kbId(),
                record.kbName(),
                record.filename(),
                record.filename(),
                record.fileSize(),
                formatSize(record.fileSize()),
                record.status().name(),
                record.chunkCount(),
                record.errorMessage(),
                record.createdAt(),
                record.updatedAt()
        );
    }

    private String extension(String filename) {
        int index = filename == null ? -1 : filename.lastIndexOf('.');
        if (index < 0 || index == filename.length() - 1) {
            return "";
        }
        return filename.substring(index + 1).toLowerCase();
    }

    private String sanitize(String filename) {
        return safeFilename(filename).replaceAll("[^\\p{L}\\p{N}._-]+", "_");
    }

    private String safeFilename(String filename) {
        return (filename == null || filename.isBlank()) ? "document.txt" : filename;
    }

    private String formatSize(long fileSize) {
        if (fileSize >= 1024L * 1024L) {
            return String.format("%.1f MB", fileSize / 1024.0 / 1024.0);
        }
        if (fileSize >= 1024L) {
            return String.format("%.0f KB", fileSize / 1024.0);
        }
        return fileSize + " B";
    }
}
