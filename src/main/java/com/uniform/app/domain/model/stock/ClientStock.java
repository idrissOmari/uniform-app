package com.uniform.app.domain.model.stock;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.InsufficientClientStockException;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.time.Instant;
import java.util.UUID;

public final class ClientStock {

    private final UUID id;
    private final UUID clientId;
    private final GarmentVariant variant;
    private int availableQuantity;
    private long version;
    private Instant updatedAt;

    public ClientStock(
            UUID id,
            UUID clientId,
            GarmentVariant variant,
            int availableQuantity,
            long version,
            Instant updatedAt
    ) {
        if (id == null) {
            throw new DomainValidationException("ClientStock id must not be null.");
        }
        if (clientId == null) {
            throw new DomainValidationException("ClientStock clientId must not be null.");
        }
        if (variant == null) {
            throw new DomainValidationException("ClientStock variant must not be null.");
        }
        this.id = id;
        this.clientId = clientId;
        this.variant = variant;
        this.availableQuantity = FinancialsAndQuantities.requireNonNegativeQuantity(availableQuantity);
        this.version = version;
        this.updatedAt = updatedAt != null ? updatedAt : Instant.now();
    }

    public static ClientStock initializeEmpty(
            UUID clientId,
            UUID catalogItemId,
            Gender gender,
            Size size,
            Instant now
    ) {
        return new ClientStock(
                UUID.randomUUID(),
                clientId,
                new GarmentVariant(catalogItemId, gender, size),
                0,
                0L,
                now != null ? now : Instant.now()
        );
    }

    public void assertIsolationAndVariant(UUID expectedClientId, GarmentVariant expectedVariant) {
        if (expectedClientId == null || !this.clientId.equals(expectedClientId)) {
            throw new DomainValidationException(
                    "Tenant isolation violation: ClientStock %s belongs to client %s, not %s."
                            .formatted(id, clientId, expectedClientId)
            );
        }
        if (expectedVariant == null || !this.variant.equals(expectedVariant)) {
            throw new DomainValidationException(
                    "Variant mismatch on ClientStock %s: expected %s, got %s."
                            .formatted(id, this.variant, expectedVariant)
            );
        }
    }

    public void credit(int quantityToAdd, Instant now) {
        FinancialsAndQuantities.requireNonNegativeQuantity(quantityToAdd);
        this.availableQuantity += quantityToAdd;
        this.updatedAt = now != null ? now : Instant.now();
    }

    public void updateAvailableQuantity(int newAvailableQuantity, Instant now) {
        this.availableQuantity = FinancialsAndQuantities.requireNonNegativeQuantity(newAvailableQuantity);
        this.updatedAt = now != null ? now : Instant.now();
    }

    public void debit(int quantityToRemove, Instant now) {
        FinancialsAndQuantities.requirePositiveQuantity(quantityToRemove);
        if (this.availableQuantity < quantityToRemove) {
            throw new InsufficientClientStockException(this.variant, quantityToRemove, this.availableQuantity);
        }
        this.availableQuantity -= quantityToRemove;
        this.updatedAt = now != null ? now : Instant.now();
    }

    public UUID id() {
        return id;
    }

    public UUID clientId() {
        return clientId;
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

    public int availableQuantity() {
        return availableQuantity;
    }

    public long version() {
        return version;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
