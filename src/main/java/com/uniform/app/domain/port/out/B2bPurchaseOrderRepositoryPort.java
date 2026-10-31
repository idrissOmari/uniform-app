package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface B2bPurchaseOrderRepositoryPort {

    B2bPurchaseOrder save(UUID clientId, B2bPurchaseOrder b2bPurchaseOrder);

    Optional<B2bPurchaseOrder> findByClientIdAndId(UUID clientId, UUID b2bOrderId);

    Optional<B2bPurchaseOrder> findByClientIdAndB2cOrderId(UUID clientId, UUID b2cOrderId);

    default List<B2bPurchaseOrder> findAllByClientIdAndB2cOrderId(UUID clientId, UUID b2cOrderId) {
        return findAllByClientId(clientId).stream()
                .filter(po -> po.b2cOrderId().equals(b2cOrderId))
                .toList();
    }

    List<B2bPurchaseOrder> findAllByClientId(UUID clientId);
}
