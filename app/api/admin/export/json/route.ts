import { requireEditorApi } from '@/lib/admin';
import { getTimezone, listAdmin } from '@/lib/db';

export async function GET() {
  if (!await requireEditorApi()) return new Response('Unauthorized', { status: 401 });
  const [quotes, timezone] = await Promise.all([listAdmin(), getTimezone()]);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), timezone, quotes }, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="in-circulation-quotes.json"' },
  });
}
