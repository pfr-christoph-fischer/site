---
title: slug
summary: 'German aware URL slug generator, compatible with Laravel''s Str::slug().'
date: 2026-05-05T00:00:00.000Z
updated: 2026-05-05T00:00:00.000Z
repository_owner: pfarr.tools
repository_owner_url: 'https://pfarr.tools'
repository_url: 'https://codeberg.org/pfarr.tools/slug'
repository_platform: Codeberg
homepage_url: ''
license: GPL 3.0+
license_url: 'https://codeberg.org/pfarr.tools/slug/src/branch/main/LICENSE'
language: JavaScript
tags:
  - project
  - open-source
  - codeberg
  - organization
  - javascript
technologies:
  - JavaScript
submodule_skip: true
---

# @pfarr.tools/slug

German-aware URL slug generator, compatible with Laravel's `Str::slug()`.

Converts German umlauts and ligatures before general Unicode normalization,
producing slugs that match what a German speaker would expect:
`Über` → `ueber`, `Straße` → `strasse`.

## Installation

```bash
npm install @pfarr.tools/slug
```

## Usage

### ESM

```js
import { slug } from '@pfarr.tools/slug';

slug('Ärger mit Öl');        // 'aerger-mit-oel'
slug('Über den Wolken');     // 'ueber-den-wolken'
slug('café au lait');        // 'cafe-au-lait'
slug('Hello, World!');       // 'hello-world'
slug(null);                  // ''
```

### CommonJS

```js
const { slug } = require('@pfarr.tools/slug');
```

### Default export

```js
import slug from '@pfarr.tools/slug';
```

## API

### `slug(input)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string \| null \| undefined \| *` | Value to slugify. Non-strings are coerced via `String()`. |

**Returns** `string` — lowercase slug containing only `[a-z0-9-]`, or `''` for `null`/`undefined`.

#### Conversion pipeline

1. `null`/`undefined` → return `''`
2. Coerce to string
3. German transliteration: `Ä→Ae`, `Ö→Oe`, `Ü→Ue`, `ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`
4. Unicode NFD normalization + strip combining diacriticals (é→e, ñ→n, ç→c, …)
5. Lowercase
6. Replace runs of non-`[a-z0-9]` characters with `-`
7. Strip leading/trailing `-`
8. Collapse consecutive `-`

## Examples

```js
slug('Größe & Stärke');           // 'groesse-staerke'
slug('Straße des 17. Juni');      // 'strasse-des-17-juni'
slug('  --leading and trailing--  '); // 'leading-and-trailing'
slug('Chapter 3: The Beginning'); // 'chapter-3-the-beginning'
slug(2024);                       // '2024'
slug('already-clean-slug');       // 'already-clean-slug'
```

## Compatibility with Laravel `Str::slug()`

This function mirrors the behaviour of Laravel's `Str::slug()` for German
input.  Laravel uses `Str::ascii()` internally, which applies the same
umlaut→digraph mapping.  The separator is always `-` (the Laravel default).

## License

GPL-3.0-or-later — © Christoph Fischer <chris@toph.de>


<!-- managed-by: import-open-source-repos -->
