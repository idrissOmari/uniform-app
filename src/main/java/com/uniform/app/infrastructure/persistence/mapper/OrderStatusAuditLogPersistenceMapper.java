package com.uniform.app.infrastructure.persistence.mapper;

import com.uniform.app.domain.model.audit.OrderStatusAuditLog;
import com.uniform.app.infrastructure.persistence.entity.OrderStatusAuditLogJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class OrderStatusAuditLogPersistenceMapper {

    public OrderStatusAuditLogJpaEntity toEntity(OrderStatusAuditLog domain) {
        OrderStatusAuditLogJpaEntity entity = new OrderStatusAuditLogJpaEntity();
        entity.setId(domain.id());
        entity.setClientId(domain.clientId());
        entity.setEntityType(domain.entityType());
        entity.setEntityId(domain.entityId());
        entity.setPreviousStatus(domain.previousStatus());
        entity.setNewStatus(domain.newStatus());
        entity.setCreatedByUserId(domain.createdByUserId());
        entity.setCreatedAt(domain.createdAt());
        entity.setDetails(domain.details());
        return entity;
    }
}
