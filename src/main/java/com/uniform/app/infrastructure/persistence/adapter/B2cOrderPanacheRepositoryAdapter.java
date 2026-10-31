package com.uniform.app.infrastructure.persistence.adapter;

import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.port.out.B2cOrderRepositoryPort;
import com.uniform.app.infrastructure.persistence.entity.B2cOrderJpaEntity;
import com.uniform.app.infrastructure.persistence.mapper.B2cOrderPersistenceMapper;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class B2cOrderPanacheRepositoryAdapter
        implements B2cOrderRepositoryPort, PanacheRepositoryBase<B2cOrderJpaEntity, UUID> {

    private final B2cOrderPersistenceMapper mapper;

    public B2cOrderPanacheRepositoryAdapter(B2cOrderPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public B2cOrder save(UUID clientId, B2cOrder b2cOrder) {
        b2cOrder.assertBelongsToClient(clientId);
        B2cOrderJpaEntity entity = find("clientId = ?1 and id = ?2", clientId, b2cOrder.id())
                .firstResultOptional()
                .orElseGet(B2cOrderJpaEntity::new);
        mapper.updateEntity(b2cOrder, entity);
        persistAndFlush(entity);
        return mapper.toDomain(entity);
    }

    @Override
    public Optional<B2cOrder> findByClientIdAndId(UUID clientId, UUID orderId) {
        return find("clientId = ?1 and id = ?2", clientId, orderId)
                .firstResultOptional()
                .map(mapper::toDomain);
    }

    @Override
    public List<B2cOrder> findAllByClientId(UUID clientId) {
        return list("clientId = ?1 ORDER BY createdAt DESC", clientId).stream()
                .map(mapper::toDomain)
                .toList();
    }
}
