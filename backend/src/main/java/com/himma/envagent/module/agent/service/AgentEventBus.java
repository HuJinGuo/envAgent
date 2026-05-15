package com.himma.envagent.module.agent.service;

import com.himma.envagent.module.agent.vo.AgentPayloads.AgentLogItem;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import org.springframework.stereotype.Component;

/**
 * 轻量内存事件总线，用于 AgentTaskRunner → SSE 端点的实时日志推送。
 * 每个 task_id 对应一个订阅者列表，Runner 写入，SSE 线程读取。
 * null 作为哨兵值，通知 SSE 端点关闭连接。
 */
@Component
public class AgentEventBus {

    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<BlockingQueue<AgentLogItem>>> subscribers =
            new ConcurrentHashMap<>();

    public BlockingQueue<AgentLogItem> subscribe(long taskId) {
        LinkedBlockingQueue<AgentLogItem> queue = new LinkedBlockingQueue<>();
        subscribers.computeIfAbsent(taskId, k -> new CopyOnWriteArrayList<>()).add(queue);
        return queue;
    }

    public void unsubscribe(long taskId, BlockingQueue<AgentLogItem> queue) {
        CopyOnWriteArrayList<BlockingQueue<AgentLogItem>> list = subscribers.get(taskId);
        if (list != null) {
            list.remove(queue);
        }
    }

    public void publish(long taskId, AgentLogItem event) {
        CopyOnWriteArrayList<BlockingQueue<AgentLogItem>> list = subscribers.get(taskId);
        if (list != null) {
            list.forEach(q -> q.offer(event));
        }
    }

    /** 发布 null 通知所有等待该 task 的 SSE 端点关闭。 */
    public void publishTerminal(long taskId) {
        CopyOnWriteArrayList<BlockingQueue<AgentLogItem>> list = subscribers.get(taskId);
        if (list != null) {
            list.forEach(q -> q.offer(AgentEventBus.TERMINAL));
        }
        subscribers.remove(taskId);
    }

    public static final AgentLogItem TERMINAL = new AgentLogItem(
            "__terminal__", "", "", "", "", "");
}
