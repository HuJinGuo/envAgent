package com.himma.envagent.module.rag.service;

import java.util.List;

public interface ModelGateway {

    /**
     * 项目内部统一使用的轻量消息结构。
     * 这里故意不直接暴露三方 SDK 的 message 类型，
     * 这样后续如果要从 LangChain4j 切到别的实现，
     * 上层的 RagService / ConversationService 基本不用跟着重写。
     */
    record ChatTurn(String role, String content) {
    }

    /**
     * 当前项目对“大模型一次完整回答”的抽象结果。
     * 注意这里是 answer 全量字符串，而不是 token 流。
     * 这也是为什么现在 controller 虽然外层返回的是 SSE，
     * 但本质上还是“先拿到完整 answer，再拆片输出”。
     */
    record ChatResult(String answer, Integer inputTokens, Integer outputTokens) {
    }

    /**
     * 真流式问答回调。
     * 上层如果想把 token / chunk 实时透传到 SSE 或 WebSocket，
     * 就应该走这条 listener 链路，而不是先等 chatResult() 返回整包 answer。
     */
    interface ChatStreamListener {

        default void onThinking(String thinking) {
        }

        default void onDelta(String delta) {
        }

        default void onComplete(ChatResult result) {
        }

        default void onError(Throwable error) {
        }
    }

    List<float[]> embed(List<String> texts);

    /**
     * 便捷方法：只关心回答文本时可以直接调这个。
     * 底层仍然依赖 chatResult，所以它同样是“同步、整包返回”的调用方式。
     */
    default String chat(List<ChatTurn> turns) {
        return chatResult(turns).answer();
    }

    /**
     * 当前版本的核心问答入口。
     *
     * 调用语义：
     * 1. 传入完整 prompt / 历史消息
     * 2. 阻塞等待模型返回完整结果
     * 3. 一次性返回完整 answer + token 统计
     *
     * 如果后面要改成“真正流式”，通常不是继续增强这个方法，
     * 而是新增一条并行能力，例如：
     * - chatStream(List<ChatTurn> turns, ChatStreamListener listener)
     * - 或者返回 Flux / Publisher
     *
     * 这样可以避免把现有同步调用链全部打碎。
     */
    ChatResult chatResult(List<ChatTurn> turns);

    default void chatResultStream(List<ChatTurn> turns) {
        chatResultStream(turns, new ChatStreamListener() {
        });
    }

    /**
     * 底层真流式调用入口。
     * SDK 每收到一段内容就立即通过 listener 往上抛，
     * 最终再在 onComplete 里回传完整结果与 token 统计。
     */
    void chatResultStream(List<ChatTurn> turns, ChatStreamListener listener);
}
