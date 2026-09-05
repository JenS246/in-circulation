CREATE INDEX `idx_publication_log_quote_id` ON `publication_log` (`quote_id`);--> statement-breakpoint
CREATE INDEX `idx_quotes_publish_date` ON `quotes` (`publish_date`);--> statement-breakpoint
CREATE INDEX `idx_quotes_status_queue` ON `quotes` (`status`,`queue_position`);--> statement-breakpoint
CREATE INDEX `idx_quotes_author` ON `quotes` (`author`);--> statement-breakpoint
CREATE INDEX `idx_quotes_source_type` ON `quotes` (`source_type`);