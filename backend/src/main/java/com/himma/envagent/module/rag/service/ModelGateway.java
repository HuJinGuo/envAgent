package com.himma.envagent.module.rag.service;

import java.util.List;

public interface ModelGateway {

    record ChatTurn(String role, String content) {
    }

    record ChatResult(String answer, Integer inputTokens, Integer outputTokens) {
    }

    List<float[]> embed(List<String> texts);

    default String chat(List<ChatTurn> turns) {
        return chatResult(turns).answer();
    }

    ChatResult chatResult(List<ChatTurn> turns);
}
