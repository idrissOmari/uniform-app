package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;

public final class OrderLockedException extends DomainException {

    public OrderLockedException(String message) {
        super(
                ErrorCode.ORDER_IMMUTABLE,
                409,
                "Commande verrouillée ou transition d'état invalide",
                message
        );
    }
}
