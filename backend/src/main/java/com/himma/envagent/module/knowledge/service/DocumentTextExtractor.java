package com.himma.envagent.module.knowledge.service;

import com.himma.envagent.common.exception.BusinessException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

@Service
public class DocumentTextExtractor {

    public String extract(Path path, String filename) {
        String extension = extension(filename);
        try {
            return switch (extension) {
                case "pdf" -> extractPdf(path);
                case "docx" -> extractDocx(path);
                case "txt" -> Files.readString(path, StandardCharsets.UTF_8);
                default -> throw new BusinessException(400, "暂不支持该文件类型: " + extension);
            };
        } catch (IOException exception) {
            throw new IllegalStateException("failed to parse document: " + filename, exception);
        }
    }

    private String extractPdf(Path path) throws IOException {
        try (PDDocument document = Loader.loadPDF(path.toFile())) {
            return new PDFTextStripper().getText(document);
        }
    }

    private String extractDocx(Path path) throws IOException {
        try (InputStream inputStream = Files.newInputStream(path);
             XWPFDocument document = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private String extension(String filename) {
        int index = filename == null ? -1 : filename.lastIndexOf('.');
        if (index < 0 || index == filename.length() - 1) {
            return "";
        }
        return filename.substring(index + 1).toLowerCase();
    }
}
