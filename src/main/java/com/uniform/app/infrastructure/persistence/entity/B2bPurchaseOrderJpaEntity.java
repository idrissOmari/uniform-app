package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.enums.B2bOrderStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "b2b_purchase_orders")
public class B2bPurchaseOrderJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @Column(name = "b2c_order_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID b2cOrderId;

    @Column(name = "po_number", length = 50, nullable = false, unique = true, updatable = false)
    private String poNumber;

    @Column(name = "supplier_name", length = 150, nullable = false)
    private String supplierName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 24, nullable = false)
    private B2bOrderStatus status;

    @Column(name = "total_b2b_cost", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalB2bCost;

    @Column(name = "po_pdf_storage_key", length = 512)
    private String poPdfStorageKey;

    @OneToMany(mappedBy = "b2bPurchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<B2bPurchaseOrderLineJpaEntity> lines = new ArrayList<>();

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_by_user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID createdByUserId;

    @Column(name = "ordered_by_user_id", columnDefinition = "BINARY(16)")
    private UUID orderedByUserId;

    @Column(name = "ordered_at")
    private Instant orderedAt;

    @Column(name = "received_by_user_id", columnDefinition = "BINARY(16)")
    private UUID receivedByUserId;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public B2bPurchaseOrderJpaEntity() {
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

    public UUID getB2cOrderId() {
        return b2cOrderId;
    }

    public void setB2cOrderId(UUID b2cOrderId) {
        this.b2cOrderId = b2cOrderId;
    }

    public String getPoNumber() {
        return poNumber;
    }

    public void setPoNumber(String poNumber) {
        this.poNumber = poNumber;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public B2bOrderStatus getStatus() {
        return status;
    }

    public void setStatus(B2bOrderStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalB2bCost() {
        return totalB2bCost;
    }

    public void setTotalB2bCost(BigDecimal totalB2bCost) {
        this.totalB2bCost = totalB2bCost;
    }

    public String getPoPdfStorageKey() {
        return poPdfStorageKey;
    }

    public void setPoPdfStorageKey(String poPdfStorageKey) {
        this.poPdfStorageKey = poPdfStorageKey;
    }

    public List<B2bPurchaseOrderLineJpaEntity> getLines() {
        return lines;
    }

    public void setLines(List<B2bPurchaseOrderLineJpaEntity> lines) {
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

    public UUID getOrderedByUserId() {
        return orderedByUserId;
    }

    public void setOrderedByUserId(UUID orderedByUserId) {
        this.orderedByUserId = orderedByUserId;
    }

    public Instant getOrderedAt() {
        return orderedAt;
    }

    public void setOrderedAt(Instant orderedAt) {
        this.orderedAt = orderedAt;
    }

    public UUID getReceivedByUserId() {
        return receivedByUserId;
    }

    public void setReceivedByUserId(UUID receivedByUserId) {
        this.receivedByUserId = receivedByUserId;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Instant receivedAt) {
        this.receivedAt = receivedAt;
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
