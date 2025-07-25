-- Corrected INSERT statements
--
-- For `users` table
INSERT INTO `users` (`email`, `username`, `password`, `first_name`, `surname`, `dob`, `country`, `phone`, `role`, `marketing_consent`, `is_active`, `email_verified`, `created_at`, `updated_at`) VALUES
('anonymous@system.local', 'anonymous', '', NULL, NULL, NULL, NULL, NULL, 'user', 0, 1, 0, '2025-07-09 10:50:16', '2025-07-09 10:50:16');  -- Need for non logged-in user to send a FAQ question

-- For 'news' table (/images/news/pic_name)
INSERT INTO `news` (`author_id`, `title`, `content`, `summary`, `featured_image`, `category`, `status`, `published_at`, `created_at`, `updated_at`, `users_user_id`) VALUES
(1, 'New Season Kicks Off with a Bang!', '<p>The highly anticipated new football season has officially begun, and it\'s already delivering thrilling matches and unexpected results. Fans are excited to see their favorite teams back in action.</p>', '<p>Exciting start to the new football season with thrilling matches.</p>', '/images/news/news_season.png', 'Season Updates', 'published', '2025-07-25 06:13:58', '2025-07-24 10:51:44', '2025-07-25 06:13:58', 1),
(1, 'Player Spotlight: Rising Star Ryan Koh', '<p>Get to know Ryan Koh, the young talent who has been making waves with his exceptional performance on the field. His dedication and skill are truly inspiring.</p>', '<p>An in-depth look at Ryan Koh, a rising football star.</p>', '/images/news/news5.jpg', 'Player Profiles', 'published', '2025-07-25 06:16:53', '2025-07-24 10:51:44', '2025-07-25 06:16:53', 1),
(1, 'Club Announces New Community Initiative', '<p>Our club is proud to launch a new community initiative aimed at promoting youth sports and healthy living in local neighborhoods. We believe in giving back to our community.</p>', '<p>Football club launches new initiative for youth sports.</p>', '/images/news/news3.jpg', 'Community', 'published', '2025-07-25 06:14:36', '2025-07-24 10:51:44', '2025-07-25 06:14:36', 1),
(1, 'Injury Update: Star Player Out for Weeks', '<p>Unfortunately, our key player, Alex Tan, has sustained an injury during the last match and will be out of action for several weeks. We wish them a speedy recovery.</p>', '<p>Important update on a star player\'s injury.</p>', '/images/news/news6.png', 'Team News', 'published', '2025-07-25 06:16:28', '2025-07-24 10:51:44', '2025-07-25 06:16:28', 1),
(1, 'Raffles Rangers Crowned Champions!', '<p>At the prestigious Singapore Premier League (SPL) Awards Night, Raffles Rangers Football Club was proudly recognized as the AIA SPL Team of the Year. This esteemed award celebrates their outstanding performance and collective excellence throughout the season.</p>', '<p>Raffles Rangers honored at the Singapore Premier League Awards Night.</p>', '/images/news/news2.jpg', 'Awards', 'published', '2025-07-25 06:18:08', '2025-07-24 10:56:29', '2025-07-25 06:18:08', 1);

-- For 'faq' table
INSERT INTO `faq` (`question`, `category`, `answer`, `status`, `is_published`, `display_order`, `users_user_id`) VALUES
('How do I purchase match tickets?', 'Tickets', 'You can purchase match tickets directly from our official website by navigating to the "Tickets" section and selecting your desired match.', 'answered', 'yes', 1, 1),
('What are the benefits of a membership?', 'Membership', 'Our membership tiers offer various benefits including discounted tickets, exclusive merchandise access, and priority event invitations. Please refer to the "Membership" page for full details.', 'answered', 'yes', 3, 1),
('I forgot my password. How can I reset it?', 'Technical', 'To reset your password, click on "Forgot Password" on the login page and follow the instructions sent to your registered email address.', 'answered', 'yes', 1, 1),
('Can I exchange my gear if it does not fit?', 'Store', 'Yes, we offer exchanges for gear within 30 days of purchase, provided the item is unworn and in its original packaging. Please see our returns policy for more information.', 'answered', 'yes', 1, 1);

-- For 'matches' table
INSERT INTO `matches` (`home_team`, `away_team`, `home_score`, `away_score`, `season`, `competition`, `match_date`, `venue`, `status`, `result`, `match_notes`, `schedule_id`) VALUES
('Raffles Rangers', 'United Titans', 2, 1, '2025/2026', 'Premier League', '2025-08-10 19:30:00', 'National Stadium', 'completed', 'win', 'A thrilling comeback victory for Raffles Rangers!', NULL),
('Raffles Rangers', 'Northern Lights', 0, 0, '2025/2026', 'Cup Championship', '2025-08-15 21:00:00', 'City Arena', 'scheduled', NULL, 'Anticipated intense rivalry match.', NULL),
('Raffles Rangers', 'Desert Wolves', 3, 3, '2025/2026', 'Friendly Match', '2025-07-25 17:00:00', 'Training Ground', 'live', 'draw', 'Currently in the second half.', NULL),
('Raffles Rangers', 'River Rovers', 1, 0, '2025/2026', 'Premier League', '2025-08-01 20:45:00', 'Valley Stadium', 'completed', 'win', 'Raffles Rangers secured a narrow victory.', NULL);