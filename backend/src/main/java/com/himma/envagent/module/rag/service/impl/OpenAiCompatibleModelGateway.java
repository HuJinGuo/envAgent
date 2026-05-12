package com.himma.envagent.module.rag.service.impl;

import com.himma.envagent.common.config.OpenAiProperties;
import com.himma.envagent.common.config.VectorProperties;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.model.output.TokenUsage;
import com.himma.envagent.module.rag.service.ModelGateway;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OpenAiCompatibleModelGateway implements ModelGateway {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleModelGateway.class);
    private static final Pattern WORD_PATTERN = Pattern.compile("[\\p{L}\\p{N}]+");

    private final ChatModel chatModel;
    private final EmbeddingModel embeddingModel;
    private final VectorProperties vectorProperties;
    private final AtomicBoolean embeddingRemoteEnabled = new AtomicBoolean(true);

    public OpenAiCompatibleModelGateway(OpenAiProperties openAiProperties, VectorProperties vectorProperties) {
        this.vectorProperties = vectorProperties;
        String baseUrl = trimTrailingSlash(openAiProperties.getBaseUrl());
        String apiKey = normalizeApiKey(openAiProperties.getApiKey());
        // 这里用 LangChain4j 封装 OpenAI-compatible 接口，外层业务只依赖 ModelGateway。
        this.chatModel = OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(openAiProperties.getChatModel())
                .temperature(0.2)
                .maxRetries(1)
                .build();
        this.embeddingModel = OpenAiEmbeddingModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(openAiProperties.getEmbeddingModel())
                .dimensions(vectorProperties.getDimensions())
                .maxRetries(1)
                .build();
    }

    @Override
    public List<float[]> embed(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return List.of();
        }
        if (embeddingRemoteEnabled.get()) {
            try {
                return remoteEmbeddings(texts);
            } catch (Exception exception) {
                // 当前部署环境可能没有标准 /embeddings，所以失败一次后直接熔断到本地 embedding。
                if (embeddingRemoteEnabled.compareAndSet(true, false)) {
                    log.warn("remote embedding disabled, fallback to deterministic embedding: {}", exception.getMessage());
                }
            }
        }
        return texts.stream().map(this::localEmbedding).toList();
    }

    @Override
    public ChatResult chatResult(List<ChatTurn> turns) {
        // ChatTurn 是项目内部的轻量对象，这里转换成 LangChain4j 的 ChatRequest。
        ChatResponse response = chatModel.chat(ChatRequest.builder()
                .messages(toChatMessages(turns))
                .build());
        if (response == null || response.aiMessage() == null || response.aiMessage().text() == null) {
            throw new IllegalStateException("chat completion content missing");
        }
        TokenUsage tokenUsage = response.tokenUsage();
        return new ChatResult(
                response.aiMessage().text(),
                tokenUsage == null ? null : tokenUsage.inputTokenCount(),
                tokenUsage == null ? null : tokenUsage.outputTokenCount()
        );
    }

    private List<float[]> remoteEmbeddings(List<String> texts) {
        List<TextSegment> segments = texts.stream().map(TextSegment::from).toList();
        Response<List<Embedding>> response = embeddingModel.embedAll(segments);
        if (response == null || response.content() == null) {
            throw new IllegalStateException("embedding response missing data");
        }
        List<float[]> embeddings = new ArrayList<>();
        for (Embedding embedding : response.content()) {
            if (embedding == null || embedding.vector() == null) {
                throw new IllegalStateException("embedding item missing vector");
            }
            embeddings.add(normalizeDimensions(embedding.vector()));
        }
        if (embeddings.size() != texts.size()) {
            throw new IllegalStateException("embedding result size mismatch");
        }
        return embeddings;
    }

    private float[] localEmbedding(String text) {
        int dimensions = vectorProperties.getDimensions();
        float[] vector = new float[dimensions];
        List<String> tokens = tokenize(text == null ? "" : text);
        if (tokens.isEmpty()) {
            vector[0] = 1F;
            return vector;
        }
        // 本地 embedding 不是语义模型，只是一个稳定的 hash 向量，用来兜底保证检索链路可运行。
        for (String token : tokens) {
            int index = Math.floorMod(token.hashCode(), dimensions);
            int sign = ((token.hashCode() >>> 1) & 1) == 0 ? 1 : -1;
            vector[index] += sign * (float) Math.sqrt(Math.max(1, token.length()));
        }
        double norm = 0;
        for (float value : vector) {
            norm += value * value;
        }
        norm = Math.sqrt(norm);
        if (norm == 0) {
            vector[0] = 1F;
            return vector;
        }
        for (int i = 0; i < vector.length; i++) {
            vector[i] /= (float) norm;
        }
        return vector;
    }

    private List<String> tokenize(String text) {
        String normalized = text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        Set<String> tokens = new LinkedHashSet<>();
        Matcher matcher = WORD_PATTERN.matcher(normalized);
        while (matcher.find()) {
            String token = matcher.group();
            if (!token.isBlank()) {
                tokens.add(token);
            }
        }
        // 中文文本额外拆单字和双字 token，避免只靠英文分词时召回能力太差。
        String compact = normalized.replaceAll("[^\\p{IsHan}\\p{L}\\p{N}]+", "");
        for (int i = 0; i < compact.length(); i++) {
            tokens.add(String.valueOf(compact.charAt(i)));
            if (i < compact.length() - 1) {
                tokens.add(compact.substring(i, i + 2));
            }
        }
        return new ArrayList<>(tokens);
    }

    private List<ChatMessage> toChatMessages(List<ChatTurn> turns) {
        List<ChatMessage> messages = new ArrayList<>();
        if (turns == null || turns.isEmpty()) {
            return messages;
        }
        for (ChatTurn turn : turns) {
            if (turn == null || turn.content() == null || turn.content().isBlank()) {
                continue;
            }
            messages.add(toChatMessage(turn));
        }
        return messages;
    }

    private ChatMessage toChatMessage(ChatTurn turn) {
        return switch (turn.role()) {
            case "system" -> SystemMessage.from(turn.content());
            case "assistant" -> AiMessage.from(turn.content());
            default -> UserMessage.from(turn.content());
        };
    }

    private float[] normalizeDimensions(float[] source) {
        int dimensions = vectorProperties.getDimensions();
        float[] vector = new float[dimensions];
        int length = Math.min(dimensions, source.length);
        for (int i = 0; i < length; i++) {
            vector[i] = source[i];
        }
        if (length < dimensions) {
            double norm = 0;
            for (float value : vector) {
                norm += value * value;
            }
            if (norm == 0) {
                vector[0] = 1F;
            }
        }
        return vector;
    }

    private String normalizeApiKey(String value) {
        return value == null || value.isBlank() ? "demo-key" : value.trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
