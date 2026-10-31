package com.uniform.app.infrastructure.persistence.adapter;

import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.port.out.ClientRepositoryPort;
import com.uniform.app.infrastructure.persistence.entity.ClientJpaEntity;
import com.uniform.app.infrastructure.persistence.mapper.ClientPersistenceMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ClientPanacheRepositoryAdapter implements ClientRepositoryPort {

    private final EntityManager entityManager;
    private final ClientPersistenceMapper mapper;

    public ClientPanacheRepositoryAdapter(EntityManager entityManager, ClientPersistenceMapper mapper) {
        this.entityManager = entityManager;
        this.mapper = mapper;
    }

    @Override
    public Client save(Client client) {
        ClientJpaEntity entity = entityManager.find(ClientJpaEntity.class, client.id());
        if (entity == null) {
            entity = new ClientJpaEntity();
            mapper.updateEntity(client, entity);
            entityManager.persist(entity);
        } else {
            mapper.updateEntity(client, entity);
        }
        entityManager.flush();
        return mapper.toDomain(entity);
    }

    @Override
    public Optional<Client> findById(UUID clientId) {
        ClientJpaEntity entity = entityManager.find(ClientJpaEntity.class, clientId);
        return Optional.ofNullable(entity).map(mapper::toDomain);
    }

    @Override
    public List<Client> findAll() {
        return entityManager.createQuery(
                        "SELECT c FROM ClientJpaEntity c WHERE c.active = true ORDER BY c.createdAt DESC",
                        ClientJpaEntity.class
                )
                .getResultList()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }
}
