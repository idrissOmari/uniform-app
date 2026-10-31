package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;

public final class InsufficientPrivilegesException extends DomainException {

    public InsufficientPrivilegesException(String message) {
        super(
                ErrorCode.INSUFFICIENT_PRIVILEGES,
                403,
                "Privilèges insuffisants",
                message
        );
    }
}
