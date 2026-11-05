package com.uniform.app.domain.model.b2c;

import com.uniform.app.domain.exception.B2bStockNotReceivedException;
import com.uniform.app.domain.exception.CashPaymentNotConfirmedException;
import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.MoqNotReachedException;
import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.B2cOrderStatus;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
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

public final class B2cOrder {

    private final UUID id;
    private final UUID clientId;
    private final String orderNumber;
    private B2cOrderStatus status;
    private final int clientMoqSnapshot;
    private int totalQuantity;
    private BigDecimal totalCashAmount;
    private final List<B2cOrderLine> lines;
    private long version;
    private final UUID createdByUserId;
    private final Instant createdAt;
    private Instant updatedAt;

    public B2cOrder(
            UUID id,
            UUID clientId,
            String orderNumber,
            B2cOrderStatus status,
            int clientMoqSnapshot,
            List<B2cOrderLine> lines,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        if (id == null || clientId == null) {
            throw new DomainValidationException("B2cOrder id and clientId must not be null.");
        }
        if (orderNumber == null || orderNumber.isBlank()) {
            throw new DomainValidationException("orderNumber must not be blank.");
        }
        if (status == null) {
            throw new DomainValidationException("status must not be null.");
        }
        if (createdByUserId == null || createdAt == null) {
            throw new DomainValidationException("createdByUserId and createdAt must not be null.");
        }
        this.id = id;
        this.clientId = clientId;
        this.orderNumber = orderNumber.trim();
        this.status = status;
        this.clientMoqSnapshot = FinancialsAndQuantities.requireValidMoq(clientMoqSnapshot);
        this.lines = new ArrayList<>();
        if (lines != null) {
            for (B2cOrderLine line : lines) {
                if (!this.clientId.equals(line.clientId()) || !this.id.equals(line.b2cOrderId())) {
                    throw new DomainValidationException(
                            "Line %s does not match B2cOrder %s / client %s.".formatted(line.id(), this.id, this.clientId)
                    );
                }
                this.lines.add(line);
            }
        }
        this.version = version;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt != null ? updatedAt : createdAt;
        recalculateTotals();
    }

    public static B2cOrder initializeInProgress(
            UUID clientId,
            String orderNumber,
            int clientMoqSnapshot,
            UUID createdByUserId,
            Instant now
    ) {
        Instant timestamp = now != null ? now : Instant.now();
        return new B2cOrder(
                UUID.randomUUID(),
                clientId,
                orderNumber,
                B2cOrderStatus.IN_PROGRESS,
                clientMoqSnapshot,
                List.of(),
                0L,
                createdByUserId,
                timestamp,
                timestamp
        );
    }

    public void assertBelongsToClient(UUID expectedClientId) {
        if (expectedClientId == null || !this.clientId.equals(expectedClientId)) {
            throw new DomainValidationException(
                    "Tenant isolation violation: B2cOrder %s belongs to client %s, not %s."
                            .formatted(id, clientId, expectedClientId)
            );
        }
    }

    public B2cOrderLine addCashOrderLine(
            CatalogItem catalogItem,
            Gender gender,
            Size size,
            int quantity,
            BuyerContact buyerContact,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            String receiptNumber,
            String receiptPdfStorageKey,
            UUID operatorUserId,
            Instant now
    ) {
        return addCashOrderLine(
                catalogItem,
                null,
                null,
                gender,
                size,
                quantity,
                buyerContact,
                cashPaymentConfirmed,
                irreversibilityAcknowledged,
                receiptNumber,
                receiptPdfStorageKey,
                operatorUserId,
                now
        );
    }

    public B2cOrderLine addCashOrderLine(
            CatalogItem catalogItem,
            UUID sectionId,
            String sectionName,
            Gender gender,
            Size size,
            int quantity,
            BuyerContact buyerContact,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            String receiptNumber,
            String receiptPdfStorageKey,
            UUID operatorUserId,
            Instant now
    ) {
        if (this.status != B2cOrderStatus.IN_PROGRESS) {
            throw new OrderLockedException(
                    "Cannot add a B2C order line to order %s because its status is %s (must be IN_PROGRESS)."
                            .formatted(id, status)
            );
        }
        if (!cashPaymentConfirmed || !irreversibilityAcknowledged) {
            throw CashPaymentNotConfirmedException.defaultMessage();
        }
        if (catalogItem == null) {
            throw new DomainValidationException("catalogItem must not be null.");
        }
        catalogItem.assertBelongsToClient(this.clientId);

        GarmentVariant variant = new GarmentVariant(catalogItem.id(), gender, size);

        B2cOrderLine line = B2cOrderLine.createPaidInCash(
                this.clientId,
                this.id,
                sectionId,
                sectionName,
                variant,
                receiptNumber,
                buyerContact,
                quantity,
                catalogItem.b2cUnitPrice(),
                true,
                true,
                receiptPdfStorageKey,
                operatorUserId,
                now
        );

        this.lines.add(line);
        recalculateTotals();
        this.updatedAt = now != null ? now : Instant.now();
        return line;
    }

    public B2bPurchaseOrder moveToProduction(
            String poNumber,
            Map<UUID, CatalogItem> catalogItemsById,
            UUID adminUserId,
            Instant now
    ) {
        if (this.status != B2cOrderStatus.IN_PROGRESS) {
            throw new OrderLockedException(
                    "Cannot transition B2C order %s to IN_PRODUCTION from status %s."
                            .formatted(id, status)
            );
        }
        if (!isMoqReached()) {
            throw new MoqNotReachedException(this.id, this.totalQuantity, this.clientMoqSnapshot);
        }
        this.status = B2cOrderStatus.IN_PRODUCTION;
        this.updatedAt = now != null ? now : Instant.now();

        return B2bPurchaseOrder.createDraftFromB2cOrder(
                this,
                poNumber,
                catalogItemsById,
                adminUserId,
                this.updatedAt
        );
    }

    public List<B2bPurchaseOrder> moveToProductionBySupplier(
            String basePoNumber,
            Map<UUID, CatalogItem> catalogItemsById,
            UUID adminUserId,
            Instant now
    ) {
        if (this.status != B2cOrderStatus.IN_PROGRESS) {
            throw new OrderLockedException(
                    "Cannot transition B2C order %s to IN_PRODUCTION from status %s."
                            .formatted(id, status)
            );
        }
        if (!isMoqReached()) {
            throw new MoqNotReachedException(this.id, this.totalQuantity, this.clientMoqSnapshot);
        }
        this.status = B2cOrderStatus.IN_PRODUCTION;
        this.updatedAt = now != null ? now : Instant.now();

        return B2bPurchaseOrder.createDraftsBySupplierFromB2cOrder(
                this,
                basePoNumber,
                catalogItemsById,
                adminUserId,
                this.updatedAt
        );
    }

    public void moveToDelivery(B2bOrderStatus associatedB2bOrderStatus, Instant now) {
        if (this.status != B2cOrderStatus.IN_PRODUCTION) {
            throw new OrderLockedException(
                    "Cannot transition B2C order %s to IN_DELIVERY from status %s (expected IN_PRODUCTION)."
                            .formatted(id, status)
            );
        }
        if (associatedB2bOrderStatus != B2bOrderStatus.RECEIVED) {
            throw new B2bStockNotReceivedException(this.id, associatedB2bOrderStatus);
        }
        this.status = B2cOrderStatus.IN_DELIVERY;
        this.updatedAt = now != null ? now : Instant.now();
    }

    public B2cOrderLine markLineDelivered(
            UUID lineId,
            ClientStock clientStockForVariant,
            UUID operatorUserId,
            Instant now
    ) {
        if (this.status != B2cOrderStatus.IN_DELIVERY) {
            throw new OrderLockedException(
                    "Cannot deliver individual lines on B2C order %s because status is %s (expected IN_DELIVERY)."
                            .formatted(id, status)
            );
        }
        B2cOrderLine targetLine = this.lines.stream()
                .filter(l -> l.id().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2C order line %s not found in order %s.".formatted(lineId, id)
                ));

        if (targetLine.isDelivered()) {
            throw new OrderLockedException("B2C order line %s is already DELIVERED.".formatted(lineId));
        }
        if (clientStockForVariant == null) {
            throw new DomainValidationException("clientStockForVariant must not be null.");
        }

        clientStockForVariant.assertIsolationAndVariant(this.clientId, targetLine.variant());
        clientStockForVariant.debit(targetLine.quantity(), now);

        Instant timestamp = now != null ? now : Instant.now();
        targetLine.markDelivered(operatorUserId, timestamp);
        this.updatedAt = timestamp;

        if (!this.lines.isEmpty() && this.lines.stream().allMatch(B2cOrderLine::isDelivered)) {
            this.status = B2cOrderStatus.DELIVERED;
        }
        return targetLine;
    }

    public B2cOrderLine removeLine(UUID lineId, Instant now) {
        B2cOrderLine targetLine = this.lines.stream()
                .filter(l -> l.id().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2C order line %s not found in order %s.".formatted(lineId, id)
                ));
        this.lines.removeIf(l -> l.id().equals(lineId));
        recalculateTotals();
        this.updatedAt = now != null ? now : Instant.now();
        if (this.status == B2cOrderStatus.DELIVERED
                && this.lines.stream().anyMatch(l -> !l.isDelivered())) {
            this.status = B2cOrderStatus.IN_DELIVERY;
        } else if (this.status == B2cOrderStatus.IN_DELIVERY
                && !this.lines.isEmpty()
                && this.lines.stream().allMatch(B2cOrderLine::isDelivered)) {
            this.status = B2cOrderStatus.DELIVERED;
        }
        return targetLine;
    }

    public Map<GarmentVariant, Integer> aggregateDemandedQuantitiesByVariant() {
        Map<GarmentVariant, Integer> aggregated = new LinkedHashMap<>();
        for (B2cOrderLine line : this.lines) {
            aggregated.merge(line.variant(), line.quantity(), Integer::sum);
        }
        return Collections.unmodifiableMap(aggregated);
    }

    public boolean isMoqReached() {
        return this.totalQuantity >= this.clientMoqSnapshot;
    }

    private void recalculateTotals() {
        int qtySum = 0;
        BigDecimal cashSum = FinancialsAndQuantities.ZERO_AMOUNT;
        for (B2cOrderLine line : this.lines) {
            qtySum += line.quantity();
            cashSum = cashSum.add(line.lineCashAmount()).setScale(2, RoundingMode.HALF_UP);
        }
        this.totalQuantity = qtySum;
        this.totalCashAmount = cashSum;
    }

    public UUID id() {
        return id;
    }

    public UUID clientId() {
        return clientId;
    }

    public String orderNumber() {
        return orderNumber;
    }

    public B2cOrderStatus status() {
        return status;
    }

    public int clientMoqSnapshot() {
        return clientMoqSnapshot;
    }

    public int totalQuantity() {
        return totalQuantity;
    }

    public BigDecimal totalCashAmount() {
        return totalCashAmount;
    }

    public List<B2cOrderLine> lines() {
        return Collections.unmodifiableList(lines);
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
