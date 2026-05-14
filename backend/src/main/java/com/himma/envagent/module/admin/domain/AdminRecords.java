package com.himma.envagent.module.admin.domain;

public final class AdminRecords {

    private AdminRecords() {
    }

    public record DefaultMenu(
            String code,
            String parentCode,
            String name,
            String title,
            String path,
            String component,
            String icon,
            String redirect,
            int sortOrder
    ) {
    }
}
