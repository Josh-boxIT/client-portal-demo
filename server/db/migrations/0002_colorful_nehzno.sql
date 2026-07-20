CREATE TABLE `assistant_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT 'New conversation' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_conversations_owner_tenant_updated_idx` ON `assistant_conversations` (`user_id`,`tenant_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `assistant_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`request_id` text,
	`citations` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `assistant_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_messages_conversation_created_idx` ON `assistant_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `assistant_messages_conversation_request_uq` ON `assistant_messages` (`conversation_id`,`request_id`);