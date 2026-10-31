package com.uniform.app.domain.model.enums;

public enum Gender {
    MEN,
    WOMEN,
    UNISEX,
    KIDS;

    public boolean isAdult() {
        return switch (this) {
            case MEN, WOMEN, UNISEX -> true;
            case KIDS -> false;
        };
    }

    public boolean isKids() {
        return this == KIDS;
    }
}
