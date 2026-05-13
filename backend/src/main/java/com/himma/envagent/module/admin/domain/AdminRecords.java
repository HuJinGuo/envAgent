package com.himma.envagent.module.admin.domain;

public final class AdminRecords {

    private AdminRecords() {
    }

    public record DefaultMenu(
            String code,
            String name,
            String title,
            String path,
            String component,
            String icon,
            int sortOrder
    ) {
    }
}
