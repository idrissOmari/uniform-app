package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;
import java.util.Objects;

public sealed abstract class DomainException extends RuntimeException
        permits CashPaymentNotConfirmedException,
                InvalidGenderSizeCombinationException,
                OrderLockedException,
                InsufficientClientStockException,
                B2bStockNotReceivedException,
                MoqNotReachedException,
                InsufficientPrivilegesException,
                ResourceNotFoundException,
                DomainValidationException {

    private final ErrorCode errorCode;
    private final int httpStatus;
    private final String title;

    protected DomainException(ErrorCode errorCode, int httpStatus, String title, String message) {
        super(Objects.requireNonNull(message, "message must not be null"));
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode must not be null");
        this.httpStatus = httpStatus;
        this.title = Objects.requireNonNull(title, "title must not be null");
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    public int httpStatus() {
        return httpStatus;
    }

    public String title() {
        return title;
    }
}
