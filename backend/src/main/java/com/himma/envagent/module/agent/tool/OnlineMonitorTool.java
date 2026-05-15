package com.himma.envagent.module.agent.tool;

import org.springframework.stereotype.Component;

/**
 * 在线监控数据工具。
 * 当前接入真实平台的 API 尚未开放，返回结构化占位数据；
 * 格式与真实返回保持一致，后续只需替换数据来源即可。
 */
@Component
public class OnlineMonitorTool implements AgentTool {

    @Override
    public String id() {
        return "online_monitor";
    }

    @Override
    public String name() {
        return "在线监控数据";
    }

    @Override
    public String description() {
        return "查询废水/废气排口实时及历史监测数据";
    }

    @Override
    public String execute(String instruction, String knowledgeContext) {
        return """
                【在线监控数据查询结果】
                数据来源：在线监控平台（占位数据，真实接口待接入）
                查询时间范围：近 30 天

                废水排口 DW001：
                  COD 均值：72.4 mg/L（限值：100 mg/L）
                  氨氮均值：4.2 mg/L（限值：15 mg/L）
                  超标次数：0 次

                废气排口 DA001：
                  颗粒物均值：8.3 mg/m³（限值：20 mg/m³）
                  SO₂均值：35.2 mg/m³（限值：100 mg/m³）
                  超标次数：0 次

                数据完整率：98.7%
                """;
    }
}
