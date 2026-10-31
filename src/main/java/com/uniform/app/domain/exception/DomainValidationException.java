package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;

public final class DomainValidationException extends DomainException {

    public DomainValidationException(String message) {
        super(
                ErrorCode.VALIDATION_ERROR,
                400,
                "Erreur de validation métier",
                message
        );
    }
}
