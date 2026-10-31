package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.enums.B2cOrderStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "b2c_orders")
public class B2cOrderJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @Column(name = "order_number", length = 50, nullable = false, unique = true)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 24, nullable = false)
    private B2cOrderStatus status;

    @Column(name = "client_moq_snapshot", nullable = false, updatable = false)
    private int clientMoqSnapshot;

    @Column(name = "total_quantity", nullable = false)
    private int totalQuantity;

    @Column(name = "total_cash_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalCashAmount;

    @OneToMany(mappedBy = "b2cOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdAt ASC")
    private List<B2cOrderLineJpaEntity> lines = new ArrayList<>();

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_by_user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public B2cOrderJpaEntity() {
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

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public B2cOrderStatus getStatus() {
        return status;
    }

    public void setStatus(B2cOrderStatus status) {
        this.status = status;
    }

    public int getClientMoqSnapshot() {
        return clientMoqSnapshot;
    }

    public void setClientMoqSnapshot(int clientMoqSnapshot) {
        this.clientMoqSnapshot = clientMoqSnapshot;
    }

    public int getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(int totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public BigDecimal getTotalCashAmount() {
        return totalCashAmount;
    }

    public void setTotalCashAmount(BigDecimal totalCashAmount) {
        this.totalCashAmount = totalCashAmount;
    }

    public List<B2cOrderLineJpaEntity> getLines() {
        return lines;
    }

    public void setLines(List<B2cOrderLineJpaEntity> lines) {
        this.lines = lines;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
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

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
