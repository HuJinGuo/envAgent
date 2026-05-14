package com.himma.envagent.module.rag.service;

import com.himma.envagent.module.rag.service.ModelGateway.ChatTurn;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LlmChatService {

    public record GenerationResult(String answer, int inputTokens, int outputTokens) {
    }

    public interface GenerationStreamListener {

        default void onThinking(String thinking) {
        }

        default void onDelta(String delta) {
        }

        default void onComplete(GenerationResult result) {
        }
    }

    private final ModelGateway modelGateway;

    public LlmChatService(ModelGateway modelGateway) {
        this.modelGateway = modelGateway;
    }

    public List<float[]> embedTexts(List<String> texts) {
        return modelGateway.embed(texts);
    }

    public GenerationResult answer(List<ChatTurn> turns, String question, String fallbackAnswer) {
        try {
            ModelGateway.ChatResult result = modelGateway.chatResult(turns);
            String answer = result == null || result.answer() == null ? "" : result.answer();
            return new GenerationResult(
                    answer,
                    safeTokenCount(result == null ? null : result.inputTokens(), question),
                    safeTokenCount(result == null ? null : result.outputTokens(), answer)
            );
        } catch (Exception exception) {
            return new GenerationResult(
                    fallbackAnswer,
                    estimateTokens(question),
                    estimateTokens(fallbackAnswer)
            );
        }
    }

    public void streamAnswer(List<ChatTurn> turns, String question, String fallbackAnswer, GenerationStreamListener listener) {
        GenerationStreamListener safeListener = listener == null ? new GenerationStreamListener() {
        } : listener;
        try {
            modelGateway.chatResultStream(turns, new ModelGateway.ChatStreamListener() {
                @Override
                public void onThinking(String thinking) {
                    safeListener.onThinking(thinking);
                }

                @Override
                public void onDelta(String delta) {
                    safeListener.onDelta(delta);
                }

                @Override
                public void onComplete(ModelGateway.ChatResult result) {
                    String answer = result == null || result.answer() == null ? "" : result.answer();
                    safeListener.onComplete(new GenerationResult(
                            answer,
                            safeTokenCount(result == null ? null : result.inputTokens(), question),
                            safeTokenCount(result == null ? null : result.outputTokens(), answer)
                    ));
                }

                @Override
                public void onError(Throwable error) {
                    safeListener.onThinking("模型流式输出失败，已切换为检索摘要降级结果。");
                    safeListener.onDelta(fallbackAnswer);
                    safeListener.onComplete(new GenerationResult(
                            fallbackAnswer,
                            estimateTokens(question),
                            estimateTokens(fallbackAnswer)
                    ));
                }
            });
        } catch (Exception exception) {
            safeListener.onThinking("模型流式调用失败，已切换为检索摘要降级结果。");
            safeListener.onDelta(fallbackAnswer);
            safeListener.onComplete(new GenerationResult(
                    fallbackAnswer,
                    estimateTokens(question),
                    estimateTokens(fallbackAnswer)
            ));
        }
    }

    private int estimateTokens(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return Math.max(1, text.length() / 4);
    }

    private int safeTokenCount(Integer tokenCount, String fallbackText) {
        if (tokenCount != null && tokenCount > 0) {
            return tokenCount;
        }
        return estimateTokens(fallbackText);
    }
}
