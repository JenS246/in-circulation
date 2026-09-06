# In Circulation

In Circulation is a tiny daily publication for one carefully sourced quotation about coins, currency, money, wages, debt, value, payment, and related ideas. It stores curator-entered text without rewriting it, schedules one eligible record per local calendar day, and keeps permanent archive links.

The ten included records are obvious editorial placeholders, not historical quotations. Replace them with curator-supplied, rights-reviewed sources before launch.

## Live services

- Public publication: <https://jens246.github.io/in-circulation/>
- Private editor: <https://jens246.github.io/in-circulation/#/admin>
- API health: <https://circulation.150-136-117-187.sslip.io/api/health>
- Source and issue tracker: <https://github.com/JenS246/in-circulation>

## Architecture

The frontend is dependency-free HTML, CSS, and JavaScript hosted by GitHub Pages. Hash routes make permanent pages work beneath GitHub's `/in-circulation/` project path without a custom 404 layer. A single Node.js service on the VM provides the editor, daily selection, imports, exports, and a local SQLite database. Caddy supplies HTTPS and PM2 restarts the API after failures or reboots.

This is intentionally smaller than a full-stack framework: the public files are cheap and durable, the only stateful component is one backed-up SQLite file, and the repository contains no secrets or production data.

## Publication behavior

For the date in the configured IANA timezone (default `America/New_York`), the API:

1. Returns the quotation already recorded for that date.
2. Otherwise selects an eligible record whose `publishDate` matches today.
3. Otherwise selects the first eligible scheduled record with no date, using `queuePosition`.
4. Excludes `Needs Review` and `Do Not Publish` records.
5. Excludes previously published records unless `reusable` is enabled.
6. Records the result in `publication_log` so refreshes cannot change the edition.

Eligible rights values are `Verified Public Domain`, `U.S. Government Work`, and `Permission / Open License`. These are curator assertions; the application never infers rights from a repository.

## Data model

Each quotation includes `id`, `quote`, `author`, `speaker`, `title`, `year`, `publicationDate`, `sourceType`, `currencyTerms`, `themes`, `context`, `showContext`, `repository`, `sourceUrl`, `sourceCitation`, `publicDomainStatus`, `rightsNote`, `publishDate`, `status`, `reusable`, `notes`, `queuePosition`, and timestamps.

Calendar dates use `YYYY-MM-DD`. Terms and themes are JSON arrays in SQLite and pipe-separated in CSV. `context` and `notes` remain private unless `showContext` is explicitly enabled. The quotation field is stored and rendered exactly as submitted, including spelling, punctuation, and line breaks.

## Local development

Requirements: Node.js 22.13 or newer, npm, and Python 3 for the small static-file development server.

```bash
npm ci
cp .env.example .env
# Replace ADMIN_PASSWORD in .env.
npm run start:api
```

In another terminal:

```bash
npm run dev
```

Open <http://127.0.0.1:4174>. The frontend uses the public HTTPS API by default, matching production. To work against a local API, temporarily change `API_BASE` at the top of `site/app.js` and do not commit that change.

Run verification with:

```bash
npm test
npm run build
```

The database and ten placeholder records are created automatically on first API start.

## Environment variables

Copy `.env.example` to the ignored `.env` file.

- `PORT`: API port; production uses `8792`.
- `ADMIN_USERNAME`: editor username; production defaults to `curator`.
- `ADMIN_PASSWORD`: required long random password.
- `FRONTEND_URL`: canonical GitHub Pages URL, including its trailing slash.
- `CORS_ORIGINS`: comma-separated browser origins allowed to call the API.
- `DATA_DIR`: optional SQLite directory override.

Never commit `.env`, credentials, or the contents of `data/`.

## Editor, import, and export

The editor supports add, edit, delete, preview, duplicate, search, status and rights filters, date assignment, queue reordering, timezone configuration, CSV/JSON import, and full CSV/JSON export.

Use [`site/sample-quotes.csv`](site/sample-quotes.csv) as the CSV template. Separate multiple themes or currency terms with `|`. Imports validate one row at a time: valid rows are retained and errors identify the failing row. Required fields are quotation text, author, title, source type, source URL, rights status, and workflow status.

Download an export after material editorial work. Exports contain the entire collection, including drafts and internal fields.

## Deployment

### Frontend

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml), validate the project, and publish `site/` to GitHub Pages. The repository must remain public and Pages must use **GitHub Actions** as its source.

### Backend

Production runs from `/config/projects/in-circulation`:

```bash
pm2 startOrReload ecosystem.config.cjs
pm2 save
```

The service registry entry is mirrored in [`ops/backend-services.json`](ops/backend-services.json). The host Caddy block is in [`ops/Caddyfile.host`](ops/Caddyfile.host) and proxies the HTTPS hostname to `webtop:8792`.

After deployment, verify both endpoints:

```bash
curl -fsS https://circulation.150-136-117-187.sslip.io/api/health
curl -I https://jens246.github.io/in-circulation/
```

## Backups and recovery

Source code is backed up in the public GitHub repository. Editorial data is deliberately not committed because it includes drafts and private notes.

Create a consistent local SQLite backup while the API is running:

```bash
sqlite3 data/in-circulation.sqlite3 ".backup 'in-circulation-backup.sqlite3'"
```

Also download JSON or CSV from the editor after major changes, then store it somewhere private. To restore, stop the PM2 service, retain a copy of the current database, replace `data/in-circulation.sqlite3` with the backup, restart PM2, and verify `/api/health` plus today's edition.

## Accessibility and safeguards

The site uses semantic figures, blockquotes, time elements, labels, headings, and navigation; visible keyboard focus; responsive type; strong contrast; and reduced-motion support. The visual system uses typography, whitespace, and rules instead of dashboard cards or decorative animation.

The API uses HTTPS, restricts cross-origin browser calls, requires HTTP Basic authentication for every editor endpoint, rate-limits repeated failed sign-ins, and never returns internal notes through public quote routes. Basic authentication is appropriate here only because Caddy enforces HTTPS; rotate the editor password by changing `.env` and reloading PM2.
