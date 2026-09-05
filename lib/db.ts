import { env } from 'cloudflare:workers';
import { DEFAULT_TIMEZONE, localDate } from './date';
import type { Quote, QuoteInput } from './types';

const CREATE_QUOTES = `CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  speaker TEXT,
  title TEXT NOT NULL,
  year TEXT,
  publication_date TEXT,
  source_type TEXT NOT NULL,
  currency_terms TEXT NOT NULL DEFAULT '[]',
  themes TEXT NOT NULL DEFAULT '[]',
  context TEXT,
  show_context INTEGER NOT NULL DEFAULT 0,
  repository TEXT,
  source_url TEXT NOT NULL,
  source_citation TEXT,
  public_domain_status TEXT NOT NULL,
  rights_note TEXT,
  publish_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  reusable INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  queue_position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const CREATE_LOG = `CREATE TABLE IF NOT EXISTS publication_log (
  publication_date TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

const CREATE_CONFIG = `CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY,
  timezone TEXT NOT NULL DEFAULT 'America/New_York'
)`;

const QUOTE_SELECT = `SELECT
  q.id, q.quote, q.author, q.speaker, q.title, q.year,
  q.publication_date AS publicationDate, q.source_type AS sourceType,
  q.currency_terms AS currencyTerms, q.themes, q.context,
  q.show_context AS showContext, q.repository, q.source_url AS sourceUrl,
  q.source_citation AS sourceCitation,
  q.public_domain_status AS publicDomainStatus, q.rights_note AS rightsNote,
  q.publish_date AS publishDate, q.status, q.reusable,
  q.notes, q.queue_position AS queuePosition,
  q.created_at AS createdAt, q.updated_at AS updatedAt`;

const SAFE_SQL = `('Verified Public Domain','U.S. Government Work','Permission / Open License')`;
let initialized = false;

function database() {
  return env.DB as D1Database;
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return String(value ?? '').split('|').map((item) => item.trim()).filter(Boolean);
  }
}

function hydrate(row: Record<string, unknown>): Quote {
  return {
    id: String(row.id), quote: String(row.quote), author: String(row.author),
    speaker: row.speaker ? String(row.speaker) : null, title: String(row.title),
    year: row.year ? String(row.year) : null,
    publicationDate: row.publicationDate ? String(row.publicationDate) : null,
    sourceType: String(row.sourceType), currencyTerms: parseArray(row.currencyTerms),
    themes: parseArray(row.themes), context: row.context ? String(row.context) : null,
    showContext: Boolean(row.showContext), repository: row.repository ? String(row.repository) : null,
    sourceUrl: String(row.sourceUrl), sourceCitation: row.sourceCitation ? String(row.sourceCitation) : null,
    publicDomainStatus: String(row.publicDomainStatus), rightsNote: row.rightsNote ? String(row.rightsNote) : null,
    publishDate: row.publishDate ? String(row.publishDate) : null, status: String(row.status),
    reusable: Boolean(row.reusable), notes: row.notes ? String(row.notes) : null,
    queuePosition: Number(row.queuePosition ?? 0), createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt), publishedDate: row.publishedDate ? String(row.publishedDate) : null,
  };
}

const samples = Array.from({ length: 10 }, (_, index) => ({
  id: `sample-${String(index + 1).padStart(2, '0')}`,
  quote: `[PLACEHOLDER ${String(index + 1).padStart(2, '0')}] Replace this text with a verified quotation. Line breaks, punctuation, capitalization, and spelling will be preserved exactly.`,
  author: 'In Circulation sample',
  title: 'Editorial placeholder',
  themes: JSON.stringify([['value', 'labor', 'debt', 'exchange', 'trust'][index % 5]]),
  currencyTerms: JSON.stringify([['money', 'wages', 'coin', 'payment', 'currency'][index % 5]]),
  sourceType: 'Other',
  sourceUrl: 'https://example.com/replace-with-original-source',
  repository: 'Placeholder repository',
  rightsNote: 'Demonstration placeholder. Replace with curator-supplied source and rights research before launch.',
  queuePosition: index + 1,
}));

export async function ensureDatabase() {
  if (initialized) return;
  const db = database();
  await db.batch([
    db.prepare(CREATE_QUOTES),
    db.prepare(CREATE_LOG),
    db.prepare(CREATE_CONFIG),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_quotes_publish_date ON quotes (publish_date)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_quotes_status_queue ON quotes (status, queue_position)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes (author)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_quotes_source_type ON quotes (source_type)'),
    db.prepare('INSERT OR IGNORE INTO site_config (id, timezone) VALUES (1, ?)').bind(DEFAULT_TIMEZONE),
  ]);
  const count = await db.prepare('SELECT COUNT(*) AS count FROM quotes').first<{ count: number }>();
  if (!count?.count) {
    const now = new Date().toISOString();
    await db.batch(samples.map((sample) => db.prepare(`INSERT OR IGNORE INTO quotes (
      id, quote, author, title, source_type, currency_terms, themes, repository,
      source_url, public_domain_status, rights_note, status, reusable,
      queue_position, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0, ?, ?, ?)`)
      .bind(sample.id, sample.quote, sample.author, sample.title, sample.sourceType,
        sample.currencyTerms, sample.themes, sample.repository, sample.sourceUrl,
        'Permission / Open License', sample.rightsNote, sample.queuePosition, now, now)));
  }
  await db.prepare('PRAGMA optimize').run();
  initialized = true;
}

export async function getTimezone() {
  await ensureDatabase();
  const row = await database().prepare('SELECT timezone FROM site_config WHERE id = 1').first<{ timezone: string }>();
  return row?.timezone || DEFAULT_TIMEZONE;
}

export async function setTimezone(timezone: string) {
  new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  await ensureDatabase();
  await database().prepare('UPDATE site_config SET timezone = ? WHERE id = 1').bind(timezone).run();
}

async function firstQuote(sql: string, ...bindings: unknown[]) {
  const row = await database().prepare(sql).bind(...bindings).first<Record<string, unknown>>();
  return row ? hydrate(row) : null;
}

export async function getTodayQuote() {
  await ensureDatabase();
  const timezone = await getTimezone();
  const today = localDate(timezone);
  const logged = await firstQuote(`${QUOTE_SELECT}, l.publication_date AS publishedDate
    FROM publication_log l JOIN quotes q ON q.id = l.quote_id
    WHERE l.publication_date = ? AND q.public_domain_status IN ${SAFE_SQL}`, today);
  if (logged) return { quote: logged, date: today, timezone };

  const scheduled = await firstQuote(`${QUOTE_SELECT} FROM quotes q
    WHERE q.publish_date = ? AND q.status IN ('scheduled','published')
      AND q.public_domain_status IN ${SAFE_SQL}
    ORDER BY q.queue_position, q.created_at LIMIT 1`, today);
  const fallback = scheduled ?? await firstQuote(`${QUOTE_SELECT} FROM quotes q
    WHERE q.status = 'scheduled' AND (q.publish_date IS NULL OR q.publish_date = '')
      AND q.public_domain_status IN ${SAFE_SQL}
      AND (q.reusable = 1 OR NOT EXISTS (SELECT 1 FROM publication_log px WHERE px.quote_id = q.id))
    ORDER BY q.reusable ASC, q.queue_position ASC,
      (SELECT MAX(publication_date) FROM publication_log pr WHERE pr.quote_id = q.id) ASC,
      q.created_at ASC LIMIT 1`);
  if (!fallback) return { quote: null, date: today, timezone };

  const db = database();
  const now = new Date().toISOString();
  const statements = [
    db.prepare('INSERT OR REPLACE INTO publication_log (publication_date, quote_id, created_at) VALUES (?, ?, ?)').bind(today, fallback.id, now),
  ];
  if (!fallback.reusable) {
    statements.push(db.prepare("UPDATE quotes SET status = 'published', publish_date = ?, updated_at = ? WHERE id = ?").bind(today, now, fallback.id));
  }
  await db.batch(statements);
  return { quote: { ...fallback, publishedDate: today }, date: today, timezone };
}

export async function getPublicQuote(id: string) {
  await ensureDatabase();
  return firstQuote(`${QUOTE_SELECT}, l.publication_date AS publishedDate
    FROM quotes q JOIN publication_log l ON l.quote_id = q.id
    WHERE q.id = ? AND q.public_domain_status IN ${SAFE_SQL}
    ORDER BY l.publication_date DESC LIMIT 1`, id);
}

export async function getQuote(id: string) {
  await ensureDatabase();
  return firstQuote(`${QUOTE_SELECT} FROM quotes q WHERE q.id = ?`, id);
}

export async function listArchive(filters: { search?: string; author?: string; sourceType?: string; theme?: string; currencyTerm?: string } = {}) {
  await ensureDatabase();
  const clauses = [`q.public_domain_status IN ${SAFE_SQL}`];
  const values: unknown[] = [];
  if (filters.search) { clauses.push('(q.quote LIKE ? OR q.author LIKE ? OR q.title LIKE ?)'); values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`); }
  if (filters.author) { clauses.push('q.author = ?'); values.push(filters.author); }
  if (filters.sourceType) { clauses.push('q.source_type = ?'); values.push(filters.sourceType); }
  if (filters.theme) { clauses.push('q.themes LIKE ?'); values.push(`%"${filters.theme}"%`); }
  if (filters.currencyTerm) { clauses.push('q.currency_terms LIKE ?'); values.push(`%"${filters.currencyTerm}"%`); }
  const result = await database().prepare(`${QUOTE_SELECT}, l.publication_date AS publishedDate
    FROM publication_log l JOIN quotes q ON q.id = l.quote_id
    WHERE ${clauses.join(' AND ')} ORDER BY l.publication_date DESC`).bind(...values).all<Record<string, unknown>>();
  return result.results.map(hydrate);
}

export async function archiveFacets() {
  const quotes = await listArchive();
  return {
    authors: [...new Set(quotes.map((quote) => quote.author))].sort(),
    sourceTypes: [...new Set(quotes.map((quote) => quote.sourceType))].sort(),
    themes: [...new Set(quotes.flatMap((quote) => quote.themes))].sort(),
    currencyTerms: [...new Set(quotes.flatMap((quote) => quote.currencyTerms))].sort(),
  };
}

export async function listAdmin(filters: { search?: string; status?: string; rights?: string } = {}) {
  await ensureDatabase();
  const clauses = ['1 = 1'];
  const values: unknown[] = [];
  if (filters.search) { clauses.push('(quote LIKE ? OR author LIKE ? OR title LIKE ?)'); values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`); }
  if (filters.status) { clauses.push('status = ?'); values.push(filters.status); }
  if (filters.rights) { clauses.push('public_domain_status = ?'); values.push(filters.rights); }
  const result = await database().prepare(`${QUOTE_SELECT} FROM quotes q WHERE ${clauses.join(' AND ')}
    ORDER BY CASE WHEN q.status = 'scheduled' THEN 0 WHEN q.status = 'draft' THEN 1 ELSE 2 END,
    COALESCE(q.publish_date, '9999-12-31'), q.queue_position, q.updated_at DESC`).bind(...values).all<Record<string, unknown>>();
  return result.results.map(hydrate);
}

export async function saveQuote(input: QuoteInput) {
  await ensureDatabase();
  const db = database();
  const id = input.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO quotes (
    id, quote, author, speaker, title, year, publication_date, source_type,
    currency_terms, themes, context, show_context, repository, source_url,
    source_citation, public_domain_status, rights_note, publish_date, status,
    reusable, notes, queue_position, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    quote=excluded.quote, author=excluded.author, speaker=excluded.speaker,
    title=excluded.title, year=excluded.year, publication_date=excluded.publication_date,
    source_type=excluded.source_type, currency_terms=excluded.currency_terms,
    themes=excluded.themes, context=excluded.context, show_context=excluded.show_context,
    repository=excluded.repository, source_url=excluded.source_url,
    source_citation=excluded.source_citation, public_domain_status=excluded.public_domain_status,
    rights_note=excluded.rights_note, publish_date=excluded.publish_date,
    status=excluded.status, reusable=excluded.reusable, notes=excluded.notes,
    queue_position=excluded.queue_position, updated_at=excluded.updated_at`)
    .bind(id, input.quote, input.author, input.speaker, input.title, input.year,
      input.publicationDate, input.sourceType, JSON.stringify(input.currencyTerms),
      JSON.stringify(input.themes), input.context, input.showContext ? 1 : 0,
      input.repository, input.sourceUrl, input.sourceCitation, input.publicDomainStatus,
      input.rightsNote, input.publishDate, input.status, input.reusable ? 1 : 0,
      input.notes, input.queuePosition, now, now).run();
  return id;
}

export async function deleteQuote(id: string) {
  await ensureDatabase();
  const db = database();
  await db.batch([
    db.prepare('DELETE FROM publication_log WHERE quote_id = ?').bind(id),
    db.prepare('DELETE FROM quotes WHERE id = ?').bind(id),
  ]);
}

export async function duplicateQuote(id: string) {
  const original = await getQuote(id);
  if (!original) throw new Error('Quote not found.');
  return saveQuote({ ...original, id: undefined, status: 'draft', publishDate: null, reusable: false, notes: original.notes ? `${original.notes}\nDuplicated from ${original.id}` : `Duplicated from ${original.id}` });
}

export async function moveQuote(id: string, direction: 'up' | 'down') {
  await ensureDatabase();
  const quote = await getQuote(id);
  if (!quote || quote.publishDate || quote.status !== 'scheduled') return;
  const operator = direction === 'up' ? '<' : '>';
  const ordering = direction === 'up' ? 'DESC' : 'ASC';
  const neighbor = await firstQuote(`${QUOTE_SELECT} FROM quotes q WHERE q.status = 'scheduled'
    AND (q.publish_date IS NULL OR q.publish_date = '') AND q.queue_position ${operator} ?
    ORDER BY q.queue_position ${ordering} LIMIT 1`, quote.queuePosition);
  if (!neighbor) return;
  const db = database();
  await db.batch([
    db.prepare('UPDATE quotes SET queue_position = ? WHERE id = ?').bind(neighbor.queuePosition, quote.id),
    db.prepare('UPDATE quotes SET queue_position = ? WHERE id = ?').bind(quote.queuePosition, neighbor.id),
  ]);
}

export async function statistics() {
  const all = await listAdmin();
  const count = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1; return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const centuries = all.map((quote) => {
    const year = Number.parseInt(quote.year || '', 10);
    return Number.isFinite(year) ? `${Math.ceil(year / 100)}th century` : 'Unknown';
  });
  return {
    total: all.length,
    centuries: count(centuries),
    genres: count(all.map((quote) => quote.sourceType)),
    repositories: count(all.map((quote) => quote.repository || 'Unspecified')),
    themes: count(all.flatMap((quote) => quote.themes)),
    currencyTerms: count(all.flatMap((quote) => quote.currencyTerms)),
  };
}
