-- ============================================================
-- Migration 001: Add selling_price + mrp to products table
-- Idempotent — safe to run multiple times.
-- Run manually once:  mysql < migrations/001_add_mrp_selling_price.sql
-- ============================================================

-- Only rename/add if selling_price column does NOT already exist.
-- We use a stored procedure so the whole script is idempotent.

DROP PROCEDURE IF EXISTS migration_001_add_mrp_selling_price;

DELIMITER $$

CREATE PROCEDURE migration_001_add_mrp_selling_price()
BEGIN
    -- Check if selling_price column already exists
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'products'
          AND COLUMN_NAME  = 'selling_price'
    ) THEN
        -- If old 'price' column exists, rename it
        IF EXISTS (
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'products'
              AND COLUMN_NAME  = 'price'
        ) THEN
            ALTER TABLE products
                CHANGE COLUMN price selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
        ELSE
            -- No old price column either — add selling_price fresh
            ALTER TABLE products
                ADD COLUMN selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
        END IF;

        SELECT 'selling_price column created/renamed.' AS migration_result;
    ELSE
        SELECT 'selling_price column already exists — skipping rename.' AS migration_result;
    END IF;

    -- Add mrp column if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'products'
          AND COLUMN_NAME  = 'mrp'
    ) THEN
        ALTER TABLE products
            ADD COLUMN mrp DECIMAL(12, 2) NULL DEFAULT NULL;
        SELECT 'mrp column added.' AS migration_result;
    ELSE
        SELECT 'mrp column already exists — skipping.' AS migration_result;
    END IF;
END$$

DELIMITER ;

CALL migration_001_add_mrp_selling_price();
DROP PROCEDURE IF EXISTS migration_001_add_mrp_selling_price;
