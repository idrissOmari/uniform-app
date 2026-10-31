package com.uniform.app.domain.model.audit;

import com.uniform.app.domain.exception.DomainValidationException;
import java.time.Instant;
import java.util.UUID;

public record OrderStatusAuditLog(
        UUID id,
        UUID clientId,
        AuditEntityType entityType,
        UUID entityId,
        String previousStatus,
        String newStatus,
        UUID createdByUserId,
        Instant createdAt,
        String details
) {
    public enum AuditEntityType {
        B2C_ORDER,
        B2C_ORDER_LINE,
        B2B_PURCHASE_ORDER
    }

    public OrderStatusAuditLog {
        if (id == null || clientId == null || entityType == null || entityId == null || createdByUserId == null || createdAt == null) {
            throw new DomainValidationException("Mandatory audit log fields must not be null.");
        }
        if (newStatus == null || newStatus.isBlank()) {
            throw new DomainValidationException("newStatus must not be blank.");
        }
    }
}
