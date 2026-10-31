package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "b2b_purchase_order_lines")
public class B2bPurchaseOrderLineJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "b2b_purchase_order_id", nullable = false, updatable = false)
    private B2bPurchaseOrderJpaEntity b2bPurchaseOrder;

    @Column(name = "catalog_item_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID catalogItemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 16, nullable = false, updatable = false)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "size", length = 16, nullable = false, updatable = false)
    private Size size;

    @Column(name = "b2c_demanded_quantity", nullable = false, updatable = false)
    private int b2cDemandedQuantity;

    @Column(name = "final_quantity", nullable = false)
    private int finalQuantity;

    @Column(name = "b2b_unit_cost", precision = 12, scale = 2, nullable = false, updatable = false)
    private BigDecimal b2bUnitCost;

    @Column(name = "line_total_cost", precision = 12, scale = 2, nullable = false)
    private BigDecimal lineTotalCost;

    @Column(name = "item_name_snapshot", length = 150, nullable = false, updatable = false)
    private String itemNameSnapshot;

    @Column(name = "garment_style_snapshot", length = 150, nullable = false, updatable = false)
    private String garmentStyleSnapshot;

    @Column(name = "color_reference_snapshot", length = 100, nullable = false, updatable = false)
    private String colorReferenceSnapshot;

    @Column(name = "front_visual_storage_snapshot", length = 512, nullable = false, updatable = false)
    private String frontVisualStorageSnapshot;

    @Column(name = "back_visual_storage_snapshot", length = 512, updatable = false)
    private String backVisualStorageSnapshot;

    public B2bPurchaseOrderLineJpaEntity() {
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

    public B2bPurchaseOrderJpaEntity getB2bPurchaseOrder() {
        return b2bPurchaseOrder;
    }

    public void setB2bPurchaseOrder(B2bPurchaseOrderJpaEntity b2bPurchaseOrder) {
        this.b2bPurchaseOrder = b2bPurchaseOrder;
    }

    public UUID getCatalogItemId() {
        return catalogItemId;
    }

    public void setCatalogItemId(UUID catalogItemId) {
        this.catalogItemId = catalogItemId;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public Size getSize() {
        return size;
    }

    public void setSize(Size size) {
        this.size = size;
    }

    public int getB2cDemandedQuantity() {
        return b2cDemandedQuantity;
    }

    public void setB2cDemandedQuantity(int b2cDemandedQuantity) {
        this.b2cDemandedQuantity = b2cDemandedQuantity;
    }

    public int getFinalQuantity() {
        return finalQuantity;
    }

    public void setFinalQuantity(int finalQuantity) {
        this.finalQuantity = finalQuantity;
    }

    public BigDecimal getB2bUnitCost() {
        return b2bUnitCost;
    }

    public void setB2bUnitCost(BigDecimal b2bUnitCost) {
        this.b2bUnitCost = b2bUnitCost;
    }

    public BigDecimal getLineTotalCost() {
        return lineTotalCost;
    }

    public void setLineTotalCost(BigDecimal lineTotalCost) {
        this.lineTotalCost = lineTotalCost;
    }

    public String getItemNameSnapshot() {
        return itemNameSnapshot;
    }

    public void setItemNameSnapshot(String itemNameSnapshot) {
        this.itemNameSnapshot = itemNameSnapshot;
    }

    public String getGarmentStyleSnapshot() {
        return garmentStyleSnapshot;
    }

    public void setGarmentStyleSnapshot(String garmentStyleSnapshot) {
        this.garmentStyleSnapshot = garmentStyleSnapshot;
    }

    public String getColorReferenceSnapshot() {
        return colorReferenceSnapshot;
    }

    public void setColorReferenceSnapshot(String colorReferenceSnapshot) {
        this.colorReferenceSnapshot = colorReferenceSnapshot;
    }

    public String getFrontVisualStorageSnapshot() {
        return frontVisualStorageSnapshot;
    }

    public void setFrontVisualStorageSnapshot(String frontVisualStorageSnapshot) {
        this.frontVisualStorageSnapshot = frontVisualStorageSnapshot;
    }

    public String getBackVisualStorageSnapshot() {
        return backVisualStorageSnapshot;
    }

    public void setBackVisualStorageSnapshot(String backVisualStorageSnapshot) {
        this.backVisualStorageSnapshot = backVisualStorageSnapshot;
    }
}
