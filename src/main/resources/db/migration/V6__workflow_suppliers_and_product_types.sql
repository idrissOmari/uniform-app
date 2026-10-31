SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

ALTER TABLE catalog_items
    ADD COLUMN product_type VARCHAR(64) NOT NULL DEFAULT 'POLO' AFTER reference_code,
    ADD COLUMN supplier_name VARCHAR(150) NOT NULL DEFAULT 'Atelier Textile Casablanca' AFTER color_reference,
    ADD COLUMN available_sizes VARCHAR(255) NULL AFTER supplier_name;

CREATE INDEX idx_b2b_po_b2c_order_client
    ON b2b_purchase_orders (b2c_order_id, client_id);

ALTER TABLE b2b_purchase_orders
    DROP INDEX uk_b2b_po_b2c_order,
    ADD COLUMN supplier_name VARCHAR(150) NOT NULL DEFAULT 'Atelier Textile Casablanca' AFTER po_number;

ALTER TABLE b2b_purchase_order_lines
    ADD COLUMN item_name_snapshot VARCHAR(150) NOT NULL DEFAULT 'Article Uniforme' AFTER line_total_cost;
