package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.audit.OrderStatusAuditLog;
import java.util.UUID;

public interface OrderStatusAuditLogPort {

    void recordStatusTransition(UUID clientId, OrderStatusAuditLog auditLog);
}
