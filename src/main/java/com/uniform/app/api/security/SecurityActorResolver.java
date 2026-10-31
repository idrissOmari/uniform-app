package com.uniform.app.api.security;

import com.uniform.app.domain.exception.InsufficientPrivilegesException;
import com.uniform.app.domain.model.enums.UserRole;
import com.uniform.app.infrastructure.persistence.entity.AppUserJpaEntity;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class SecurityActorResolver {

    private final SecurityIdentity securityIdentity;
    private final EntityManager entityManager;

    public SecurityActorResolver(SecurityIdentity securityIdentity, EntityManager entityManager) {
        this.securityIdentity = securityIdentity;
        this.entityManager = entityManager;
    }

    public boolean isCurrentActorAdmin() {
        return securityIdentity != null
                && (securityIdentity.hasRole("ROLE_ADMIN") || securityIdentity.hasRole("ADMIN"));
    }

    public Optional<UUID> resolveAssignedClientIdForNonAdmin() {
        if (isCurrentActorAdmin() || securityIdentity == null || securityIdentity.isAnonymous()) {
            return Optional.empty();
        }
        String principalName = (securityIdentity.getPrincipal() != null
                && securityIdentity.getPrincipal().getName() != null)
                ? securityIdentity.getPrincipal().getName().trim()
                : "";
        if (principalName.isEmpty()) {
            return Optional.empty();
        }
        UUID actorId = parseOrDeriveUuid(principalName);
        AppUserJpaEntity user = entityManager.find(AppUserJpaEntity.class, actorId);
        if (user == null) {
            var byUsername = entityManager.createQuery(
                            "SELECT u FROM AppUserJpaEntity u WHERE LOWER(u.username) = LOWER(:username)",
                            AppUserJpaEntity.class
                    )
                    .setParameter("username", principalName)
                    .getResultList();
            if (!byUsername.isEmpty()) {
                user = byUsername.getFirst();
            }
        }
        if (user != null && user.getRole() == UserRole.ROLE_USER && user.getAssignedClientId() != null) {
            return Optional.of(user.getAssignedClientId());
        }
        return Optional.empty();
    }

    public void assertClientAccessAllowed(UUID requestedClientId) {
        if (requestedClientId == null || isCurrentActorAdmin()) {
            return;
        }
        Optional<UUID> assignedClientId = resolveAssignedClientIdForNonAdmin();
        if (assignedClientId.isPresent() && !assignedClientId.get().equals(requestedClientId)) {
            throw new InsufficientPrivilegesException(
                    "Accès refusé : cet utilisateur est affecté exclusivement à son établissement attribué."
            );
        }
    }

    @Transactional
    public UUID resolveCurrentActorUserId() {
        String principalName = (securityIdentity != null && !securityIdentity.isAnonymous()
                && securityIdentity.getPrincipal() != null
                && securityIdentity.getPrincipal().getName() != null
                && !securityIdentity.getPrincipal().getName().isBlank())
                ? securityIdentity.getPrincipal().getName().trim()
                : "system-operator";

        UUID actorId = parseOrDeriveUuid(principalName);
        AppUserJpaEntity existing = entityManager.find(AppUserJpaEntity.class, actorId);
        if (existing != null) {
            return existing.getId();
        }

        // Check by username in case the user was seeded with a different UUID
        var byUsername = entityManager.createQuery(
                        "SELECT u FROM AppUserJpaEntity u WHERE u.username = :username",
                        AppUserJpaEntity.class
                )
                .setParameter("username", principalName)
                .getResultList();
        if (!byUsername.isEmpty()) {
            return byUsername.getFirst().getId();
        }

        boolean isAdmin = securityIdentity != null
                && (securityIdentity.hasRole("ROLE_ADMIN") || securityIdentity.hasRole("ADMIN"));

        Instant now = Instant.now();
        AppUserJpaEntity provisioned = new AppUserJpaEntity();
        provisioned.setId(actorId);
        provisioned.setUsername(principalName);
        provisioned.setEmail(principalName.contains("@") ? principalName : principalName + "@uniform-app.local");
        provisioned.setPasswordHash("{noop}jwt-authenticated");
        provisioned.setFullName(principalName);
        provisioned.setRole(isAdmin ? UserRole.ROLE_ADMIN : UserRole.ROLE_USER);
        provisioned.setActive(true);
        provisioned.setCreatedAt(now);
        provisioned.setUpdatedAt(now);
        entityManager.persist(provisioned);
        entityManager.flush();
        return actorId;
    }

    private static UUID parseOrDeriveUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException _) {
            return UUID.nameUUIDFromBytes(("uniform-user:" + value).getBytes(StandardCharsets.UTF_8));
        }
    }
}
