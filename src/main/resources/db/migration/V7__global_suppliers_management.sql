SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

CREATE TABLE suppliers (
    id BINARY(16) NOT NULL,
    name VARCHAR(180) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    contact_name VARCHAR(180) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(255) NOT NULL,
    city_address VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_suppliers PRIMARY KEY (id),
    CONSTRAINT uk_suppliers_name UNIQUE (name)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

ALTER TABLE catalog_items
    ADD COLUMN supplier_id BINARY(16) NULL AFTER color_reference;

CREATE INDEX idx_catalog_items_supplier_id
    ON catalog_items (supplier_id);
