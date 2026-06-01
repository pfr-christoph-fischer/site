# 2026 Static Rebuild

Eleventy-based rebuild of `christoph-fischer.de` with:

- filesystem-backed content
- migrated sermon archive
- static search via Pagefind
- generated feeds, sitemap, OpenSearch, manifest, and icons
- optional ActivityPub backend for federation

## Requirements

- Node.js 20.x
- npm
- `rsync` for deployment

## Install

```bash
cd 2026
npm install
```

## Daily Commands

Development server:

```bash
npm run dev
```

Full static build with validation:

```bash
npm run build
```

This build now runs in a staging directory first, generates the Pagefind assets there, validates the complete output, and only then promotes the finished result to `_site/`. That keeps the public output stable during long sermon rebuilds.

Generate the Pagefind search index:

```bash
npm run search
```

Build, search, deploy, and federate:

```bash
npm run publish
```

## Hidden Sermons And Release Workflow

Sermons can exist on the site without appearing in archives, feeds, sitemap, search, or federation.

Use that for content that should be reachable by direct URL but not publicly listed yet.

Import the latest Pfarrplaner sermon as hidden:

```bash
npm run import:latest-sermon -- --hidden
```

Optional local media overrides are supported:

```bash
npm run import:latest-sermon -- --hidden --audio ~/Audio/predigt.mp3 --image ~/Bilder/titel.jpg
```

Release a hidden sermon by slug:

```bash
npm run release:sermon -- --slug nett
```

Or by Pfarrplaner source id:

```bash
npm run release:sermon -- --source-id 99999@host.example
```

Releasing a sermon sets:

- `listed: true`
- `index: true`
- `federate: true`

After release, run:

```bash
npm run publish
```

## Build Quality Gates

`npm run build` currently does all of this:

- generate default icons and social image assets
- validate frontmatter and referenced files
- build the Eleventy site in a staging directory
- generate the Pagefind search bundle
- validate built HTML links, canonicals, and podcast enclosures
- promote the validated build to `_site/`

## Accessibility Standard

Target standard is WCAG 2.2 AA across the whole site, with AAA applied where feasible without harming content clarity.

Current implementation priorities:

- semantic page structure
- visible keyboard focus
- skip link
- no JS dependency for core content
- reduced-motion handling
- minimum target sizing for interactive controls
- high-contrast editorial palette
- alt text validation for meaningful images

Remaining accessibility work should be evaluated against real page output with manual keyboard testing and automated checks such as Lighthouse or axe after each substantial template change.

## ActivityPub Backend

Start the backend:

```bash
npm run backend
```

Important environment variables:

- `ACTIVITYPUB_BASE_URL`
- `ACTIVITYPUB_DOMAIN`
- `ACTIVITYPUB_USERNAME`
- `ACTIVITYPUB_PUBLIC_KEY_PATH`
- `ACTIVITYPUB_PRIVATE_KEY_PATH`
- `ACTIVITYPUB_DATA_DIR`
- `ACTIVITYPUB_PORT`

## Deployment

Deployment uses `rsync`.

Required environment variable:

```bash
export DEPLOY_TARGET='user@example:/var/www/christoph-fischer.de/'
```

Optional:

```bash
export DEPLOY_DELETE=true
export DEPLOY_RSYNC_ARGS='--omit-dir-times'
```

Then run:

```bash
npm run deploy
```

## Repository Layout

```text
2026/
  backend/     ActivityPub service
  scripts/     import, release, deploy, validation, migration tooling
  src/         Eleventy source
  _site/       generated output
```
