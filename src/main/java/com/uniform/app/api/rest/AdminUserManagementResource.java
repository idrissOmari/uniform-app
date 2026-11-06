package com.uniform.app.api.rest;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.enums.UserRole;
import com.uniform.app.infrastructure.notification.EmailInvitationNotificationService;
import com.uniform.app.infrastructure.persistence.entity.AppUserJpaEntity;
import com.uniform.app.infrastructure.persistence.entity.ClientJpaEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/admin/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "ROLE_ADMIN"})
public class AdminUserManagementResource {

    private static final Duration INVITATION_VALIDITY = Duration.ofDays(7);

    private final EntityManager entityManager;
    private final EmailInvitationNotificationService emailInvitationService;

    public AdminUserManagementResource(
            EntityManager entityManager,
            EmailInvitationNotificationService emailInvitationService
    ) {
        this.entityManager = entityManager;
        this.emailInvitationService = emailInvitationService;
    }

    public record InviteUserRequest(
            @NotBlank String username,
            @NotBlank @Email String email,
            @NotBlank String fullName,
            @NotNull UserRole role,
            UUID assignedClientId
    ) {
    }

    public record UpdateUserStatusRequest(
            boolean active
    ) {
    }

    public record UpdateAssignedClientRequest(
            UUID assignedClientId
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank String fullName,
            @NotNull UserRole role,
            UUID assignedClientId
    ) {
    }

    public record UserAccountResponse(
            UUID id,
            String username,
            String email,
            String fullName,
            UserRole role,
            UUID assignedClientId,
            String assignedClientName,
            boolean active,
            String invitationStatus,
            String invitationUrl,
            String emailArchivePath,
            Instant invitationExpiresAt,
            Instant createdAt
    ) {
    }

    @GET
    public List<UserAccountResponse> listUsers() {
        return entityManager.createQuery(
                        "SELECT u FROM AppUserJpaEntity u ORDER BY u.createdAt DESC",
                        AppUserJpaEntity.class
                )
                .getResultList()
                .stream()
                .map(u -> toResponse(u, null))
                .toList();
    }

    @POST
    @Path("/invite")
    @Transactional
    public Response inviteUser(@Valid InviteUserRequest request) {
        String normalizedUsername = request.username().trim();
        String normalizedEmail = request.email().trim().toLowerCase();

        long existingUsernameCount = entityManager.createQuery(
                        "SELECT COUNT(u) FROM AppUserJpaEntity u WHERE LOWER(u.username) = LOWER(:username)",
                        Long.class
                )
                .setParameter("username", normalizedUsername)
                .getSingleResult();
        if (existingUsernameCount > 0) {
            throw new DomainValidationException(
                    "L'identifiant '" + normalizedUsername + "' est déjà attribué à un utilisateur."
            );
        }

        long existingEmailCount = entityManager.createQuery(
                        "SELECT COUNT(u) FROM AppUserJpaEntity u WHERE LOWER(u.email) = LOWER(:email)",
                        Long.class
                )
                .setParameter("email", normalizedEmail)
                .getSingleResult();
        if (existingEmailCount > 0) {
            throw new DomainValidationException(
                    "L'adresse email '" + normalizedEmail + "' est déjà associée à un compte utilisateur."
            );
        }

        Instant now = Instant.now();
        String invitationToken = generateInvitationToken();

        UUID resolvedAssignedClientId = null;
        if (request.role() == UserRole.ROLE_USER) {
            if (request.assignedClientId() == null) {
                throw new DomainValidationException(
                        "Chaque opérateur comptoir (ROLE_USER) doit être affecté à un seul client (école / organisme)."
                );
            }
            ClientJpaEntity assignedClient = entityManager.find(ClientJpaEntity.class, request.assignedClientId());
            if (assignedClient == null) {
                throw new ResourceNotFoundException("Client introuvable : " + request.assignedClientId());
            }
            resolvedAssignedClientId = assignedClient.getId();
        } else if (request.assignedClientId() != null) {
            ClientJpaEntity assignedClient = entityManager.find(ClientJpaEntity.class, request.assignedClientId());
            if (assignedClient != null) {
                resolvedAssignedClientId = assignedClient.getId();
            }
        }

        AppUserJpaEntity user = new AppUserJpaEntity();
        user.setId(UUID.randomUUID());
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setAssignedClientId(resolvedAssignedClientId);
        user.setPasswordHash("{pending-invitation}");
        user.setActive(false);
        user.setInvitationStatus("PENDING_INVITATION");
        user.setInvitationToken(invitationToken);
        user.setInvitationExpiresAt(now.plus(INVITATION_VALIDITY));
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        entityManager.persist(user);
        entityManager.flush();

        String archivePath = emailInvitationService.sendUserInvitationEmail(user);
        return Response.status(Response.Status.CREATED)
                .entity(toResponse(user, archivePath))
                .build();
    }

    @POST
    @Path("/{userId}/resend-invitation")
    @Transactional
    public UserAccountResponse resendInvitation(@PathParam("userId") UUID userId) {
        AppUserJpaEntity user = entityManager.find(AppUserJpaEntity.class, userId);
        if (user == null) {
            throw new ResourceNotFoundException("Utilisateur introuvable : " + userId);
        }
        if ("ACTIVE".equals(user.getInvitationStatus()) && user.isActive()) {
            throw new DomainValidationException("Ce compte utilisateur a déjà été activé.");
        }

        Instant now = Instant.now();
        user.setInvitationToken(generateInvitationToken());
        user.setInvitationExpiresAt(now.plus(INVITATION_VALIDITY));
        user.setInvitationStatus("PENDING_INVITATION");
        user.setActive(false);
        user.setUpdatedAt(now);
        entityManager.flush();

        String archivePath = emailInvitationService.sendUserInvitationEmail(user);
        return toResponse(user, archivePath);
    }

    @PATCH
    @Path("/{userId}/status")
    @Transactional
    public UserAccountResponse updateUserStatus(
            @PathParam("userId") UUID userId,
            @Valid UpdateUserStatusRequest request
    ) {
        AppUserJpaEntity user = entityManager.find(AppUserJpaEntity.class, userId);
        if (user == null) {
            throw new ResourceNotFoundException("Utilisateur introuvable : " + userId);
        }
        if ("PENDING_INVITATION".equals(user.getInvitationStatus())) {
            throw new DomainValidationException(
                    "Ce compte est en attente d'invitation par email. Il sera activé lorsque l'utilisateur définira son mot de passe."
            );
        }

        user.setActive(request.active());
        user.setInvitationStatus(request.active() ? "ACTIVE" : "DISABLED");
        user.setUpdatedAt(Instant.now());
        entityManager.flush();
        return toResponse(user, null);
    }

    @PATCH
    @Path("/{userId}/assigned-client")
    @Transactional
    public UserAccountResponse updateAssignedClient(
            @PathParam("userId") UUID userId,
            @Valid UpdateAssignedClientRequest request
    ) {
        AppUserJpaEntity user = entityManager.find(AppUserJpaEntity.class, userId);
        if (user == null) {
            throw new ResourceNotFoundException("Utilisateur introuvable : " + userId);
        }
        if (user.getRole() == UserRole.ROLE_USER && request.assignedClientId() == null) {
            throw new DomainValidationException(
                    "Chaque opérateur comptoir (ROLE_USER) doit être affecté à un seul client (école / organisme)."
            );
        }
        if (request.assignedClientId() != null) {
            ClientJpaEntity assignedClient = entityManager.find(ClientJpaEntity.class, request.assignedClientId());
            if (assignedClient == null) {
                throw new ResourceNotFoundException("Client introuvable : " + request.assignedClientId());
            }
            user.setAssignedClientId(assignedClient.getId());
        } else {
            user.setAssignedClientId(null);
        }
        user.setUpdatedAt(Instant.now());
        entityManager.flush();
        return toResponse(user, null);
    }

    @PUT
    @Path("/{userId}")
    @Transactional
    public UserAccountResponse updateUser(
            @PathParam("userId") UUID userId,
            @Valid UpdateUserRequest request
    ) {
        AppUserJpaEntity user = entityManager.find(AppUserJpaEntity.class, userId);
        if (user == null) {
            throw new ResourceNotFoundException("Utilisateur introuvable : " + userId);
        }

        UUID resolvedAssignedClientId = null;
        if (request.role() == UserRole.ROLE_USER) {
            if (request.assignedClientId() == null) {
                throw new DomainValidationException(
                        "Chaque opérateur comptoir doit être affecté à un établissement."
                );
            }
            ClientJpaEntity assignedClient = entityManager.find(ClientJpaEntity.class, request.assignedClientId());
            if (assignedClient == null) {
                throw new ResourceNotFoundException("Établissement introuvable : " + request.assignedClientId());
            }
            resolvedAssignedClientId = assignedClient.getId();
        } else if (request.assignedClientId() != null) {
            ClientJpaEntity assignedClient = entityManager.find(ClientJpaEntity.class, request.assignedClientId());
            if (assignedClient != null) {
                resolvedAssignedClientId = assignedClient.getId();
            }
        }

        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setAssignedClientId(resolvedAssignedClientId);
        user.setUpdatedAt(Instant.now());
        entityManager.flush();
        return toResponse(user, null);
    }

    @DELETE
    @Path("/{userId}")
    @Transactional
    public Response deleteUser(@PathParam("userId") UUID userId) {
        AppUserJpaEntity user = entityManager.find(AppUserJpaEntity.class, userId);
        if (user == null) {
            throw new ResourceNotFoundException("Utilisateur introuvable : " + userId);
        }
        entityManager.remove(user);
        entityManager.flush();
        return Response.noContent().build();
    }

    private UserAccountResponse toResponse(AppUserJpaEntity user, String emailArchivePath) {
        String invitationUrl = (user.getInvitationToken() != null && !user.getInvitationToken().isBlank())
                ? emailInvitationService.buildInvitationUrl(user.getInvitationToken())
                : null;
        String assignedClientName = null;
        if (user.getAssignedClientId() != null) {
            ClientJpaEntity client = entityManager.find(ClientJpaEntity.class, user.getAssignedClientId());
            if (client != null) {
                assignedClientName = client.getName();
            }
        }
        return new UserAccountResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getAssignedClientId(),
                assignedClientName,
                user.isActive(),
                user.getInvitationStatus(),
                invitationUrl,
                emailArchivePath,
                user.getInvitationExpiresAt(),
                user.getCreatedAt()
        );
    }

    private static String generateInvitationToken() {
        return UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
    }
}
