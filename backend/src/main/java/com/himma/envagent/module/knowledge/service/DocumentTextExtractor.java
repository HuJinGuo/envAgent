package com.himma.envagent.module.knowledge.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.knowledge.domain.DocumentBlock;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Service;

/**
 * 文档抽取器：把 PDF / DOCX / TXT 解析成「结构化块列表」。
 *
 * <p>对比旧实现（直接返回一整段 String），这一版多做了两件事：
 * <ol>
 *   <li>识别标题与正文段落，便于下游切片器维护「标题路径」当 metadata。</li>
 *   <li>DOCX 表格序列化成 Markdown 单独成块，避免被字符切片器拦腰切断。</li>
 * </ol>
 *
 * <p>PDF 的表格识别因为依赖坐标分析较复杂，本版先不做，留到后续接入 MinerU
 * 等专业解析服务时再补；当前仅做「标题 / 段落」启发式识别。
 */
@Service
public class DocumentTextExtractor {

    /** 简单的标题启发式：编号开头（如「1.」「1.2」「第3章」「第三条」）。 */
    private static final Pattern HEADING_NUMBER = Pattern.compile(
            "^(\\d+(\\.\\d+){0,3}\\s+\\S+|第[零一二三四五六七八九十百千0-9]+[章节条款编部分]\\s*.*)$"
    );

    /** 标题最大长度：超过此长度即便符合编号也按段落处理，避免把长句误判为标题。 */
    private static final int HEADING_MAX_LENGTH = 40;

    public List<DocumentBlock> extract(Path path, String filename) {
        String extension = extension(filename);
        try {
            return switch (extension) {
                case "pdf" -> extractPdf(path);
                case "docx" -> extractDocx(path);
                case "txt" -> extractTxt(path);
                default -> throw new BusinessException(400, "暂不支持该文件类型: " + extension);
            };
        } catch (IOException exception) {
            throw new IllegalStateException("failed to parse document: " + filename, exception);
        }
    }

    // ---------------------------------------------------------------------
    // PDF
    // ---------------------------------------------------------------------

    private List<DocumentBlock> extractPdf(Path path) throws IOException {
        List<DocumentBlock> blocks = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(path.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            // PDFBox 默认会跨页拼接文本，这里按页解析，便于把 pageNo 准确写进 metadata。
            int totalPages = document.getNumberOfPages();
            for (int page = 1; page <= totalPages; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String pageText = stripper.getText(document);
                appendParsedParagraphs(blocks, pageText, page);
            }
        }
        return blocks;
    }

    /**
     * 把一页文本拆成段落并识别标题。
     *
     * <p>切分规则：PDFBox 输出里段落之间通常有连续换行，按 {@code \n\n} 切；
     * 段内的单换行视为软换行，合并成一行后再判断是不是标题。
     */
    private void appendParsedParagraphs(List<DocumentBlock> blocks, String pageText, int pageNo) {
        if (pageText == null || pageText.isBlank()) {
            return;
        }
        // 仅做必要归一化：去掉 NUL 字节、统一换行；普通空格保留（中文标题里也有意义）。
        // 注意：这里用正则 \x00 而不是 Java 字面量  ，避免编译期 Unicode escape 误处理。
        String normalized = pageText.replaceAll("\\x00", "").replaceAll("\\r\\n?", "\n");
        for (String raw : normalized.split("\\n{2,}")) {
            String paragraph = raw.replace('\n', ' ').replaceAll("\\s+", " ").trim();
            if (paragraph.isEmpty()) {
                continue;
            }
            int headingLevel = detectHeadingLevel(paragraph);
            if (headingLevel > 0) {
                blocks.add(DocumentBlock.heading(paragraph, headingLevel, pageNo));
            } else {
                blocks.add(DocumentBlock.paragraph(paragraph, pageNo));
            }
        }
    }

    /**
     * 启发式判定标题层级。0 表示不是标题。
     *
     * <p>判定逻辑：
     * <ul>
     *   <li>长度过长直接否决（避免长句被误判）；</li>
     *   <li>形如「1.」「1.2.3」按点数推断层级；</li>
     *   <li>「第X章/节/条」按关键字分配层级。</li>
     * </ul>
     */
    private int detectHeadingLevel(String line) {
        if (line.length() > HEADING_MAX_LENGTH) {
            return 0;
        }
        if (line.endsWith("。") || line.endsWith(".") || line.endsWith("；") || line.endsWith(";")) {
            return 0;
        }
        if (!HEADING_NUMBER.matcher(line).matches()) {
            return 0;
        }
        if (line.startsWith("第")) {
            if (line.contains("章") || line.contains("编") || line.contains("部分")) {
                return 1;
            }
            if (line.contains("节")) {
                return 2;
            }
            return 3;
        }
        // 通过点的个数判断层级：「1 X」→ 1 级，「1.1 X」→ 2 级，依此类推。
        // 只扫描行首连续的数字和点，遇到第一个空格或其他字符即停止。
        int dots = 0;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '.') {
                dots++;
            } else if (!Character.isDigit(c)) {
                break;
            }
        }
        return Math.min(Math.max(dots, 1), 4);
    }

    // ---------------------------------------------------------------------
    // DOCX
    // ---------------------------------------------------------------------

    private List<DocumentBlock> extractDocx(Path path) throws IOException {
        List<DocumentBlock> blocks = new ArrayList<>();
        try (InputStream inputStream = Files.newInputStream(path);
             XWPFDocument document = new XWPFDocument(inputStream)) {
            // 按文档顺序遍历，能保证标题、段落、表格三者的相对位置不被打乱。
            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph) {
                    appendDocxParagraph(blocks, paragraph);
                } else if (element instanceof XWPFTable table) {
                    blocks.add(DocumentBlock.table(toMarkdown(table), 0));
                }
            }
        }
        return blocks;
    }

    private void appendDocxParagraph(List<DocumentBlock> blocks, XWPFParagraph paragraph) {
        String text = paragraph.getText();
        if (text == null) {
            return;
        }
        String trimmed = text.replaceAll("\\s+", " ").trim();
        if (trimmed.isEmpty()) {
            return;
        }
        // Word 模板的标题样式名一般是「Heading 1 / Heading 2 / 标题 1」之类，统一抓数字。
        int headingLevel = detectDocxHeadingLevel(paragraph.getStyle());
        if (headingLevel > 0) {
            blocks.add(DocumentBlock.heading(trimmed, headingLevel, 0));
        } else {
            blocks.add(DocumentBlock.paragraph(trimmed, 0));
        }
    }

    private int detectDocxHeadingLevel(String style) {
        if (style == null) {
            return 0;
        }
        String normalized = style.toLowerCase();
        if (!normalized.contains("heading") && !normalized.contains("标题")) {
            return 0;
        }
        for (int i = 0; i < style.length(); i++) {
            char c = style.charAt(i);
            if (Character.isDigit(c)) {
                return Math.min(Character.digit(c, 10), 4);
            }
        }
        return 1;
    }

    /**
     * 把 Word 表格序列化成 Markdown 表格，保留行列关系。
     *
     * <p>检索阶段拿到这种 chunk 时，模型能直接读懂「列名 | 列值」的对应关系，
     * 而不是像旧实现那样拿到一堆按空格分隔的乱码。
     */
    private String toMarkdown(XWPFTable table) {
        List<XWPFTableRow> rows = table.getRows();
        if (rows.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            XWPFTableRow row = rows.get(rowIndex);
            builder.append('|');
            for (XWPFTableCell cell : row.getTableCells()) {
                String cellText = cell.getText() == null ? "" : cell.getText().replaceAll("\\s+", " ").trim();
                builder.append(' ').append(cellText.replace("|", "\\|")).append(" |");
            }
            builder.append('\n');
            // 第一行结束补一行 Markdown 分隔线，让首行天然成为表头。
            if (rowIndex == 0) {
                builder.append('|');
                for (int i = 0; i < row.getTableCells().size(); i++) {
                    builder.append(" --- |");
                }
                builder.append('\n');
            }
        }
        return builder.toString().trim();
    }

    // ---------------------------------------------------------------------
    // TXT
    // ---------------------------------------------------------------------

    private List<DocumentBlock> extractTxt(Path path) throws IOException {
        String content = Files.readString(path, StandardCharsets.UTF_8);
        List<DocumentBlock> blocks = new ArrayList<>();
        appendParsedParagraphs(blocks, content, 0);
        return blocks;
    }

    private String extension(String filename) {
        int index = filename == null ? -1 : filename.lastIndexOf('.');
        if (index < 0 || index == filename.length() - 1) {
            return "";
        }
        return filename.substring(index + 1).toLowerCase();
    }
}
