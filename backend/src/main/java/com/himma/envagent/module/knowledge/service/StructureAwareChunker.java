package com.himma.envagent.module.knowledge.service;

import com.himma.envagent.module.knowledge.domain.DocumentBlock;
import com.himma.envagent.module.knowledge.domain.DocumentBlock.BlockType;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * 结构感知切片器。
 *
 * <p>核心思想：相比按字符数硬切，这里多做三件事：
 * <ol>
 *   <li><b>维护标题路径</b>：遇到 HEADING 就更新「面包屑」，每个 chunk 都带着它来自哪个章节，
 *       检索时可以回答「这段内容属于哪一节」。</li>
 *   <li><b>表格独立成块</b>：TABLE 永远单独成 chunk，不会被字符切片器切到一半。</li>
 *   <li><b>段落聚合而非硬切</b>：连续的段落会拼到同一 chunk，直到长度逼近 {@link #targetChunkSize}；
 *       遇到新章节标题会立刻 flush，避免一个 chunk 横跨多个主题。</li>
 * </ol>
 *
 * <p>当上游某个段落本身已经超长（典型的「一段话占两页」），仍然会用滑窗在段内切，
 * 但所有切出来的 sub-chunk 都共享同一个标题路径，保证检索回来的上下文完整。
 */
@Service
public class StructureAwareChunker {

    /** 目标 chunk 字符数：偏向短一点，能让 embedding 更聚焦。 */
    private final int targetChunkSize = 900;

    /** 段间 overlap：相邻 chunk 共享一小段上下文，缓解跨片段答题的信息断裂。 */
    private final int overlap = 120;

    /** 一个 chunk 至少要凑到这么多字符再考虑 flush；防止出现一两个字的碎片。 */
    private final int minFlushSize = 200;

    public record StructuredChunk(
            String content,
            String chunkType,
            int tokenCount,
            List<String> headingPath,
            Integer pageNo
    ) {
        public Map<String, Object> toMetadata() {
            // 用 LinkedHashMap 保证 JSON key 顺序稳定，方便人工排查。
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("chunkType", chunkType);
            map.put("headingPath", headingPath);
            if (pageNo != null) {
                map.put("pageNo", pageNo);
            }
            return map;
        }
    }

    public List<StructuredChunk> chunk(List<DocumentBlock> blocks) {
        List<StructuredChunk> result = new ArrayList<>();
        if (blocks == null || blocks.isEmpty()) {
            return result;
        }

        // 标题栈：index 0 是最高级标题。遇到同级或更高级标题会先弹栈再压栈。
        Deque<HeadingFrame> headingStack = new LinkedList<>();
        StringBuilder buffer = new StringBuilder();
        Integer bufferStartPage = null;

        for (DocumentBlock block : blocks) {
            switch (block.type()) {
                case HEADING -> {
                    // 章节切换前先把上一节积累的正文 flush 出去，避免主题混淆。
                    flushTextBuffer(buffer, headingStack, bufferStartPage, result);
                    bufferStartPage = null;
                    updateHeadingStack(headingStack, block);
                }
                case TABLE -> {
                    // 表格保持原子性：flush 当前文本缓冲，再把表格单独写成一个 chunk。
                    flushTextBuffer(buffer, headingStack, bufferStartPage, result);
                    bufferStartPage = null;
                    if (!block.text().isBlank()) {
                        result.add(new StructuredChunk(
                                block.text(),
                                "table",
                                estimateTokens(block.text()),
                                snapshotHeadingPath(headingStack),
                                block.pageNo() == 0 ? null : block.pageNo()
                        ));
                    }
                }
                case PARAGRAPH, LIST_ITEM -> {
                    if (bufferStartPage == null && block.pageNo() > 0) {
                        bufferStartPage = block.pageNo();
                    }
                    appendParagraph(buffer, block.text());
                    // 缓冲区接近目标大小就 flush，保持 chunk 尺寸均匀。
                    if (buffer.length() >= targetChunkSize) {
                        flushTextBuffer(buffer, headingStack, bufferStartPage, result);
                        bufferStartPage = null;
                    }
                }
            }
        }

        // 文档末尾把残余 buffer flush 掉。
        flushTextBuffer(buffer, headingStack, bufferStartPage, result);
        return result;
    }

    private void appendParagraph(StringBuilder buffer, String paragraph) {
        if (paragraph == null || paragraph.isBlank()) {
            return;
        }
        if (buffer.length() > 0) {
            buffer.append("\n\n");
        }
        buffer.append(paragraph.trim());
    }

    /**
     * 把当前文本缓冲落成一个或多个 chunk。
     *
     * <p>常规情况：缓冲长度 ≤ targetChunkSize，直接成一个 chunk；
     * 极端情况：单段超长（一段话就 >900 字），用字符滑窗内部切出多个 chunk，
     * 每个 chunk 共享同一个 headingPath。
     */
    private void flushTextBuffer(
            StringBuilder buffer,
            Deque<HeadingFrame> headingStack,
            Integer pageNo,
            List<StructuredChunk> result
    ) {
        if (buffer.length() == 0) {
            return;
        }
        String text = buffer.toString().trim();
        buffer.setLength(0);
        if (text.isEmpty()) {
            return;
        }
        List<String> headingPath = snapshotHeadingPath(headingStack);

        if (text.length() <= targetChunkSize) {
            result.add(new StructuredChunk(text, "text", estimateTokens(text), headingPath, pageNo));
            return;
        }

        // 单 chunk 装不下，按字符滑窗在「段内」继续切，并尽量在句子边界落刀。
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(text.length(), start + targetChunkSize);
            int breakAt = findBreakPosition(text, start, end);
            String slice = text.substring(start, breakAt).trim();
            if (!slice.isEmpty() && slice.length() >= minFlushSize / 2) {
                result.add(new StructuredChunk(slice, "text", estimateTokens(slice), headingPath, pageNo));
            }
            if (breakAt >= text.length()) {
                break;
            }
            // overlap 让相邻 sub-chunk 共享一段上下文，缓解跨片段答题时的信息断裂。
            start = Math.max(breakAt - overlap, start + 1);
        }
    }

    private int findBreakPosition(String text, int start, int end) {
        // 优先在段落分隔处切；其次中文句号或换行；都没有就硬切。
        int paragraph = text.lastIndexOf("\n\n", end);
        if (paragraph > start + minFlushSize) {
            return paragraph;
        }
        int sentence = Math.max(text.lastIndexOf('。', end), text.lastIndexOf('\n', end));
        if (sentence > start + minFlushSize) {
            return sentence + 1;
        }
        return end;
    }

    /**
     * 根据新标题更新标题栈：弹出所有同级或更深的旧标题，再压入新标题。
     */
    private void updateHeadingStack(Deque<HeadingFrame> stack, DocumentBlock heading) {
        int level = Math.max(heading.headingLevel(), 1);
        while (!stack.isEmpty() && stack.peekLast().level >= level) {
            stack.removeLast();
        }
        stack.addLast(new HeadingFrame(level, heading.text()));
    }

    private List<String> snapshotHeadingPath(Deque<HeadingFrame> stack) {
        List<String> path = new ArrayList<>(stack.size());
        for (HeadingFrame frame : stack) {
            path.add(frame.text);
        }
        return path;
    }

    private int estimateTokens(String text) {
        // 粗估：中英文混排时按字符数 / 4 大致接近 token 数，足够用于成本估算。
        return Math.max(1, text.length() / 4);
    }

    private record HeadingFrame(int level, String text) {
    }
}
