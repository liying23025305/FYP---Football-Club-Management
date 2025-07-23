-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `username` VARCHAR(225) NOT NULL,
  `password` VARCHAR(225) NOT NULL,
  `first_name` VARCHAR(100) NULL,
  `surname` VARCHAR(100) NULL,
  `dob` DATE NULL,
  `country` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `role` ENUM('admin', 'user') NULL DEFAULT 'user',
  `marketing_consent` TINYINT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) ,
  UNIQUE INDEX `username_UNIQUE` (`username` ASC) )
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`membership_tiers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`membership_tiers` (
  `tier_id` INT NOT NULL AUTO_INCREMENT,
  `tier_name` VARCHAR(45) NOT NULL,
  `tier_desc` VARCHAR(225) NULL,
  `discount_percentage` DECIMAL(3,2) NULL,
  `discount_rate` DECIMAL(3,2) NULL,
  `cashback_rate` DECIMAL(3,2) NULL,
  `duration` VARCHAR(45) NULL,
  `price` VARCHAR(45) NULL,
  `active` TINYINT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_id`),
  UNIQUE INDEX `tier_name_UNIQUE` (`tier_name` ASC) )
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`user_memberships`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`user_memberships` (
  `membership_id` INT NOT NULL,
  `join_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `status` ENUM('active', 'expired', 'cancelled') NULL DEFAULT 'active',
  `cashback_accumulated` DECIMAL(10,2) NULL DEFAULT 0.00,
  `discount_percentage` DECIMAL(10,2) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` INT NOT NULL,
  `tier_id` INT NOT NULL,
  PRIMARY KEY (`membership_id`),
  INDEX `fk_user_memberships_users_idx` (`user_id` ASC) ,
  INDEX `fk_user_memberships_membership_tiers1_idx` (`tier_id` ASC) ,
  CONSTRAINT `fk_user_memberships_users`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_user_memberships_membership_tiers1`
    FOREIGN KEY (`tier_id`)
    REFERENCES `mydb`.`membership_tiers` (`tier_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`schedules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`schedules` (
  `schedule_id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `start_time` DATETIME NULL,
  `end_time` DATETIME NULL,
  `location` VARCHAR(100) NULL,
  `schedule_type` ENUM('training', 'match', 'meeting', 'event') NULL,
  `team` VARCHAR(50) NULL,
  `status` ENUM('scheduled', 'completed', 'cancelled') NULL DEFAULT 'scheduled',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_ad` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`schedule_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`players`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`players` (
  `player_id` INT NOT NULL AUTO_INCREMENT,
  `player_name` VARCHAR(100) NULL,
  `position` VARCHAR(50) NULL,
  `jersey_number` INT NULL,
  `player_image` VARCHAR(225) NULL,
  `status` ENUM('active', 'injured', 'suspended', 'inactive') NULL DEFAULT 'active',
  `date_joined` DATE NULL,
  `biography` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`matches`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`matches` (
  `match_id` INT NOT NULL AUTO_INCREMENT,
  `home_team` VARCHAR(100) NULL,
  `away_team` VARCHAR(100) NULL,
  `home_score` INT NULL DEFAULT 0,
  `away_score` INT NULL DEFAULT 0,
  `season` VARCHAR(45) NULL,
  `competition` VARCHAR(100) NULL,
  `match_date` DATETIME NULL,
  `venue` VARCHAR(100) NULL,
  `status` ENUM('scheduled', 'live', 'completed', 'postponed', 'cancelled') NULL DEFAULT 'scheduled',
  `result` ENUM('win', 'loss', 'draw') NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `schedule_id` INT NOT NULL,
  `player_id` INT NOT NULL,
  PRIMARY KEY (`match_id`),
  INDEX `fk_matches_schedules1_idx` (`schedule_id` ASC) ,
  INDEX `fk_matches_players1_idx` (`player_id` ASC) ,
  CONSTRAINT `fk_matches_schedules1`
    FOREIGN KEY (`schedule_id`)
    REFERENCES `mydb`.`schedules` (`schedule_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_matches_players1`
    FOREIGN KEY (`player_id`)
    REFERENCES `mydb`.`players` (`player_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`events`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`events` (
  `event_id` INT NOT NULL AUTO_INCREMENT,
  `event_name` VARCHAR(100) NOT NULL,
  `event_date` DATE NULL,
  `event_time` TIME NULL,
  `event_type` VARCHAR(45) NULL,
  `event_desc` VARCHAR(225) NULL,
  `location` VARCHAR(100) NULL,
  `capacity` INT NULL,
  `available_tickets` INT NULL,
  `ticket_price` DECIMAL(10,2) NULL,
  `status` ENUM('upcoming', 'ongoing', 'completed', 'cancelled') NULL DEFAULT 'upcoming',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `match_id` INT NULL,
  PRIMARY KEY (`event_id`),
  INDEX `fk_events_matches1_idx` (`match_id` ASC) ,
  CONSTRAINT `fk_events_matches1`
    FOREIGN KEY (`match_id`)
    REFERENCES `mydb`.`matches` (`match_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`ticket_purchases`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`ticket_purchases` (
  `purchase_id` INT NOT NULL AUTO_INCREMENT,
  `quantity` INT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NULL,
  `total_price` DECIMAL(10,2) NULL,
  `purchase_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('reserved', 'confirmed', 'cancelled') NULL DEFAULT 'reserved',
  `reservation_expires_at` TIMESTAMP NULL,
  `user_id` INT NOT NULL,
  `event_id` INT NOT NULL,
  PRIMARY KEY (`purchase_id`),
  INDEX `fk_ticket_purchases_users1_idx` (`user_id` ASC) ,
  INDEX `fk_ticket_purchases_events1_idx` (`event_id` ASC) ,
  CONSTRAINT `fk_ticket_purchases_users1`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_ticket_purchases_events1`
    FOREIGN KEY (`event_id`)
    REFERENCES `mydb`.`events` (`event_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`gear`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`gear` (
  `gear_id` INT NOT NULL AUTO_INCREMENT,
  `gear_name` VARCHAR(100) NOT NULL,
  `gear_image` VARCHAR(225) NULL,
  `gear_desc` VARCHAR(225) NULL,
  `gear_quantity` INT NULL,
  `price_per_unit` DECIMAL(5,2) NOT NULL,
  `category` VARCHAR(50) NULL,
  `status` ENUM('available', 'out_of_stock', 'discontinued') NULL DEFAULT 'available',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gear_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`orders`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `order_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(10,2) NULL,
  `discount_applied` DECIMAL(10,2) NULL DEFAULT 0.00,
  `final_amount` DECIMAL(10,2) NULL,
  `status` ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') NULL DEFAULT 'pending',
  `shipping_address` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` INT NOT NULL,
  PRIMARY KEY (`order_id`),
  INDEX `fk_orders_users1_idx` (`user_id` ASC) ,
  CONSTRAINT `fk_orders_users1`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`order_items`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`order_items` (
  `order_items_id` INT NOT NULL AUTO_INCREMENT,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  `order_id` INT NOT NULL,
  `gear_id` INT NOT NULL,
  PRIMARY KEY (`order_items_id`),
  INDEX `fk_order_items_orders1_idx` (`order_id` ASC) ,
  INDEX `fk_order_items_gear1_idx` (`gear_id` ASC) ,
  CONSTRAINT `fk_order_items_orders1`
    FOREIGN KEY (`order_id`)
    REFERENCES `mydb`.`orders` (`order_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_order_items_gear1`
    FOREIGN KEY (`gear_id`)
    REFERENCES `mydb`.`gear` (`gear_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`payment_methods`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`payment_methods` (
  `payment_method_id` INT NOT NULL AUTO_INCREMENT,
  `method_name` VARCHAR(45) NOT NULL,
  `gateway_url` VARCHAR(225) NULL,
  `is_active` TINYINT NULL,
  PRIMARY KEY (`payment_method_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`payments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`payments` (
  `payment_id` INT NOT NULL AUTO_INCREMENT,
  `amount` DECIMAL(10,2) NULL,
  `payment_type` ENUM('gear', 'ticket', 'membership') NULL,
  `payment_status` ENUM('pending', 'completed', 'failed', 'refunded') NULL DEFAULT 'pending',
  `transaction_reference` VARCHAR(100) NULL,
  `payment_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` INT NOT NULL,
  `payment_method_id` INT NOT NULL,
  PRIMARY KEY (`payment_id`),
  INDEX `fk_payments_users1_idx` (`user_id` ASC) ,
  INDEX `fk_payments_payment_methods1_idx` (`payment_method_id` ASC) ,
  CONSTRAINT `fk_payments_users1`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_payments_payment_methods1`
    FOREIGN KEY (`payment_method_id`)
    REFERENCES `mydb`.`payment_methods` (`payment_method_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`news`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`news` (
  `news_id` INT NOT NULL AUTO_INCREMENT,
  `author_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `summary` VARCHAR(500) NULL,
  `featured_image` VARCHAR(255) NULL,
  `category` VARCHAR(50) NULL,
  `status` ENUM('draft', 'published', 'archived') NULL DEFAULT 'draft',
  `published_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `users_user_id` INT NOT NULL,
  PRIMARY KEY (`news_id`),
  INDEX `fk_news_users1_idx` (`users_user_id` ASC) ,
  CONSTRAINT `fk_news_users1`
    FOREIGN KEY (`users_user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`faq`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`faq` (
  `faq_id` INT NOT NULL AUTO_INCREMENT,
  `submitted_by_user_id` INT NULL,
  `question` TEXT NOT NULL,
  `answer` TEXT NULL,
  `status` ENUM('pending', 'answered', 'archived') NULL DEFAULT 'pending',
  `display_order` INT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `users_user_id` INT NOT NULL,
  PRIMARY KEY (`faq_id`),
  INDEX `fk_faq_users1_idx` (`users_user_id` ASC) ,
  CONSTRAINT `fk_faq_users1`
    FOREIGN KEY (`users_user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`user_bookmarks`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`user_bookmarks` (
  `bookmark_id` INT NOT NULL AUTO_INCREMENT,
  `news_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `bookmarked_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bookmark_id`, `news_id`, `user_id`),
  INDEX `fk_news_has_users_users1_idx` (`user_id` ASC) ,
  INDEX `fk_news_has_users_news1_idx` (`news_id` ASC) ,
  CONSTRAINT `fk_news_has_users_news1`
    FOREIGN KEY (`news_id`)
    REFERENCES `mydb`.`news` (`news_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_news_has_users_users1`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`shopping_cart`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`shopping_cart` (
  `cart_id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(45) NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `size` VARCHAR(45) NULL,
  `color` VARCHAR(45) NULL,
  `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NULL,
  `gear_id` INT NOT NULL,
  `user_id` INT NULL,
  PRIMARY KEY (`cart_id`),
  INDEX `fk_shopping_cart_gear1_idx` (`gear_id` ASC) ,
  INDEX `fk_shopping_cart_users1_idx` (`user_id` ASC) ,
  CONSTRAINT `fk_shopping_cart_gear1`
    FOREIGN KEY (`gear_id`)
    REFERENCES `mydb`.`gear` (`gear_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_shopping_cart_users1`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
