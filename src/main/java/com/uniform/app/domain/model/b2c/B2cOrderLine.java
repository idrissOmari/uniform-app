package com.uniform.app.domain.model.b2c;

import com.uniform.app.domain.exception.CashPaymentNotConfirmedException;
import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.model.enums.B2cOrderLineStatus;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class B2cOrderLine {

    private final UUID id;
    private final UUID clientId;
    private final UUID b2cOrderId;
    private final UUID sectionId;
    private final String sectionName;
    private final GarmentVariant variant;
    private final String receiptNumber;
    private final BuyerContact buyerContact;
    private final int quantity;
    private final BigDecimal b2cUnitPrice;
    private final BigDecimal lineCashAmount;
    private final boolean cashPaymentConfirmed;
    private final boolean irreversibilityAcknowledged;
    private B2cOrderLineStatus lineStatus;
    private final String receiptPdfStorageKey;
    private final UUID createdByUserId;
    private final Instant createdAt;
    private UUID deliveredByUserId;
    private Instant deliveredAt;

    public B2cOrderLine(
            UUID id,
            UUID clientId,
            UUID b2cOrderId,
            GarmentVariant variant,
            String receiptNumber,
            BuyerContact buyerContact,
            int quantity,
            BigDecimal b2cUnitPrice,
            BigDecimal lineCashAmount,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            B2cOrderLineStatus lineStatus,
            String receiptPdfStorageKey,
            UUID createdByUserId,
            Instant createdAt,
            UUID deliveredByUserId,
            Instant deliveredAt
    ) {
        this(
                id,
                clientId,
                b2cOrderId,
                null,
                null,
                variant,
                receiptNumber,
                buyerContact,
                quantity,
                b2cUnitPrice,
                lineCashAmount,
                cashPaymentConfirmed,
                irreversibilityAcknowledged,
                lineStatus,
                receiptPdfStorageKey,
                createdByUserId,
                createdAt,
                deliveredByUserId,
                deliveredAt
        );
    }

    public B2cOrderLine(
            UUID id,
            UUID clientId,
            UUID b2cOrderId,
            UUID sectionId,
            String sectionName,
            GarmentVariant variant,
            String receiptNumber,
            BuyerContact buyerContact,
            int quantity,
            BigDecimal b2cUnitPrice,
            BigDecimal lineCashAmount,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            B2cOrderLineStatus lineStatus,
            String receiptPdfStorageKey,
            UUID createdByUserId,
            Instant createdAt,
            UUID deliveredByUserId,
            Instant deliveredAt
    ) {
        if (!cashPaymentConfirmed || !irreversibilityAcknowledged) {
            throw CashPaymentNotConfirmedException.defaultMessage();
        }
        if (id == null || clientId == null || b2cOrderId == null) {
            throw new DomainValidationException("Line identifiers (id, clientId, b2cOrderId) must not be null.");
        }
        if (variant == null) {
            throw new DomainValidationException("GarmentVariant must not be null.");
        }
        if (receiptNumber == null || receiptNumber.isBlank()) {
            throw new DomainValidationException("receiptNumber must not be blank.");
        }
        if (buyerContact == null) {
            throw new DomainValidationException("buyerContact must not be null.");
        }
        if (lineStatus == null) {
            throw new DomainValidationException("lineStatus must not be null.");
        }
        if (receiptPdfStorageKey == null || receiptPdfStorageKey.isBlank()) {
            throw new DomainValidationException("receiptPdfStorageKey must not be blank.");
        }
        if (createdByUserId == null || createdAt == null) {
            throw new DomainValidationException("createdByUserId and createdAt must not be null.");
        }

        int validQty = FinancialsAndQuantities.requirePositiveQuantity(quantity);
        BigDecimal normalizedUnit = FinancialsAndQuantities.normalizeAmount(b2cUnitPrice);
        BigDecimal expectedLineAmount = FinancialsAndQuantities.multiplyPriceByQuantity(normalizedUnit, validQty);
        BigDecimal actualLineAmount = lineCashAmount != null
                ? FinancialsAndQuantities.normalizeAmount(lineCashAmount)
                : expectedLineAmount;
        if (actualLineAmount.compareTo(expectedLineAmount) != 0) {
            throw new DomainValidationException(
                    "Invalid lineCashAmount: expected %s (quantity %d * unitPrice %s), got %s."
                            .formatted(expectedLineAmount, validQty, normalizedUnit, actualLineAmount)
            );
        }

        if (lineStatus == B2cOrderLineStatus.DELIVERED && (deliveredByUserId == null || deliveredAt == null)) {
            throw new DomainValidationException("Delivered line must have deliveredByUserId and deliveredAt.");
        }

        this.id = id;
        this.clientId = clientId;
        this.b2cOrderId = b2cOrderId;
        this.sectionId = sectionId;
        this.sectionName = (sectionName == null || sectionName.isBlank()) ? null : sectionName.trim();
        this.variant = variant;
        this.receiptNumber = receiptNumber.trim();
        this.buyerContact = buyerContact;
        this.quantity = validQty;
        this.b2cUnitPrice = normalizedUnit;
        this.lineCashAmount = expectedLineAmount;
        this.cashPaymentConfirmed = true;
        this.irreversibilityAcknowledged = true;
        this.lineStatus = lineStatus;
        this.receiptPdfStorageKey = receiptPdfStorageKey.trim();
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.deliveredByUserId = deliveredByUserId;
        this.deliveredAt = deliveredAt;
    }

    static B2cOrderLine createPaidInCash(
            UUID clientId,
            UUID b2cOrderId,
            GarmentVariant variant,
            String receiptNumber,
            BuyerContact buyerContact,
            int quantity,
            BigDecimal b2cUnitPrice,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            String receiptPdfStorageKey,
            UUID createdByUserId,
            Instant now
    ) {
        return createPaidInCash(
                clientId,
                b2cOrderId,
                null,
                null,
                variant,
                receiptNumber,
                buyerContact,
                quantity,
                b2cUnitPrice,
                cashPaymentConfirmed,
                irreversibilityAcknowledged,
                receiptPdfStorageKey,
                createdByUserId,
                now
        );
    }

    static B2cOrderLine createPaidInCash(
            UUID clientId,
            UUID b2cOrderId,
            UUID sectionId,
            String sectionName,
            GarmentVariant variant,
            String receiptNumber,
            BuyerContact buyerContact,
            int quantity,
            BigDecimal b2cUnitPrice,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            String receiptPdfStorageKey,
            UUID createdByUserId,
            Instant now
    ) {
        if (!cashPaymentConfirmed || !irreversibilityAcknowledged) {
            throw CashPaymentNotConfirmedException.defaultMessage();
        }
        int validQty = FinancialsAndQuantities.requirePositiveQuantity(quantity);
        BigDecimal normalizedUnit = FinancialsAndQuantities.normalizeAmount(b2cUnitPrice);
        BigDecimal computedLineAmount = FinancialsAndQuantities.multiplyPriceByQuantity(normalizedUnit, validQty);
        Instant timestamp = now != null ? now : Instant.now();

        return new B2cOrderLine(
                UUID.randomUUID(),
                clientId,
                b2cOrderId,
                sectionId,
                sectionName,
                variant,
                receiptNumber,
                buyerContact,
                validQty,
                normalizedUnit,
                computedLineAmount,
                true,
                true,
                B2cOrderLineStatus.PENDING_PICKUP,
                receiptPdfStorageKey,
                createdByUserId,
                timestamp,
                null,
                null
        );
    }

    void markDelivered(UUID operatorUserId, Instant now) {
        if (this.lineStatus == B2cOrderLineStatus.DELIVERED) {
            throw new OrderLockedException("B2C order line %s is already DELIVERED.".formatted(id));
        }
        if (operatorUserId == null) {
            throw new DomainValidationException("deliveredByUserId must not be null.");
        }
        this.lineStatus = B2cOrderLineStatus.DELIVERED;
        this.deliveredByUserId = operatorUserId;
        this.deliveredAt = now != null ? now : Instant.now();
    }

    public boolean isDelivered() {
        return this.lineStatus == B2cOrderLineStatus.DELIVERED;
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

    public UUID sectionId() {
        return sectionId;
    }

    public String sectionName() {
        return sectionName;
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

    public String receiptNumber() {
        return receiptNumber;
    }

    public BuyerContact buyerContact() {
        return buyerContact;
    }

    public String buyerFullName() {
        return buyerContact.fullName();
    }

    public String buyerPhone() {
        return buyerContact.phone();
    }

    public String buyerEmail() {
        return buyerContact.email();
    }

    public int quantity() {
        return quantity;
    }

    public BigDecimal b2cUnitPrice() {
        return b2cUnitPrice;
    }

    public BigDecimal lineCashAmount() {
        return lineCashAmount;
    }

    public boolean cashPaymentConfirmed() {
        return cashPaymentConfirmed;
    }

    public boolean irreversibilityAcknowledged() {
        return irreversibilityAcknowledged;
    }

    public B2cOrderLineStatus lineStatus() {
        return lineStatus;
    }

    public String receiptPdfStorageKey() {
        return receiptPdfStorageKey;
    }

    public UUID createdByUserId() {
        return createdByUserId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public UUID deliveredByUserId() {
        return deliveredByUserId;
    }

    public Instant deliveredAt() {
        return deliveredAt;
    }
}
