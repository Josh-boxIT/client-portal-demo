CREATE TABLE `product_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`aliases` text NOT NULL,
	`pricing_model` text NOT NULL,
	`monthly_price_low` integer NOT NULL,
	`monthly_price_high` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_catalog_normalized_name_uq` ON `product_catalog` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `sales_opportunity_analyses` (
	`tenant_id` text PRIMARY KEY NOT NULL,
	`analyzed_at` text NOT NULL,
	`model` text NOT NULL,
	`source_summary` text NOT NULL,
	`findings` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_opportunity_handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`sent_at` text NOT NULL,
	`sent_by` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_opportunity_handoff_tenant_fingerprint_uq` ON `sales_opportunity_handoffs` (`tenant_id`,`fingerprint`);