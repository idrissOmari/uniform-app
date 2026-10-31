package com.uniform.app.domain.model.vo;

import com.uniform.app.domain.exception.DomainValidationException;
import java.math.BigDecimal;
import java.math.RoundingMode;

public final class FinancialsAndQuantities {

    public static final BigDecimal ZERO_AMOUNT = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private FinancialsAndQuantities() {
    }

    public static BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            throw new DomainValidationException("Financial amount must not be null.");
        }
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        if (scaled.compareTo(ZERO_AMOUNT) < 0) {
            throw new DomainValidationException("Financial amount must be >= 0.00, got: " + scaled);
        }
        return scaled;
    }

    public static BigDecimal multiplyPriceByQuantity(BigDecimal unitAmount, int quantity) {
        BigDecimal normalizedUnit = normalizeAmount(unitAmount);
        if (quantity < 0) {
            throw new DomainValidationException("Quantity must be >= 0, got: " + quantity);
        }
        return normalizedUnit
                .multiply(BigDecimal.valueOf(quantity))
                .setScale(2, RoundingMode.HALF_UP);
    }

    public static int requireValidMoq(int moq) {
        if (moq < 1) {
            throw new DomainValidationException("Client MOQ must be >= 1, got: " + moq);
        }
        return moq;
    }

    public static int requirePositiveQuantity(int quantity) {
        if (quantity < 1) {
            throw new DomainValidationException("Quantity must be >= 1, got: " + quantity);
        }
        return quantity;
    }

    public static int requireNonNegativeQuantity(int quantity) {
        if (quantity < 0) {
            throw new DomainValidationException("Quantity must be >= 0, got: " + quantity);
        }
        return quantity;
    }

    public record Money(BigDecimal amount) {
        public static final Money ZERO = new Money(ZERO_AMOUNT);

        public Money {
            amount = normalizeAmount(amount);
        }

        public static Money of(BigDecimal value) {
            return new Money(value);
        }

        public static Money of(String value) {
            if (value == null || value.isBlank()) {
                throw new DomainValidationException("Money string value must not be blank.");
            }
            return new Money(new BigDecimal(value));
        }

        public Money add(Money other) {
            if (other == null) {
                throw new DomainValidationException("Cannot add null Money.");
            }
            return new Money(this.amount.add(other.amount).setScale(2, RoundingMode.HALF_UP));
        }

        public Money multiply(int quantity) {
            return new Money(multiplyPriceByQuantity(this.amount, quantity));
        }
    }

    public record BuyerContact(String fullName, String phone, String email) {
        public BuyerContact {
            if (fullName == null || fullName.isBlank()) {
                throw new DomainValidationException("buyerFullName must not be blank.");
            }
            fullName = fullName.trim();
            phone = (phone == null || phone.isBlank()) ? "—" : phone.trim();
            email = (email == null || email.isBlank()) ? "—" : email.trim();
        }
    }

    public record GarmentSpecificationSnapshot(
            String itemName,
            String garmentStyle,
            String colorReference,
            String frontVisualStorageKey,
            String backVisualStorageKey
    ) {
        public GarmentSpecificationSnapshot(
                String garmentStyle,
                String colorReference,
                String frontVisualStorageKey,
                String backVisualStorageKey
        ) {
            this(garmentStyle, garmentStyle, colorReference, frontVisualStorageKey, backVisualStorageKey);
        }

        public GarmentSpecificationSnapshot {
            if (garmentStyle == null || garmentStyle.isBlank()) {
                throw new DomainValidationException("garmentStyleSnapshot must not be blank.");
            }
            if (colorReference == null || colorReference.isBlank()) {
                throw new DomainValidationException("colorReferenceSnapshot must not be blank.");
            }
            if (frontVisualStorageKey == null || frontVisualStorageKey.isBlank()) {
                throw new DomainValidationException("frontVisualStorageSnapshot must not be blank.");
            }
            garmentStyle = garmentStyle.trim();
            itemName = (itemName == null || itemName.isBlank()) ? garmentStyle : itemName.trim();
            colorReference = colorReference.trim();
            frontVisualStorageKey = frontVisualStorageKey.trim();
            backVisualStorageKey = (backVisualStorageKey == null || backVisualStorageKey.isBlank())
                    ? null
                    : backVisualStorageKey.trim();
        }
    }
}
