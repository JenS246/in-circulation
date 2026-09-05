import { requireEditorApi } from '@/lib/admin';
import { listAdmin } from '@/lib/db';
import { toCsv } from '@/lib/csv';

export async function GET() {
  if (!await requireEditorApi()) return new Response('Unauthorized', { status: 401 });
  return new Response(toCsv(await listAdmin()), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="in-circulation-quotes.csv"' },
  });
}
