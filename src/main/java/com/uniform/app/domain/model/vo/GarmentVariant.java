package com.uniform.app.domain.model.vo;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.InvalidGenderSizeCombinationException;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import java.util.UUID;

public record GarmentVariant(
        UUID catalogItemId,
        Gender gender,
        Size size
) {
    public GarmentVariant {
        if (catalogItemId == null) {
            throw new DomainValidationException("catalogItemId must not be null.");
        }
        if (gender == null || size == null) {
            throw new InvalidGenderSizeCombinationException(gender, size);
        }
        if (!size.isCompatibleWith(gender)) {
            throw new InvalidGenderSizeCombinationException(gender, size);
        }
    }
}
