package com.uniform.app.domain.port.in;

import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import java.util.List;
import java.util.UUID;

public interface B2cOrderUseCase {

    List<B2cOrder> listB2cOrders(UUID clientId);

    B2cOrder createB2cOrder(UUID clientId, UUID operatorUserId);

    B2cOrder getB2cOrderById(UUID clientId, UUID orderId);

    B2cOrderLine addB2cOrderLine(UUID clientId, UUID orderId, AddB2cOrderLineCommand command);

    byte[] downloadB2cLineReceiptPdf(UUID clientId, UUID orderId, UUID lineId);

    byte[] downloadB2cOrderPackingListPdf(UUID clientId, UUID orderId);

    B2cOrder moveB2cOrderToProduction(UUID clientId, UUID orderId, UUID adminUserId);

    B2cOrder moveB2cOrderToDelivery(UUID clientId, UUID orderId, UUID adminUserId);

    B2cOrder markB2cOrderLineDelivered(UUID clientId, UUID orderId, UUID lineId, UUID operatorUserId);

    record AddB2cOrderLineCommand(
            UUID catalogItemId,
            UUID sectionId,
            String sectionName,
            String buyerFullName,
            String buyerPhone,
            String buyerEmail,
            Gender gender,
            Size size,
            int quantity,
            boolean cashPaymentConfirmed,
            boolean irreversibilityAcknowledged,
            UUID operatorUserId
    ) {
        public AddB2cOrderLineCommand(
                UUID catalogItemId,
                String buyerFullName,
                String buyerPhone,
                String buyerEmail,
                Gender gender,
                Size size,
                int quantity,
                boolean cashPaymentConfirmed,
                boolean irreversibilityAcknowledged,
                UUID operatorUserId
        ) {
            this(
                    catalogItemId,
                    null,
                    null,
                    buyerFullName,
                    buyerPhone,
                    buyerEmail,
                    gender,
                    size,
                    quantity,
                    cashPaymentConfirmed,
                    irreversibilityAcknowledged,
                    operatorUserId
            );
        }
    }
}
