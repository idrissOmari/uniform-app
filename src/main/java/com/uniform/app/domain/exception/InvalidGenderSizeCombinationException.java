package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;

public final class InvalidGenderSizeCombinationException extends DomainException {

    public InvalidGenderSizeCombinationException(Gender gender, Size size) {
        super(
                ErrorCode.INVALID_GENDER_SIZE,
                400,
                "Combinaison genre / taille invalide",
                "Invalid combination of gender '%s' and size '%s'.".formatted(gender, size)
        );
    }

    public InvalidGenderSizeCombinationException(String message) {
        super(
                ErrorCode.INVALID_GENDER_SIZE,
                400,
                "Combinaison genre / taille invalide",
                message
        );
    }
}
