package com.uniform.app.infrastructure.persistence.adapter;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.model.audit.OrderStatusAuditLog;
import com.uniform.app.domain.port.out.OrderStatusAuditLogPort;
import com.uniform.app.infrastructure.persistence.entity.OrderStatusAuditLogJpaEntity;
import com.uniform.app.infrastructure.persistence.mapper.OrderStatusAuditLogPersistenceMapper;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

@ApplicationScoped
public class OrderStatusAuditLogPanacheAdapter
        implements OrderStatusAuditLogPort, PanacheRepositoryBase<OrderStatusAuditLogJpaEntity, UUID> {

    private final OrderStatusAuditLogPersistenceMapper mapper;

    public OrderStatusAuditLogPanacheAdapter(OrderStatusAuditLogPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public void recordStatusTransition(UUID clientId, OrderStatusAuditLog auditLog) {
        if (clientId == null || !clientId.equals(auditLog.clientId())) {
            throw new DomainValidationException(
                    "Tenant isolation violation on OrderStatusAuditLog: expected client %s, got %s."
                            .formatted(clientId, auditLog.clientId())
            );
        }
        persist(mapper.toEntity(auditLog));
    }
}
