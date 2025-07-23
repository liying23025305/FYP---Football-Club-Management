-- Create reservations table for Raffles Rangers Cafe
CREATE TABLE IF NOT EXISTS `mydb`.`reservations` (
  `reservation_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `reservation_date` DATE NOT NULL,
  `reservation_time` TIME NOT NULL,
  `party_size` INT NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  INDEX `fk_reservations_users_idx` (`user_id` ASC),
  CONSTRAINT `fk_reservations_users`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Insert some sample time slots configuration
CREATE TABLE IF NOT EXISTS `mydb`.`reservation_time_slots` (
  `slot_id` INT NOT NULL AUTO_INCREMENT,
  `time_slot` TIME NOT NULL,
  `max_capacity` INT NOT NULL DEFAULT 4,
  `is_active` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`slot_id`),
  UNIQUE KEY `unique_time_slot` (`time_slot`)
) ENGINE = InnoDB;

-- Insert default time slots
INSERT INTO `mydb`.`reservation_time_slots` (`time_slot`, `max_capacity`) VALUES
('09:00:00', 4),
('10:00:00', 4),
('11:00:00', 4),
('12:00:00', 4),
('13:00:00', 4),
('14:00:00', 4),
('15:00:00', 4),
('16:00:00', 4),
('17:00:00', 4),
('18:00:00', 4),
('19:00:00', 4),
('20:00:00', 4)
ON DUPLICATE KEY UPDATE max_capacity = VALUES(max_capacity);
