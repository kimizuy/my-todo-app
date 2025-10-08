ALTER TABLE `archived_tasks` ADD `order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `order` integer DEFAULT 0 NOT NULL;