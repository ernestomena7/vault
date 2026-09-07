CREATE TABLE `approval_statuses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`dropbox_path` varchar(700) NOT NULL,
	`dropbox_url` varchar(1000),
	`position` int unsigned NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `approval_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `approval_statuses_name_unique` UNIQUE(`name`),
	CONSTRAINT `approval_statuses_position_unique` UNIQUE(`position`)
);
--> statement-breakpoint
CREATE TABLE `file_transitions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`file_id` bigint unsigned NOT NULL,
	`from_status_id` bigint unsigned,
	`to_status_id` bigint unsigned NOT NULL,
	`actor_id` bigint unsigned NOT NULL,
	`outcome` enum('succeeded','failed') NOT NULL,
	`detail` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `file_transitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`standard_name` varchar(400) NOT NULL,
	`original_name` varchar(400) NOT NULL,
	`extension` varchar(20) NOT NULL,
	`mime_type` varchar(150) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`approval_status_id` bigint unsigned NOT NULL,
	`quest_id` bigint unsigned NOT NULL,
	`mission_id` bigint unsigned NOT NULL,
	`stage_id` bigint unsigned NOT NULL,
	`dropbox_folder_path` varchar(700) NOT NULL,
	`dropbox_file_id` varchar(255) NOT NULL,
	`dropbox_url` varchar(1000),
	`uploaded_by` bigint unsigned NOT NULL,
	`uploaded_at` datetime(3) NOT NULL,
	`integrity_state` enum('valid','broken') NOT NULL DEFAULT 'valid',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `files_id` PRIMARY KEY(`id`),
	CONSTRAINT `files_destination_name_unique` UNIQUE(`approval_status_id`,`quest_id`,`mission_id`,`standard_name`)
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`quest_id` bigint unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`name_normalized` varchar(120) GENERATED ALWAYS AS ((LOWER(TRIM(name)))) STORED,
	`dropbox_path` varchar(700) NOT NULL,
	`dropbox_url` varchar(1000),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `missions_id` PRIMARY KEY(`id`),
	CONSTRAINT `missions_parent_name_unique` UNIQUE(`quest_id`,`name_normalized`)
);
--> statement-breakpoint
CREATE TABLE `pending_uploads` (
	`id` varchar(26) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`approval_status_id` bigint unsigned NOT NULL,
	`quest_id` bigint unsigned NOT NULL,
	`mission_id` bigint unsigned NOT NULL,
	`stage_id` bigint unsigned NOT NULL,
	`standard_name` varchar(400) NOT NULL,
	`dropbox_folder_path` varchar(700) NOT NULL,
	`original_name` varchar(400) NOT NULL,
	`declared_size_bytes` bigint unsigned NOT NULL,
	`mime_type` varchar(150) NOT NULL,
	`dropbox_session_id` varchar(255),
	`state` enum('authorized','completed','failed','expired') NOT NULL DEFAULT 'authorized',
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `pending_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`approval_status_id` bigint unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`name_normalized` varchar(120) GENERATED ALWAYS AS ((LOWER(TRIM(name)))) STORED,
	`dropbox_path` varchar(700) NOT NULL,
	`dropbox_url` varchar(1000),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `quests_id` PRIMARY KEY(`id`),
	CONSTRAINT `quests_parent_name_unique` UNIQUE(`approval_status_id`,`name_normalized`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mission_id` bigint unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`name_normalized` varchar(120) GENERATED ALWAYS AS ((LOWER(TRIM(name)))) STORED,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stages_id` PRIMARY KEY(`id`),
	CONSTRAINT `stages_parent_name_unique` UNIQUE(`mission_id`,`name_normalized`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','uploader') NOT NULL DEFAULT 'uploader',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `file_transitions` ADD CONSTRAINT `file_transitions_file_id_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_transitions` ADD CONSTRAINT `file_transitions_from_status_id_approval_statuses_id_fk` FOREIGN KEY (`from_status_id`) REFERENCES `approval_statuses`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_transitions` ADD CONSTRAINT `file_transitions_to_status_id_approval_statuses_id_fk` FOREIGN KEY (`to_status_id`) REFERENCES `approval_statuses`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_transitions` ADD CONSTRAINT `file_transitions_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_approval_status_id_approval_statuses_id_fk` FOREIGN KEY (`approval_status_id`) REFERENCES `approval_statuses`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_quest_id_quests_id_fk` FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_mission_id_missions_id_fk` FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_stage_id_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `missions` ADD CONSTRAINT `missions_quest_id_quests_id_fk` FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_uploads` ADD CONSTRAINT `pending_uploads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_uploads` ADD CONSTRAINT `pending_uploads_approval_status_id_approval_statuses_id_fk` FOREIGN KEY (`approval_status_id`) REFERENCES `approval_statuses`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_uploads` ADD CONSTRAINT `pending_uploads_quest_id_quests_id_fk` FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_uploads` ADD CONSTRAINT `pending_uploads_mission_id_missions_id_fk` FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_uploads` ADD CONSTRAINT `pending_uploads_stage_id_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quests` ADD CONSTRAINT `quests_approval_status_id_approval_statuses_id_fk` FOREIGN KEY (`approval_status_id`) REFERENCES `approval_statuses`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_mission_id_missions_id_fk` FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `file_transitions_file_idx` ON `file_transitions` (`file_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `files_queue_idx` ON `files` (`approval_status_id`,`uploaded_at`);--> statement-breakpoint
CREATE INDEX `files_uploader_idx` ON `files` (`uploaded_by`,`uploaded_at`);--> statement-breakpoint
CREATE INDEX `files_dropbox_file_idx` ON `files` (`dropbox_file_id`);--> statement-breakpoint
CREATE INDEX `missions_parent_idx` ON `missions` (`quest_id`);--> statement-breakpoint
CREATE INDEX `pending_uploads_user_idx` ON `pending_uploads` (`user_id`);--> statement-breakpoint
CREATE INDEX `pending_uploads_state_expires_idx` ON `pending_uploads` (`state`,`expires_at`);--> statement-breakpoint
CREATE INDEX `quests_parent_idx` ON `quests` (`approval_status_id`);--> statement-breakpoint
CREATE INDEX `stages_parent_idx` ON `stages` (`mission_id`);