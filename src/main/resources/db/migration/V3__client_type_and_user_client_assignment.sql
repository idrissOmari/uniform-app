SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

ALTER TABLE clients
    ADD COLUMN client_type VARCHAR(32) NOT NULL DEFAULT 'SECONDARY_SCHOOL' AFTER name,
    ADD CONSTRAINT chk_clients_type CHECK (client_type IN ('PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'ORGANIZATION'));

ALTER TABLE app_users
    ADD COLUMN assigned_client_id BINARY(16) NULL AFTER role,
    ADD CONSTRAINT fk_app_users_assigned_client FOREIGN KEY (assigned_client_id) REFERENCES clients (id) ON DELETE SET NULL;
