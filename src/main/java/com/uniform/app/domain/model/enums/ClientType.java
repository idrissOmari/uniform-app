package com.uniform.app.domain.model.enums;

public enum ClientType {
    PRIMARY_SCHOOL,
    SECONDARY_SCHOOL,
    ORGANIZATION;

    public boolean isKidsSizesOnly() {
        return this == PRIMARY_SCHOOL;
    }
}
