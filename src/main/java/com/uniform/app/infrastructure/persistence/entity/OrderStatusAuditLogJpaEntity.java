package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.audit.OrderStatusAuditLog.AuditEntityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_status_audit_logs")
public class OrderStatusAuditLogJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", length = 32, nullable = false, updatable = false)
    private AuditEntityType entityType;

    @Column(name = "entity_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID entityId;

    @Column(name = "previous_status", length = 24, updatable = false)
    private String previousStatus;

    @Column(name = "new_status", length = 24, nullable = false, updatable = false)
    private String newStatus;

    @Column(name = "created_by_user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "details", length = 500, updatable = false)
    private String details;

    public OrderStatusAuditLogJpaEntity() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getClientId() {
        return clientId;
    }

    public void setClientId(UUID clientId) {
        this.clientId = clientId;
    }

    public AuditEntityType getEntityType() {
        return entityType;
    }

    public void setEntityType(AuditEntityType entityType) {
        this.entityType = entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public void setEntityId(UUID entityId) {
        this.entityId = entityId;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(UUID createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
