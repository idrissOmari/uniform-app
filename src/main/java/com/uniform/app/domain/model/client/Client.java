package com.uniform.app.domain.model.client;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.InvalidGenderSizeCombinationException;
import com.uniform.app.domain.model.enums.ClientType;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public final class Client {

    private final UUID id;
    private String name;
    private ClientType clientType;
    private String address;
    private String logoStorageKey;
    private int moq;
    private final List<ClientSection> sections = new ArrayList<>();
    private boolean active;
    private long version;
    private final UUID createdByUserId;
    private final Instant createdAt;
    private Instant updatedAt;

    public Client(
            UUID id,
            String name,
            String address,
            String logoStorageKey,
            int moq,
            boolean active,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(
                id,
                name,
                ClientType.SECONDARY_SCHOOL,
                address,
                logoStorageKey,
                moq,
                active,
                version,
                createdByUserId,
                createdAt,
                updatedAt
        );
    }

    public Client(
            UUID id,
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int moq,
            boolean active,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(
                id,
                name,
                clientType,
                address,
                logoStorageKey,
                moq,
                List.of(),
                active,
                version,
                createdByUserId,
                createdAt,
                updatedAt
        );
    }

    public Client(
            UUID id,
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int moq,
            List<ClientSection> sections,
            boolean active,
            long version,
            UUID createdByUserId,
            Instant createdAt,
            Instant updatedAt
    ) {
        if (id == null) {
            throw new DomainValidationException("Client id must not be null.");
        }
        if (name == null || name.isBlank()) {
            throw new DomainValidationException("Client name must not be blank.");
        }
        if (address == null || address.isBlank()) {
            throw new DomainValidationException("Client address must not be blank.");
        }
        if (createdByUserId == null) {
            throw new DomainValidationException("createdByUserId must not be null.");
        }
        if (createdAt == null) {
            throw new DomainValidationException("createdAt must not be null.");
        }
        this.id = id;
        this.name = name.trim();
        this.clientType = clientType != null ? clientType : ClientType.SECONDARY_SCHOOL;
        this.address = address.trim();
        this.logoStorageKey = (logoStorageKey == null || logoStorageKey.isBlank()) ? null : logoStorageKey.trim();
        this.moq = FinancialsAndQuantities.requireValidMoq(moq);
        this.active = active;
        this.version = version;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt != null ? updatedAt : createdAt;
        setValidatedSections(sections);
    }

    public static Client createNew(
            String name,
            String address,
            String logoStorageKey,
            int moq,
            UUID createdByUserId,
            Instant now
    ) {
        return createNew(name, ClientType.SECONDARY_SCHOOL, address, logoStorageKey, moq, createdByUserId, now);
    }

    public static Client createNew(
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int moq,
            UUID createdByUserId,
            Instant now
    ) {
        Instant timestamp = now != null ? now : Instant.now();
        return new Client(
                UUID.randomUUID(),
                name,
                clientType != null ? clientType : ClientType.SECONDARY_SCHOOL,
                address,
                logoStorageKey,
                moq,
                true,
                0L,
                createdByUserId,
                timestamp,
                timestamp
        );
    }

    public void assertVariantAllowedForClientType(Gender gender, Size size) {
        if (this.clientType.isKidsSizesOnly() && gender != Gender.KIDS) {
            throw new InvalidGenderSizeCombinationException(gender, size);
        }
    }

    public void updateMoq(int newMoq, Instant now) {
        this.moq = FinancialsAndQuantities.requireValidMoq(newMoq);
        this.updatedAt = now != null ? now : Instant.now();
    }

    public void updateDetails(
            String name,
            String address,
            String logoStorageKey,
            int newMoq,
            Instant now
    ) {
        updateDetails(name, this.clientType, address, logoStorageKey, newMoq, now);
    }

    public void updateDetails(
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int newMoq,
            Instant now
    ) {
        if (name == null || name.isBlank()) {
            throw new DomainValidationException("Client name must not be blank.");
        }
        if (address == null || address.isBlank()) {
            throw new DomainValidationException("Client address must not be blank.");
        }
        this.name = name.trim();
        this.clientType = clientType != null ? clientType : ClientType.SECONDARY_SCHOOL;
        this.address = address.trim();
        this.logoStorageKey = (logoStorageKey == null || logoStorageKey.isBlank()) ? null : logoStorageKey.trim();
        this.moq = FinancialsAndQuantities.requireValidMoq(newMoq);
        this.updatedAt = now != null ? now : Instant.now();
    }

    public void replaceSections(List<ClientSection> newSections, Instant now) {
        setValidatedSections(newSections);
        this.updatedAt = now != null ? now : Instant.now();
    }

    private void setValidatedSections(List<ClientSection> candidateSections) {
        this.sections.clear();
        if (candidateSections == null || candidateSections.isEmpty()) {
            return;
        }
        Set<String> seenNames = new HashSet<>();
        for (ClientSection section : candidateSections) {
            if (section == null) {
                continue;
            }
            if (!this.id.equals(section.clientId())) {
                throw new DomainValidationException("Tenant isolation violation: section does not belong to client.");
            }
            String normalizedName = section.name().trim().toLowerCase(Locale.ROOT);
            if (!seenNames.add(normalizedName)) {
                throw new DomainValidationException(
                        "Deux sections d'un même client ne peuvent pas porter le même nom : '" + section.name() + "'."
                );
            }
            this.sections.add(section);
        }
    }

    public List<ClientSection> sections() {
        return List.copyOf(sections);
    }

    public int totalCapacity() {
        return sections.stream().mapToInt(ClientSection::capacity).sum();
    }

    public void deactivate(Instant now) {
        this.active = false;
        this.updatedAt = now != null ? now : Instant.now();
    }

    public UUID id() {
        return id;
    }

    public String name() {
        return name;
    }

    public ClientType clientType() {
        return clientType;
    }

    public boolean isPrimarySchool() {
        return clientType == ClientType.PRIMARY_SCHOOL;
    }

    public String address() {
        return address;
    }

    public String logoStorageKey() {
        return logoStorageKey;
    }

    public int moq() {
        return moq;
    }

    public boolean active() {
        return active;
    }

    public long version() {
        return version;
    }

    public UUID createdByUserId() {
        return createdByUserId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
