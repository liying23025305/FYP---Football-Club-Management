-- ========================
-- 1. Alter membership_tiers table (grouped edits)
-- ========================
ALTER TABLE membership_tiers
    DROP COLUMN discount_percentage,
    ADD COLUMN display_order INT AFTER active,
    ADD COLUMN updated_at DATETIME AFTER created_at,
    ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0 AFTER tier_desc,
    ADD COLUMN duration_months INT DEFAULT 12;

-- ========================
-- 2. Insert membership tiers
-- ========================
INSERT INTO membership_tiers (
    tier_name,
    tier_desc,
    cashback_rate,
    duration,
    price,
    active,
    display_order,
    created_at,
    updated_at
) VALUES 
('Bronze', 'Entry-level membership with basic benefits and exclusive access to club content.', 1.00, 12, 29.99, 1, 1, NOW(), NOW()),
('Silver', 'Mid-tier membership with enhanced benefits, priority support, and additional discounts.', 3.00, 12, 59.99, 1, 2, NOW(), NOW()),
('Gold', 'Premium membership with maximum benefits, VIP access, and highest rewards.', 5.00, 12, 99.99, 1, 3, NOW(), NOW());

-- ========================
-- 3. Alter users table
-- ========================
ALTER TABLE users
    ADD COLUMN is_active TINYINT DEFAULT 1 AFTER marketing_consent,
    ADD COLUMN email_verified TINYINT DEFAULT 0 AFTER is_active;

-- ========================
-- 4. Insert admin user
-- ========================
INSERT INTO users (
    email, username, password, first_name, surname, dob, country, phone,
    role, marketing_consent, is_active, email_verified, created_at, updated_at
) VALUES (
    'admin@footballclub.com',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLWOJy6HtPS',
    'System',
    'Administrator',
    '1990-01-01',
    'Singapore',
    '+65-9123-4567',
    'admin',
    0,
    1,
    1,
    NOW(),
    NOW()
);

-- ========================
-- 5. Alter ticket_purchases table
-- ========================
ALTER TABLE ticket_purchases
    ADD COLUMN discount_applied DECIMAL(5,2) DEFAULT 0 AFTER total_price,
    ADD COLUMN final_price DECIMAL(10,2) DEFAULT 0 AFTER discount_applied,
    ADD COLUMN confirmation_code VARCHAR(100) DEFAULT NULL AFTER status,
    ADD COLUMN notes TEXT,
    ADD COLUMN updated_at DATETIME;

-- ========================
-- 6. Alter payment_methods table
-- ========================
ALTER TABLE payment_methods
    ADD COLUMN method_code VARCHAR(50) UNIQUE AFTER method_name,
    ADD COLUMN sort_order INT DEFAULT 0 AFTER is_active;

INSERT INTO payment_methods (method_name, method_code, is_active, sort_order) 
VALUES ('Stripe Credit Card', 'stripe', 1, 1);

-- ========================
-- 7. Alter payments table
-- ========================
ALTER TABLE payments
    ADD COLUMN completed_at DATETIME DEFAULT NULL AFTER transaction_reference,
    ADD COLUMN purchase_id INT AFTER payment_method_id,
    ADD COLUMN updated_at DATETIME,
    ADD COLUMN membership_id INT;

UPDATE payments 
SET payment_method_id = 1 
WHERE payment_method_id IS NULL;

-- ========================
-- 8. Alter user_memberships table
-- ========================
DELETE FROM user_memberships WHERE membership_id = 0;

ALTER TABLE user_memberships
    DROP PRIMARY KEY,
    MODIFY COLUMN membership_id INT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (membership_id),
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
