----- Altering 'faq' table ------
-- Drop 'submitted_by_user_id' column
ALTER TABLE `mydb`.`faq`
DROP COLUMN `submitted_by_user_id`;

-- Add 'category' column
ALTER TABLE `mydb`.`faq`
ADD COLUMN `category` VARCHAR(50) NULL AFTER `question`;

-- Add 'is_published' column
ALTER TABLE `mydb`.`faq`
ADD COLUMN `is_published` ENUM('yes', 'no') NOT NULL DEFAULT 'no' AFTER `status`;

-- Add 'published_at' column
ALTER TABLE `mydb`.`faq`
ADD COLUMN `published_at` TIMESTAMP NULL DEFAULT NULL AFTER `is_published`;

-- Modify 'users_user_id' to allow NULL
ALTER TABLE `mydb`.`faq`
CHANGE COLUMN `users_user_id` `users_user_id` INT(11) NULL DEFAULT NULL;

----- Altering 'matches' table ------
-- Drop 'player_id' column & its foreign key constraint
ALTER TABLE `mydb`.`matches`
DROP FOREIGN KEY `fk_matches_players1`;

ALTER TABLE `mydb`.`matches`
DROP INDEX `fk_matches_players1_idx`;

ALTER TABLE `mydb`.`matches`
DROP COLUMN `player_id`;

-- Add 'match_notes' column
ALTER TABLE `mydb`.`matches`
ADD COLUMN `match_notes` TEXT NULL AFTER `result`;

-- Add new indexes to 'matches' table
CREATE INDEX `idx_season` ON `mydb`.`matches` (`season`);
CREATE INDEX `idx_match_date` ON `mydb`.`matches` (`match_date`);

-- Modify 'schedule_id' column to DEFAULT NULL
ALTER TABLE `mydb`.`matches`
MODIFY COLUMN `schedule_id` INT(11) NULL DEFAULT NULL;

-- NOTE: An INDEX in a DB is a data structure that improves the speed of data retrieval operations on a DB table.
----- It allows us to find relevant data much faster