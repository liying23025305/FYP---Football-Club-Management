-- Create refund_requests table
CREATE TABLE IF NOT EXISTS refund_requests (
    refund_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    payment_id INT NULL, -- Link to specific payment transaction
    
    -- Refund request details
    reason VARCHAR(500) NOT NULL,
    detailed_reason TEXT NULL, -- For additional explanation
    status ENUM('pending', 'approved', 'rejected', 'processed') DEFAULT 'pending',
    
    -- Transaction details at time of refund request
    original_order_amount DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    original_payment_method VARCHAR(100) NULL,
    original_transaction_reference VARCHAR(255) NULL,
    original_payment_date TIMESTAMP NULL,
    
    -- Items being refunded (JSON or separate table reference)
    refunded_items JSON NULL, -- Store array of {item_id, quantity, price, reason}
    
    -- Processing details
    admin_notes TEXT NULL,
    admin_decision_reason TEXT NULL,
    refund_transaction_reference VARCHAR(255) NULL, -- Reference for processed refund
    refund_method VARCHAR(100) NULL, -- How refund was processed (stripe, paypal, manual)
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL, -- When admin first reviewed
    processed_at TIMESTAMP NULL, -- When refund was actually processed
    completed_at TIMESTAMP NULL, -- When customer received refund
    
    -- Staff tracking
    processed_by INT NULL, -- Admin who approved/rejected
    refunded_by INT NULL, -- Admin who processed the actual refund
    
    -- Additional tracking
    customer_notified BOOLEAN DEFAULT FALSE,
    refund_confirmation_sent BOOLEAN DEFAULT FALSE,
    
    INDEX idx_refund_status (status),
    INDEX idx_refund_date (requested_at),
    INDEX idx_user_refunds (user_id, requested_at)
);

-- Add foreign keys to refund_requests after table creation
ALTER TABLE refund_requests 
ADD CONSTRAINT fk_refund_order 
FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;

ALTER TABLE refund_requests 
ADD CONSTRAINT fk_refund_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE refund_requests 
ADD CONSTRAINT fk_refund_payment 
FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL;

ALTER TABLE refund_requests 
ADD CONSTRAINT fk_refund_processed_by 
FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE refund_requests 
ADD CONSTRAINT fk_refund_refunded_by 
FOREIGN KEY (refunded_by) REFERENCES users(user_id) ON DELETE SET NULL;
