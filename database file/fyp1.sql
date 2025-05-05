-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `mydb`.`customer_account` (
  `account_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NULL,
  `email` VARCHAR(100) NULL,
  `password` VARCHAR(255) NULL,
  PRIMARY KEY (`account_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) );

CREATE TABLE IF NOT EXISTS `mydb`.`gear` (
  `gear_id` INT NOT NULL AUTO_INCREMENT,
  `gear_name` VARCHAR(100) NULL,
  `gear_desc` VARCHAR(255) NULL,
  `price_per_unit` DECIMAL(5,2) NULL,
  PRIMARY KEY (`gear_id`));

CREATE TABLE IF NOT EXISTS `mydb`.`payment_mode` (
  `payment_mode_id` INT NOT NULL AUTO_INCREMENT,
  `total_amount` DECIMAL(10,2) NULL,
  `name` VARCHAR(45) NULL,
  `gateway_url` VARCHAR(45) NULL,
  PRIMARY KEY (`payment_mode_id`));

CREATE TABLE IF NOT EXISTS `mydb`.`order` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `order_date` DATETIME NULL,
  `payment_ref` VARCHAR(45) NULL,
  `account_id` INT NOT NULL,
  `payment_mode_id` INT NOT NULL,
  PRIMARY KEY (`order_id`),
  INDEX `fk_orders_customer_account1_idx` (`account_id` ASC) ,
  INDEX `fk_orders_payment_mode1_idx` (`payment_mode_id` ASC) ,
  CONSTRAINT `fk_orders_customer_account1`
    FOREIGN KEY (`account_id`)
    REFERENCES `mydb`.`customer_account` (`account_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_orders_payment_mode1`
    FOREIGN KEY (`payment_mode_id`)
    REFERENCES `mydb`.`payment_mode` (`payment_mode_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS `mydb`.`transaction_detail` (
  `transaction_id` INT NOT NULL AUTO_INCREMENT,
  `transaction_type` VARCHAR(45) NULL,
  `transaction_date` DATE NULL,
  `amount` DECIMAL(10,2) NULL,
  PRIMARY KEY (`transaction_id`))
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `mydb`.`order_item` (
  `order_item_id` INT NOT NULL,
  `quantity` INT NULL,
  `order_id` INT NOT NULL,
  `gear_id` INT NOT NULL,
  `transaction_id` INT NOT NULL,
  PRIMARY KEY (`order_item_id`),
  INDEX `fk_order_item_orders1_idx` (`order_id` ASC) ,
  INDEX `fk_order_item_product1_idx` (`gear_id` ASC) ,
  INDEX `fk_order_item_transaction_detail1_idx` (`transaction_id` ASC) ,
  CONSTRAINT `fk_order_item_orders1`
    FOREIGN KEY (`order_id`)
    REFERENCES `mydb`.`order` (`order_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_order_item_product1`
    FOREIGN KEY (`gear_id`)
    REFERENCES `mydb`.`gear` (`gear_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_order_item_transaction_detail1`
    FOREIGN KEY (`transaction_id`)
    REFERENCES `mydb`.`transaction_detail` (`transaction_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS `mydb`.`membership` (
  `member_id` INT NOT NULL AUTO_INCREMENT,
  `account_id` INT NOT NULL,
  `membership_type` VARCHAR(45) NULL,
  `cashback_accumulated` DECIMAL(3,2) NULL,
  `cashback_rate` DECIMAL(3,2) NULL,
  `join_date` DATE NULL,
  `expiry_date` DATE NULL,
  `discount_percentage` DECIMAL(3,2) NULL,
  `discount_rate` DECIMAL(3,2) NULL,
  PRIMARY KEY (`member_id`),
  INDEX `fk_membership_customer_account_idx` (`account_id` ASC) ,
  CONSTRAINT `fk_membership_customer_account`
    FOREIGN KEY (`account_id`)
    REFERENCES `mydb`.`customer_account` (`account_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS `mydb`.`schedule` (
  `schedule_id` INT NOT NULL AUTO_INCREMENT,
  `event_name` VARCHAR(100) NULL,
  `event_date` DATE NULL,
  `event_type` VARCHAR(45) NULL,
  `event_desc` VARCHAR(225) NULL,
  `member_id` INT NOT NULL,
  PRIMARY KEY (`schedule_id`),
  INDEX `fk_schedule_membership1_idx` (`member_id` ASC) ,
  CONSTRAINT `fk_schedule_membership1`
    FOREIGN KEY (`member_id`)
    REFERENCES `mydb`.`membership` (`member_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Dummy Data
-- -----------------------------------------------------

-- Customer Accounts
INSERT INTO `mydb`.`customer_account` (`name`, `email`, `password`)
VALUES 
('John Doe', 'john@example.com', 'hashed_pwd1'),
('Jane Smith', 'jane@example.com', 'hashed_pwd2'),
('Alex Lee', 'alex@example.com', 'hashed_pwd3');

-- Payment Modes
INSERT INTO `mydb`.`payment_mode` (`total_amount`, `name`, `gateway_url`)
VALUES
(100.00, 'Credit Card', 'https://gateway.com/cc'),
(200.00, 'PayPal', 'https://gateway.com/paypal');

-- Gear
INSERT INTO `mydb`.`gear` (`gear_name`, `gear_desc`, `price_per_unit`)
VALUES
('Jersey', 'Official Club Jersey', 49.99),
('Football Boots', 'High-quality boots', 89.50),
('Scarf', 'Club branded scarf', 19.99);

-- Memberships
INSERT INTO `mydb`.`membership` (`account_id`, `membership_type`, `cashback_accumulated`, `cashback_rate`, `join_date`, `expiry_date`, `discount_percentage`, `discount_rate`)
VALUES
(1, 'gold', 15.00, 0.10, '2024-01-01', '2025-01-01', 20.00, 0.20),
(2, 'silver', 10.00, 0.07, '2024-06-01', '2025-06-01', 15.00, 0.15),
(3, 'bronze', 5.00, 0.05, '2024-09-01', '2025-09-01', 10.00, 0.10);

-- Orders
INSERT INTO `mydb`.`order` (`order_date`, `payment_ref`, `account_id`, `payment_mode_id`)
VALUES
(NOW(), 'REF123456', 1, 1),
(NOW(), 'REF654321', 2, 2);

-- Transaction Details
INSERT INTO `mydb`.`transaction_detail` (`transaction_type`, `transaction_date`, `amount`)
VALUES
('football gear purchase', CURDATE(), 49.99),
('restaurant bills', CURDATE(), 30.00);

-- Order Items
INSERT INTO `mydb`.`order_item` (`order_item_id`, `quantity`, `order_id`, `gear_id`, `transaction_id`)
VALUES
(1, 1, 1, 1, 1),
(2, 2, 2, 3, 2);

-- Schedule
INSERT INTO `mydb`.`schedule` (`event_name`, `event_date`, `event_type`, `event_desc`, `member_id`)
VALUES
('Club Match vs Rivals', '2025-05-20', 'Club Match', 'Annual match with main rivals', 1),
('AGM 2025', '2025-06-15', 'AGM', 'Annual General Meeting for all club members', 2);

-- -----------------------------------------------------
-- Reset SQL Modes
-- -----------------------------------------------------
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;