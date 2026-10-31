package com.uniform.app.domain.model.b2b;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.GarmentSpecificationSnapshot;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.math.BigDecimal;
import java.util.UUID;

public final class B2bPurchaseOrderLine {

    private final UUID id;
    private final UUID clientId;
    private final UUID b2bPurchaseOrderId;
    private final GarmentVariant variant;
    private final int b2cDemandedQuantity;
    private int finalQuantity;
    private final BigDecimal b2bUnitCost;
    private BigDecimal lineTotalCost;
    private final GarmentSpecificationSnapshot specificationSnapshot;

    public B2bPurchaseOrderLine(
            UUID id,
            UUID clientId,
            UUID b2bPurchaseOrderId,
            GarmentVariant variant,
            int b2cDemandedQuantity,
            int finalQuantity,
            BigDecimal b2bUnitCost,
            BigDecimal lineTotalCost,
            GarmentSpecificationSnapshot specificationSnapshot
    ) {
        if (id == null || clientId == null || b2bPurchaseOrderId == null) {
            throw new DomainValidationException("B2B line identifiers (id, clientId, b2bPurchaseOrderId) must not be null.");
        }
        if (variant == null) {
            throw new DomainValidationException("variant must not be null.");
        }
        if (specificationSnapshot == null) {
            throw new DomainValidationException("specificationSnapshot must not be null.");
        }
        int validDemanded = FinancialsAndQuantities.requireNonNegativeQuantity(b2cDemandedQuantity);
        int validFinal = FinancialsAndQuantities.requireNonNegativeQuantity(finalQuantity);
        BigDecimal normalizedCost = FinancialsAndQuantities.normalizeAmount(b2bUnitCost);
        BigDecimal expectedTotal = FinancialsAndQuantities.multiplyPriceByQuantity(normalizedCost, validFinal);
        BigDecimal actualTotal = lineTotalCost != null
                ? FinancialsAndQuantities.normalizeAmount(lineTotalCost)
                : expectedTotal;
        if (actualTotal.compareTo(expectedTotal) != 0) {
            throw new DomainValidationException(
                    "Invalid B2B lineTotalCost: expected %s, got %s.".formatted(expectedTotal, actualTotal)
            );
        }

        this.id = id;
        this.clientId = clientId;
        this.b2bPurchaseOrderId = b2bPurchaseOrderId;
        this.variant = variant;
        this.b2cDemandedQuantity = validDemanded;
        this.finalQuantity = validFinal;
        this.b2bUnitCost = normalizedCost;
        this.lineTotalCost = expectedTotal;
        this.specificationSnapshot = specificationSnapshot;
    }

    static B2bPurchaseOrderLine createPrefilledFromB2cDemand(
            UUID clientId,
            UUID b2bPurchaseOrderId,
            GarmentVariant variant,
            int b2cDemandedQuantity,
            BigDecimal b2bUnitCost,
            GarmentSpecificationSnapshot specificationSnapshot
    ) {
        int validDemanded = FinancialsAndQuantities.requireNonNegativeQuantity(b2cDemandedQuantity);
        BigDecimal normalizedCost = FinancialsAndQuantities.normalizeAmount(b2bUnitCost);
        BigDecimal totalCost = FinancialsAndQuantities.multiplyPriceByQuantity(normalizedCost, validDemanded);
        return new B2bPurchaseOrderLine(
                UUID.randomUUID(),
                clientId,
                b2bPurchaseOrderId,
                variant,
                validDemanded,
                validDemanded,
                normalizedCost,
                totalCost,
                specificationSnapshot
        );
    }

    void updateFinalQuantity(int newFinalQuantity) {
        this.finalQuantity = FinancialsAndQuantities.requireNonNegativeQuantity(newFinalQuantity);
        this.lineTotalCost = FinancialsAndQuantities.multiplyPriceByQuantity(this.b2bUnitCost, this.finalQuantity);
    }

    public UUID id() {
        return id;
    }

    public UUID clientId() {
        return clientId;
    }

    public UUID b2bPurchaseOrderId() {
        return b2bPurchaseOrderId;
    }

    public GarmentVariant variant() {
        return variant;
    }

    public UUID catalogItemId() {
        return variant.catalogItemId();
    }

    public Gender gender() {
        return variant.gender();
    }

    public Size size() {
        return variant.size();
    }

    public int b2cDemandedQuantity() {
        return b2cDemandedQuantity;
    }

    public int finalQuantity() {
        return finalQuantity;
    }

    public BigDecimal b2bUnitCost() {
        return b2bUnitCost;
    }

    public BigDecimal lineTotalCost() {
        return lineTotalCost;
    }

    public GarmentSpecificationSnapshot specificationSnapshot() {
        return specificationSnapshot;
    }

    public String itemNameSnapshot() {
        return specificationSnapshot.itemName();
    }

    public String garmentStyleSnapshot() {
        return specificationSnapshot.garmentStyle();
    }

    public String colorReferenceSnapshot() {
        return specificationSnapshot.colorReference();
    }

    public String frontVisualStorageSnapshot() {
        return specificationSnapshot.frontVisualStorageKey();
    }

    public String backVisualStorageSnapshot() {
        return specificationSnapshot.backVisualStorageKey();
    }
}
