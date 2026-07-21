CREATE TABLE `connectwise_cache_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`resource` text NOT NULL,
	`entity_id` text NOT NULL,
	`data` text NOT NULL,
	`position` integer NOT NULL,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connectwise_cache_entries_tenant_resource_entity_uq` ON `connectwise_cache_entries` (`tenant_id`,`resource`,`entity_id`);--> statement-breakpoint
CREATE INDEX `connectwise_cache_entries_tenant_resource_position_idx` ON `connectwise_cache_entries` (`tenant_id`,`resource`,`position`);--> statement-breakpoint
CREATE TABLE `connectwise_cache_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`resource` text NOT NULL,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connectwise_cache_snapshots_tenant_resource_uq` ON `connectwise_cache_snapshots` (`tenant_id`,`resource`);