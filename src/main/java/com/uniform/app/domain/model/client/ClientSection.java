package com.uniform.app.domain.model.client;

import com.uniform.app.domain.exception.DomainValidationException;
import java.util.UUID;

public record ClientSection(
        UUID id,
        UUID clientId,
        String name,
        int capacity
) {

    public ClientSection {
        if (id == null) {
            throw new DomainValidationException("ClientSection id must not be null.");
        }
        if (clientId == null) {
            throw new DomainValidationException("ClientSection clientId must not be null.");
        }
        if (name == null || name.isBlank()) {
            throw new DomainValidationException("Le nom de la section ne peut pas être vide.");
        }
        if (capacity <= 0) {
            throw new DomainValidationException(
                    "La capacité de la section '" + name.trim() + "' doit être supérieure ou égale à 1."
            );
        }
        name = name.trim();
    }

    public static ClientSection createNew(UUID clientId, String name, int capacity) {
        return new ClientSection(UUID.randomUUID(), clientId, name, capacity);
    }
}
