# Runbook

This runbook explains the `site/` repository as an operator would use it. It covers deployment, sermon publishing, ActivityPub maintenance, and every script in [`scripts/`](/home/christoph/dev/christoph/site/scripts).

## 1. Setup

Install dependencies:

```bash
cd /home/christoph/dev/christoph/site
npm install
cp .env.example .env
```

Edit `.env` before the first real deployment.

Important:

- `ACTIVITYPUB_BASE_URL` must be the public HTTPS origin, not the localhost backend URL.
- `ACTIVITYPUB_HOST` and `ACTIVITYPUB_PORT` are the local bind address for the backend.
- `DEPLOY_TARGET` is where `rsync` uploads the generated `_site/`.
- `BACKEND_SERVER_PATH` is the backend checkout path on the deployment server.
- `PFARRPLANER_INSTANCES` must contain at least one `{ "host", "token" }` object if you use the sermon import or metadata sync scripts.

## 2. Main NPM Workflows

### Local development

`npm run dev`

- starts Eleventy in local serve mode
- use this when changing templates, CSS, content, feeds, or metadata

### Source validation only

`npm run validate`

- validates source content only
- checks frontmatter, required fields, duplicate source IDs and permalinks, missing assets, gallery references, and related schema rules

### Accessibility audit only

`npm run audit:a11y`

- expects an existing `_site/` build
- serves `_site/` locally
- runs `pa11y-ci` and `axe-core` against a representative route set

`npm run audit:a11y:full`

- runs the same representative Axe pass
- additionally crawls all generated HTML via `pa11y-ci`
- slower; use before larger releases

### Full build

`npm run build`

- generates default site icon and social assets
- fills in missing sermon audio durations
- validates source content
- runs Eleventy
- copies local cover/audio/download assets into `_site/`
- builds the Pagefind index
- validates generated HTML, internal links, canonicals, and podcast enclosures

Use this before every deploy.

### Clean rebuild

`npm run build:clean`

- empties `_site/`
- removes `.pagefind/`
- recreates `_site/img/previews/`
- then runs the full build

Use this when incremental output looks suspicious or after structural changes.

### Search only

`npm run search`

- regenerates only the Pagefind index for `_site/`
- useful if `_site/` already exists and only search needs refreshing

### Deploy only

`npm run deploy`

- pushes `_site/` to `DEPLOY_TARGET` using `rsync`
- does not build automatically
- adds `--delete` only if `DEPLOY_DELETE=true`
- appends any extra flags from `DEPLOY_RSYNC_ARGS`

### Static site publish

`npm run publish`

- runs `build:clean`
- deploys `_site/`
- federates newly released public sermons

This is the normal production command for the public site.

### Backend runtime

`npm run backend`

- starts the local ActivityPub backend from [`backend/server.mjs`](/home/christoph/dev/christoph/site/backend/server.mjs)

### Backend deploy

`npm run deploy:backend`

- stages backend runtime files into a temporary bundle
- generates a backend `.env` from local `ACTIVITYPUB_*` variables
- uploads that bundle to `BACKEND_SERVER_PATH` on the same host as `DEPLOY_TARGET`
- includes backend code, required scripts, service files, and package manifests
- excludes backend runtime state such as `backend/data/`

## 3. Sermon Workflow

### Import newest sermon from Pfarrplaner

Interactive selection from recent sermons:

```bash
npm run import:latest-sermon -- --hidden
```

Import the newest sermon directly without prompting:

```bash
npm run import:latest-sermon -- --hidden --latest
```

What the importer does:

- fetches sermon metadata from the first configured Pfarrplaner instance
- creates a new sermon folder under `src/content/sermons/YYYY-MM-DD-slug/`
- normalizes the sermon body to Markdown
- strips Bible version tags from scripture references and body text
- downloads cover/audio when available
- calculates `audio_duration` from a local MP3 when possible
- skips import if the `source_id` or target directory already exists

Optional local file overrides:

```bash
npm run import:latest-sermon -- --hidden --audio ~/Audio/predigt.mp3 --image ~/Bilder/titel.jpg
```

`--hidden` means the imported sermon is created with flags that keep it out of archives, feeds, search, sitemap, and federation until you release it.

### Release a hidden sermon

By slug:

```bash
npm run release:sermon -- --slug nett
```

By source ID:

```bash
npm run release:sermon -- --source-id 99999@host.example
```

Releasing sets:

- `listed: true`
- `index: true`
- `federate: true`

It edits the first matching sermon file in place.

### Sync sermon metadata from Pfarrplaner

Dry run:

```bash
npm run sync:sermon-metadata -- --dry-run
```

Useful variants:

```bash
npm run sync:sermon-metadata -- --slug nett
npm run sync:sermon-metadata -- --source-id 99999@host.example
npm run sync:sermon-metadata -- --force
```

What it updates:

- sermon `subtitle`
- sermon `liturgy_color`
- per-event `occasion`
- per-event `liturgy_color`

By default it only fills missing values. `--force` overwrites existing values too.

### Commit and push the sermons submodule

```bash
npm run commit:sermons-submodule -- --message "Add July 6 sermon"
```

What it does inside `src/content/sermons/`:

1. `git add -A`
2. `git commit -m "<message>"`
3. `git push`

Operational notes:

- this script runs Git in the `src/content/sermons/` submodule, not in the main repository
- it stages all submodule changes, including deletions
- it fails immediately if there is nothing to commit, the commit fails, or the push fails
- use it only after checking the submodule diff carefully

Recommended sequence after importing and releasing a sermon:

```bash
npm run import:latest-sermon -- --hidden --latest
npm run release:sermon -- --slug my-slug
npm run commit:sermons-submodule -- --message "Release sermon my-slug"
npm run publish
```

### Check content that is not a submodule yet

Interactive mode:

```bash
npm run check:submodules
```

List mode:

```bash
npm run check:submodules -- --list
```

What it checks:

- scans supported content types under `src/content/`
- finds direct content folders with an `index.md`
- skips entries that are already declared in `.gitmodules`
- skips entries already marked with `submodule_skip: true`
- offers to run `npm run extract:material -- <folder> <type>` for each remaining candidate

Answering `no` marks that content entry with:

```yaml
submodule_skip: true
```

Remove that field later if you want the checker to ask again for that entry.

### Fix sermon metadata or legacy content

`npm run fix:sermon-audio-durations`

- fills missing `audio_duration` values from local sermon MP3 files
- only touches sermons that have local audio and no existing duration

Dry run:

```bash
npm run fix:sermon-audio-durations -- --dry-run
```

`npm run fix:sermon-cover-extensions`

- renames generic entry media files to `<entry-slug>.<ext>`
- updates matching `cover`, `audio`, and `image` frontmatter values

`npm run fix:sermon-bible-version-tags`

- removes Bible version suffixes from `scripture` and sermon text

`npm run rewrite:sermons-markdown`

- normalizes sermon body Markdown
- also normalizes quoted or HTML-heavy `summary` values where needed

### Legacy import

`npm run migrate:sermons`

- imports sermons from a legacy SQL export
- expects sibling paths outside this repo, especially `../cfde.sql` and `../current/`
- is a one-off migration helper, not a normal daily command

## 4. Open Source Project Import

`npm run import:open-source`

- fetches repositories from GitHub and Codeberg
- supports personal accounts and organizations
- imports generated entries into `src/content/projects/`
- leaves manual project pages untouched
- publishes imported items under `/open-source/<slug>/`

Required `.env` fields for this workflow:

```dotenv
OPEN_SOURCE_GITHUB_USERS=potofcoffee
OPEN_SOURCE_GITHUB_ORGS=my-org,another-org
OPEN_SOURCE_GITHUB_TOKEN=
OPEN_SOURCE_CODEBERG_USERS=peregrinus
OPEN_SOURCE_CODEBERG_ORGS=my-codeberg-org
OPEN_SOURCE_CODEBERG_TOKEN=
OPEN_SOURCE_INCLUDE_FORKS=false
```

Useful variants:

```bash
npm run import:open-source -- --dry-run
npm run import:open-source -- --prune
```

Behavior details:

- generated entries are regenerated by the importer
- `--prune` removes stale generated repository directories no longer returned by the configured APIs
- stale legacy directories under `src/content/projects/imported/` are also removed when pruning
- README content and license metadata are pulled from the upstream forge when possible

## 5. Manual Podcasts And Episodes

The podcast system distinguishes between a podcast series and its episodes.

Structure:

```text
src/content/podcasts/christoph-talks/
  index.md
  christoph-talks.jpg
  erste-folge/
    index.md
    erste-folge.mp3
    erste-folge.jpg
```

Series frontmatter:

```md
---
title: Christoph talks
summary: Gespraeche, Beobachtungen und digitale Randnotizen.
date: 2026-06-02
cover: christoph-talks.jpg
cover_alt: Kurze, konkrete Bildbeschreibung.
podcast_feed_title: Christoph talks
podcast_feed_description: Gespraeche, Beobachtungen und digitale Randnotizen.
podcast_categories:
  - Society & Culture
  - Personal Journals
---
Beschreibung der Reihe.
```

Episode frontmatter:

```md
---
title: Erste Folge
summary: Kurze Beschreibung fuer Archiv, Feed und Suchseite.
date: 2026-06-02
subtitle: Optionaler Untertitel fuer Feed und Detailseite
audio: erste-folge.mp3
audio_duration: 28:14
cover: erste-folge.jpg
cover_alt: Kurze, konkrete Bildbeschreibung.
episode_number: 1
season_number: 1
---
Shownotes, Links, Kapitelhinweise oder Begleittext.
```

Notes:

- `audio` is required only on episode pages and must point to a local file in the same folder
- `cover_alt` is required whenever `cover` is set
- `summary` is reused in archive views, search, and feeds
- `subtitle` and `audio_duration` are emitted into the series feed when present
- series pages are published under `/podcast/<show>/`
- episode pages are published under `/podcast/<show>/<episode>/`
- manual series feeds are published under `/podcast/<show>/feed.xml`
- the sermon feed remains `/podcast.xml`

Operational workflow:

```bash
npm run build
```

That rebuild updates:

- `/podcasts/`
- `/podcast/<show>/`
- `/podcast/<show>/feed.xml`
- `/podcast.xml`
- Pagefind search output
- sitemap and metadata

## 6. Validation And Quality Gates

`npm run build` combines most operator checks.

Current checks include:

- required titles and summaries
- valid dates
- duplicate permalinks
- duplicate `source_id` values
- missing cover, audio, and download files
- missing alt text where required
- invalid linked gallery references
- canonical presence and uniqueness
- `og:image` without `og:image:alt`
- broken internal generated links
- invalid podcast enclosure targets

Accessibility-specific checks include:

- representative or full-route HTML_CodeSniffer checks through `pa11y-ci`
- representative Axe checks for WCAG 2.2 AA and WCAG 2 AAA rules

## 7. Deployment

### Required `.env` fields

At minimum, set:

```dotenv
DEPLOY_TARGET=user@example:/var/www/christoph-fischer.de/
ACTIVITYPUB_BASE_URL=https://www.christoph-fischer.de
ACTIVITYPUB_DOMAIN=christoph-fischer.de
ACTIVITYPUB_PUBLIC_KEY_PATH=/absolute/path/to/keys/public.pem
ACTIVITYPUB_PRIVATE_KEY_PATH=/absolute/path/to/keys/private.pem
BACKEND_SERVER_PATH=/srv/christoph-activitypub
```

Optional:

```dotenv
DEPLOY_DELETE=false
DEPLOY_RSYNC_ARGS=--compress-choice=zstd
SHARE_BATCH_URLS=https://www.facebook.com/sharer/sharer.php?u=<permalink>,https://kirche.social/@christoph
PFARRPLANER_INSTANCES=[{"host":"www.pfarrplaner.de","token":"token-for-first-instance"},{"host":"example.org","token":"token-for-second-instance"}]
INFLUENCE_FEED_URL=https://influence.christoph-fischer.de/api/feed/published.json
```

`SHARE_BATCH_URLS` accepts comma- or newline-separated URLs. Supported placeholders are `<permalink>`, `<title>`, `<summary>`, and `<text>`.

`PFARRPLANER_INSTANCES` accepts a single-line JSON array of objects with `host` and `token` fields.

Each build synchronizes the published Influence posts into `src/content/posts/`. The feed must be reachable during the build. If it is protected, configure `INFLUENCE_FEED_USERNAME` and `INFLUENCE_FEED_PASSWORD` as single-line `.env` values.

### Full release

`npm run publish`

- the usual production path

### Static deploy only

`npm run deploy`

- pushes the already-built `_site/`

### Backend deploy only

`npm run deploy:backend`

- uploads the backend runtime bundle

## 8. ActivityPub Backend

Server installation and `systemd` setup are documented separately in:

- [ACTIVITYPUB_SERVER_SETUP.md](/home/christoph/dev/christoph/site/docs/ACTIVITYPUB_SERVER_SETUP.md)

### Start the backend

```bash
npm run backend
```

The backend serves:

- `/.well-known/webfinger`
- `/users/christoph`
- `/users/christoph/inbox`
- `/users/christoph/outbox`
- `/users/christoph/followers`
- `/users/christoph/following`
- `/users/christoph/featured`
- `/activity/...`

### Storage

Default storage lives in:

- SQLite DB: `backend/data/activitypub.sqlite`
- legacy JSON files: `backend/data/*.json`

If the SQLite database is empty, the backend imports any legacy JSON state automatically on first start.

### Security and hardening

Current backend behavior:

- inbox POST requests require valid HTTP signatures by default
- request digest must match the body
- request date must be inside the configured signature age window
- inbox rate limiting is enabled
- failed outbound deliveries are retried automatically with short backoff
- followers and outbox are paginated with `?page=1`

### Operational scripts

Block an actor:

```bash
npm run activitypub:block -- --actor https://example.social/users/spam
```

Optionally add a note:

```bash
npm run activitypub:block -- --actor https://example.social/users/spam --note "spam"
```

Unblock an actor:

```bash
npm run activitypub:unblock -- --actor https://example.social/users/spam
```

Remove a follower without blocking:

```bash
npm run activitypub:remove-follower -- --actor https://example.social/users/name
```

Retry failed deliveries that are due:

```bash
npm run activitypub:retry-deliveries
```

Federate newly released public sermons:

```bash
npm run federate
```

Federation note:

- on a first run, the script seeds older published sermons into backend state and may federate only the newest one unless `ACTIVITYPUB_BACKFILL=all`
- set `ACTIVITYPUB_BACKFILL=none` if you want an initial seed without sending anything

## 9. Caddy Reverse Proxy

The example file is:

- [Caddyfile.activitypub](/home/christoph/dev/christoph/site/deploy/Caddyfile.activitypub)

The intended architecture is:

1. Caddy serves the static `_site/` output directly.
2. Caddy reverse proxies only the ActivityPub paths to the local Node backend.
3. The Node backend listens on localhost only.

Core paths that must be proxied:

- `/.well-known/webfinger`
- `/users/*`
- `/activity/*`

Example flow:

```text
internet -> Caddy :443 -> static files from _site
internet -> Caddy :443 -> reverse_proxy 127.0.0.1:8787 for ActivityPub endpoints
```

Important:

- keep `ACTIVITYPUB_BASE_URL` on the public HTTPS domain
- keep `ACTIVITYPUB_HOST=127.0.0.1`
- do not publish the backend on a separate public port unless intentional

## 10. Recommended Daily Workflows

### Change templates or content locally

```bash
npm run dev
```

Before shipping:

```bash
npm run build
```

### Import a new sermon and publish it later

```bash
npm run import:latest-sermon -- --hidden --latest
npm run release:sermon -- --slug my-slug
npm run commit:sermons-submodule -- --message "Release sermon my-slug"
npm run publish
```

### Fix metadata on existing sermons

```bash
npm run sync:sermon-metadata -- --dry-run
npm run sync:sermon-metadata -- --force
```

### Retry failed federation

```bash
npm run activitypub:retry-deliveries
```

### Re-import open source project pages

```bash
npm run import:open-source -- --prune
npm run build
```

## 11. Complete Script Reference

This section lists every script entrypoint in [`scripts/`](/home/christoph/dev/christoph/site/scripts), including internal helpers that are usually called through npm scripts.

### Public npm-exposed scripts

- `scripts/activitypub-block-actor.mjs`
  Blocks an ActivityPub actor in backend storage. Requires `--actor`; accepts optional `--note`.
- `scripts/activitypub-remove-follower.mjs`
  Removes a follower from backend storage without blocking them. Requires `--actor`.
- `scripts/activitypub-retry-deliveries.mjs`
  Retries up to 25 failed outbound deliveries that are currently due.
- `scripts/activitypub-unblock-actor.mjs`
  Removes a block entry for an ActivityPub actor. Requires `--actor`.
- `scripts/audit-accessibility.mjs`
  Serves `_site/` locally and runs `pa11y-ci` plus `axe-core`. Use `--full` for a full HTML crawl.
- `scripts/clean-site-output.mjs`
  Deletes everything inside `_site/`, removes `.pagefind/`, then recreates `_site/img/previews/`.
- `scripts/commit-sermons-submodule.mjs`
  Runs `git add -A`, `git commit -m`, and `git push` inside `src/content/sermons/`. Requires `--message` or `-m`.
- `scripts/check-submodule-candidates.mjs`
  Finds content folders that are not submodules yet and interactively offers to run `extract:material`. `no` writes `submodule_skip: true` to the entry frontmatter. Supports `--list`.
- `scripts/deploy-backend.mjs`
  Stages and uploads the ActivityPub backend bundle. Requires `DEPLOY_TARGET`, `BACKEND_SERVER_PATH`, and core `ACTIVITYPUB_*` variables.
- `scripts/deploy.mjs`
  Runs `rsync` from `_site/` to `DEPLOY_TARGET`. Optional behavior comes from `DEPLOY_DELETE` and `DEPLOY_RSYNC_ARGS`.
- `scripts/extract-material.mjs`
  Extracts `src/content/<type>/<folder>` into a dedicated GitHub repo and rewires it as a Git submodule. Requires `gh`, GitHub auth, Git SSH access, and a working parent repo. Usage: `npm run extract:material -- <folder> [type]`.
- `scripts/federate-new-posts.mjs`
  Federates newly released public sermons and records deliveries in backend storage.
- `scripts/fix-sermon-audio-durations.mjs`
  Fills missing sermon `audio_duration` values. Supports `--dry-run`.
- `scripts/fix-sermon-cover-extensions.mjs`
  Renames generic entry media files to `<entry-slug>.<ext>` and updates matching frontmatter.
- `scripts/generate-site-assets.mjs`
  Rebuilds default generated icon and social image assets when the embedded SVG changes.
- `scripts/import-latest-sermon.mjs`
  Imports a sermon from Pfarrplaner. Supports `--audio`, `--image`, `--hidden`, and `--latest`.
- `scripts/import-open-source-repos.mjs`
  Imports repository-backed project pages from GitHub and Codeberg. Supports `--dry-run` and `--prune`.
- `scripts/migrate-sermons.mjs`
  One-off importer from legacy SQL and legacy asset paths into `src/content/sermons/`.
- `scripts/release-sermon.mjs`
  Releases a hidden sermon by `--slug` or `--source-id`.
- `scripts/rewrite-sermons-markdown.mjs`
  Rewrites sermon bodies into normalized Markdown and cleans summaries where possible.
- `scripts/strip-sermon-bible-version-tags.mjs`
  Removes Bible translation suffixes from sermon frontmatter and body text.
- `scripts/sync-sermon-metadata.mjs`
  Syncs sermon metadata from Pfarrplaner. Supports `--slug`, `--source-id`, `--dry-run`, and `--force`.
- `scripts/validate-content.mjs`
  Validates source content, or source plus built output when called with `--site`.

### Internal build helpers

- `scripts/copy-sermon-assets.mjs`
  Copies local `cover`, `audio`, and `downloads[*].file` assets into the already-generated `_site/` output and removes stale copied files using a manifest in `.cache/`.
- `scripts/clean-site-output.mjs`
  Internal clean step used by `build:clean`; destructive for generated output only.
- `scripts/generate-site-assets.mjs`
  Internal asset generator used by `build`.

### Script cautions

- Scripts that modify tracked content in place:
  `import-latest-sermon`, `release-sermon`, `sync-sermon-metadata`, `fix-sermon-audio-durations`, `fix-sermon-cover-extensions`, `rewrite-sermons-markdown`, `strip-sermon-bible-version-tags`, `migrate-sermons`.
- Scripts that modify generated output only:
  `clean-site-output`, `copy-sermon-assets`, `generate-site-assets`, `audit-accessibility`, `validate-content --site`.
- Scripts that perform network or remote side effects:
  `deploy`, `deploy-backend`, `federate-new-posts`, all ActivityPub actor management scripts, `import-latest-sermon`, `sync-sermon-metadata`, `import-open-source-repos`, `extract-material`.
- Scripts that assume special environment or external tooling:
  `extract-material` needs `gh` and GitHub repo creation rights.
  `audit-accessibility` needs a Chromium/Chrome executable available to Puppeteer.
  `migrate-sermons` expects legacy files outside this repository.

## 12. Known Limits

- real-domain federation still needs end-to-end verification after deployment changes
- Pfarrplaner sync depends on upstream API availability
- full rebuilds are expensive because of the sermon archive size
- some maintenance scripts are intentionally one-off and make broad in-place edits; review diffs before committing
