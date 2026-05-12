package com.himma.envagent.module.workspace.vo;

import java.util.List;

public final class WorkspacePayloads {

    private WorkspacePayloads() {
    }

    public record DashboardSnapshot(
            int todayQuestions,
            double satisfactionRate,
            int knowledgeDocuments,
            int newDocumentsWeek,
            int activeAgentTasks,
            int completedAgentTasks,
            double todayTokenCost,
            double monthTokenCost,
            List<QuestionRecord> recentQuestions,
            List<UsageBreakdown> knowledgeUsage,
            List<StatusCard> taskStatus
    ) {
    }

    public record QuestionRecord(String id, String summary, String user, String timeAgo) {
    }

    public record UsageBreakdown(String label, int percent, String color) {
    }

    public record StatusCard(String id, String label, String value, String note) {
    }

    public record ChatWorkspace(
            List<ChatSession> sessions,
            List<WorkspaceScope> scopes,
            List<String> suggestions,
            List<ChatMessage> messages,
            List<ReferenceCard> references
    ) {
    }

    public record ChatSession(String id, String title, String group, String updatedAt) {
    }

    public record WorkspaceScope(String id, String label, boolean enabled) {
    }

    public record ChatMessage(String id, String role, String content, List<String> citations) {
    }

    public record ReferenceCard(String id, String title, String excerpt, String source, double score) {
    }

    public record KnowledgeWorkspace(
            List<SummaryCard> summary,
            List<CategoryCount> categories,
            List<KnowledgeDocument> documents
    ) {
    }

    public record SummaryCard(String id, String label, String value, String note) {
    }

    public record CategoryCount(String id, String label, int count) {
    }

    public record KnowledgeDocument(
            String id,
            String name,
            String category,
            String size,
            int chunks,
            String uploadedAt,
            String status
    ) {
    }

    public record SourceWorkspace(List<EnterpriseRecord> enterprises) {
    }

    public record EnterpriseRecord(
            String id,
            String name,
            String industry,
            String licenseCode,
            int permits,
            int devices,
            String riskLevel,
            String permitStatus,
            String monitorStatus,
            String location,
            String contacts,
            String latestEvent,
            List<String> complianceNotes
    ) {
    }

    public record AgentWorkspace(
            List<TaskHistory> history,
            List<FlowStep> flow,
            List<LogLine> logs,
            List<ToolCard> tools,
            String outputPreview
    ) {
    }

    public record TaskHistory(String id, String title, String status) {
    }

    public record FlowStep(String id, String label, String status, String description) {
    }

    public record LogLine(String id, String status, String line) {
    }

    public record ToolCard(String id, String name, String description, String status) {
    }

    public record MonitorWorkspace(
            String availability,
            String averageLatency,
            int todayTokens,
            String monthCost,
            List<Integer> trend,
            List<UsageShare> breakdown,
            List<CallRecord> recentCalls
    ) {
    }

    public record UsageShare(String id, String label, int percent, String color) {
    }

    public record CallRecord(
            String id,
            String time,
            String user,
            String model,
            String type,
            int inputTokens,
            Integer outputTokens,
            String duration,
            String cost,
            String status
    ) {
    }

    public record UsersWorkspace(List<UserRecord> users, List<PermissionMatrix> permissions) {
    }

    public record UserRecord(
            String id,
            String name,
            String initials,
            String role,
            String dept,
            String lastLogin,
            String status
    ) {
    }

    public record PermissionMatrix(
            String module,
            boolean inspector,
            boolean analyst,
            boolean manager
    ) {
    }
}
