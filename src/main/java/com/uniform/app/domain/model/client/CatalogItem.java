package com.uniform.app.domain.model.client;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.GarmentSpecificationSnapshot;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class CatalogItem {

    public static final String DEFAULT_PRODUCT_TYPE = "POLO";
    public static final String DEFAULT_SUPPLIER_NAME = "Atelier Textile Casablanca";

    private final UUID id;
    private final UUID clientId;
    private final String referenceCode;
    private final String productType;
    private final String name;
    private final String garmentStyle;
    private final String colorReference;
    private final UUID supplierId;
    private final String supplierName;
    private final String availableSizes;
    private final String frontVisualStorageKey;
    private final String backVisualStorageKey;
    private final String visualPlacementNotes;
    private final BigDecimal b2cUnitPrice;
    private final BigDecimal b2bUnitCost;
    private final boolean active;
    private final long version;
    private final UUID createdByUserId;
    private final Instant createdAt;
    private final Instant updatedAt;

    public CatalogItem(
            UUID id,
            UUID clientId,
            String referenceCode,
            String name,
            String garmentStyle,
            String colorReference,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            boolean active,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(
                id,
                clientId,
                referenceCode,
                DEFAULT_PRODUCT_TYPE,
                name,
                garmentStyle,
                colorReference,
                null,
                DEFAULT_SUPPLIER_NAME,
                null,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                active,
                version,
                createdByUserId,
                createdAt,
                updatedAt
        );
    }

    public CatalogItem(
            UUID id,
            UUID clientId,
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            boolean active,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(
                id,
                clientId,
                referenceCode,
                productType,
                name,
                garmentStyle,
                colorReference,
                null,
                supplierName,
                availableSizes,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                active,
                version,
                createdByUserId,
                createdAt,
                updatedAt
        );
    }

    public CatalogItem(
            UUID id,
            UUID clientId,
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            UUID supplierId,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            boolean active,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        if (id == null) {
            throw new DomainValidationException("CatalogItem id must not be null.");
        }
        if (clientId == null) {
            throw new DomainValidationException("CatalogItem clientId must not be null.");
        }
        if (referenceCode == null || referenceCode.isBlank()) {
            throw new DomainValidationException("referenceCode must not be blank.");
        }
        if (name == null || name.isBlank()) {
            throw new DomainValidationException("name must not be blank.");
        }
        if (garmentStyle == null || garmentStyle.isBlank()) {
            throw new DomainValidationException("garmentStyle must not be blank.");
        }
        if (colorReference == null || colorReference.isBlank()) {
            throw new DomainValidationException("colorReference must not be blank.");
        }
        if (createdByUserId == null) {
            throw new DomainValidationException("createdByUserId must not be null.");
        }
        if (createdAt == null) {
            throw new DomainValidationException("createdAt must not be null.");
        }
        this.id = id;
        this.clientId = clientId;
        this.referenceCode = referenceCode.trim();
        this.productType = (productType == null || productType.isBlank())
                ? DEFAULT_PRODUCT_TYPE
                : productType.trim();
        this.name = name.trim();
        this.garmentStyle = garmentStyle.trim();
        this.colorReference = colorReference.trim();
        this.supplierId = supplierId;
        this.supplierName = (supplierName == null || supplierName.isBlank())
                ? DEFAULT_SUPPLIER_NAME
                : supplierName.trim();
        this.availableSizes = (availableSizes == null || availableSizes.isBlank())
                ? null
                : availableSizes.trim();
        this.frontVisualStorageKey = (frontVisualStorageKey == null || frontVisualStorageKey.isBlank())
                ? null
                : frontVisualStorageKey.trim();
        this.backVisualStorageKey = (backVisualStorageKey == null || backVisualStorageKey.isBlank())
                ? null
                : backVisualStorageKey.trim();
        this.visualPlacementNotes = (visualPlacementNotes == null || visualPlacementNotes.isBlank())
                ? null
                : visualPlacementNotes.trim();
        this.b2cUnitPrice = FinancialsAndQuantities.normalizeAmount(b2cUnitPrice);
        this.b2bUnitCost = FinancialsAndQuantities.normalizeAmount(b2bUnitCost != null ? b2bUnitCost : BigDecimal.ZERO);
        this.active = active;
        this.version = version;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt != null ? updatedAt : createdAt;
    }

    public static CatalogItem createNew(
            UUID clientId,
            String referenceCode,
            String name,
            String garmentStyle,
            String colorReference,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            UUID createdByUserId,
            Instant now
    ) {
        return createNew(
                clientId,
                referenceCode,
                DEFAULT_PRODUCT_TYPE,
                name,
                garmentStyle,
                colorReference,
                DEFAULT_SUPPLIER_NAME,
                null,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                createdByUserId,
                now
        );
    }

    public static CatalogItem createNew(
            UUID clientId,
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            UUID createdByUserId,
            Instant now
    ) {
        return createNew(
                clientId,
                referenceCode,
                productType,
                name,
                garmentStyle,
                colorReference,
                null,
                supplierName,
                availableSizes,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                createdByUserId,
                now
        );
    }

    public static CatalogItem createNew(
            UUID clientId,
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            UUID supplierId,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            UUID createdByUserId,
            Instant now
    ) {
        Instant timestamp = now != null ? now : Instant.now();
        return new CatalogItem(
                UUID.randomUUID(),
                clientId,
                referenceCode,
                productType,
                name,
                garmentStyle,
                colorReference,
                supplierId,
                supplierName,
                availableSizes,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                true,
                0L,
                createdByUserId,
                timestamp,
                timestamp
        );
    }

    public void assertBelongsToClient(UUID expectedClientId) {
        if (expectedClientId == null || !this.clientId.equals(expectedClientId)) {
            throw new DomainValidationException(
                    "Tenant isolation violation: CatalogItem %s belongs to client %s, not %s."
                            .formatted(id, clientId, expectedClientId)
            );
        }
    }

    public GarmentSpecificationSnapshot toSpecificationSnapshot() {
        return new GarmentSpecificationSnapshot(
                name,
                garmentStyle,
                colorReference,
                frontVisualStorageKey,
                backVisualStorageKey
        );
    }

    public CatalogItem withUpdatedSpecifications(
            String referenceCode,
            String name,
            String garmentStyle,
            String colorReference,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            Instant now
    ) {
        return withUpdatedSpecifications(
                referenceCode,
                this.productType,
                name,
                garmentStyle,
                colorReference,
                this.supplierName,
                this.availableSizes,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                now
        );
    }

    public CatalogItem withUpdatedSpecifications(
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            Instant now
    ) {
        return withUpdatedSpecifications(
                referenceCode,
                productType,
                name,
                garmentStyle,
                colorReference,
                this.supplierId,
                supplierName,
                availableSizes,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                now
        );
    }

    public CatalogItem withUpdatedSpecifications(
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            UUID supplierId,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost,
            Instant now
    ) {
        return new CatalogItem(
                this.id,
                this.clientId,
                referenceCode,
                productType,
                name,
                garmentStyle,
                colorReference,
                supplierId,
                supplierName,
                availableSizes,
                frontVisualStorageKey,
                backVisualStorageKey,
                visualPlacementNotes,
                b2cUnitPrice,
                b2bUnitCost,
                this.active,
                this.version,
                this.createdByUserId,
                this.createdAt,
                now != null ? now : Instant.now()
        );
    }

    public CatalogItem deactivated(Instant now) {
        return new CatalogItem(
                this.id,
                this.clientId,
                this.referenceCode,
                this.productType,
                this.name,
                this.garmentStyle,
                this.colorReference,
                this.supplierId,
                this.supplierName,
                this.availableSizes,
                this.frontVisualStorageKey,
                this.backVisualStorageKey,
                this.visualPlacementNotes,
                this.b2cUnitPrice,
                this.b2bUnitCost,
                false,
                this.version,
                this.createdByUserId,
                this.createdAt,
                now != null ? now : Instant.now()
        );
    }

    public UUID id() {
        return id;
    }

    public UUID clientId() {
        return clientId;
    }

    public String referenceCode() {
        return referenceCode;
    }

    public String productType() {
        return productType;
    }

    public String name() {
        return name;
    }

    public String garmentStyle() {
        return garmentStyle;
    }

    public String colorReference() {
        return colorReference;
    }

    public UUID supplierId() {
        return supplierId;
    }

    public String supplierName() {
        return supplierName;
    }

    public String availableSizes() {
        return availableSizes;
    }

    public String frontVisualStorageKey() {
        return frontVisualStorageKey;
    }

    public String backVisualStorageKey() {
        return backVisualStorageKey;
    }

    public String visualPlacementNotes() {
        return visualPlacementNotes;
    }

    public BigDecimal b2cUnitPrice() {
        return b2cUnitPrice;
    }

    public BigDecimal b2bUnitCost() {
        return b2bUnitCost;
    }

    public boolean active() {
        return active;
    }

    public long version() {
        return version;
    }

    public UUID createdByUserId() {
        return createdByUserId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
