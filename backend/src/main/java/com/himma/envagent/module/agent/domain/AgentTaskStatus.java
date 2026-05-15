package com.himma.envagent.module.agent.domain;

public enum AgentTaskStatus {
    PENDING,
    RUNNING,
    DONE,
    FAILED;

    public boolean isTerminal() {
        return this == DONE || this == FAILED;
    }
}
