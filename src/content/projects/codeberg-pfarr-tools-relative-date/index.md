---
title: relative-date
summary: Human readable relative date descriptions in German.
date: 2026-05-05T00:00:00.000Z
updated: 2026-05-05T00:00:00.000Z
repository_owner: pfarr.tools
repository_owner_url: 'https://pfarr.tools'
repository_url: 'https://codeberg.org/pfarr.tools/relative-date'
repository_platform: Codeberg
homepage_url: ''
license: GPL 3.0+
license_url: 'https://codeberg.org/pfarr.tools/relative-date/src/branch/main/LICENSE'
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

# @pfarr.tools/relative-date

Human-readable relative date descriptions in German.

Converts a pair of date strings (in `DD.MM.YYYY` format) into a natural German phrase:
`heute`, `gestern`, `vorgestern`, `am Montag`, `am Montag der letzten Woche`, etc.

## Installation

```bash
npm install @pfarr.tools/relative-date
```

## Usage

### ESM

```js
import { relativeDate } from '@pfarr.tools/relative-date';

const today = '05.05.2026';

relativeDate('05.05.2026', today); // 'heute'
relativeDate('04.05.2026', today); // 'gestern'
relativeDate('03.05.2026', today); // 'vorgestern'
relativeDate('28.04.2026', today); // 'am Dienstag der letzten Woche'
relativeDate('21.04.2026', today); // 'am Dienstag vor 2 Wochen'
```

### CommonJS

```js
const { relativeDate } = require('@pfarr.tools/relative-date');
```

### Default export

```js
import relativeDate from '@pfarr.tools/relative-date';
```

## API

### `relativeDate(date1, date2)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `date1` | `string` | Subject date in `DD.MM.YYYY` format (the past date). |
| `date2` | `string` | Reference date in `DD.MM.YYYY` format (typically today). |

**Returns** `string` — German relative-date phrase, or `''` for invalid/missing input.

#### Output phrases by day difference

| Days | Output |
|------|--------|
| 0 | `heute` |
| 1 | `gestern` |
| 2 | `vorgestern` |
| 3–6 | `am <Wochentag>` |
| 7 | `am <Wochentag> der letzten Woche` |
| 8–12 | `am <Wochentag> vor einer Woche` |
| ≥ 13 | `am <Wochentag> vor N Wochen` |

Day names are in German (`Montag`, `Dienstag`, …, `Sonntag`).

## Date format

Both parameters must be strings in `DD.MM.YYYY` format (German locale convention).
Invalid or empty strings return `''`.

## License

GPL-3.0-or-later — © Christoph Fischer <chris@toph.de>


<!-- managed-by: import-open-source-repos -->
