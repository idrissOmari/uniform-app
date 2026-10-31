package com.uniform.app.domain.exception;

import com.uniform.app.domain.model.enums.ErrorCode;
import java.util.UUID;

public final class MoqNotReachedException extends DomainException {

    private final int currentQuantity;
    private final int requiredMoq;

    public MoqNotReachedException(UUID b2cOrderId, int currentQuantity, int requiredMoq) {
        super(
                ErrorCode.MOQ_NOT_REACHED,
                422,
                "Quantité Minimale de Commande (MOQ) non atteinte",
                "Cannot move B2C order %s to IN_PRODUCTION: total quantity (%d) is below client MOQ (%d)."
                        .formatted(b2cOrderId, currentQuantity, requiredMoq)
        );
        this.currentQuantity = currentQuantity;
        this.requiredMoq = requiredMoq;
    }

    public int currentQuantity() {
        return currentQuantity;
    }

    public int requiredMoq() {
        return requiredMoq;
    }
}
