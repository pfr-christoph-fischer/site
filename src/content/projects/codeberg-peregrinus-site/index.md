---
title: "site"
summary: "Eleventy based rebuild of christoph fischer.de with:"
date: 2026-06-02
updated: 2026-06-02
repository_owner: "peregrinus"
repository_owner_url: "https://christoph-fischer.de"
repository_url: "https://codeberg.org/peregrinus/site"
repository_platform: "Codeberg"
homepage_url: ""
license: "GPL 3.0+"
license_url: "https://www.gnu.org/licenses/gpl-3.0.txt"
language: "JavaScript"
tags:
  - "project"
  - "open-source"
  - "codeberg"
  - "user"
  - "javascript"
technologies:
  - "JavaScript"
---

# 2026 Static Rebuild

Eleventy-based rebuild of `christoph-fischer.de` with:

- filesystem-backed content
- migrated sermon archive
- static search via Pagefind
- generated feeds, sitemap, OpenSearch, manifest, and icons
- optional ActivityPub backend for federation

This README is the short operator overview. The fuller runbook is here:

- `2026/docs/RUNBOOK.md`

## Requirements

- Node.js 20.x
- npm
- `rsync` for deployment
- `sqlite3` for the ActivityPub backend

## Install

```bash
cd 2026
npm install
cp .env.example .env
```

Then edit `.env` for your machine and deployment.

## Most Common Commands

Development server:

```bash
npm run dev
```

Full static build with validation:

```bash
npm run build
```

This clears `_site/` first, then rebuilds it completely.

Import repository entries from GitHub and Codeberg:

```bash
npm run import:open-source
```

Manual podcast workflow:

```bash
# create src/content/podcasts/<show>/index.md
# create src/content/podcasts/<show>/<episode>/index.md + audio file
npm run build
```

Run the ActivityPub backend:

```bash
npm run backend
```

Build, deploy, and federate newly released public content:

```bash
npm run publish
```

## Sermon Workflow

Import the newest Pfarrplaner sermon as hidden:

```bash
npm run import:latest-sermon -- --hidden
```

Import with local file overrides:

```bash
npm run import:latest-sermon -- --hidden --audio ~/Audio/predigt.mp3 --image ~/Bilder/titel.jpg
```

Release a hidden sermon by slug:

```bash
npm run release:sermon -- --slug nett
```

Sync subtitle and liturgical color metadata from Pfarrplaner:

```bash
npm run sync:sermon-metadata -- --dry-run
```

After release:

```bash
npm run publish
```

## Open Source Workflow

Repository entries are imported as normal content pages under `src/content/projects/imported/`.
They are published under `/open-source/`.

Dry run:

```bash
npm run import:open-source -- --dry-run
```

Real import:

```bash
npm run import:open-source
```

Include organization repositories by setting `OPEN_SOURCE_GITHUB_ORGS` and/or `OPEN_SOURCE_CODEBERG_ORGS` in `.env`.
The full operator details are documented in `2026/docs/RUNBOOK.md`.

Optional cleanup of no-longer-present imported repositories:

```bash
npm run import:open-source -- --prune
```

## Manual Podcast Workflow

The podcast area is split into podcast series and podcast episodes:

- series page: `src/content/podcasts/<show>/index.md`
- episode page: `src/content/podcasts/<show>/<episode>/index.md`
- each episode folder contains its own audio file and optional cover

Series example:

```md
---
title: Christoph talks
summary: Gespraeche, Beobachtungen und digitale Randnotizen.
date: 2026-06-02
cover: cover.jpg
cover_alt: Podcastcover fuer Christoph talks.
podcast_feed_title: Christoph talks
podcast_feed_description: Gespraeche, Beobachtungen und digitale Randnotizen.
podcast_categories:
  - Society & Culture
  - Personal Journals
---
Diese Seite beschreibt die Reihe. Die Folgen liegen in Unterordnern derselben Reihe.
```

Episode example:

```md
---
title: Neue Folge
summary: Kurze Beschreibung fuer Archiv, Feed und Suchseite.
date: 2026-06-02
subtitle: Ein moeglicher Untertitel
audio: episode.mp3
audio_duration: 28:14
cover: cover.jpg
cover_alt: Covermotiv der Folge.
episode_number: 1
season_number: 1
---
Einleitungstext, Shownotes, Links und weitere Hinweise.
```

After the files are in place, the series appears automatically:

- in `/podcasts/`
- on `/podcast/<show>/`
- with its own feed on `/podcast/<show>/feed.xml`
- in search and sitemap

The existing sermon podcast stays separate at `/podcast.xml` and is represented by `Christoph predigt` in the overview. Full operator notes are in `2026/docs/RUNBOOK.md`.

## ActivityPub Notes

The backend now stores its state in SQLite by default:

- database: `2026/backend/data/activitypub.sqlite`
- migrated automatically from legacy JSON files in `2026/backend/data/` on first start

Operational helper scripts:

```bash
npm run activitypub:block -- --actor https://example.social/users/spam
npm run activitypub:unblock -- --actor https://example.social/users/spam
npm run activitypub:remove-follower -- --actor https://example.social/users/name
npm run activitypub:retry-deliveries
```

The inbox requires valid HTTP signatures by default, outbound delivery retries are enabled, and followers/outbox are paginated.

## Reverse Proxy

A Caddy example is included here:

- `2026/deploy/Caddyfile.activitypub`

Use a public HTTPS `ACTIVITYPUB_BASE_URL` in `.env`, even if the backend itself listens only on `127.0.0.1`.

## Accessibility Standard

Target standard is WCAG 2.2 AA across the whole site, with AAA applied where feasible without harming content clarity.

## Repository Layout

```text
2026/
  backend/     ActivityPub service
  docs/        runbook and operator docs
  scripts/     import, release, deploy, validation, migration tooling
  src/         Eleventy source
  _site/       generated output
```


<!-- managed-by: import-open-source-repos -->
