export const SOURCE_TYPES = [
  'Fiction', 'Poetry', 'Play', 'Nonfiction', 'Letter', 'Diary', 'Oral history',
  'Court opinion', 'Government document', 'Newspaper', 'Song', 'Film', 'Other',
];

export const RIGHTS_STATUSES = [
  'Verified Public Domain', 'U.S. Government Work', 'Permission / Open License',
  'Needs Review', 'Do Not Publish',
];

export const SAFE_RIGHTS = RIGHTS_STATUSES.slice(0, 3);
export const QUOTE_STATUSES = ['draft', 'scheduled', 'published'];

export function localDate(timezone = 'America/New_York', date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return localDate('America/New_York', date);
  }
}

export function isIsoDate(value) {
  return !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.length)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

export function listValue(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    } catch { /* Fall back to separators. */ }
  }
  return text.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
}

export function booleanValue(value) {
  return value === true || ['true', '1', 'yes', 'on'].includes(String(value ?? '').toLowerCase());
}

export function validateQuote(record, { allowId = true } = {}) {
  const quote = String(record.quote ?? '');
  const author = String(record.author ?? '').trim();
  const title = String(record.title ?? '').trim();
  const sourceUrl = String(record.sourceUrl ?? '').trim();
  const sourceType = String(record.sourceType ?? 'Other');
  const publicDomainStatus = String(record.publicDomainStatus ?? 'Needs Review');
  const status = String(record.status ?? 'draft');
  const publishDate = String(record.publishDate ?? '').trim() || null;
  const errors = [];
  if (!quote.trim()) errors.push('Quotation text is required.');
  if (!author) errors.push('Author is required.');
  if (!title) errors.push('Title is required.');
  if (!sourceUrl) errors.push('Original source URL is required.');
  else {
    try {
      const parsedUrl = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) errors.push('Source URL must use HTTP or HTTPS.');
    } catch { errors.push('Source URL must be a complete URL.'); }
  }
  if (!SOURCE_TYPES.includes(sourceType)) errors.push('Source type is not recognized.');
  if (!RIGHTS_STATUSES.includes(publicDomainStatus)) errors.push('Rights status is not recognized.');
  if (!QUOTE_STATUSES.includes(status)) errors.push('Publication status is not recognized.');
  if (!isIsoDate(publishDate)) errors.push('Publish date must use YYYY-MM-DD.');
  if (errors.length) throw new Error(errors.join(' '));
  const nullable = (key) => String(record[key] ?? '').trim() || null;
  return {
    id: allowId ? nullable('id') : null,
    quote,
    author,
    speaker: nullable('speaker'),
    title,
    year: nullable('year'),
    publicationDate: nullable('publicationDate'),
    sourceType,
    currencyTerms: listValue(record.currencyTerms),
    themes: listValue(record.themes),
    context: nullable('context'),
    showContext: booleanValue(record.showContext),
    repository: nullable('repository'),
    sourceUrl,
    sourceCitation: nullable('sourceCitation'),
    publicDomainStatus,
    rightsNote: nullable('rightsNote'),
    publishDate,
    status,
    reusable: booleanValue(record.reusable),
    notes: nullable('notes'),
    queuePosition: Number(record.queuePosition) || Date.now(),
  };
}

export function csvCell(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function excerpt(value, maximum = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum - 1).replace(/\s+\S*$/, '')}…`;
}
