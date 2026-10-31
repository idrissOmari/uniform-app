SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

ALTER TABLE app_users
    ADD COLUMN invitation_status     VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE' AFTER active,
    ADD COLUMN invitation_token      VARCHAR(128) NULL AFTER invitation_status,
    ADD COLUMN invitation_expires_at TIMESTAMP(6) NULL AFTER invitation_token,
    ADD CONSTRAINT uk_app_users_invitation_token UNIQUE (invitation_token),
    ADD CONSTRAINT chk_app_users_invitation_status CHECK (invitation_status IN ('PENDING_INVITATION', 'ACTIVE', 'DISABLED'));
