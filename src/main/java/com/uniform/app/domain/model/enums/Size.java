package com.uniform.app.domain.model.enums;

public enum Size {
    // Adult grid (MEN, WOMEN, UNISEX)
    XS( false),
    S(false),
    M(false),
    L(false),
    XL(false),
    XXL(false),
    XXXL(false),

    // Kids grid (KIDS only)
    AGE_2(true),
    AGE_4(true),
    AGE_6(true),
    AGE_8(true),
    AGE_10(true),
    AGE_12(true),
    AGE_14(true);

    private final boolean kidsGrid;

    Size(boolean kidsGrid) {
        this.kidsGrid = kidsGrid;
    }

    public boolean isKidsGrid() {
        return kidsGrid;
    }

    public boolean isAdultGrid() {
        return !kidsGrid;
    }

    public boolean isCompatibleWith(Gender gender) {
        if (gender == null) {
            return false;
        }
        return switch (gender) {
            case MEN, WOMEN, UNISEX -> isAdultGrid();
            case KIDS -> isKidsGrid();
        };
    }
}
