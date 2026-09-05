CREATE TABLE `publication_log` (
	`publication_date` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`quote` text NOT NULL,
	`author` text NOT NULL,
	`speaker` text,
	`title` text NOT NULL,
	`year` text,
	`publication_date` text,
	`source_type` text NOT NULL,
	`currency_terms` text DEFAULT '[]' NOT NULL,
	`themes` text DEFAULT '[]' NOT NULL,
	`context` text,
	`show_context` integer DEFAULT false NOT NULL,
	`repository` text,
	`source_url` text NOT NULL,
	`source_citation` text,
	`public_domain_status` text NOT NULL,
	`rights_note` text,
	`publish_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`reusable` integer DEFAULT false NOT NULL,
	`notes` text,
	`queue_position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL
);
