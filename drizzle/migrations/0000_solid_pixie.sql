CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`current_step` text NOT NULL,
	`collected_data` text DEFAULT '{}' NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`is_complete` integer DEFAULT false NOT NULL,
	`created_ticket_id` text,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `current_step_idx` ON `conversations` (`current_step`);--> statement-breakpoint
CREATE INDEX `is_complete_idx` ON `conversations` (`is_complete`);--> statement-breakpoint
CREATE INDEX `started_at_idx` ON `conversations` (`started_at`);--> statement-breakpoint
CREATE TABLE `support_techs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_techs_email_unique` ON `support_techs` (`email`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_name` text NOT NULL,
	`user_email` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	`assigned_to` text,
	`tags` text DEFAULT '[]',
	`conversation_id` text
);
--> statement-breakpoint
CREATE INDEX `status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `tickets` (`category`);--> statement-breakpoint
CREATE INDEX `priority_idx` ON `tickets` (`priority`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `tickets` (`created_at`);--> statement-breakpoint
CREATE INDEX `conversation_id_idx` ON `tickets` (`conversation_id`);