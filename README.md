# In Circulation

In Circulation is a tiny daily publication for one carefully sourced quotation about coins, currency, money, wages, debt, value, payment, and related ideas. The quotation is the publication. The application stores curator-entered text without rewriting it, schedules one eligible record per local calendar day, keeps permanent archive links, and makes the complete collection portable.

The included records are obvious editorial placeholders. They are not presented as historical quotations. Replace them with curator-supplied, rights-reviewed sources before launch.

Hosted Site: <https://in-circulation.dschnei1122.chatgpt.site>

## Why this stack

The site uses Vinext with React Server Components, Cloudflare D1 (SQLite), and native CSS. D1 provides durable records, filtering, and inexpensive backups without a separate database service. ChatGPT sign-in protects the editor, while server-side authorization can restrict it to configured curator email addresses. There is no AI quote generation and no AI text processing.

## What it does

- Publishes a quote assigned to today's date in the configured timezone.
- Falls back to the next eligible, unscheduled quote when today has no assignment.
- Records one selected quote per calendar date so refreshes cannot change the edition.
- Never automatically publishes records marked `Needs Review` or `Do Not Publish`.
- Never automatically repeats a record unless `reusable` is enabled.
- Preserves quote text, punctuation, capitalization, spelling, and line breaks exactly as submitted.
- Keeps `context` private unless `showContext` is explicitly enabled.
- Provides a searchable, filterable, reverse chronological archive and permanent quote URLs.
- Supports add, edit, delete, preview, duplicate, scheduling, status changes, and queue reordering.
- Imports CSV or JSON row by row, preserving successful rows while reporting validation errors.
- Exports every public and private database field to CSV or JSON.
- Includes local browser favorites, Web Share support, exact-text copy, and collection statistics.

## Data model

The `quotes` table contains:

`id`, `quote`, `author`, `speaker`, `title`, `year`, `publicationDate`, `sourceType`, `currencyTerms`, `themes`, `context`, `showContext`, `repository`, `sourceUrl`, `sourceCitation`, `publicDomainStatus`, `rightsNote`, `publishDate`, `status`, `reusable`, `notes`, `queuePosition`, `createdAt`, and `updatedAt`.

`currencyTerms` and `themes` are stored as JSON arrays. Dates use ISO `YYYY-MM-DD` when they represent a calendar date. Timestamps use UTC ISO 8601 strings. `publication_log` fixes the chosen quote for each day. `site_config` stores the IANA timezone, defaulting to `America/New_York`.

## Publication rules

For the current local date, the server:

1. Returns the quote already recorded for that date, if it is still rights-eligible.
2. Otherwise selects an eligible scheduled or published record whose `publishDate` matches the date.
3. Otherwise selects the first eligible record with `status=scheduled` and no `publishDate`, using `queuePosition`.
4. Excludes every `Needs Review` and `Do Not Publish` record.
5. Excludes previously published records unless `reusable=true`.
6. Records the result in `publication_log`; a non-reusable fallback becomes `published` and receives that day's `publishDate`.

The eligible rights values are `Verified Public Domain`, `U.S. Government Work`, and `Permission / Open License`. These labels are curator assertions, not automated legal conclusions.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

Open the local URL printed by Vinext. The Sites development environment supplies a test signed-in user. The local D1 database and Wrangler state stay inside the project under `.wrangler/`.

The application creates its tables and ten placeholder records on first use. Drizzle migrations in `drizzle/` are also included for hosted database setup.

## Environment variables

- `ADMIN_EMAILS`: comma-separated curator email allowlist. Set this for every public deployment. If omitted, any signed-in ChatGPT user can open the editor.
- `NEXT_PUBLIC_SITE_URL`: canonical HTTPS origin used for absolute Open Graph image URLs.

Do not commit `.env`, `.env.local`, passwords, keys, or tokens.

## Adding quotations

Open `/admin`, choose **Add quote**, paste the exact quotation and original source URL, then enter attribution and rights research. New records default to `draft` and `Needs Review`. To place a record in the automatic queue, change it to `scheduled`; optionally assign a `publishDate` in `YYYY-MM-DD`.

For poetry and plays, paste line and stanza breaks directly into the quotation field. The editor uses a multiline control and the public page uses whitespace-preserving rendering.

## Import and export

Open `/admin/import`. Import accepts:

- CSV using the columns in [`public/sample-quotes.csv`](public/sample-quotes.csv). Use `|` between multiple currency terms or themes.
- JSON as an array of quote objects or an object with a `quotes` array.

Required import fields are `quote`, `author`, `title`, `sourceType`, `sourceUrl`, `publicDomainStatus`, and a valid workflow `status`. Invalid rows are reported and valid rows remain imported.

CSV and JSON exports include drafts, internal notes, context, rights fields, schedule state, and queue positions. Save exports regularly as portable backups.

## Deployment

The project is configured for OpenAI Sites with the logical D1 binding `DB` in `.openai/hosting.json`.

1. Build with `npm run build`.
2. Save and deploy through Sites so the D1 migration is applied.
3. Set `ADMIN_EMAILS` and `NEXT_PUBLIC_SITE_URL` as hosted environment variables.
4. Make the public reading site publicly accessible, while `/admin` continues to require ChatGPT sign-in and the email allowlist.
5. Verify the home page, one permanent quote page, `/archive`, and an authorized editor session.

The generated deployment URL appears in the Sites project after publishing. A custom domain can be attached later without changing the source model.

## Accessibility and visual system

Pages use semantic headings, figures, blockquotes, time elements, labels, and navigation landmarks. Keyboard focus is highly visible. Controls meet practical contrast targets in both system light and dark modes. The layout collapses to one column on phones, retains exact quote line breaks, and disables nonessential transitions when reduced motion is requested.

The visual direction is an independent-press broadside: Libre Baskerville for the quotation, Source Sans 3 for interface text, IBM Plex Mono for archival metadata, cool gray paper, charcoal ink, one forest accent, square controls, and rules instead of cards or shadows.

## Important safeguards

- Repositories do not determine copyright status. A Project Gutenberg, Library of Congress, NPS, Internet Archive, or HathiTrust link still requires a curator-entered rights decision.
- Do not mark a record verified without completing the relevant rights research.
- The application never rewrites or modernizes quote text.
- Changing a published record changes its permanent page. Treat post-publication edits as corrections and document them in `notes`.
