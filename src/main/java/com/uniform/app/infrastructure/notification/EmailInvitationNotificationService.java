package com.uniform.app.infrastructure.notification;

import com.uniform.app.infrastructure.persistence.entity.AppUserJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EmailInvitationNotificationService {

    private static final Logger LOG = Logger.getLogger(EmailInvitationNotificationService.class);
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private final Path emailOutboxDir;
    private final String frontendBaseUrl;

    public EmailInvitationNotificationService(
            @ConfigProperty(name = "uniform.storage.root-dir", defaultValue = "target/storage") String rootDir,
            @ConfigProperty(name = "uniform.frontend.base-url", defaultValue = "http://localhost:4200") String frontendBaseUrl
    ) {
        this.emailOutboxDir = Path.of(rootDir).toAbsolutePath().normalize().resolve("emails");
        this.frontendBaseUrl = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
    }

    public String buildInvitationUrl(String invitationToken) {
        return frontendBaseUrl + "/accept-invitation?token=" + invitationToken;
    }

    public String sendUserInvitationEmail(AppUserJpaEntity user) {
        String invitationUrl = buildInvitationUrl(user.getInvitationToken());
        String roleLabel = "ROLE_ADMIN".equals(user.getRole().name())
                ? "Administrateur (Super-Utilisateur)"
                : "Opérateur Comptoir B2C";
        String expiresAtFormatted = user.getInvitationExpiresAt() != null
                ? DATE_FORMATTER.format(user.getInvitationExpiresAt())
                : "7 jours";

        String htmlContent = """
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8" />
                  <title>Invitation à rejoindre BidLab</title>
                </head>
                <body style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 24px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h2 style="margin-top: 0; color: #1e293b;">Bienvenue sur BidLab</h2>
                  <p>Bonjour <strong>%s</strong>,</p>
                  <p>Un administrateur vous a invité(e) à rejoindre la plateforme <strong>BidLab</strong>.</p>
                  <ul style="background: #f8fafc; padding: 16px 32px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <li><strong>Identifiant :</strong> %s</li>
                    <li><strong>Email :</strong> %s</li>
                    <li><strong>Rôle attribué :</strong> %s</li>
                    <li><strong>Expiration du lien :</strong> %s</li>
                  </ul>
                  <p>Pour activer votre compte et définir votre mot de passe personnel, cliquez sur le bouton ci-dessous :</p>
                  <p style="margin: 24px 0;">
                    <a href="%s" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
                      Activer mon compte et définir mon mot de passe
                    </a>
                  </p>
                  <p style="font-size: 12px; color: #64748b;">Lien direct : <a href="%s">%s</a></p>
                </body>
                </html>
                """.formatted(
                user.getFullName(),
                user.getUsername(),
                user.getEmail(),
                roleLabel,
                expiresAtFormatted,
                invitationUrl,
                invitationUrl,
                invitationUrl
        );

        try {
            Files.createDirectories(emailOutboxDir);
            String safeFileName = user.getUsername().replaceAll("[^a-zA-Z0-9._-]", "_") + "-invitation.html";
            Path emailFile = emailOutboxDir.resolve(safeFileName);
            Files.writeString(emailFile, htmlContent, StandardCharsets.UTF_8);
            LOG.infof(
                    "[EMAIL INVITATION ENVOYÉ] Destinataire: %s (%s) | Rôle: %s | Lien d'activation: %s | Archive: %s",
                    user.getFullName(),
                    user.getEmail(),
                    user.getRole(),
                    invitationUrl,
                    emailFile
            );
            return emailFile.toString();
        } catch (IOException e) {
            LOG.warnf(e, "Impossible d'archiver l'email d'invitation sur disque pour %s", user.getEmail());
            return "logs/backend.log";
        }
    }
}
