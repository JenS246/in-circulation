import { SiteHeader } from '@/components/SiteHeader';
import { requireEditor } from '@/lib/admin';
import { getTimezone } from '@/lib/db';

export const dynamic = 'force-dynamic';
export default async function Settings() {
  await requireEditor('/admin/settings');
  const timezone = await getTimezone();
  return <main className="page-shell admin-shell"><SiteHeader editor /><header className="editor-heading"><h1>Publication settings</h1><p>The daily edition changes at midnight in this timezone.</p></header><form className="settings-form" action="/api/admin/settings" method="post"><label>IANA timezone<input name="timezone" required defaultValue={timezone} /><span>Default: America/New_York</span></label><button className="solid-button" type="submit">Save settings</button></form></main>;
}
