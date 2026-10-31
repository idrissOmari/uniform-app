package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;

public final class ResourceNotFoundException extends DomainException {

    public ResourceNotFoundException(String message) {
        super(
                ErrorCode.RESOURCE_NOT_FOUND,
                404,
                "Ressource introuvable",
                message
        );
    }
}
