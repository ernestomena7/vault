ALTER TABLE `files` ADD `distinguishing_text` varchar(80);--> statement-breakpoint
ALTER TABLE `files` ADD `incomplete_set` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pending_uploads` ADD `distinguishing_text` varchar(80);