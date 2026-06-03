# Christoph Fischer (personal site)

## Requirements

 - WCAG 2.2 AAA accessibility is a must (AA where AAA is absolutely not possible).
 - The only permissible fonts are: Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono (for code blocks).
 - Minimum font size is 16px.

## Rules

 - Never commit anything unless I specifically tell you.

## Build tools

 - node and npm are available from /run/user/1000/fnm_multishells/99281_1780402586253/bin/
 - Git commits need elevated privileges.

## Content architecture

 - This is an Eleventy site with `src/` as input and `_site/` as output.
 - Public content entries are primarily sermons, posts, materials, projects, galleries, podcast series, and podcast episodes.
 - Reusable entry layout for non-sermon content is `src/_includes/layouts/content-entry.njk`.
 - Share subpages are generated from `src/content/share/generated.njk` over the `shareableContent` collection.

## Image and gallery rules

 - Legacy gallery and profile images were relocated from `../current/public/img` to `src/content/img`.
 - Gallery metadata is built from `src/_data/legacyMedia.js`.
 - Gallery archive pages must be driven by the `gallery` tag, not by a narrow file glob, because generated gallery pages are tag-based.
 - If galleries break, verify both the data source in `src/_data/legacyMedia.js` and the `galleries` collection in `eleventy.config.js`.

## URL and domain configuration

 - Frontend absolute URLs use `site.url` from `src/_data/site.js`.
 - Backend/ActivityPub absolute URLs use `ACTIVITYPUB_BASE_URL` from `.env`.
 - Do not assume changing `ACTIVITYPUB_BASE_URL` changes frontend permalinks. It does not.

## Environment configuration

 - The project uses a simple custom `.env` loader from `scripts/lib/env.mjs`.
 - That loader is line-based. Do not use multiline quoted values in `.env`.
 - `SHARE_BATCH_URLS` must therefore be stored as a single-line comma-separated list or as separate newline entries only if the loader is extended.
 - ActivityPub key paths must come from `.env` via `ACTIVITYPUB_PUBLIC_KEY_PATH` and `ACTIVITYPUB_PRIVATE_KEY_PATH`.

## Share pages

 - Share pages are intentionally unlisted and unindexed.
 - The `Teilen` button must copy the first textarea to the clipboard before opening configured share URLs.
 - The share URL list is configured via `SHARE_BATCH_URLS` in `.env`.
 - Supported share placeholders are `<permalink>`, `<title>`, `<summary>`, and `<text>`.

## Operational notes

 - There may be large binary changes under `src/content/img/`; do not accidentally omit them when the task is about galleries.
 - Keep local instruction files like `AGENTS.md` out of commits unless explicitly requested.
