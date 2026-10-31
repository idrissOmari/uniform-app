-- =============================================================================
-- V4__client_sections.sql
-- Découpage d'un Client en Sections avec capacité par section
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_sections (
    id          BINARY(16)   NOT NULL,
    client_id   BINARY(16)   NOT NULL,
    name        VARCHAR(120) NOT NULL,
    capacity    INT          NOT NULL,
    created_at  TIMESTAMP(6) NOT NULL,
    updated_at  TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_client_sections PRIMARY KEY (id),
    CONSTRAINT fk_client_sections_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    CONSTRAINT uk_client_sections_client_name UNIQUE (client_id, name),
    CONSTRAINT chk_client_sections_capacity CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_client_sections_client_id ON client_sections (client_id);
