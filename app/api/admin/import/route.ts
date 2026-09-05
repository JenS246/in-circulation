import { quoteFromForm, requireEditorApi } from '@/lib/admin';
import { boolFromImport, listFromImport, parseCsv } from '@/lib/csv';
import { saveQuote } from '@/lib/db';

export async function POST(request: Request) {
  if (!await requireEditorApi()) return new Response('Unauthorized', { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return new Response('Choose a CSV or JSON file.', { status: 400 });
  const text = await file.text();
  let records: Record<string, unknown>[];
  try {
    if (file.name.toLowerCase().endsWith('.json') || file.type.includes('json')) {
      const parsed = JSON.parse(text) as unknown;
      const items = Array.isArray(parsed) ? parsed : (parsed as { quotes?: unknown[] })?.quotes;
      if (!Array.isArray(items)) throw new Error('JSON must be an array or an object with a quotes array.');
      records = items as Record<string, unknown>[];
    } else records = parseCsv(text);
  } catch (error) {
    return resultPage(0, [error instanceof Error ? error.message : 'The file could not be parsed.']);
  }
  let imported = 0;
  const errors: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    try {
      const record = records[index];
      const quoteForm = new FormData();
      const fields = ['id','quote','author','speaker','title','year','publicationDate','sourceType','context','repository','sourceUrl','sourceCitation','publicDomainStatus','rightsNote','publishDate','status','notes','queuePosition'];
      fields.forEach((key) => quoteForm.set(key, String(record[key] ?? '')));
      quoteForm.set('currencyTerms', listFromImport(record.currencyTerms).join(', '));
      quoteForm.set('themes', listFromImport(record.themes).join(', '));
      if (boolFromImport(record.showContext)) quoteForm.set('showContext', 'on');
      if (boolFromImport(record.reusable)) quoteForm.set('reusable', 'on');
      await saveQuote(quoteFromForm(quoteForm));
      imported += 1;
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Could not import this row.'}`);
    }
  }
  return resultPage(imported, errors);
}

function resultPage(imported: number, errors: string[]) {
  const list = errors.length ? `<h2>Errors</h2><ol>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ol>` : '<p>No errors.</p>';
  return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><title>Import result</title><main><h1>Import complete</h1><p>${imported} record${imported === 1 ? '' : 's'} imported.</p>${list}<p><a href="/admin/import">Import another file</a></p><p><a href="/admin">Return to quotes</a></p></main>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]!)); }
