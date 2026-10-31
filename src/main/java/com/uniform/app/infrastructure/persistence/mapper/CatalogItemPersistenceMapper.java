package com.uniform.app.infrastructure.persistence.mapper;

import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.infrastructure.persistence.entity.CatalogItemJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CatalogItemPersistenceMapper {

    public CatalogItem toDomain(CatalogItemJpaEntity entity) {
        if (entity == null) {
            return null;
        }
        return new CatalogItem(
                entity.getId(),
                entity.getClientId(),
                entity.getReferenceCode(),
                entity.getProductType(),
                entity.getName(),
                entity.getGarmentStyle(),
                entity.getColorReference(),
                entity.getSupplierId(),
                entity.getSupplierName(),
                entity.getAvailableSizes(),
                entity.getFrontVisualStorageKey(),
                entity.getBackVisualStorageKey(),
                entity.getVisualPlacementNotes(),
                entity.getB2cUnitPrice(),
                entity.getB2bUnitCost(),
                entity.isActive(),
                entity.getVersion(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public void updateEntity(CatalogItem domain, CatalogItemJpaEntity entity) {
        entity.setId(domain.id());
        entity.setClientId(domain.clientId());
        entity.setReferenceCode(domain.referenceCode());
        entity.setProductType(domain.productType());
        entity.setName(domain.name());
        entity.setGarmentStyle(domain.garmentStyle());
        entity.setColorReference(domain.colorReference());
        entity.setSupplierId(domain.supplierId());
        entity.setSupplierName(domain.supplierName());
        entity.setAvailableSizes(domain.availableSizes());
        entity.setFrontVisualStorageKey(domain.frontVisualStorageKey());
        entity.setBackVisualStorageKey(domain.backVisualStorageKey());
        entity.setVisualPlacementNotes(domain.visualPlacementNotes());
        entity.setB2cUnitPrice(domain.b2cUnitPrice());
        entity.setB2bUnitCost(domain.b2bUnitCost());
        entity.setActive(domain.active());
        entity.setCreatedByUserId(domain.createdByUserId());
        entity.setCreatedAt(domain.createdAt());
        entity.setUpdatedAt(domain.updatedAt());
    }
}
