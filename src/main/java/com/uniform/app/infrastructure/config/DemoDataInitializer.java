package com.uniform.app.infrastructure.config;

import com.uniform.app.domain.model.enums.UserRole;
import com.uniform.app.infrastructure.persistence.entity.AppUserJpaEntity;
import com.uniform.app.infrastructure.security.PasswordHasher;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class DemoDataInitializer {

    private final boolean demoDataEnabled;
    private final EntityManager entityManager;
    private final PasswordHasher passwordHasher;

    public DemoDataInitializer(
            @ConfigProperty(name = "uniform.demo-data.enabled", defaultValue = "true") boolean demoDataEnabled,
            EntityManager entityManager,
            PasswordHasher passwordHasher
    ) {
        this.demoDataEnabled = demoDataEnabled;
        this.entityManager = entityManager;
        this.passwordHasher = passwordHasher;
    }

    @Transactional
    void onStart(@Observes StartupEvent event) {
        if (!demoDataEnabled) {
            return;
        }

        ensureUserWithPassword(
                "admin",
                "admin@uniform-app.local",
                "Administrateur Principal",
                "admin",
                UserRole.ROLE_ADMIN
        );
        ensureUserWithPassword(
                "operateur",
                "sara.elamrani@uniform-school.ma",
                "Sara El Amrani",
                "operateur",
                UserRole.ROLE_USER
        );
    }

    private UUID ensureUserWithPassword(
            String username,
            String email,
            String fullName,
            String rawPassword,
            UserRole role
    ) {
        var existingByUsername = entityManager.createQuery(
                        "SELECT u FROM AppUserJpaEntity u WHERE LOWER(u.username) = LOWER(:username)",
                        AppUserJpaEntity.class
                )
                .setParameter("username", username)
                .getResultList();

        if (!existingByUsername.isEmpty()) {
            AppUserJpaEntity existing = existingByUsername.getFirst();
            if (!passwordHasher.matches(rawPassword, existing.getPasswordHash())) {
                existing.setPasswordHash(passwordHasher.hash(rawPassword));
            }
            existing.setFullName(fullName);
            existing.setRole(role);
            existing.setActive(true);
            existing.setInvitationStatus("ACTIVE");
            existing.setUpdatedAt(Instant.now());
            return existing.getId();
        }

        UUID id = UUID.nameUUIDFromBytes(("uniform-user:" + username).getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        AppUserJpaEntity user = new AppUserJpaEntity();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordHasher.hash(rawPassword));
        user.setFullName(fullName);
        user.setRole(role);
        user.setActive(true);
        user.setInvitationStatus("ACTIVE");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        entityManager.persist(user);
        entityManager.flush();
        return id;
    }
}
