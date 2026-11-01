-- Allow optional visual storage keys and store uploaded images (data URLs) as LONGTEXT
ALTER TABLE clients
    MODIFY COLUMN logo_storage_key LONGTEXT NULL;

ALTER TABLE catalog_items
    MODIFY COLUMN front_visual_storage_key LONGTEXT NULL,
    MODIFY COLUMN back_visual_storage_key LONGTEXT NULL;

ALTER TABLE b2b_purchase_order_lines
    MODIFY COLUMN front_visual_storage_snapshot LONGTEXT NULL,
    MODIFY COLUMN back_visual_storage_snapshot LONGTEXT NULL;

