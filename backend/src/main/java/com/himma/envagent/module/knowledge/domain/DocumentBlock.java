package com.himma.envagent.module.knowledge.domain;

/**
 * 文档解析中间产物：一个「最小语义块」。
 *
 * <p>解析器（PDF / DOCX / TXT）统一把原始文档拆成有限几种类型的块，
 * 切片器再基于块的类型和层级做「结构感知切片」，而不是按字符数硬切。
 *
 * <p>设计要点：
 * <ul>
 *   <li>标题不与正文混排，便于切片时维护「标题路径」当作 metadata。</li>
 *   <li>表格独立成块，永远不会被切到一半，也不会和上下文段落拼在一起。</li>
 *   <li>{@code pageNo} 主要给 PDF 使用，DOCX / TXT 没有可靠页码，统一填 0。</li>
 * </ul>
 */
public record DocumentBlock(
        BlockType type,
        String text,
        int headingLevel,
        int pageNo
) {

    public enum BlockType {
        /** 标题：headingLevel 表示层级（1 最高）。 */
        HEADING,
        /** 普通段落。 */
        PARAGRAPH,
        /** 列表项：暂时和段落同等对待，预留枚举便于将来差异化处理。 */
        LIST_ITEM,
        /** 表格：text 字段是序列化后的 Markdown 表格字符串。 */
        TABLE
    }

    public static DocumentBlock heading(String text, int level, int pageNo) {
        return new DocumentBlock(BlockType.HEADING, text, level, pageNo);
    }

    public static DocumentBlock paragraph(String text, int pageNo) {
        return new DocumentBlock(BlockType.PARAGRAPH, text, 0, pageNo);
    }

    public static DocumentBlock listItem(String text, int pageNo) {
        return new DocumentBlock(BlockType.LIST_ITEM, text, 0, pageNo);
    }

    public static DocumentBlock table(String markdown, int pageNo) {
        return new DocumentBlock(BlockType.TABLE, markdown, 0, pageNo);
    }
}
