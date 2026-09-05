import { requireEditorApi } from '@/lib/admin';
import { setTimezone } from '@/lib/db';

export async function POST(request: Request) {
  if (!await requireEditorApi()) return new Response('Unauthorized', { status: 401 });
  const form = await request.formData();
  try {
    await setTimezone(String(form.get('timezone') || ''));
    return Response.redirect(new URL('/admin/settings', request.url), 303);
  } catch {
    return new Response('Use a valid IANA timezone, such as America/New_York.', { status: 400 });
  }
}
