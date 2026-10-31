package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.client.Client;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepositoryPort {

    Client save(Client client);

    Optional<Client> findById(UUID clientId);

    List<Client> findAll();
}
