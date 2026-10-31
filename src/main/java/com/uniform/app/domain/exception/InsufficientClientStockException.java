package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;
import com.uniform.app.domain.model.vo.GarmentVariant;

public final class InsufficientClientStockException extends DomainException {

    public InsufficientClientStockException(GarmentVariant variant, int requested, int available) {
        super(
                ErrorCode.INSUFFICIENT_CLIENT_STOCK,
                409,
                "Stock client insuffisant",
                "Insufficient client stock for variant [item=%s, gender=%s, size=%s]: requested=%d, available=%d."
                        .formatted(variant.catalogItemId(), variant.gender(), variant.size(), requested, available)
        );
    }

    public InsufficientClientStockException(String message) {
        super(
                ErrorCode.INSUFFICIENT_CLIENT_STOCK,
                409,
                "Stock client insuffisant",
                message
        );
    }
}
