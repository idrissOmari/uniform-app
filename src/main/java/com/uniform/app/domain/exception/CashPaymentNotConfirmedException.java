package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;

public final class CashPaymentNotConfirmedException extends DomainException {

    public CashPaymentNotConfirmedException(String message) {
        super(
                ErrorCode.CASH_CONFIRMATION_REQUIRED,
                400,
                "Confirmation d'encaissement espèces requise",
                message
        );
    }

    public static CashPaymentNotConfirmedException defaultMessage() {
        return new CashPaymentNotConfirmedException(
                "Both cashPaymentConfirmed and irreversibilityAcknowledged must be explicitly set to true."
        );
    }
}
