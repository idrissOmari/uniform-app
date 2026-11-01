package com.uniform.app.domain.model.enums;

import java.util.Locale;

public enum Size {
    // Adult grid (MEN, WOMEN, UNISEX)
    XXS(GridScope.ADULT_ONLY),
    XS(GridScope.ADULT_ONLY),
    S(GridScope.ADULT_ONLY),
    M(GridScope.ADULT_ONLY),
    L(GridScope.ADULT_ONLY),
    XL(GridScope.ADULT_ONLY),
    XXL(GridScope.ADULT_ONLY),
    XXXL(GridScope.ADULT_ONLY),
    XXXXL(GridScope.ADULT_ONLY),

    // Kids grid (KIDS only)
    AGE_2(GridScope.KIDS_ONLY),
    AGE_4(GridScope.KIDS_ONLY),
    AGE_6(GridScope.KIDS_ONLY),
    AGE_8(GridScope.KIDS_ONLY),
    AGE_10(GridScope.KIDS_ONLY),
    AGE_12(GridScope.KIDS_ONLY),
    AGE_14(GridScope.KIDS_ONLY),
    AGE_16(GridScope.KIDS_ONLY),

    // Universal numeric & one-size grids (compatible with MEN, WOMEN, UNISEX, KIDS)
    TU(GridScope.UNIVERSAL),
    SIZE_28(GridScope.UNIVERSAL),
    SIZE_30(GridScope.UNIVERSAL),
    SIZE_32(GridScope.UNIVERSAL),
    SIZE_34(GridScope.UNIVERSAL),
    SIZE_35(GridScope.UNIVERSAL),
    SIZE_36(GridScope.UNIVERSAL),
    SIZE_37(GridScope.UNIVERSAL),
    SIZE_38(GridScope.UNIVERSAL),
    SIZE_39(GridScope.UNIVERSAL),
    SIZE_40(GridScope.UNIVERSAL),
    SIZE_41(GridScope.UNIVERSAL),
    SIZE_42(GridScope.UNIVERSAL),
    SIZE_43(GridScope.UNIVERSAL),
    SIZE_44(GridScope.UNIVERSAL),
    SIZE_45(GridScope.UNIVERSAL),
    SIZE_46(GridScope.UNIVERSAL),
    SIZE_48(GridScope.UNIVERSAL),
    SIZE_50(GridScope.UNIVERSAL),
    SIZE_52(GridScope.UNIVERSAL);

    public enum GridScope {
        ADULT_ONLY,
        KIDS_ONLY,
        UNIVERSAL
    }

    private final GridScope scope;

    Size(GridScope scope) {
        this.scope = scope;
    }

    public boolean isKidsGrid() {
        return scope == GridScope.KIDS_ONLY || scope == GridScope.UNIVERSAL;
    }

    public boolean isAdultGrid() {
        return scope == GridScope.ADULT_ONLY || scope == GridScope.UNIVERSAL;
    }

    public boolean isUniversalGrid() {
        return scope == GridScope.UNIVERSAL;
    }

    public boolean isCompatibleWith(Gender gender) {
        if (gender == null) {
            return false;
        }
        if (scope == GridScope.UNIVERSAL) {
            return true;
        }
        return switch (gender) {
            case MEN, WOMEN, UNISEX -> scope == GridScope.ADULT_ONLY;
            case KIDS -> scope == GridScope.KIDS_ONLY;
        };
    }

    public static Size fromCode(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Size code cannot be blank");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (normalized.matches("^\\d+$")) {
            return Size.valueOf("SIZE_" + normalized);
        }
        return Size.valueOf(normalized);
    }
}
