package com.uniform.app.domain.model.b2b;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.B2cOrderStatus;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class B2bPurchaseOrder {

    private final UUID id;
    private final UUID clientId;
    private final UUID b2cOrderId;
    private final String poNumber;
    private final String supplierName;
    private B2bOrderStatus status;
    private BigDecimal totalB2bCost;
    private String poPdfStorageKey;
    private final List<B2bPurchaseOrderLine> lines;
    private long version;
    private final UUID createdByUserId;
    private UUID orderedByUserId;
    private Instant orderedAt;
    private UUID receivedByUserId;
    private Instant receivedAt;
    private final Instant createdAt;
    private Instant updatedAt;

    public B2bPurchaseOrder(
            UUID id,
            UUID clientId,
            UUID b2cOrderId,
            String poNumber,
            B2bOrderStatus status,
            String poPdfStorageKey,
            List<B2bPurchaseOrderLine> lines,
            long version,
            UUID createdByUserId,
            UUID orderedByUserId,
            Instant orderedAt,
            UUID receivedByUserId,
            Instant receivedAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(
                id,
                clientId,
                b2cOrderId,
                poNumber,
                CatalogItem.DEFAULT_SUPPLIER_NAME,
                status,
                poPdfStorageKey,
                lines,
                version,
                createdByUserId,
                orderedByUserId,
                orderedAt,
                receivedByUserId,
                receivedAt,
                createdAt,
                updatedAt
        );
    }

    public B2bPurchaseOrder(
            UUID id,
            UUID clientId,
            UUID b2cOrderId,
            String poNumber,
            String supplierName,
            B2bOrderStatus status,
            String poPdfStorageKey,
            List<B2bPurchaseOrderLine> lines,
            long version,
            UUID createdByUserId,
            UUID orderedByUserId,
            Instant orderedAt,
            UUID receivedByUserId,
            Instant receivedAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        if (id == null || clientId == null || b2cOrderId == null) {
            throw new DomainValidationException("B2bPurchaseOrder id, clientId, and b2cOrderId must not be null.");
        }
        if (poNumber == null || poNumber.isBlank()) {
            throw new DomainValidationException("poNumber must not be blank.");
        }
        if (status == null) {
            throw new DomainValidationException("status must not be null.");
        }
        if (createdByUserId == null || createdAt == null) {
            throw new DomainValidationException("createdByUserId and createdAt must not be null.");
        }

        this.id = id;
        this.clientId = clientId;
        this.b2cOrderId = b2cOrderId;
        this.poNumber = poNumber.trim();
        this.supplierName = (supplierName == null || supplierName.isBlank())
                ? CatalogItem.DEFAULT_SUPPLIER_NAME
                : supplierName.trim();
        this.status = status;
        this.poPdfStorageKey = (poPdfStorageKey == null || poPdfStorageKey.isBlank()) ? null : poPdfStorageKey.trim();
        this.lines = new ArrayList<>();
        if (lines != null) {
            for (B2bPurchaseOrderLine line : lines) {
                if (!this.clientId.equals(line.clientId()) || !this.id.equals(line.b2bPurchaseOrderId())) {
                    throw new DomainValidationException(
                            "B2B line %s does not belong to PO %s / client %s.".formatted(line.id(), this.id, this.clientId)
                    );
                }
                this.lines.add(line);
            }
        }
        this.version = version;
        this.createdByUserId = createdByUserId;
        this.orderedByUserId = orderedByUserId;
        this.orderedAt = orderedAt;
        this.receivedByUserId = receivedByUserId;
        this.receivedAt = receivedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt != null ? updatedAt : createdAt;
        recalculateTotalB2bCost();
    }

    public static B2bPurchaseOrder createDraftFromB2cOrder(
            B2cOrder b2cOrder,
            String poNumber,
            Map<UUID, CatalogItem> catalogItemsById,
            UUID createdByUserId,
            Instant now
    ) {
        if (b2cOrder == null) {
            throw new DomainValidationException("b2cOrder must not be null.");
        }
        if (b2cOrder.status() != B2cOrderStatus.IN_PRODUCTION) {
            throw new OrderLockedException(
                    "B2B Purchase Order can only be created from a B2C order in IN_PRODUCTION status, got %s."
                            .formatted(b2cOrder.status())
            );
        }
        if (catalogItemsById == null || catalogItemsById.isEmpty()) {
            throw new DomainValidationException("catalogItemsById must not be null or empty.");
        }

        UUID poId = UUID.randomUUID();
        UUID clientId = b2cOrder.clientId();
        Instant timestamp = now != null ? now : Instant.now();

        Map<GarmentVariant, Integer> demandedByVariant = b2cOrder.aggregateDemandedQuantitiesByVariant();
        List<B2bPurchaseOrderLine> draftLines = new ArrayList<>();

        for (Map.Entry<GarmentVariant, Integer> entry : demandedByVariant.entrySet()) {
            GarmentVariant variant = entry.getKey();
            int demandedQty = entry.getValue();

            CatalogItem catalogItem = catalogItemsById.get(variant.catalogItemId());
            if (catalogItem == null) {
                throw new ResourceNotFoundException(
                        "CatalogItem %s not found when generating B2B Purchase Order.".formatted(variant.catalogItemId())
                );
            }
            catalogItem.assertBelongsToClient(clientId);

            draftLines.add(B2bPurchaseOrderLine.createPrefilledFromB2cDemand(
                    clientId,
                    poId,
                    variant,
                    demandedQty,
                    catalogItem.b2bUnitCost(),
                    catalogItem.toSpecificationSnapshot()
            ));
        }

        return new B2bPurchaseOrder(
                poId,
                clientId,
                b2cOrder.id(),
                poNumber,
                draftLines.isEmpty()
                        ? CatalogItem.DEFAULT_SUPPLIER_NAME
                        : catalogItemsById.get(draftLines.getFirst().catalogItemId()).supplierName(),
                B2bOrderStatus.DRAFT,
                null,
                draftLines,
                0L,
                createdByUserId,
                null,
                null,
                null,
                null,
                timestamp,
                timestamp
        );
    }

    public static List<B2bPurchaseOrder> createDraftsBySupplierFromB2cOrder(
            B2cOrder b2cOrder,
            String basePoNumber,
            Map<UUID, CatalogItem> catalogItemsById,
            UUID createdByUserId,
            Instant now
    ) {
        if (b2cOrder == null) {
            throw new DomainValidationException("b2cOrder must not be null.");
        }
        if (b2cOrder.status() != B2cOrderStatus.IN_PRODUCTION) {
            throw new OrderLockedException(
                    "B2B Purchase Order can only be created from a B2C order in IN_PRODUCTION status, got %s."
                            .formatted(b2cOrder.status())
            );
        }
        if (catalogItemsById == null || catalogItemsById.isEmpty()) {
            throw new DomainValidationException("catalogItemsById must not be null or empty.");
        }

        UUID clientId = b2cOrder.clientId();
        Instant timestamp = now != null ? now : Instant.now();
        Map<GarmentVariant, Integer> demandedByVariant = b2cOrder.aggregateDemandedQuantitiesByVariant();

        Map<String, List<Map.Entry<GarmentVariant, Integer>>> groupedBySupplier = new LinkedHashMap<>();
        for (Map.Entry<GarmentVariant, Integer> entry : demandedByVariant.entrySet()) {
            GarmentVariant variant = entry.getKey();
            CatalogItem catalogItem = catalogItemsById.get(variant.catalogItemId());
            if (catalogItem == null) {
                throw new ResourceNotFoundException(
                        "CatalogItem %s not found when generating B2B Purchase Order.".formatted(variant.catalogItemId())
                );
            }
            catalogItem.assertBelongsToClient(clientId);
            String supplier = catalogItem.supplierName();
            groupedBySupplier.computeIfAbsent(supplier, _ -> new ArrayList<>()).add(entry);
        }

        List<B2bPurchaseOrder> result = new ArrayList<>();
        int index = 1;
        for (Map.Entry<String, List<Map.Entry<GarmentVariant, Integer>>> supplierGroup : groupedBySupplier.entrySet()) {
            String supplierName = supplierGroup.getKey();
            UUID poId = UUID.randomUUID();
            String poNumber = groupedBySupplier.size() == 1
                    ? basePoNumber
                    : "%s-F%d".formatted(basePoNumber, index++);

            List<B2bPurchaseOrderLine> draftLines = new ArrayList<>();
            for (Map.Entry<GarmentVariant, Integer> entry : supplierGroup.getValue()) {
                GarmentVariant variant = entry.getKey();
                int demandedQty = entry.getValue();
                CatalogItem catalogItem = catalogItemsById.get(variant.catalogItemId());
                draftLines.add(B2bPurchaseOrderLine.createPrefilledFromB2cDemand(
                        clientId,
                        poId,
                        variant,
                        demandedQty,
                        catalogItem.b2bUnitCost(),
                        catalogItem.toSpecificationSnapshot()
                ));
            }

            result.add(new B2bPurchaseOrder(
                    poId,
                    clientId,
                    b2cOrder.id(),
                    poNumber,
                    supplierName,
                    B2bOrderStatus.DRAFT,
                    null,
                    draftLines,
                    0L,
                    createdByUserId,
                    null,
                    null,
                    null,
                    null,
                    timestamp,
                    timestamp
            ));
        }

        return result;
    }

    public void updatePoPdfStorageKey(String poPdfStorageKey, Instant now) {
        if (poPdfStorageKey != null && !poPdfStorageKey.isBlank()) {
            this.poPdfStorageKey = poPdfStorageKey.trim();
            this.updatedAt = now != null ? now : Instant.now();
        }
    }

    public void assertBelongsToClient(UUID expectedClientId) {
        if (expectedClientId == null || !this.clientId.equals(expectedClientId)) {
            throw new DomainValidationException(
                    "Tenant isolation violation: B2bPurchaseOrder %s belongs to client %s, not %s."
                            .formatted(id, clientId, expectedClientId)
            );
        }
    }

    public B2bPurchaseOrderLine updateLineFinalQuantity(UUID b2bLineId, int finalQuantity, Instant now) {
        if (this.status != B2bOrderStatus.DRAFT) {
            throw new OrderLockedException(
                    "Cannot modify finalQuantity on B2B purchase order %s because status is %s (must be DRAFT)."
                            .formatted(id, status)
            );
        }
        B2bPurchaseOrderLine targetLine = this.lines.stream()
                .filter(l -> l.id().equals(b2bLineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2B purchase order line %s not found in PO %s.".formatted(b2bLineId, id)
                ));

        targetLine.updateFinalQuantity(finalQuantity);
        recalculateTotalB2bCost();
        this.updatedAt = now != null ? now : Instant.now();
        return targetLine;
    }

    public void confirmOrder(UUID adminUserId, String poPdfStorageKey, Instant now) {
        if (this.status != B2bOrderStatus.DRAFT) {
            throw new OrderLockedException(
                    "Cannot confirm B2B purchase order %s from status %s (must be DRAFT)."
                            .formatted(id, status)
            );
        }
        if (adminUserId == null) {
            throw new DomainValidationException("orderedByUserId must not be null.");
        }
        if (poPdfStorageKey == null || poPdfStorageKey.isBlank()) {
            throw new DomainValidationException("poPdfStorageKey must not be blank when confirming B2B order.");
        }
        recalculateTotalB2bCost();
        Instant timestamp = now != null ? now : Instant.now();
        this.status = B2bOrderStatus.ORDERED;
        this.poPdfStorageKey = poPdfStorageKey.trim();
        this.orderedByUserId = adminUserId;
        this.orderedAt = timestamp;
        this.updatedAt = timestamp;
    }

    public void receiveStock(
            Map<GarmentVariant, ClientStock> clientStocksByVariant,
            UUID adminUserId,
            Instant now
    ) {
        if (this.status != B2bOrderStatus.ORDERED) {
            throw new OrderLockedException(
                    "Cannot receive stock for B2B purchase order %s because status is %s (must be ORDERED)."
                            .formatted(id, status)
            );
        }
        if (adminUserId == null) {
            throw new DomainValidationException("receivedByUserId must not be null.");
        }
        if (clientStocksByVariant == null) {
            throw new DomainValidationException("clientStocksByVariant must not be null.");
        }

        Instant timestamp = now != null ? now : Instant.now();
        for (B2bPurchaseOrderLine line : this.lines) {
            ClientStock stock = clientStocksByVariant.get(line.variant());
            if (stock == null) {
                throw new DomainValidationException(
                        "Missing ClientStock entry for variant %s when receiving B2B PO %s."
                                .formatted(line.variant(), id)
                );
            }
            stock.assertIsolationAndVariant(this.clientId, line.variant());
            stock.credit(line.finalQuantity(), timestamp);
        }

        this.status = B2bOrderStatus.RECEIVED;
        this.receivedByUserId = adminUserId;
        this.receivedAt = timestamp;
        this.updatedAt = timestamp;
    }

    private void recalculateTotalB2bCost() {
        BigDecimal sum = FinancialsAndQuantities.ZERO_AMOUNT;
        for (B2bPurchaseOrderLine line : this.lines) {
            sum = sum.add(line.lineTotalCost()).setScale(2, RoundingMode.HALF_UP);
        }
        this.totalB2bCost = sum;
    }

    public UUID id() {
        return id;
    }

    public UUID clientId() {
        return clientId;
    }

    public UUID b2cOrderId() {
        return b2cOrderId;
    }

    public String poNumber() {
        return poNumber;
    }

    public String supplierName() {
        return supplierName;
    }

    public B2bOrderStatus status() {
        return status;
    }

    public BigDecimal totalB2bCost() {
        return totalB2bCost;
    }

    public String poPdfStorageKey() {
        return poPdfStorageKey;
    }

    public List<B2bPurchaseOrderLine> lines() {
        return Collections.unmodifiableList(lines);
    }

    public long version() {
        return version;
    }

    public UUID createdByUserId() {
        return createdByUserId;
    }

    public UUID orderedByUserId() {
        return orderedByUserId;
    }

    public Instant orderedAt() {
        return orderedAt;
    }

    public UUID receivedByUserId() {
        return receivedByUserId;
    }

    public Instant receivedAt() {
        return receivedAt;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
