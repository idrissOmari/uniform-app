SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

CREATE TABLE app_users (
    id              BINARY(16)      NOT NULL,
    username        VARCHAR(64)     NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(150)    NOT NULL,
    role            VARCHAR(20)     NOT NULL,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_app_users PRIMARY KEY (id),
    CONSTRAINT uk_app_users_username UNIQUE (username),
    CONSTRAINT uk_app_users_email UNIQUE (email),
    CONSTRAINT chk_app_users_role CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE clients (
    id                 BINARY(16)      NOT NULL,
    name               VARCHAR(150)    NOT NULL,
    address            TEXT            NOT NULL,
    logo_storage_key   VARCHAR(512)    NULL,
    moq                INT             NOT NULL,
    active             BOOLEAN         NOT NULL DEFAULT TRUE,
    version            BIGINT          NOT NULL DEFAULT 0,
    created_by_user_id BINARY(16)      NOT NULL,
    created_at         TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_clients PRIMARY KEY (id),
    CONSTRAINT uk_clients_name UNIQUE (name),
    CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_users (id),
    CONSTRAINT chk_clients_moq_positive CHECK (moq >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE catalog_items (
    id                       BINARY(16)      NOT NULL,
    client_id                BINARY(16)      NOT NULL,
    reference_code           VARCHAR(64)     NOT NULL,
    name                     VARCHAR(150)    NOT NULL,
    garment_style            VARCHAR(150)    NOT NULL,
    color_reference          VARCHAR(100)    NOT NULL,
    front_visual_storage_key VARCHAR(512)    NOT NULL,
    back_visual_storage_key  VARCHAR(512)    NULL,
    visual_placement_notes   TEXT            NULL,
    b2c_unit_price           DECIMAL(12, 2)  NOT NULL,
    b2b_unit_cost            DECIMAL(12, 2)  NOT NULL,
    active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    version                  BIGINT          NOT NULL DEFAULT 0,
    created_by_user_id       BINARY(16)      NOT NULL,
    created_at               TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at               TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_catalog_items PRIMARY KEY (id),
    CONSTRAINT uk_catalog_items_id_client UNIQUE (id, client_id),
    CONSTRAINT uk_catalog_items_client_ref UNIQUE (client_id, reference_code),
    CONSTRAINT fk_catalog_items_client FOREIGN KEY (client_id) REFERENCES clients (id),
    CONSTRAINT fk_catalog_items_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_users (id),
    CONSTRAINT chk_catalog_items_prices CHECK (b2c_unit_price >= 0.00 AND b2b_unit_cost >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_catalog_items_client_id ON catalog_items (client_id);

CREATE TABLE client_stocks (
    id                  BINARY(16)      NOT NULL,
    client_id           BINARY(16)      NOT NULL,
    catalog_item_id     BINARY(16)      NOT NULL,
    gender              VARCHAR(16)     NOT NULL,
    size                VARCHAR(16)     NOT NULL,
    available_quantity  INT             NOT NULL DEFAULT 0,
    version             BIGINT          NOT NULL DEFAULT 0,
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_client_stocks PRIMARY KEY (id),
    CONSTRAINT uk_client_stocks_variant UNIQUE (client_id, catalog_item_id, gender, size),
    CONSTRAINT fk_client_stocks_item_client FOREIGN KEY (catalog_item_id, client_id)
        REFERENCES catalog_items (id, client_id),
    CONSTRAINT chk_client_stocks_qty_non_negative CHECK (available_quantity >= 0),
    CONSTRAINT chk_client_stocks_gender_size CHECK (
        (gender IN ('MEN', 'WOMEN', 'UNISEX') AND size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'))
        OR
        (gender = 'KIDS' AND size IN ('AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14'))
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_client_stocks_client_id ON client_stocks (client_id);

CREATE TABLE b2c_orders (
    id                  BINARY(16)      NOT NULL,
    client_id           BINARY(16)      NOT NULL,
    order_number        VARCHAR(50)     NOT NULL,
    status              VARCHAR(24)     NOT NULL DEFAULT 'IN_PROGRESS',
    client_moq_snapshot INT             NOT NULL,
    total_quantity      INT             NOT NULL DEFAULT 0,
    total_cash_amount   DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    version             BIGINT          NOT NULL DEFAULT 0,
    created_by_user_id  BINARY(16)      NOT NULL,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_b2c_orders PRIMARY KEY (id),
    CONSTRAINT uk_b2c_orders_id_client UNIQUE (id, client_id),
    CONSTRAINT uk_b2c_orders_number UNIQUE (order_number),
    CONSTRAINT fk_b2c_orders_client FOREIGN KEY (client_id) REFERENCES clients (id),
    CONSTRAINT fk_b2c_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_users (id),
    CONSTRAINT chk_b2c_orders_status CHECK (status IN ('IN_PROGRESS', 'IN_PRODUCTION', 'IN_DELIVERY', 'DELIVERED')),
    CONSTRAINT chk_b2c_orders_moq_snapshot CHECK (client_moq_snapshot >= 1),
    CONSTRAINT chk_b2c_orders_totals CHECK (total_quantity >= 0 AND total_cash_amount >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_b2c_orders_client_status ON b2c_orders (client_id, status);

CREATE TABLE b2c_order_lines (
    id                              BINARY(16)      NOT NULL,
    client_id                       BINARY(16)      NOT NULL,
    b2c_order_id                    BINARY(16)      NOT NULL,
    catalog_item_id                 BINARY(16)      NOT NULL,
    receipt_number                  VARCHAR(64)     NOT NULL,
    buyer_full_name                 VARCHAR(150)    NOT NULL,
    buyer_phone                     VARCHAR(40)     NOT NULL,
    buyer_email                     VARCHAR(255)    NOT NULL,
    gender                          VARCHAR(16)     NOT NULL,
    size                            VARCHAR(16)     NOT NULL,
    quantity                        INT             NOT NULL,
    b2c_unit_price                  DECIMAL(12, 2)  NOT NULL,
    line_cash_amount                DECIMAL(12, 2)  NOT NULL,
    cash_payment_confirmed          BOOLEAN         NOT NULL,
    irreversibility_acknowledged    BOOLEAN         NOT NULL,
    line_status                     VARCHAR(24)     NOT NULL DEFAULT 'PENDING_PICKUP',
    receipt_pdf_storage_key         VARCHAR(512)    NOT NULL,
    created_by_user_id              BINARY(16)      NOT NULL,
    created_at                      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    delivered_by_user_id            BINARY(16)      NULL,
    delivered_at                    TIMESTAMP(6)    NULL,

    CONSTRAINT pk_b2c_order_lines PRIMARY KEY (id),
    CONSTRAINT uk_b2c_order_lines_receipt UNIQUE (receipt_number),
    CONSTRAINT fk_b2c_lines_order_client FOREIGN KEY (b2c_order_id, client_id)
        REFERENCES b2c_orders (id, client_id),
    CONSTRAINT fk_b2c_lines_item_client FOREIGN KEY (catalog_item_id, client_id)
        REFERENCES catalog_items (id, client_id),
    CONSTRAINT fk_b2c_lines_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_users (id),
    CONSTRAINT fk_b2c_lines_delivered_by FOREIGN KEY (delivered_by_user_id) REFERENCES app_users (id),
    CONSTRAINT chk_b2c_lines_qty_positive CHECK (quantity >= 1),
    CONSTRAINT chk_b2c_lines_amounts CHECK (
        b2c_unit_price >= 0.00
        AND line_cash_amount = ROUND(quantity * b2c_unit_price, 2)
    ),
    CONSTRAINT chk_b2c_lines_cash_confirmed CHECK (
        cash_payment_confirmed = TRUE AND irreversibility_acknowledged = TRUE
    ),
    CONSTRAINT chk_b2c_lines_status CHECK (line_status IN ('PENDING_PICKUP', 'DELIVERED')),
    CONSTRAINT chk_b2c_lines_delivery_audit CHECK (
        (line_status = 'PENDING_PICKUP' AND delivered_by_user_id IS NULL AND delivered_at IS NULL)
        OR
        (line_status = 'DELIVERED' AND delivered_by_user_id IS NOT NULL AND delivered_at IS NOT NULL)
    ),
    CONSTRAINT chk_b2c_lines_gender_size CHECK (
        (gender IN ('MEN', 'WOMEN', 'UNISEX') AND size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'))
        OR
        (gender = 'KIDS' AND size IN ('AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14'))
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_b2c_lines_order_status ON b2c_order_lines (b2c_order_id, line_status);
CREATE INDEX idx_b2c_lines_client_id ON b2c_order_lines (client_id);

CREATE TABLE b2b_purchase_orders (
    id                      BINARY(16)      NOT NULL,
    client_id               BINARY(16)      NOT NULL,
    b2c_order_id            BINARY(16)      NOT NULL,
    po_number               VARCHAR(50)     NOT NULL,
    status                  VARCHAR(24)     NOT NULL DEFAULT 'DRAFT',
    total_b2b_cost          DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    po_pdf_storage_key      VARCHAR(512)    NULL,
    version                 BIGINT          NOT NULL DEFAULT 0,
    created_by_user_id      BINARY(16)      NOT NULL,
    ordered_by_user_id      BINARY(16)      NULL,
    ordered_at              TIMESTAMP(6)    NULL,
    received_by_user_id     BINARY(16)      NULL,
    received_at             TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_b2b_purchase_orders PRIMARY KEY (id),
    CONSTRAINT uk_b2b_po_id_client UNIQUE (id, client_id),
    CONSTRAINT uk_b2b_po_b2c_order UNIQUE (b2c_order_id),
    CONSTRAINT uk_b2b_po_number UNIQUE (po_number),
    CONSTRAINT fk_b2b_po_b2c_order_client FOREIGN KEY (b2c_order_id, client_id)
        REFERENCES b2c_orders (id, client_id),
    CONSTRAINT fk_b2b_po_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_users (id),
    CONSTRAINT fk_b2b_po_ordered_by FOREIGN KEY (ordered_by_user_id) REFERENCES app_users (id),
    CONSTRAINT fk_b2b_po_received_by FOREIGN KEY (received_by_user_id) REFERENCES app_users (id),
    CONSTRAINT chk_b2b_po_status CHECK (status IN ('DRAFT', 'ORDERED', 'RECEIVED')),
    CONSTRAINT chk_b2b_po_cost_non_negative CHECK (total_b2b_cost >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_b2b_po_client_status ON b2b_purchase_orders (client_id, status);

CREATE TABLE b2b_purchase_order_lines (
    id                              BINARY(16)      NOT NULL,
    client_id                       BINARY(16)      NOT NULL,
    b2b_purchase_order_id           BINARY(16)      NOT NULL,
    catalog_item_id                 BINARY(16)      NOT NULL,
    gender                          VARCHAR(16)     NOT NULL,
    size                            VARCHAR(16)     NOT NULL,
    b2c_demanded_quantity           INT             NOT NULL,
    final_quantity                  INT             NOT NULL,
    b2b_unit_cost                   DECIMAL(12, 2)  NOT NULL,
    line_total_cost                 DECIMAL(12, 2)  NOT NULL,
    garment_style_snapshot          VARCHAR(150)    NOT NULL,
    color_reference_snapshot        VARCHAR(100)    NOT NULL,
    front_visual_storage_snapshot   VARCHAR(512)    NOT NULL,
    back_visual_storage_snapshot    VARCHAR(512)    NULL,

    CONSTRAINT pk_b2b_purchase_order_lines PRIMARY KEY (id),
    CONSTRAINT uk_b2b_po_lines_variant UNIQUE (b2b_purchase_order_id, catalog_item_id, gender, size),
    CONSTRAINT fk_b2b_lines_po_client FOREIGN KEY (b2b_purchase_order_id, client_id)
        REFERENCES b2b_purchase_orders (id, client_id),
    CONSTRAINT fk_b2b_lines_item_client FOREIGN KEY (catalog_item_id, client_id)
        REFERENCES catalog_items (id, client_id),
    CONSTRAINT chk_b2b_lines_quantities CHECK (b2c_demanded_quantity >= 0 AND final_quantity >= 0),
    CONSTRAINT chk_b2b_lines_costs CHECK (
        b2b_unit_cost >= 0.00
        AND line_total_cost = ROUND(final_quantity * b2b_unit_cost, 2)
    ),
    CONSTRAINT chk_b2b_lines_gender_size CHECK (
        (gender IN ('MEN', 'WOMEN', 'UNISEX') AND size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'))
        OR
        (gender = 'KIDS' AND size IN ('AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14'))
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_b2b_lines_client_id ON b2b_purchase_order_lines (client_id);

CREATE TABLE order_status_audit_logs (
    id                  BINARY(16)      NOT NULL,
    client_id           BINARY(16)      NOT NULL,
    entity_type         VARCHAR(32)     NOT NULL,
    entity_id           BINARY(16)      NOT NULL,
    previous_status     VARCHAR(24)     NULL,
    new_status          VARCHAR(24)     NOT NULL,
    created_by_user_id  BINARY(16)      NOT NULL,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    details             VARCHAR(500)    NULL,

    CONSTRAINT pk_order_status_audit_logs PRIMARY KEY (id),
    CONSTRAINT fk_audit_logs_client FOREIGN KEY (client_id) REFERENCES clients (id),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (created_by_user_id) REFERENCES app_users (id),
    CONSTRAINT chk_audit_logs_entity_type CHECK (
        entity_type IN ('B2C_ORDER', 'B2C_ORDER_LINE', 'B2B_PURCHASE_ORDER')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_audit_logs_entity ON order_status_audit_logs (client_id, entity_type, entity_id);
