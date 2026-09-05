import type { Quote } from './types';

export const CSV_HEADERS = [
  'id', 'quote', 'author', 'speaker', 'title', 'year', 'publicationDate', 'sourceType',
  'currencyTerms', 'themes', 'context', 'showContext', 'repository', 'sourceUrl',
  'sourceCitation', 'publicDomainStatus', 'rightsNote', 'publishDate', 'status',
  'reusable', 'notes', 'queuePosition',
];

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); if (row.some((value) => value.length)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  row.push(cell); if (row.some((value) => value.length)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function escapeCell(value: unknown) {
  const string = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return `"${string.replace(/"/g, '""')}"`;
}

export function toCsv(quotes: Quote[]) {
  const lines = [CSV_HEADERS.map(escapeCell).join(',')];
  for (const quote of quotes) lines.push(CSV_HEADERS.map((header) => escapeCell(quote[header as keyof Quote])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export function listFromImport(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  const string = String(value ?? '').trim();
  if (!string) return [];
  if (string.startsWith('[')) {
    try { const parsed = JSON.parse(string); if (Array.isArray(parsed)) return parsed.map(String); } catch { /* use separators */ }
  }
  return string.split('|').map((item) => item.trim()).filter(Boolean);
}

export function boolFromImport(value: unknown) {
  return ['true', '1', 'yes', 'on'].includes(String(value ?? '').toLowerCase());
}
