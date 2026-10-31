package com.uniform.app.api.rest;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.InsufficientPrivilegesException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.enums.UserRole;
import com.uniform.app.infrastructure.persistence.entity.AppUserJpaEntity;
import com.uniform.app.infrastructure.security.PasswordHasher;
import io.quarkus.security.UnauthorizedException;
import io.smallrye.jwt.build.Jwt;
import jakarta.annotation.security.PermitAll;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Path("/api/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthTokenResource {

    private final EntityManager entityManager;
    private final PasswordHasher passwordHasher;

    public AuthTokenResource(EntityManager entityManager, PasswordHasher passwordHasher) {
        this.entityManager = entityManager;
        this.passwordHasher = passwordHasher;
    }

    public record TokenRequest(
            @NotBlank String username,
            @NotNull UserRole role
    ) {
    }

    public record TokenResponse(
            String accessToken,
            String username,
            UserRole role
    ) {
    }

    public record LoginRequest(
            @NotBlank String identifier,
            @NotBlank String password
    ) {
    }

    public record AuthSessionResponse(
            String accessToken,
            UUID userId,
            String username,
            String email,
            String fullName,
            UserRole role,
            UUID assignedClientId
    ) {
    }

    public record InvitationDetailsResponse(
            String username,
            String email,
            String fullName,
            UserRole role,
            UUID assignedClientId,
            Instant expiresAt
    ) {
    }

    public record AcceptInvitationRequest(
            @NotBlank @Size(min = 4, max = 128) String password
    ) {
    }

    @POST
    @Path("/login")
    @PermitAll
    @Transactional
    public AuthSessionResponse login(@Valid LoginRequest request) {
        String normalizedIdentifier = request.identifier().trim();
        var matches = entityManager.createQuery(
                        """
                        SELECT u FROM AppUserJpaEntity u
                        WHERE LOWER(u.username) = LOWER(:identifier)
                           OR LOWER(u.email) = LOWER(:identifier)
                        """,
                        AppUserJpaEntity.class
                )
                .setParameter("identifier", normalizedIdentifier)
                .getResultList();

        if (matches.isEmpty()) {
            throw new UnauthorizedException("Identifiant ou mot de passe incorrect.");
        }

        AppUserJpaEntity user = matches.getFirst();
        if ("PENDING_INVITATION".equals(user.getInvitationStatus())) {
            throw new DomainValidationException(
                    "Ce compte est en attente d'activation. Veuillez cliquer sur le lien d'invitation reçu par email."
            );
        }

        if (!passwordHasher.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Identifiant ou mot de passe incorrect.");
        }

        if (!user.isActive() || "DISABLED".equals(user.getInvitationStatus())) {
            throw new InsufficientPrivilegesException(
                    "Ce compte utilisateur a été désactivé par un administrateur."
            );
        }

        return buildSessionResponse(user);
    }

    @GET
    @Path("/invitations/{token}")
    @PermitAll
    public InvitationDetailsResponse getInvitationByToken(@PathParam("token") String token) {
        AppUserJpaEntity user = findValidPendingInvitation(token);
        return new InvitationDetailsResponse(
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getAssignedClientId(),
                user.getInvitationExpiresAt()
        );
    }

    @POST
    @Path("/invitations/{token}/accept")
    @PermitAll
    @Transactional
    public AuthSessionResponse acceptInvitation(
            @PathParam("token") String token,
            @Valid AcceptInvitationRequest request
    ) {
        AppUserJpaEntity user = findValidPendingInvitation(token);
        user.setPasswordHash(passwordHasher.hash(request.password()));
        user.setActive(true);
        user.setInvitationStatus("ACTIVE");
        user.setInvitationToken(null);
        user.setInvitationExpiresAt(null);
        user.setUpdatedAt(Instant.now());
        entityManager.flush();

        return buildSessionResponse(user);
    }

    @POST
    @Path("/token")
    @PermitAll
    public TokenResponse issueToken(@Valid TokenRequest request) {
        String shortRole = request.role() == UserRole.ROLE_ADMIN ? "ADMIN" : "USER";
        String token = Jwt.issuer("https://uniform-app.local/issuer")
                .upn(request.username())
                .subject(request.username())
                .groups(Set.of(request.role().name(), shortRole))
                .expiresIn(Duration.ofHours(8))
                .sign();
        return new TokenResponse(token, request.username(), request.role());
    }

    private AppUserJpaEntity findValidPendingInvitation(String token) {
        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Jeton d'invitation manquant.");
        }
        var matches = entityManager.createQuery(
                        "SELECT u FROM AppUserJpaEntity u WHERE u.invitationToken = :token",
                        AppUserJpaEntity.class
                )
                .setParameter("token", token.trim())
                .getResultList();

        if (matches.isEmpty() || !"PENDING_INVITATION".equals(matches.getFirst().getInvitationStatus())) {
            throw new ResourceNotFoundException("Ce lien d'invitation est invalide ou a déjà été utilisé.");
        }

        AppUserJpaEntity user = matches.getFirst();
        if (user.getInvitationExpiresAt() != null && user.getInvitationExpiresAt().isBefore(Instant.now())) {
            throw new DomainValidationException(
                    "Ce lien d'invitation a expiré. Demandez à un administrateur de vous renvoyer une invitation."
            );
        }
        return user;
    }

    private static AuthSessionResponse buildSessionResponse(AppUserJpaEntity user) {
        String shortRole = user.getRole() == UserRole.ROLE_ADMIN ? "ADMIN" : "USER";
        String token = Jwt.issuer("https://uniform-app.local/issuer")
                .upn(user.getUsername())
                .subject(user.getId().toString())
                .groups(Set.of(user.getRole().name(), shortRole))
                .expiresIn(Duration.ofHours(8))
                .sign();
        return new AuthSessionResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getAssignedClientId()
        );
    }
}
