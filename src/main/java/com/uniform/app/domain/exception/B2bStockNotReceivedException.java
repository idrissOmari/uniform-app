package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.ErrorCode;
import java.util.UUID;

public final class B2bStockNotReceivedException extends DomainException {

    public B2bStockNotReceivedException(UUID b2cOrderId, B2bOrderStatus currentB2bStatus) {
        super(
                ErrorCode.B2B_STOCK_NOT_RECEIVED,
                409,
                "Marchandise fournisseur B2B non réceptionnée",
                "Cannot move B2C order %s to IN_DELIVERY because associated B2B purchase order status is %s (expected RECEIVED)."
                        .formatted(b2cOrderId, currentB2bStatus)
        );
    }

    public B2bStockNotReceivedException(String message) {
        super(
                ErrorCode.B2B_STOCK_NOT_RECEIVED,
                409,
                "Marchandise fournisseur B2B non réceptionnée",
                message
        );
    }
}
