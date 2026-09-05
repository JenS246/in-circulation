import { deleteQuote, duplicateQuote, moveQuote, saveQuote } from '@/lib/db';
import { quoteFromForm, requireEditorApi } from '@/lib/admin';

export async function POST(request: Request) {
  if (!await requireEditorApi()) return new Response('Unauthorized', { status: 401 });
  const form = await request.formData();
  const operation = String(form.get('operation') || 'save');
  const id = String(form.get('id') || '');
  try {
    if (operation === 'delete') await deleteQuote(id);
    else if (operation === 'duplicate') {
      const copyId = await duplicateQuote(id);
      return Response.redirect(new URL(`/admin/${copyId}/edit`, request.url), 303);
    } else if (operation === 'up' || operation === 'down') await moveQuote(id, operation);
    else await saveQuote(quoteFromForm(form));
    return Response.redirect(new URL('/admin', request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save the quotation.';
    return new Response(`<!doctype html><title>Could not save</title><main><h1>Could not save</h1><p>${escapeHtml(message)}</p><p><a href="/admin">Return to the editor</a></p></main>`, { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]!));
}
