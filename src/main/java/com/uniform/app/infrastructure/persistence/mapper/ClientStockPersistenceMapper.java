package com.uniform.app.infrastructure.persistence.mapper;

import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.GarmentVariant;
import com.uniform.app.infrastructure.persistence.entity.ClientStockJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ClientStockPersistenceMapper {

    public ClientStock toDomain(ClientStockJpaEntity entity) {
        if (entity == null) {
            return null;
        }
        return new ClientStock(
                entity.getId(),
                entity.getClientId(),
                new GarmentVariant(entity.getCatalogItemId(), entity.getGender(), entity.getSize()),
                entity.getAvailableQuantity(),
                entity.getVersion(),
                entity.getUpdatedAt()
        );
    }

    public void updateEntity(ClientStock domain, ClientStockJpaEntity entity) {
        entity.setId(domain.id());
        entity.setClientId(domain.clientId());
        entity.setCatalogItemId(domain.catalogItemId());
        entity.setGender(domain.gender());
        entity.setSize(domain.size());
        entity.setAvailableQuantity(domain.availableQuantity());
        entity.setUpdatedAt(domain.updatedAt());
    }
}
