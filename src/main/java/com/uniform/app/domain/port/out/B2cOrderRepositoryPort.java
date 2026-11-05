package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.b2c.B2cOrder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface B2cOrderRepositoryPort {

    B2cOrder save(UUID clientId, B2cOrder b2cOrder);

    Optional<B2cOrder> findByClientIdAndId(UUID clientId, UUID orderId);

    List<B2cOrder> findAllByClientId(UUID clientId);

    default void deleteByClientIdAndId(UUID clientId, UUID orderId) {
    }
}
