-- Minimal migration script for unified payment system
-- MySQL2 compatible version - Only adds what's absolutely necessary

USE mydb;

-- 1. REQUIRED: Insert payment methods (Stripe and PayPal)
INSERT IGNORE INTO payment_methods (payment_method_id, method_name, gateway_url, is_active) VALUES
(1, 'Stripe', 'https://stripe.com', 1),
(2, 'PayPal', 'https://paypal.com', 1);

-- 2. REQUIRED: Update payments table to support unified payment type
ALTER TABLE payments 
MODIFY COLUMN payment_type ENUM('gear', 'ticket', 'membership', 'unified') DEFAULT 'unified';

-- 3. STEP-BY-STEP: Fix purchase_id column to work with foreign key
-- First, check if there are any invalid values and clean them up
UPDATE ticket_purchases SET purchase_id = NULL WHERE purchase_id <= 0;

-- Drop any existing foreign key constraint if it exists (ignore error if not exists)
-- ALTER TABLE ticket_purchases DROP FOREIGN KEY fk_ticket_purchases_payments;

-- Now modify the column structure to explicitly allow NULL
ALTER TABLE ticket_purchases 
MODIFY COLUMN purchase_id INT(11) NULL DEFAULT NULL;

-- Add index for purchase_id (ignore error if exists)
-- ALTER TABLE ticket_purchases ADD INDEX idx_purchase_id (purchase_id);

-- 4. OPTIONAL: Add foreign key constraint for purchase_id (safer payment tracking)
-- This should now work since purchase_id properly allows NULL
ALTER TABLE ticket_purchases 
ADD CONSTRAINT fk_ticket_purchases_payments 
FOREIGN KEY (purchase_id) REFERENCES payments(payment_id) ON DELETE SET NULL;
