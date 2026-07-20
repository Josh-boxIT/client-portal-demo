CREATE TABLE `demo_ticket_mutations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ticket_id` text NOT NULL,
	`status` text,
	`replies` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_ticket_mutations_tenant_ticket_uq` ON `demo_ticket_mutations` (`tenant_id`,`ticket_id`);--> statement-breakpoint
CREATE INDEX `demo_ticket_mutations_tenant_idx` ON `demo_ticket_mutations` (`tenant_id`);