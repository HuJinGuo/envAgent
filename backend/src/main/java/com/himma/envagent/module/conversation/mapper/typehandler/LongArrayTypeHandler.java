package com.himma.envagent.module.conversation.mapper.typehandler;

import java.sql.Array;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

public class LongArrayTypeHandler extends BaseTypeHandler<List<Long>> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, List<Long> parameter, JdbcType jdbcType) throws SQLException {
        List<Long> values = parameter == null ? List.of() : parameter;
        ps.setArray(i, createArray(ps.getConnection(), values));
    }

    @Override
    public List<Long> getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return toList(rs.getArray(columnName));
    }

    @Override
    public List<Long> getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return toList(rs.getArray(columnIndex));
    }

    @Override
    public List<Long> getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return toList(cs.getArray(columnIndex));
    }

    private Array createArray(Connection connection, List<Long> values) throws SQLException {
        String database = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        String typeName = database.contains("postgres") ? "bigint" : "BIGINT";
        return connection.createArrayOf(typeName, values.toArray(Long[]::new));
    }

    private List<Long> toList(Array sqlArray) throws SQLException {
        if (sqlArray == null) {
            return List.of();
        }
        try {
            Object raw = sqlArray.getArray();
            if (!(raw instanceof Object[] objects)) {
                return List.of();
            }
            List<Long> values = new ArrayList<>(objects.length);
            for (Object object : objects) {
                if (object instanceof Number number) {
                    values.add(number.longValue());
                } else if (object != null) {
                    values.add(Long.parseLong(object.toString()));
                }
            }
            return values;
        } finally {
            sqlArray.free();
        }
    }
}
