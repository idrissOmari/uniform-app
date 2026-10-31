package com.uniform.app.infrastructure.persistence.mapper;

import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.client.ClientSection;
import com.uniform.app.infrastructure.persistence.entity.ClientJpaEntity;
import com.uniform.app.infrastructure.persistence.entity.ClientSectionJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@ApplicationScoped
public class ClientPersistenceMapper {

    public Client toDomain(ClientJpaEntity entity) {
        if (entity == null) {
            return null;
        }
        List<ClientSection> domainSections = entity.getSections() == null
                ? List.of()
                : entity.getSections().stream()
                        .map(s -> new ClientSection(s.getId(), entity.getId(), s.getName(), s.getCapacity()))
                        .toList();

        return new Client(
                entity.getId(),
                entity.getName(),
                entity.getClientType(),
                entity.getAddress(),
                entity.getLogoStorageKey(),
                entity.getMoq(),
                domainSections,
                entity.isActive(),
                entity.getVersion(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public void updateEntity(Client domain, ClientJpaEntity entity) {
        entity.setId(domain.id());
        entity.setName(domain.name());
        entity.setClientType(domain.clientType());
        entity.setAddress(domain.address());
        entity.setLogoStorageKey(domain.logoStorageKey());
        entity.setMoq(domain.moq());
        entity.setActive(domain.active());
        entity.setCreatedByUserId(domain.createdByUserId());
        entity.setCreatedAt(domain.createdAt());
        entity.setUpdatedAt(domain.updatedAt());

        Instant now = domain.updatedAt() != null ? domain.updatedAt() : Instant.now();
        Map<UUID, ClientSectionJpaEntity> existingById = entity.getSections().stream()
                .collect(Collectors.toMap(ClientSectionJpaEntity::getId, Function.identity()));

        Set<UUID> retainedIds = domain.sections().stream()
                .map(ClientSection::id)
                .collect(Collectors.toSet());

        entity.getSections().removeIf(s -> !retainedIds.contains(s.getId()));

        for (ClientSection section : domain.sections()) {
            ClientSectionJpaEntity sectionEntity = existingById.get(section.id());
            if (sectionEntity == null) {
                sectionEntity = new ClientSectionJpaEntity();
                sectionEntity.setId(section.id());
                sectionEntity.setClient(entity);
                sectionEntity.setName(section.name());
                sectionEntity.setCapacity(section.capacity());
                sectionEntity.setCreatedAt(now);
                sectionEntity.setUpdatedAt(now);
                entity.getSections().add(sectionEntity);
            } else {
                sectionEntity.setName(section.name());
                sectionEntity.setCapacity(section.capacity());
                sectionEntity.setUpdatedAt(now);
            }
        }
    }
}
