CREATE TABLE `passkeys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`aaguid` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkeys_credential_id_unique` ON `passkeys` (`credential_id`);--> statement-breakpoint
CREATE TABLE `webauthn_challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`challenge` text NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`verification_token` text,
	`verification_token_expiry` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "email_verified", "verification_token", "verification_token_expiry", "created_at") SELECT "id", "email", "password_hash", "email_verified", "verification_token", "verification_token_expiry", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);