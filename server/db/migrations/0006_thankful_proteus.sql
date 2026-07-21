CREATE TABLE `churn_narratives` (
	`tenant_id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`assessment` text NOT NULL,
	`suggested_actions` text NOT NULL,
	`generated_at` text NOT NULL,
	`model` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
