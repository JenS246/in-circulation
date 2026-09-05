import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(),
  quote: text('quote').notNull(),
  author: text('author').notNull(),
  speaker: text('speaker'),
  title: text('title').notNull(),
  year: text('year'),
  publicationDate: text('publication_date'),
  sourceType: text('source_type').notNull(),
  currencyTerms: text('currency_terms').notNull().default('[]'),
  themes: text('themes').notNull().default('[]'),
  context: text('context'),
  showContext: integer('show_context', { mode: 'boolean' }).notNull().default(false),
  repository: text('repository'),
  sourceUrl: text('source_url').notNull(),
  sourceCitation: text('source_citation'),
  publicDomainStatus: text('public_domain_status').notNull(),
  rightsNote: text('rights_note'),
  publishDate: text('publish_date'),
  status: text('status').notNull().default('draft'),
  reusable: integer('reusable', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  queuePosition: integer('queue_position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_quotes_publish_date').on(table.publishDate),
  index('idx_quotes_status_queue').on(table.status, table.queuePosition),
  index('idx_quotes_author').on(table.author),
  index('idx_quotes_source_type').on(table.sourceType),
]);

export const publicationLog = sqliteTable('publication_log', {
  publicationDate: text('publication_date').primaryKey(),
  quoteId: text('quote_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_publication_log_quote_id').on(table.quoteId)]);

export const siteConfig = sqliteTable('site_config', {
  id: integer('id').primaryKey(),
  timezone: text('timezone').notNull().default('America/New_York'),
});
