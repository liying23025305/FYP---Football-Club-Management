-- Unified Payment System Migration
-- Based on original final fyp 2.sql schema
-- This migration adds minimal changes to enable the unified payment system

USE mydb;

-- 1. Insert payment methods (Stripe and PayPal) if they don't exist
INSERT IGNORE INTO payment_methods (payment_method_id, method_name, gateway_url, is_active) VALUES
(1, 'Stripe', 'https://stripe.com', 1),
(2, 'PayPal', 'https://paypal.com', 1);

-- 2. Update payments table to support 'unified' payment type
-- Original schema only has: 'gear', 'ticket', 'membership'
-- We're adding 'unified' for combined purchases
ALTER TABLE payments 
MODIFY COLUMN payment_type ENUM('gear', 'ticket', 'membership', 'unified') DEFAULT 'unified';

-- 3. The original schema already has everything we need!
-- ✅ payments table - ready to use
-- ✅ payment_methods table - ready to use  
-- ✅ user_memberships.cashback_accumulated - ready for cashback
-- ✅ membership_tiers.cashback_rate - ready for cashback calculation
-- ✅ membership_tiers.discount_percentage - ready for member discounts
-- ✅ ticket_purchases table - ready for ticket handling
-- ✅ orders and order_items tables - ready for gear purchases

-- 4. OPTIONAL: Add some indexes for better performance
ALTER TABLE payments ADD INDEX idx_payment_type (payment_type);
ALTER TABLE payments ADD INDEX idx_payment_status (payment_status);
ALTER TABLE payments ADD INDEX idx_transaction_reference (transaction_reference);

-- 5. OPTIONAL: Add completed_at column to payments for better tracking
ALTER TABLE payments 
ADD COLUMN completed_at TIMESTAMP NULL AFTER payment_date;

COMMIT;
