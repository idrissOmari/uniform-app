package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class AppUserJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "username", length = 64, nullable = false, unique = true)
    private String username;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20, nullable = false)
    private UserRole role;

    @Column(name = "assigned_client_id", columnDefinition = "BINARY(16)")
    private UUID assignedClientId;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "invitation_status", length = 32, nullable = false)
    private String invitationStatus = "ACTIVE";

    @Column(name = "invitation_token", length = 128, unique = true)
    private String invitationToken;

    @Column(name = "invitation_expires_at")
    private Instant invitationExpiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AppUserJpaEntity() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public UUID getAssignedClientId() {
        return assignedClientId;
    }

    public void setAssignedClientId(UUID assignedClientId) {
        this.assignedClientId = assignedClientId;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getInvitationStatus() {
        return invitationStatus;
    }

    public void setInvitationStatus(String invitationStatus) {
        this.invitationStatus = invitationStatus;
    }

    public String getInvitationToken() {
        return invitationToken;
    }

    public void setInvitationToken(String invitationToken) {
        this.invitationToken = invitationToken;
    }

    public Instant getInvitationExpiresAt() {
        return invitationExpiresAt;
    }

    public void setInvitationExpiresAt(Instant invitationExpiresAt) {
        this.invitationExpiresAt = invitationExpiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
