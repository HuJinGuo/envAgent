package com.himma.envagent.module.agent.tool;

import org.springframework.stereotype.Component;

/**
 * 排污许可证查询工具。
 * 真实接口依赖生态环境部全国排污许可证管理平台，当前返回占位数据。
 */
@Component
public class PermitQueryTool implements AgentTool {

    @Override
    public String id() {
        return "permit_query";
    }

    @Override
    public String name() {
        return "排污许可证查询";
    }

    @Override
    public String description() {
        return "查询企业排污许可证信息、有效期及排放限值";
    }

    @Override
    public String execute(String instruction, String knowledgeContext) {
        return """
                【排污许可证查询结果】
                数据来源：全国排污许可证管理平台（占位数据，真实接口待接入）

                许可证编号：91330100XXXXXXXX2021
                持证单位：目标企业
                证件状态：有效
                有效期：2021-06-01 至 2026-05-31
                剩余有效期：约 16 天（临近到期，建议启动续证程序）

                许可排放量：
                  废水：COD ≤ 100 mg/L，氨氮 ≤ 15 mg/L
                  废气：颗粒物 ≤ 20 mg/m³，SO₂ ≤ 100 mg/m³

                执行标准：GB 8978-1996 二级，GB 16297-1996
                """;
    }
}
