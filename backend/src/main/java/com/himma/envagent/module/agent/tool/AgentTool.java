package com.himma.envagent.module.agent.tool;

public interface AgentTool {

    String id();

    String name();

    String description();

    String execute(String instruction, String knowledgeContext);
}
