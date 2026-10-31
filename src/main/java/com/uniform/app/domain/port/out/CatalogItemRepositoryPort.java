package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.client.CatalogItem;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface CatalogItemRepositoryPort {

    CatalogItem save(UUID clientId, CatalogItem catalogItem);

    Optional<CatalogItem> findByClientIdAndId(UUID clientId, UUID catalogItemId);

    List<CatalogItem> findAllByClientId(UUID clientId);

    Map<UUID, CatalogItem> findByClientIdAndIds(UUID clientId, Collection<UUID> catalogItemIds);
}
