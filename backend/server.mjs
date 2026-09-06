import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SAFE_RIGHTS, booleanValue, csvCell, excerpt, listValue, localDate, parseCsv, validateQuote,
} from './core.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = process.env.DATA_DIR || join(projectRoot, 'data');
const port = Number(process.env.PORT || 8792);
const adminUsername = process.env.ADMIN_USERNAME || 'curator';
const adminPassword = process.env.ADMIN_PASSWORD || '';
const frontendUrl = process.env.FRONTEND_URL || 'https://jens246.github.io/in-circulation/';
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'https://jens246.github.io,http://127.0.0.1:4174,http://localhost:4174').split(',').map((value) => value.trim()).filter(Boolean));

if (!adminPassword) throw new Error('ADMIN_PASSWORD is required.');
mkdirSync(dataDirectory, { recursive: true });
const database = new DatabaseSync(join(dataDirectory, 'in-circulation.sqlite3'));
database.exec('PRAGMA journal_mode = WAL');
database.exec('PRAGMA foreign_keys = ON');
database.exec(`
CREATE TABLE IF NOT EXISTS quotes (
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
);
CREATE TABLE IF NOT EXISTS publication_log (
  publication_date TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  timezone TEXT NOT NULL DEFAULT 'America/New_York'
);
CREATE INDEX IF NOT EXISTS idx_quotes_publish_date ON quotes(publish_date);
CREATE INDEX IF NOT EXISTS idx_quotes_status_queue ON quotes(status, queue_position);
CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(author);
CREATE INDEX IF NOT EXISTS idx_quotes_source_type ON quotes(source_type);
CREATE INDEX IF NOT EXISTS idx_publication_log_quote_id ON publication_log(quote_id);
INSERT OR IGNORE INTO site_config (id, timezone) VALUES (1, 'America/New_York');
`);

const quoteColumns = `
  q.id, q.quote, q.author, q.speaker, q.title, q.year,
  q.publication_date AS publicationDate, q.source_type AS sourceType,
  q.currency_terms AS currencyTerms, q.themes, q.context,
  q.show_context AS showContext, q.repository, q.source_url AS sourceUrl,
  q.source_citation AS sourceCitation, q.public_domain_status AS publicDomainStatus,
  q.rights_note AS rightsNote, q.publish_date AS publishDate, q.status, q.reusable,
  q.notes, q.queue_position AS queuePosition, q.created_at AS createdAt, q.updated_at AS updatedAt`;
const safePlaceholders = SAFE_RIGHTS.map(() => '?').join(',');
const exportHeaders = [
  'id', 'quote', 'author', 'speaker', 'title', 'year', 'publicationDate', 'sourceType',
  'currencyTerms', 'themes', 'context', 'showContext', 'repository', 'sourceUrl',
  'sourceCitation', 'publicDomainStatus', 'rightsNote', 'publishDate', 'status',
  'reusable', 'notes', 'queuePosition',
];
const failedLogins = new Map();

seedPlaceholders();

function seedPlaceholders() {
  if (database.prepare('SELECT COUNT(*) AS count FROM quotes').get().count) return;
  const insert = database.prepare(`INSERT INTO quotes (
    id, quote, author, title, source_type, currency_terms, themes, repository,
    source_url, public_domain_status, rights_note, status, reusable,
    queue_position, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0, ?, ?, ?)`);
  const now = new Date().toISOString();
  for (let index = 1; index <= 10; index += 1) {
    insert.run(
      `sample-${String(index).padStart(2, '0')}`,
      `[PLACEHOLDER ${String(index).padStart(2, '0')}] Replace this text with a verified quotation. Line breaks, punctuation, capitalization, and spelling will be preserved exactly.`,
      'In Circulation sample', 'Editorial placeholder', 'Other',
      JSON.stringify([['money', 'wages', 'coin', 'payment', 'currency'][(index - 1) % 5]]),
      JSON.stringify([['value', 'labor', 'debt', 'exchange', 'trust'][(index - 1) % 5]]),
      'Placeholder repository', 'https://example.com/replace-with-original-source',
      'Permission / Open License',
      'Demonstration placeholder. Replace with curator-supplied source and rights research before launch.',
      index, now, now,
    );
  }
}

function hydrate(row, { publicOnly = false } = {}) {
  if (!row) return null;
  const value = { ...row };
  try { value.currencyTerms = JSON.parse(value.currencyTerms || '[]'); } catch { value.currencyTerms = []; }
  try { value.themes = JSON.parse(value.themes || '[]'); } catch { value.themes = []; }
  value.showContext = Boolean(value.showContext);
  value.reusable = Boolean(value.reusable);
  if (publicOnly) {
    if (!value.showContext) delete value.context;
    delete value.notes;
    delete value.queuePosition;
    delete value.createdAt;
    delete value.updatedAt;
  }
  return value;
}

function getTimezone() {
  return database.prepare('SELECT timezone FROM site_config WHERE id = 1').get()?.timezone || 'America/New_York';
}

function getTodayQuote() {
  const timezone = getTimezone();
  const date = localDate(timezone);
  let quote = database.prepare(`SELECT ${quoteColumns}, l.publication_date AS publishedDate
    FROM publication_log l JOIN quotes q ON q.id = l.quote_id
    WHERE l.publication_date = ? AND q.public_domain_status IN (${safePlaceholders})`).get(date, ...SAFE_RIGHTS);
  if (quote) return { date, timezone, quote: hydrate(quote, { publicOnly: true }) };

  quote = database.prepare(`SELECT ${quoteColumns} FROM quotes q
    WHERE q.publish_date = ? AND q.status IN ('scheduled','published')
      AND q.public_domain_status IN (${safePlaceholders})
      AND (q.reusable = 1 OR NOT EXISTS (SELECT 1 FROM publication_log px WHERE px.quote_id = q.id))
    ORDER BY q.queue_position, q.created_at LIMIT 1`).get(date, ...SAFE_RIGHTS);
  if (!quote) quote = database.prepare(`SELECT ${quoteColumns} FROM quotes q
    WHERE q.status = 'scheduled' AND (q.publish_date IS NULL OR q.publish_date = '')
      AND q.public_domain_status IN (${safePlaceholders})
      AND (q.reusable = 1 OR NOT EXISTS (SELECT 1 FROM publication_log px WHERE px.quote_id = q.id))
    ORDER BY q.reusable ASC, q.queue_position ASC,
      (SELECT MAX(publication_date) FROM publication_log pr WHERE pr.quote_id = q.id) ASC,
      q.created_at ASC LIMIT 1`).get(...SAFE_RIGHTS);
  if (!quote) return { date, timezone, quote: null };

  const now = new Date().toISOString();
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('INSERT OR REPLACE INTO publication_log (publication_date, quote_id, created_at) VALUES (?, ?, ?)').run(date, quote.id, now);
    if (!quote.reusable) database.prepare("UPDATE quotes SET status = 'published', publish_date = ?, updated_at = ? WHERE id = ?").run(date, now, quote.id);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return { date, timezone, quote: hydrate({ ...quote, publishedDate: date }, { publicOnly: true }) };
}

function publicQuote(id) {
  const row = database.prepare(`SELECT ${quoteColumns}, l.publication_date AS publishedDate
    FROM quotes q JOIN publication_log l ON l.quote_id = q.id
    WHERE q.id = ? AND q.public_domain_status IN (${safePlaceholders})
    ORDER BY l.publication_date DESC LIMIT 1`).get(id, ...SAFE_RIGHTS);
  return hydrate(row, { publicOnly: true });
}

function archive(searchParams) {
  const clauses = [`q.public_domain_status IN (${safePlaceholders})`];
  const values = [...SAFE_RIGHTS];
  const search = searchParams.get('search')?.trim();
  if (search) { clauses.push('(q.quote LIKE ? OR q.author LIKE ? OR q.title LIKE ?)'); values.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  for (const [parameter, column] of [['author', 'q.author'], ['sourceType', 'q.source_type']]) {
    const value = searchParams.get(parameter)?.trim();
    if (value) { clauses.push(`${column} = ?`); values.push(value); }
  }
  for (const [parameter, column] of [['theme', 'q.themes'], ['currencyTerm', 'q.currency_terms']]) {
    const value = searchParams.get(parameter)?.trim();
    if (value) { clauses.push(`${column} LIKE ?`); values.push(`%"${value}"%`); }
  }
  return database.prepare(`SELECT ${quoteColumns}, l.publication_date AS publishedDate
    FROM publication_log l JOIN quotes q ON q.id = l.quote_id
    WHERE ${clauses.join(' AND ')} ORDER BY l.publication_date DESC`).all(...values).map((row) => hydrate(row, { publicOnly: true }));
}

function allAdmin(searchParams = new URLSearchParams()) {
  const clauses = ['1 = 1'];
  const values = [];
  const search = searchParams.get('search')?.trim();
  if (search) { clauses.push('(q.quote LIKE ? OR q.author LIKE ? OR q.title LIKE ?)'); values.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  for (const [parameter, column] of [['status', 'q.status'], ['rights', 'q.public_domain_status']]) {
    const value = searchParams.get(parameter)?.trim();
    if (value) { clauses.push(`${column} = ?`); values.push(value); }
  }
  return database.prepare(`SELECT ${quoteColumns} FROM quotes q WHERE ${clauses.join(' AND ')}
    ORDER BY CASE q.status WHEN 'scheduled' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
      COALESCE(q.publish_date, '9999-12-31'), q.queue_position, q.updated_at DESC`).all(...values).map((row) => hydrate(row));
}

function saveQuote(record) {
  const input = validateQuote(record);
  const id = input.id || randomUUID();
  if (input.id && (record.queuePosition === undefined || record.queuePosition === null || record.queuePosition === '')) {
    input.queuePosition = database.prepare('SELECT queue_position AS queuePosition FROM quotes WHERE id = ?').get(input.id)?.queuePosition || input.queuePosition;
  }
  const now = new Date().toISOString();
  database.prepare(`INSERT INTO quotes (
    id, quote, author, speaker, title, year, publication_date, source_type,
    currency_terms, themes, context, show_context, repository, source_url,
    source_citation, public_domain_status, rights_note, publish_date, status,
    reusable, notes, queue_position, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET quote=excluded.quote, author=excluded.author,
    speaker=excluded.speaker, title=excluded.title, year=excluded.year,
    publication_date=excluded.publication_date, source_type=excluded.source_type,
    currency_terms=excluded.currency_terms, themes=excluded.themes,
    context=excluded.context, show_context=excluded.show_context, repository=excluded.repository,
    source_url=excluded.source_url, source_citation=excluded.source_citation,
    public_domain_status=excluded.public_domain_status, rights_note=excluded.rights_note,
    publish_date=excluded.publish_date, status=excluded.status, reusable=excluded.reusable,
    notes=excluded.notes, queue_position=excluded.queue_position, updated_at=excluded.updated_at`)
    .run(id, input.quote, input.author, input.speaker, input.title, input.year,
      input.publicationDate, input.sourceType, JSON.stringify(input.currencyTerms),
      JSON.stringify(input.themes), input.context, input.showContext ? 1 : 0,
      input.repository, input.sourceUrl, input.sourceCitation, input.publicDomainStatus,
      input.rightsNote, input.publishDate, input.status, input.reusable ? 1 : 0,
      input.notes, input.queuePosition, now, now);
  return hydrate(database.prepare(`SELECT ${quoteColumns} FROM quotes q WHERE q.id = ?`).get(id));
}

function facets() {
  const quotes = archive(new URLSearchParams());
  return {
    authors: [...new Set(quotes.map((quote) => quote.author))].sort(),
    sourceTypes: [...new Set(quotes.map((quote) => quote.sourceType))].sort(),
    themes: [...new Set(quotes.flatMap((quote) => quote.themes))].sort(),
    currencyTerms: [...new Set(quotes.flatMap((quote) => quote.currencyTerms))].sort(),
  };
}

function statistics() {
  const quotes = archive(new URLSearchParams());
  const count = (items) => Object.entries(items.reduce((result, item) => ({ ...result, [item]: (result[item] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  return {
    total: quotes.length,
    centuries: count(quotes.map((quote) => { const year = Number.parseInt(quote.year || '', 10); return Number.isFinite(year) ? `${Math.ceil(year / 100)}th century` : 'Unknown'; })),
    genres: count(quotes.map((quote) => quote.sourceType)),
    repositories: count(quotes.map((quote) => quote.repository || 'Unspecified')),
    themes: count(quotes.flatMap((quote) => quote.themes)),
    currencyTerms: count(quotes.flatMap((quote) => quote.currencyTerms)),
  };
}

function secureEqual(left, right) {
  return timingSafeEqual(createHash('sha256').update(left).digest(), createHash('sha256').update(right).digest());
}

function authorized(request) {
  const ip = request.socket.remoteAddress || 'unknown';
  const attempt = failedLogins.get(ip);
  if (attempt && attempt.until > Date.now() && attempt.count >= 10) return 'blocked';
  const header = request.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let credentials = '';
  try { credentials = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch { return false; }
  const separator = credentials.indexOf(':');
  const username = separator >= 0 ? credentials.slice(0, separator) : '';
  const password = separator >= 0 ? credentials.slice(separator + 1) : '';
  const allowed = secureEqual(username, adminUsername) && secureEqual(password, adminPassword);
  if (allowed) { failedLogins.delete(ip); return true; }
  const current = failedLogins.get(ip) || { count: 0, until: Date.now() + 15 * 60_000 };
  current.count += 1;
  failedLogins.set(ip, current);
  return false;
}

function setHeaders(response, request, contentType = 'application/json; charset=utf-8') {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  response.setHeader('Content-Type', contentType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

function json(response, request, body, status = 200) {
  setHeaders(response, request);
  response.writeHead(status);
  response.end(JSON.stringify(body));
}

function html(response, request, body, status = 200) {
  setHeaders(response, request, 'text/html; charset=utf-8');
  response.writeHead(status);
  response.end(body);
}

async function body(request, maximum = 2_000_000) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maximum) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sharePage(quote) {
  const title = `In Circulation: ${quote.speaker || quote.author}`;
  const description = `${excerpt(quote.quote, 145)} - ${quote.speaker || quote.author}`;
  const target = `${frontendUrl}#/quote/${encodeURIComponent(quote.id)}`;
  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:site_name" content="In Circulation"><meta property="og:type" content="article"><meta property="og:image" content="${escape(`${frontendUrl}og.png`)}"><meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${escape(target)}"></head><body><p><a href="${escape(target)}">Read this quotation in In Circulation</a></p></body></html>`;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') { setHeaders(response, request); response.writeHead(204); response.end(); return; }
  try {
    if (url.pathname === '/api/health' && request.method === 'GET') return json(response, request, { status: 'ok', service: 'in-circulation-api' });
    if (url.pathname === '/api/today' && request.method === 'GET') return json(response, request, getTodayQuote());
    if (url.pathname === '/api/archive' && request.method === 'GET') return json(response, request, archive(url.searchParams));
    if (url.pathname === '/api/facets' && request.method === 'GET') return json(response, request, facets());
    if (url.pathname === '/api/stats' && request.method === 'GET') return json(response, request, statistics());

    let match = url.pathname.match(/^\/api\/quotes\/([^/]+)$/);
    if (match && request.method === 'GET') {
      const quote = publicQuote(decodeURIComponent(match[1]));
      return quote ? json(response, request, quote) : json(response, request, { error: 'Quotation not found.' }, 404);
    }
    match = url.pathname.match(/^\/q\/([^/]+)$/);
    if (match && request.method === 'GET') {
      const quote = publicQuote(decodeURIComponent(match[1]));
      return quote ? html(response, request, sharePage(quote)) : html(response, request, '<h1>Quotation not found</h1>', 404);
    }

    if (url.pathname.startsWith('/api/admin/')) {
      const permission = authorized(request);
      if (permission !== true) return json(response, request, { error: permission === 'blocked' ? 'Too many failed sign-in attempts. Try again later.' : 'Authentication required.' }, permission === 'blocked' ? 429 : 401);

      if (url.pathname === '/api/admin/quotes' && request.method === 'GET') return json(response, request, allAdmin(url.searchParams));
      if (url.pathname === '/api/admin/quotes' && request.method === 'POST') return json(response, request, saveQuote(JSON.parse(await body(request))), 201);
      match = url.pathname.match(/^\/api\/admin\/quotes\/([^/]+)$/);
      if (match && request.method === 'GET') {
        const quote = hydrate(database.prepare(`SELECT ${quoteColumns} FROM quotes q WHERE q.id = ?`).get(decodeURIComponent(match[1])));
        return quote ? json(response, request, quote) : json(response, request, { error: 'Quotation not found.' }, 404);
      }
      if (match && request.method === 'PUT') return json(response, request, saveQuote({ ...JSON.parse(await body(request)), id: decodeURIComponent(match[1]) }));
      if (match && request.method === 'DELETE') {
        database.prepare('DELETE FROM quotes WHERE id = ?').run(decodeURIComponent(match[1]));
        setHeaders(response, request);
        response.writeHead(204); response.end(); return;
      }
      match = url.pathname.match(/^\/api\/admin\/quotes\/([^/]+)\/(duplicate|move)$/);
      if (match && request.method === 'POST') {
        const id = decodeURIComponent(match[1]);
        const quote = hydrate(database.prepare(`SELECT ${quoteColumns} FROM quotes q WHERE q.id = ?`).get(id));
        if (!quote) return json(response, request, { error: 'Quotation not found.' }, 404);
        if (match[2] === 'duplicate') return json(response, request, saveQuote({ ...quote, id: null, status: 'draft', publishDate: null, reusable: false, queuePosition: Date.now(), notes: quote.notes ? `${quote.notes}\nDuplicated from ${id}` : `Duplicated from ${id}` }), 201);
        const { direction } = JSON.parse(await body(request));
        if (!quote.publishDate && quote.status === 'scheduled' && ['up', 'down'].includes(direction)) {
          const operator = direction === 'up' ? '<' : '>';
          const order = direction === 'up' ? 'DESC' : 'ASC';
          const neighbor = database.prepare(`SELECT id, queue_position AS queuePosition FROM quotes WHERE status = 'scheduled' AND (publish_date IS NULL OR publish_date = '') AND queue_position ${operator} ? ORDER BY queue_position ${order} LIMIT 1`).get(quote.queuePosition);
          if (neighbor) {
            const update = database.prepare('UPDATE quotes SET queue_position = ?, updated_at = ? WHERE id = ?');
            const now = new Date().toISOString();
            database.exec('BEGIN IMMEDIATE');
            try { update.run(neighbor.queuePosition, now, quote.id); update.run(quote.queuePosition, now, neighbor.id); database.exec('COMMIT'); }
            catch (error) { database.exec('ROLLBACK'); throw error; }
          }
        }
        return json(response, request, { ok: true });
      }

      if (url.pathname === '/api/admin/import' && request.method === 'POST') {
        const format = url.searchParams.get('format') || 'json';
        const text = await body(request);
        let records;
        if (format === 'csv') records = parseCsv(text);
        else { const parsed = JSON.parse(text); records = Array.isArray(parsed) ? parsed : parsed.quotes; }
        if (!Array.isArray(records)) throw new Error('Import must contain an array of quote records.');
        let imported = 0;
        const errors = [];
        records.forEach((record, index) => { try { saveQuote(record); imported += 1; } catch (error) { errors.push({ row: index + 2, message: error.message }); } });
        return json(response, request, { imported, errors });
      }
      if (url.pathname === '/api/admin/export/json' && request.method === 'GET') return json(response, request, { exportedAt: new Date().toISOString(), timezone: getTimezone(), quotes: allAdmin() });
      if (url.pathname === '/api/admin/export/csv' && request.method === 'GET') {
        const rows = allAdmin();
        const csv = [exportHeaders.map(csvCell).join(','), ...rows.map((quote) => exportHeaders.map((key) => csvCell(quote[key])).join(','))].join('\r\n') + '\r\n';
        setHeaders(response, request, 'text/csv; charset=utf-8');
        response.setHeader('Content-Disposition', 'attachment; filename="in-circulation-quotes.csv"');
        response.writeHead(200); response.end(csv); return;
      }
      if (url.pathname === '/api/admin/settings' && request.method === 'GET') return json(response, request, { timezone: getTimezone() });
      if (url.pathname === '/api/admin/settings' && request.method === 'PUT') {
        const { timezone } = JSON.parse(await body(request));
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
        database.prepare('UPDATE site_config SET timezone = ? WHERE id = 1').run(timezone);
        return json(response, request, { timezone });
      }
    }
    return json(response, request, { error: 'Not found.' }, 404);
  } catch (error) {
    console.error(error);
    return json(response, request, { error: error instanceof Error ? error.message : 'Unexpected server error.' }, 400);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`In Circulation API listening on 0.0.0.0:${port}`);
});
