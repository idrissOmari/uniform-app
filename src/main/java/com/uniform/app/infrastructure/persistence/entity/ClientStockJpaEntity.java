package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "client_stocks")
public class ClientStockJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @Column(name = "catalog_item_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID catalogItemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 16, nullable = false, updatable = false)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "size", length = 16, nullable = false, updatable = false)
    private Size size;

    @Column(name = "available_quantity", nullable = false)
    private int availableQuantity;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ClientStockJpaEntity() {
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

    public int getAvailableQuantity() {
        return availableQuantity;
    }

    public void setAvailableQuantity(int availableQuantity) {
        this.availableQuantity = availableQuantity;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
