ALTER TABLE `leaderboard` ADD `submission_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leaderboard_submission` ON `leaderboard` (`submission_key`);