-- =============================================================================
-- V5__b2c_order_line_section.sql
-- Rattachement de chaque ligne de commande B2C à une Section du Client
-- =============================================================================

SET @col_section_id_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'b2c_order_lines'
      AND COLUMN_NAME = 'section_id'
);

SET @sql_add_section_id := IF(
    @col_section_id_exists = 0,
    'ALTER TABLE b2c_order_lines ADD COLUMN section_id BINARY(16) NULL AFTER catalog_item_id',
    'SELECT 1'
);
PREPARE stmt_sec_id FROM @sql_add_section_id;
EXECUTE stmt_sec_id;
DEALLOCATE PREPARE stmt_sec_id;

SET @col_section_name_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'b2c_order_lines'
      AND COLUMN_NAME = 'section_name'
);

SET @sql_add_section_name := IF(
    @col_section_name_exists = 0,
    'ALTER TABLE b2c_order_lines ADD COLUMN section_name VARCHAR(120) NULL AFTER section_id',
    'SELECT 1'
);
PREPARE stmt_sec_name FROM @sql_add_section_name;
EXECUTE stmt_sec_name;
DEALLOCATE PREPARE stmt_sec_name;
