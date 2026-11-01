package com.uniform.app.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "catalog_items")
public class CatalogItemJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @Column(name = "reference_code", length = 64, nullable = false)
    private String referenceCode;

    @Column(name = "product_type", length = 64, nullable = false)
    private String productType;

    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @Column(name = "garment_style", length = 150, nullable = false)
    private String garmentStyle;

    @Column(name = "color_reference", length = 100, nullable = false)
    private String colorReference;

    @Column(name = "supplier_id", columnDefinition = "BINARY(16)")
    private UUID supplierId;

    @Column(name = "supplier_name", length = 150, nullable = false)
    private String supplierName;

    @Column(name = "available_sizes", length = 255)
    private String availableSizes;

    @Column(name = "front_visual_storage_key", columnDefinition = "LONGTEXT")
    private String frontVisualStorageKey;

    @Column(name = "back_visual_storage_key", columnDefinition = "LONGTEXT")
    private String backVisualStorageKey;

    @Column(name = "visual_placement_notes", columnDefinition = "TEXT")
    private String visualPlacementNotes;

    @Column(name = "b2c_unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal b2cUnitPrice;

    @Column(name = "b2b_unit_cost", precision = 12, scale = 2, nullable = false)
    private BigDecimal b2bUnitCost;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_by_user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CatalogItemJpaEntity() {
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

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public String getProductType() {
        return productType;
    }

    public void setProductType(String productType) {
        this.productType = productType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGarmentStyle() {
        return garmentStyle;
    }

    public void setGarmentStyle(String garmentStyle) {
        this.garmentStyle = garmentStyle;
    }

    public String getColorReference() {
        return colorReference;
    }

    public void setColorReference(String colorReference) {
        this.colorReference = colorReference;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(UUID supplierId) {
        this.supplierId = supplierId;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getAvailableSizes() {
        return availableSizes;
    }

    public void setAvailableSizes(String availableSizes) {
        this.availableSizes = availableSizes;
    }

    public String getFrontVisualStorageKey() {
        return frontVisualStorageKey;
    }

    public void setFrontVisualStorageKey(String frontVisualStorageKey) {
        this.frontVisualStorageKey = frontVisualStorageKey;
    }

    public String getBackVisualStorageKey() {
        return backVisualStorageKey;
    }

    public void setBackVisualStorageKey(String backVisualStorageKey) {
        this.backVisualStorageKey = backVisualStorageKey;
    }

    public String getVisualPlacementNotes() {
        return visualPlacementNotes;
    }

    public void setVisualPlacementNotes(String visualPlacementNotes) {
        this.visualPlacementNotes = visualPlacementNotes;
    }

    public BigDecimal getB2cUnitPrice() {
        return b2cUnitPrice;
    }

    public void setB2cUnitPrice(BigDecimal b2cUnitPrice) {
        this.b2cUnitPrice = b2cUnitPrice;
    }

    public BigDecimal getB2bUnitCost() {
        return b2bUnitCost;
    }

    public void setB2bUnitCost(BigDecimal b2bUnitCost) {
        this.b2bUnitCost = b2bUnitCost;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
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
