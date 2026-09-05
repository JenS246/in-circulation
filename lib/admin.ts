import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import { getChatGPTUser, requireChatGPTUser } from '@/app/chatgpt-auth';
import { isIsoDate } from './date';
import { parseList } from './format';
import { QUOTE_STATUSES, RIGHTS_STATUSES, SOURCE_TYPES, type QuoteInput } from './types';

function allowedEmails() {
  const value = (env as unknown as { ADMIN_EMAILS?: string }).ADMIN_EMAILS || '';
  return value.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export async function requireEditor(returnTo: string) {
  const user = await requireChatGPTUser(returnTo);
  const allowlist = allowedEmails();
  if (allowlist.length && !allowlist.includes(user.email.toLowerCase())) redirect('/');
  return user;
}

export async function requireEditorApi() {
  const user = await getChatGPTUser();
  const allowlist = allowedEmails();
  if (!user || (allowlist.length && !allowlist.includes(user.email.toLowerCase()))) {
    return false;
  }
  return true;
}

function clean(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim();
  return value || null;
}

export function quoteFromForm(form: FormData): QuoteInput {
  const quote = String(form.get('quote') ?? '');
  const author = String(form.get('author') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  const sourceUrl = String(form.get('sourceUrl') ?? '').trim();
  const sourceType = String(form.get('sourceType') ?? 'Other');
  const publicDomainStatus = String(form.get('publicDomainStatus') ?? 'Needs Review');
  const status = String(form.get('status') ?? 'draft');
  const publishDate = clean(form, 'publishDate');
  const errors: string[] = [];
  if (!quote.trim()) errors.push('Quotation text is required.');
  if (!author) errors.push('Author is required.');
  if (!title) errors.push('Title is required.');
  if (!sourceUrl) errors.push('Original source URL is required.');
  else { try { new URL(sourceUrl); } catch { errors.push('Source URL must be a complete URL.'); } }
  if (!SOURCE_TYPES.includes(sourceType as (typeof SOURCE_TYPES)[number])) errors.push('Source type is not recognized.');
  if (!RIGHTS_STATUSES.includes(publicDomainStatus as (typeof RIGHTS_STATUSES)[number])) errors.push('Rights status is not recognized.');
  if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) errors.push('Publication status is not recognized.');
  if (publishDate && !isIsoDate(publishDate)) errors.push('Publish date must use YYYY-MM-DD.');
  if (errors.length) throw new Error(errors.join(' '));
  return {
    id: clean(form, 'id') || undefined,
    quote, author, title, sourceUrl, sourceType, publicDomainStatus, status,
    speaker: clean(form, 'speaker'), year: clean(form, 'year'),
    publicationDate: clean(form, 'publicationDate'), currencyTerms: parseList(form.get('currencyTerms')),
    themes: parseList(form.get('themes')), context: clean(form, 'context'),
    showContext: form.get('showContext') === 'on', repository: clean(form, 'repository'),
    sourceCitation: clean(form, 'sourceCitation'), rightsNote: clean(form, 'rightsNote'),
    publishDate, reusable: form.get('reusable') === 'on', notes: clean(form, 'notes'),
    queuePosition: Number(form.get('queuePosition')) || Date.now(),
  };
}
