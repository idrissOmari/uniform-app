package com.uniform.app.infrastructure.storage;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class LocalDocumentStorageService {

    private final Path baseDirectory;

    public LocalDocumentStorageService(
            @ConfigProperty(name = "uniform.storage.dir", defaultValue = "target/uniform-storage") String storageDir
    ) {
        this.baseDirectory = Path.of(storageDir).toAbsolutePath().normalize();
    }

    public void storeDocument(UUID clientId, String storageKey, byte[] content) {
        Path resolved = resolveAndValidateTenantPath(clientId, storageKey);
        try {
            Files.createDirectories(resolved.getParent());
            Files.write(resolved, content);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write PDF document to storage key: " + storageKey, e);
        }
    }

    public byte[] loadDocument(UUID clientId, String storageKey) {
        Path resolved = resolveAndValidateTenantPath(clientId, storageKey);
        if (!Files.exists(resolved)) {
            throw new ResourceNotFoundException("Stored PDF document not found for key: " + storageKey);
        }
        try {
            return Files.readAllBytes(resolved);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read PDF document from storage key: " + storageKey, e);
        }
    }

    private Path resolveAndValidateTenantPath(UUID clientId, String storageKey) {
        if (clientId == null) {
            throw new DomainValidationException("clientId must not be null for document storage.");
        }
        if (storageKey == null || storageKey.isBlank()) {
            throw new DomainValidationException("storageKey must not be blank.");
        }
        if (!storageKey.contains(clientId.toString())) {
            throw new DomainValidationException(
                    "Tenant isolation violation on storage key '%s' for client %s.".formatted(storageKey, clientId)
            );
        }
        Path target = baseDirectory.resolve(storageKey).normalize();
        if (!target.startsWith(baseDirectory)) {
            throw new DomainValidationException("Invalid storage path traversal attempt: " + storageKey);
        }
        return target;
    }
}
