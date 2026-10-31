package com.uniform.app.infrastructure.persistence.adapter;

import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.port.out.B2bPurchaseOrderRepositoryPort;
import com.uniform.app.infrastructure.persistence.entity.B2bPurchaseOrderJpaEntity;
import com.uniform.app.infrastructure.persistence.mapper.B2bPurchaseOrderPersistenceMapper;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class B2bPurchaseOrderPanacheRepositoryAdapter
        implements B2bPurchaseOrderRepositoryPort, PanacheRepositoryBase<B2bPurchaseOrderJpaEntity, UUID> {

    private final B2bPurchaseOrderPersistenceMapper mapper;

    public B2bPurchaseOrderPanacheRepositoryAdapter(B2bPurchaseOrderPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public B2bPurchaseOrder save(UUID clientId, B2bPurchaseOrder b2bPurchaseOrder) {
        b2bPurchaseOrder.assertBelongsToClient(clientId);
        B2bPurchaseOrderJpaEntity entity = find("clientId = ?1 and id = ?2", clientId, b2bPurchaseOrder.id())
                .firstResultOptional()
                .orElseGet(B2bPurchaseOrderJpaEntity::new);
        mapper.updateEntity(b2bPurchaseOrder, entity);
        persistAndFlush(entity);
        return mapper.toDomain(entity);
    }

    @Override
    public Optional<B2bPurchaseOrder> findByClientIdAndId(UUID clientId, UUID b2bOrderId) {
        return find("clientId = ?1 and id = ?2", clientId, b2bOrderId)
                .firstResultOptional()
                .map(mapper::toDomain);
    }

    @Override
    public Optional<B2bPurchaseOrder> findByClientIdAndB2cOrderId(UUID clientId, UUID b2cOrderId) {
        return find("clientId = ?1 and b2cOrderId = ?2 ORDER BY createdAt ASC", clientId, b2cOrderId)
                .firstResultOptional()
                .map(mapper::toDomain);
    }

    @Override
    public List<B2bPurchaseOrder> findAllByClientIdAndB2cOrderId(UUID clientId, UUID b2cOrderId) {
        return list("clientId = ?1 and b2cOrderId = ?2 ORDER BY createdAt ASC", clientId, b2cOrderId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<B2bPurchaseOrder> findAllByClientId(UUID clientId) {
        return list("clientId = ?1 ORDER BY createdAt DESC", clientId).stream()
                .map(mapper::toDomain)
                .toList();
    }
}
