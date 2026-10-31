package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface ClientStockRepositoryPort {

    ClientStock save(UUID clientId, ClientStock clientStock);

    void saveAll(UUID clientId, Collection<ClientStock> clientStocks);

    Optional<ClientStock> findByClientIdAndVariant(UUID clientId, GarmentVariant variant);

    Map<GarmentVariant, ClientStock> findOrCreateByClientIdAndVariants(
            UUID clientId,
            Collection<GarmentVariant> variants
    );

    List<ClientStock> findAllByClientId(UUID clientId);
}
