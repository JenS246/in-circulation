import type { Quote } from './types';

export function excerpt(text: string, max = 170) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function attribution(quote: Quote) {
  const creator = quote.speaker && quote.speaker !== quote.author
    ? `${quote.speaker} (in ${quote.author})`
    : quote.author;
  return `${creator}\n${quote.title}${quote.year ? `, ${quote.year}` : ''}`;
}

export function copyText(quote: Quote) {
  return `“${quote.quote}”\n\n${attribution(quote)}`;
}

export function parseList(value: FormDataEntryValue | null) {
  return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function csvCell(value: unknown) {
  const string = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return `"${string.replace(/"/g, '""')}"`;
}
