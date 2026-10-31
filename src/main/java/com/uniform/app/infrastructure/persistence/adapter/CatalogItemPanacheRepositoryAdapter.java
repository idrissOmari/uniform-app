package com.uniform.app.infrastructure.persistence.adapter;

import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.port.out.CatalogItemRepositoryPort;
import com.uniform.app.infrastructure.persistence.entity.CatalogItemJpaEntity;
import com.uniform.app.infrastructure.persistence.mapper.CatalogItemPersistenceMapper;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@ApplicationScoped
public class CatalogItemPanacheRepositoryAdapter
        implements CatalogItemRepositoryPort, PanacheRepositoryBase<CatalogItemJpaEntity, UUID> {

    private final CatalogItemPersistenceMapper mapper;

    public CatalogItemPanacheRepositoryAdapter(CatalogItemPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public CatalogItem save(UUID clientId, CatalogItem catalogItem) {
        catalogItem.assertBelongsToClient(clientId);
        CatalogItemJpaEntity entity = find("clientId = ?1 and id = ?2", clientId, catalogItem.id())
                .firstResultOptional()
                .orElseGet(CatalogItemJpaEntity::new);
        mapper.updateEntity(catalogItem, entity);
        persistAndFlush(entity);
        return mapper.toDomain(entity);
    }

    @Override
    public Optional<CatalogItem> findByClientIdAndId(UUID clientId, UUID catalogItemId) {
        return find("clientId = ?1 and id = ?2", clientId, catalogItemId)
                .firstResultOptional()
                .map(mapper::toDomain);
    }

    @Override
    public List<CatalogItem> findAllByClientId(UUID clientId) {
        return list("clientId = ?1 and active = true ORDER BY createdAt DESC", clientId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Map<UUID, CatalogItem> findByClientIdAndIds(UUID clientId, Collection<UUID> catalogItemIds) {
        if (catalogItemIds == null || catalogItemIds.isEmpty()) {
            return Map.of();
        }
        return list("clientId = ?1 and id in ?2", clientId, catalogItemIds).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toMap(CatalogItem::id, Function.identity()));
    }
}
