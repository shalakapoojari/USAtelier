-- Migration: Add Delhivery columns to orders table
-- This migration adds Delhivery-specific columns to support the new delivery provider
-- Existing Borzo columns are retained for backward compatibility

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delhivery_shipment_id VARCHAR(100) UNIQUE KEY NULL COMMENT 'Delhivery shipment ID' AFTER discount_amount;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delhivery_tracking_url VARCHAR(500) NULL COMMENT 'Delhivery tracking URL' AFTER delhivery_shipment_id;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delhivery_waybill_number VARCHAR(100) NULL COMMENT 'Delhivery waybill number' AFTER delhivery_tracking_url;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_delhivery_shipment_id ON orders(delhivery_shipment_id);

-- Update comments on Borzo columns to indicate deprecation
ALTER TABLE orders MODIFY borzo_order_id VARCHAR(100) NULL COMMENT 'DEPRECATED: Use delhivery_shipment_id instead';
ALTER TABLE orders MODIFY borzo_tracking_url VARCHAR(500) NULL COMMENT 'DEPRECATED: Use delhivery_tracking_url instead';

-- Verify the migration
SELECT 'Migration completed successfully. New columns added:' as status;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'orders' AND COLUMN_NAME IN (
  'delhivery_shipment_id', 
  'delhivery_tracking_url', 
  'delhivery_waybill_number',
  'borzo_order_id',
  'borzo_tracking_url'
) 
ORDER BY ORDINAL_POSITION;
