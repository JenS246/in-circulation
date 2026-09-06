const API_BASE = 'https://circulation.150-136-117-187.sslip.io';
const SITE_TITLE = 'In Circulation';
const SOURCE_TYPES = ['Fiction','Poetry','Play','Nonfiction','Letter','Diary','Oral history','Court opinion','Government document','Newspaper','Song','Other'];
const RIGHTS = ['Verified Public Domain','U.S. Government Work','Permission / Open License','Needs Review','Do Not Publish'];
const STATUSES = ['draft','scheduled','published'];
const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
const excerpt = (value, maximum = 170) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1).replace(/\s+\S*$/, '')}…`;
};
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)) : 'Unscheduled';
const selectOptions = (values, selected = '', blank = '') => `${blank ? `<option value="">${escapeHtml(blank)}</option>` : ''}${values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('')}`;
const auth = () => sessionStorage.getItem('in-circulation-auth');
const isFavorite = (id) => JSON.parse(localStorage.getItem('in-circulation-favorites') || '[]').includes(id);

function shell(content, active = '') {
  const current = (name) => active === name ? ' aria-current="page"' : '';
  return `<div class="shell">
    <header class="masthead"><a class="wordmark" href="#/">${SITE_TITLE}</a><nav aria-label="Primary">
      <a href="#/archive"${current('archive')}>Archive</a><a href="#/stats"${current('stats')}>Index</a><a href="#/admin"${current('admin')}>Editor</a>
    </nav></header>
    ${content}
    <footer class="site-footer"><span>One quotation, each day.</span><span>Text preserved as sourced.</span></footer>
  </div>`;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const type = response.headers.get('content-type') || '';
  const result = type.includes('json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(result?.error || `Request failed (${response.status}).`);
  return result;
}

async function adminApi(path, options = {}) {
  const credentials = auth();
  if (!credentials) throw new Error('Authentication required.');
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Basic ${credentials}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  try { return await api(`/api/admin${path}`, {...options, headers}); }
  catch (error) {
    if (/Authentication required/.test(error.message)) sessionStorage.removeItem('in-circulation-auth');
    throw error;
  }
}

function creator(quote) { return quote.speaker && quote.speaker !== quote.author ? quote.speaker : quote.author; }
function copyText(quote) {
  const attribution = `${creator(quote)}, ${quote.title}${quote.year ? ` (${quote.year})` : ''}`;
  return `${quote.quote}\n\n— ${attribution}`;
}

function quoteView(quote, dateLabel, today = false) {
  const name = creator(quote);
  return `<main id="main" class="daily-edition">
    <div class="edition-index" aria-label="Edition details"><span>${today ? 'Today' : 'Archive'}</span><time datetime="${escapeHtml(quote.publishedDate || quote.publishDate || '')}">${escapeHtml(dateLabel)}</time></div>
    <figure class="quotation"><blockquote>${escapeHtml(quote.quote)}</blockquote><figcaption>
      <strong>${escapeHtml(name)}</strong>
      ${quote.speaker && quote.speaker !== quote.author ? `<span>Written by ${escapeHtml(quote.author)}</span>` : ''}
      <span><cite>${escapeHtml(quote.title)}</cite>${quote.year ? `, ${escapeHtml(quote.year)}` : ''}</span>
    </figcaption></figure>
    <footer class="source-note"><div class="source-copy">
      <p>${escapeHtml(quote.sourceType)}${quote.repository ? ` · ${escapeHtml(quote.repository)}` : ''}</p>
      ${quote.sourceCitation ? `<p>${escapeHtml(quote.sourceCitation)}</p>` : ''}
      ${quote.context ? `<p class="public-context">${escapeHtml(quote.context)}</p>` : ''}
      <p class="rights">${escapeHtml(quote.publicDomainStatus)}${quote.rightsNote ? `. ${escapeHtml(quote.rightsNote)}` : ''}</p>
      <a class="source-link" href="${escapeHtml(quote.sourceUrl)}" rel="noreferrer" target="_blank">View original source</a>
    </div><div class="edition-actions">
      <button type="button" data-copy>Copy quote</button><button type="button" data-share>Share</button><button type="button" data-favorite>${isFavorite(quote.id) ? 'Bookmarked' : 'Bookmark'}</button><span class="action-message" aria-live="polite"></span>
    </div></footer>
  </main>`;
}

function wireQuoteActions(quote) {
  const message = document.querySelector('.action-message');
  document.querySelector('[data-copy]')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(copyText(quote));
    message.textContent = 'Copied.';
  });
  document.querySelector('[data-share]')?.addEventListener('click', async () => {
    const url = `${API_BASE}/q/${encodeURIComponent(quote.id)}`;
    if (navigator.share) await navigator.share({title:`${SITE_TITLE}: ${creator(quote)}`,text:excerpt(quote.quote),url});
    else { await navigator.clipboard.writeText(url); message.textContent = 'Link copied.'; }
  });
  document.querySelector('[data-favorite]')?.addEventListener('click', (event) => {
    const favorites = new Set(JSON.parse(localStorage.getItem('in-circulation-favorites') || '[]'));
    favorites.has(quote.id) ? favorites.delete(quote.id) : favorites.add(quote.id);
    localStorage.setItem('in-circulation-favorites', JSON.stringify([...favorites]));
    event.currentTarget.textContent = favorites.has(quote.id) ? 'Bookmarked' : 'Bookmark';
    message.textContent = favorites.has(quote.id) ? 'Saved locally.' : 'Removed.';
  });
}

async function home() {
  const result = await api('/api/today');
  if (!result.quote) {
    app.innerHTML = shell('<main id="main" class="empty-edition"><div><h1>No edition today.</h1><p>The curator has not scheduled an eligible quotation.</p><a href="#/archive">Browse the archive</a></div></main>');
    return;
  }
  app.innerHTML = shell(quoteView(result.quote, formatDate(result.date), true));
  wireQuoteActions(result.quote);
}

async function quotePage(id) {
  const quote = await api(`/api/quotes/${encodeURIComponent(id)}`);
  document.title = `${creator(quote)} — ${SITE_TITLE}`;
  app.innerHTML = shell(quoteView(quote, formatDate(quote.publishedDate)));
  wireQuoteActions(quote);
}

function archiveEntry(quote) {
  return `<article class="archive-entry"><time datetime="${escapeHtml(quote.publishedDate)}">${escapeHtml(formatDate(quote.publishedDate))}</time><div><a class="archive-quote" href="#/quote/${encodeURIComponent(quote.id)}">“${escapeHtml(excerpt(quote.quote, 260))}”</a><p><strong>${escapeHtml(creator(quote))}</strong><cite>${escapeHtml(quote.title)}</cite>${quote.year ? escapeHtml(quote.year) : ''}</p></div><span>${escapeHtml(quote.sourceType)}</span></article>`;
}

async function archivePage() {
  const [quotes, facets] = await Promise.all([api('/api/archive'), api('/api/facets')]);
  app.innerHTML = shell(`<main id="main" class="page"><header class="page-heading"><h1>Archive</h1><p>Previously circulated quotations, newest first.</p></header>
    <form class="archive-filters" id="archive-filters">
      <label class="wide-field">Search<input name="search" type="search" placeholder="Quote, author, or title"></label>
      <label>Author<select name="author">${selectOptions(facets.authors,'','All authors')}</select></label>
      <label>Source type<select name="sourceType">${selectOptions(facets.sourceTypes,'','All types')}</select></label>
      <label>Theme<select name="theme">${selectOptions(facets.themes,'','All themes')}</select></label>
      <label>Currency term<select name="currencyTerm">${selectOptions(facets.currencyTerms,'','All terms')}</select></label>
      <button class="solid-button" type="submit">Filter</button>
    </form><div class="archive-list"><p class="result-count"><span data-count>${quotes.length}</span> edition${quotes.length === 1 ? '' : 's'}</p><div data-results>${quotes.map(archiveEntry).join('') || '<p class="empty-list">No published quotations yet.</p>'}</div></div></main>`, 'archive');
  document.querySelector('#archive-filters').addEventListener('submit', async (event) => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(event.currentTarget));
    [...params].forEach(([key,value]) => { if (!value) params.delete(key); });
    const results = await api(`/api/archive?${params}`);
    document.querySelector('[data-count]').textContent = results.length;
    document.querySelector('[data-results]').innerHTML = results.map(archiveEntry).join('') || '<p class="empty-list">No quotations match those filters.</p>';
  });
}

function tally(title, rows) {
  return `<section><h2>${escapeHtml(title)}</h2><dl>${rows.map(([label,count]) => `<div><dt>${escapeHtml(label)}</dt><dd>${count}</dd></div>`).join('') || '<p>No data yet.</p>'}</dl></section>`;
}
async function statsPage() {
  const stats = await api('/api/stats');
  app.innerHTML = shell(`<main id="main" class="page"><header class="page-heading"><h1>Index</h1><p>${stats.total} quotation records in the collection.</p></header><div class="stats-grid"><div>${tally('By century',stats.centuries)}${tally('By source type',stats.genres)}${tally('By repository',stats.repositories)}</div><div>${tally('By theme',stats.themes)}${tally('By currency term',stats.currencyTerms)}</div></div></main>`, 'stats');
}

function loginPage(message = '') {
  app.innerHTML = shell(`<main id="main" class="page"><header class="page-heading"><h1>Editor</h1><p>Private access for the curator.</p></header>${message ? `<p class="notice error">${escapeHtml(message)}</p>` : ''}<form id="login" class="login-form"><label>Username<input name="username" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="solid-button" type="submit">Sign in</button></form></main>`, 'admin');
  document.querySelector('#login').addEventListener('submit', async (event) => {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    sessionStorage.setItem('in-circulation-auth', btoa(`${fields.get('username')}:${fields.get('password')}`));
    try { await adminApi('/quotes'); location.hash = '#/admin'; await adminPage(); }
    catch (error) { sessionStorage.removeItem('in-circulation-auth'); loginPage(error.message); }
  });
}

function adminRow(quote) {
  const unsafe = ['Needs Review','Do Not Publish'].includes(quote.publicDomainStatus);
  const canMove = quote.status === 'scheduled' && !quote.publishDate;
  return `<div class="quote-row"><div><a href="#/admin/edit/${encodeURIComponent(quote.id)}"><strong>${escapeHtml(excerpt(quote.quote, 90))}</strong><span>${escapeHtml(quote.author)} · ${escapeHtml(quote.title)}</span></a></div><div><strong>${escapeHtml(quote.status)}</strong><span>${escapeHtml(quote.publishDate || 'Unscheduled')}</span></div><div class="${unsafe ? 'hold' : ''}"><strong>${escapeHtml(quote.publicDomainStatus)}</strong><span>${escapeHtml(quote.sourceType)}</span></div><div class="row-actions"><a href="#/admin/edit/${encodeURIComponent(quote.id)}">Edit</a><button data-action="duplicate" data-id="${escapeHtml(quote.id)}">Duplicate</button>${canMove ? `<button data-action="up" data-id="${escapeHtml(quote.id)}">↑ Up</button><button data-action="down" data-id="${escapeHtml(quote.id)}">↓ Down</button>` : ''}<button class="danger" data-action="delete" data-id="${escapeHtml(quote.id)}">Delete</button></div></div>`;
}

async function adminPage() {
  if (!auth()) return loginPage();
  let quotes;
  try { quotes = await adminApi('/quotes'); } catch (error) { return loginPage(error.message); }
  const count = (status) => quotes.filter((quote) => quote.status === status).length;
  const upcoming = quotes.filter((quote) => quote.publishDate && quote.status === 'scheduled').length;
  app.innerHTML = shell(`<main id="main" class="page"><header class="admin-heading"><div><h1>Editor</h1><p>Rights status remains visible at every step.</p></div><a class="solid-button" href="#/admin/new">Add quotation</a></header>
    <div class="admin-summary"><p><strong>${quotes.length}</strong>Total</p><p><strong>${count('published')}</strong>Published</p><p><strong>${count('draft')}</strong>Drafts</p><p><strong>${upcoming}</strong>Upcoming</p></div>
    <nav class="admin-tools" aria-label="Editor tools"><a href="#/admin/import">Import / export</a><a href="#/admin/settings">Timezone</a><button class="link-button" data-signout>Sign out</button></nav>
    <form class="admin-filters" id="admin-filters"><label>Search<input name="search" type="search" placeholder="Quote, author, or title"></label><label>Status<select name="status">${selectOptions(STATUSES,'','All statuses')}</select></label><label>Rights<select name="rights">${selectOptions(RIGHTS,'','All rights states')}</select></label><button class="solid-button" type="submit">Filter</button></form>
    <div class="quote-table"><div class="quote-row quote-row-head"><div>Quotation</div><div>Publication</div><div>Rights</div><div>Actions</div></div><div data-admin-results>${quotes.map(adminRow).join('')}</div></div></main>`, 'admin');
  document.querySelector('[data-signout]').addEventListener('click', () => { sessionStorage.removeItem('in-circulation-auth'); loginPage(); });
  document.querySelector('#admin-filters').addEventListener('submit', async (event) => {
    event.preventDefault(); const params = new URLSearchParams(new FormData(event.currentTarget));
    [...params].forEach(([key,value]) => { if (!value) params.delete(key); });
    const results = await adminApi(`/quotes?${params}`); document.querySelector('[data-admin-results]').innerHTML = results.map(adminRow).join('');
  });
  document.querySelector('[data-admin-results]').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const {action,id} = button.dataset;
    if (action === 'delete') {
      if (!confirm('Delete this quotation? This cannot be undone from the editor.')) return;
      await adminApi(`/quotes/${encodeURIComponent(id)}`, {method:'DELETE'});
    } else if (action === 'duplicate') await adminApi(`/quotes/${encodeURIComponent(id)}/duplicate`, {method:'POST'});
    else await adminApi(`/quotes/${encodeURIComponent(id)}/move`, {method:'POST',body:JSON.stringify({direction:action})});
    await adminPage();
  });
}

const field = (label, name, value = '', options = {}) => `<label class="${options.className || ''}">${label}${options.help ? `<small>${options.help}</small>` : ''}${options.type === 'textarea' ? `<textarea name="${name}"${options.required ? ' required' : ''}>${escapeHtml(value || '')}</textarea>` : options.values ? `<select name="${name}">${selectOptions(options.values,value,options.blank || '')}</select>` : `<input name="${name}" type="${options.type || 'text'}" value="${escapeHtml(value || '')}"${options.required ? ' required' : ''}${options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : ''}>`}</label>`;

function formRecord(form) {
  const data = Object.fromEntries(new FormData(form));
  data.showContext = form.elements.showContext.checked;
  data.reusable = form.elements.reusable.checked;
  data.currencyTerms = data.currencyTerms.split('|').map((v) => v.trim()).filter(Boolean);
  data.themes = data.themes.split('|').map((v) => v.trim()).filter(Boolean);
  return data;
}

async function editorPage(id) {
  if (!auth()) return loginPage();
  const quote = id ? await adminApi(`/quotes/${encodeURIComponent(id)}`) : {sourceType:'Other',publicDomainStatus:'Needs Review',status:'draft',currencyTerms:[],themes:[],showContext:false,reusable:false};
  app.innerHTML = shell(`<main id="main" class="page"><header class="editor-heading"><h1>${id ? 'Edit quotation' : 'Add quotation'}</h1><p>Paste faithfully. The application never rewrites quotation text.</p></header><form class="quote-form" id="quote-form">
    <div class="form-primary">${field('Quotation','quote',quote.quote,{type:'textarea',required:true,help:'Line and stanza breaks are preserved exactly.'})}${field('Original source URL','sourceUrl',quote.sourceUrl,{type:'url',required:true})}</div>
    <div class="form-grid">${field('Author','author',quote.author,{required:true})}${field('Speaker, if different','speaker',quote.speaker)}${field('Title','title',quote.title,{required:true})}${field('Year','year',quote.year)}${field('Publication date','publicationDate',quote.publicationDate,{help:'As known; free-form bibliographic date.'})}${field('Source type','sourceType',quote.sourceType,{values:SOURCE_TYPES})}${field('Repository','repository',quote.repository)}${field('Citation / page / chapter / stanza','sourceCitation',quote.sourceCitation)}${field('Currency terms','currencyTerms',(quote.currencyTerms || []).join(' | '),{help:'Separate multiple terms with |.'})}${field('Themes','themes',(quote.themes || []).join(' | '),{help:'Separate multiple themes with |.'})}${field('Internal context','context',quote.context,{type:'textarea',className:'span-two'})}<label class="check-field"><input name="showContext" type="checkbox"${quote.showContext ? ' checked' : ''}> Display context publicly</label>${field('Internal notes','notes',quote.notes,{type:'textarea',className:'span-two'})}</div>
    <section class="rights-panel"><h2>Rights and publication</h2><div class="form-grid">${field('Public-domain status','publicDomainStatus',quote.publicDomainStatus,{values:RIGHTS})}${field('Rights note','rightsNote',quote.rightsNote)}${field('Workflow status','status',quote.status,{values:STATUSES})}${field('Publish date','publishDate',quote.publishDate,{type:'date',help:'YYYY-MM-DD in the configured timezone.'})}<label class="check-field"><input name="reusable" type="checkbox"${quote.reusable ? ' checked' : ''}> Allow automatic reuse</label></div><p class="rights-warning">Needs Review and Do Not Publish records are never selected automatically.</p></section>
    <div class="form-actions"><button class="solid-button" type="submit">Save quotation</button><button class="text-button" type="button" data-preview>Preview</button><a href="#/admin">Cancel</a><span data-form-message aria-live="polite"></span></div></form></main>`, 'admin');
  const form = document.querySelector('#quote-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const record = formRecord(form); const message = document.querySelector('[data-form-message]');
    try {
      const saved = await adminApi(id ? `/quotes/${encodeURIComponent(id)}` : '/quotes', {method:id ? 'PUT' : 'POST',body:JSON.stringify(record)});
      message.textContent = 'Saved.'; location.hash = `#/admin/edit/${saved.id}`;
    } catch (error) { message.textContent = error.message; }
  });
  document.querySelector('[data-preview]').addEventListener('click', () => {
    const record = {...quote,...formRecord(form),id:quote.id || 'preview'};
    const dialog = document.createElement('dialog');
    dialog.innerHTML = `<div class="shell"><button class="text-button" data-close>Close preview</button>${quoteView(record,'Preview')}</div>`;
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('[data-close]').addEventListener('click', () => { dialog.close(); dialog.remove(); });
  });
}

async function transferPage() {
  if (!auth()) return loginPage();
  app.innerHTML = shell(`<main id="main" class="page"><header class="page-heading"><h1>Import / export</h1><p>Your complete collection stays portable.</p></header><div class="transfer-grid"><section><h2>Import records</h2><form id="import-form"><label>Format<select name="format"><option value="csv">CSV</option><option value="json">JSON</option></select></label><label>File<input name="file" type="file" accept=".csv,.json,text/csv,application/json" required></label><button class="solid-button">Import valid rows</button><div data-import-message aria-live="polite"></div></form><a href="sample-quotes.csv" download>Download sample CSV template</a></section><section><h2>Export everything</h2><p>Exports include drafts, schedules, rights research, context, and private notes.</p><p><button class="text-button" data-export="json">Download JSON</button></p><p><button class="text-button" data-export="csv">Download CSV</button></p></section></div></main>`, 'admin');
  document.querySelector('#import-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const fields = new FormData(event.currentTarget); const file = fields.get('file'); const message = document.querySelector('[data-import-message]');
    try { const result = await adminApi(`/import?format=${fields.get('format')}`, {method:'POST',headers:{'Content-Type':'text/plain'},body:await file.text()}); message.innerHTML = `<p class="notice">Imported ${result.imported} record(s). ${result.errors.length} error(s).</p>${result.errors.map((error) => `<p>Row ${error.row}: ${escapeHtml(error.message)}</p>`).join('')}`; }
    catch (error) { message.innerHTML = `<p class="notice error">${escapeHtml(error.message)}</p>`; }
  });
  document.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', async () => {
    const format = button.dataset.export; const credentials = auth();
    const response = await fetch(`${API_BASE}/api/admin/export/${format}`, {headers:{Authorization:`Basic ${credentials}`}});
    if (!response.ok) return alert('Export failed.');
    const blob = await response.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `in-circulation-quotes.${format}`; link.click(); URL.revokeObjectURL(link.href);
  }));
}

async function settingsPage() {
  if (!auth()) return loginPage(); const settings = await adminApi('/settings');
  app.innerHTML = shell(`<main id="main" class="page"><header class="page-heading"><h1>Timezone</h1><p>Daily publication follows one predictable local calendar.</p></header><form class="settings-form" id="settings-form">${field('IANA timezone','timezone',settings.timezone,{required:true,help:'Default: America/New_York'})}<button class="solid-button">Save timezone</button><span data-message></span></form></main>`, 'admin');
  document.querySelector('#settings-form').addEventListener('submit', async (event) => { event.preventDefault(); const timezone = new FormData(event.currentTarget).get('timezone'); try { await adminApi('/settings',{method:'PUT',body:JSON.stringify({timezone})}); document.querySelector('[data-message]').textContent='Saved.'; } catch(error) { document.querySelector('[data-message]').textContent=error.message; } });
}

async function route() {
  window.scrollTo(0,0); document.title = SITE_TITLE;
  const path = (location.hash.slice(1) || '/').replace(/\/+$/, '') || '/';
  app.innerHTML = '<main class="loading-state"><p>Retrieving the edition…</p><span></span><span></span></main>';
  try {
    if (path === '/') return await home();
    if (path === '/archive') return await archivePage();
    if (path === '/stats') return await statsPage();
    if (path === '/admin') return await adminPage();
    if (path === '/admin/new') return await editorPage();
    if (path === '/admin/import') return await transferPage();
    if (path === '/admin/settings') return await settingsPage();
    let match = path.match(/^\/quote\/(.+)$/); if (match) return await quotePage(decodeURIComponent(match[1]));
    match = path.match(/^\/admin\/edit\/(.+)$/); if (match) return await editorPage(decodeURIComponent(match[1]));
    throw new Error('Page not found.');
  } catch (error) {
    app.innerHTML = shell(`<main id="main" class="error-state"><div><h1>Unable to open this page.</h1><p>${escapeHtml(error.message)}</p><p><a href="#/">Return to today’s edition</a></p></div></main>`);
  }
}

window.addEventListener('hashchange', route);
route();
