package com.uniform.app.domain.port.in;

import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import java.util.List;
import java.util.UUID;

public interface B2bPurchaseOrderUseCase {

    List<B2bPurchaseOrder> listB2bPurchaseOrders(UUID clientId);

    B2bPurchaseOrder updateB2bLineFinalQuantity(
            UUID clientId,
            UUID b2bOrderId,
            UUID b2bLineId,
            int finalQuantity,
            UUID adminUserId
    );

    B2bPurchaseOrder confirmB2bPurchaseOrder(UUID clientId, UUID b2bOrderId, UUID adminUserId);

    B2bPurchaseOrder receiveB2bPurchaseOrderStock(UUID clientId, UUID b2bOrderId, UUID adminUserId);

    byte[] downloadB2bPurchaseOrderPdf(UUID clientId, UUID b2bOrderId);
}
