package com.uniform.app.infrastructure.persistence.adapter;

import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.GarmentVariant;
import com.uniform.app.domain.port.out.ClientStockRepositoryPort;
import com.uniform.app.infrastructure.persistence.entity.ClientStockJpaEntity;
import com.uniform.app.infrastructure.persistence.mapper.ClientStockPersistenceMapper;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ClientStockPanacheRepositoryAdapter
        implements ClientStockRepositoryPort, PanacheRepositoryBase<ClientStockJpaEntity, UUID> {

    private final ClientStockPersistenceMapper mapper;

    public ClientStockPanacheRepositoryAdapter(ClientStockPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public ClientStock save(UUID clientId, ClientStock clientStock) {
        clientStock.assertIsolationAndVariant(clientId, clientStock.variant());
        ClientStockJpaEntity entity = find(
                "clientId = ?1 and catalogItemId = ?2 and gender = ?3 and size = ?4",
                clientId,
                clientStock.catalogItemId(),
                clientStock.gender(),
                clientStock.size()
        ).firstResultOptional().orElseGet(ClientStockJpaEntity::new);

        mapper.updateEntity(clientStock, entity);
        persistAndFlush(entity);
        return mapper.toDomain(entity);
    }

    @Override
    public void saveAll(UUID clientId, Collection<ClientStock> clientStocks) {
        for (ClientStock stock : clientStocks) {
            save(clientId, stock);
        }
    }

    @Override
    public Optional<ClientStock> findByClientIdAndVariant(UUID clientId, GarmentVariant variant) {
        return find(
                "clientId = ?1 and catalogItemId = ?2 and gender = ?3 and size = ?4",
                clientId,
                variant.catalogItemId(),
                variant.gender(),
                variant.size()
        ).firstResultOptional().map(mapper::toDomain);
    }

    @Override
    public Map<GarmentVariant, ClientStock> findOrCreateByClientIdAndVariants(
            UUID clientId,
            Collection<GarmentVariant> variants
    ) {
        Map<GarmentVariant, ClientStock> result = new LinkedHashMap<>();
        Instant now = Instant.now();
        for (GarmentVariant variant : variants) {
            ClientStock stock = findByClientIdAndVariant(clientId, variant)
                    .orElseGet(() -> ClientStock.initializeEmpty(
                            clientId,
                            variant.catalogItemId(),
                            variant.gender(),
                            variant.size(),
                            now
                    ));
            result.put(variant, stock);
        }
        return result;
    }

    @Override
    public List<ClientStock> findAllByClientId(UUID clientId) {
        return list("clientId = ?1 ORDER BY catalogItemId ASC, gender ASC, size ASC", clientId).stream()
                .map(mapper::toDomain)
                .toList();
    }
}
