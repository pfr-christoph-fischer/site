---
title: romanize
summary: Converts positive integers to Roman numeral strings.
date: 2026-05-05T00:00:00.000Z
updated: 2026-05-05T00:00:00.000Z
repository_owner: pfarr.tools
repository_owner_url: 'https://pfarr.tools'
repository_url: 'https://codeberg.org/pfarr.tools/romanize'
repository_platform: Codeberg
homepage_url: ''
license: GPL 3.0+
license_url: 'https://codeberg.org/pfarr.tools/romanize/src/branch/main/LICENSE'
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

# @pfarr.tools/romanize

Converts positive integers to Roman numeral strings.

## Installation

```bash
npm install @pfarr.tools/romanize
```

## Usage

### ESM

```js
import { romanize } from '@pfarr.tools/romanize';

romanize(1);    // 'I'
romanize(4);    // 'IV'
romanize(9);    // 'IX'
romanize(1994); // 'MCMXCIV'
romanize(2024); // 'MMXXIV'
romanize('X');  // NaN
```

### CommonJS

```js
const { romanize } = require('@pfarr.tools/romanize');
```

### Default export

```js
import romanize from '@pfarr.tools/romanize';
```

## API

### `romanize(num)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `num` | `number \| string` | A positive integer (or numeric string) to convert. |

**Returns** `string` — the Roman numeral representation, or `NaN` if `num` is not a valid number.

#### Supported range

1 to 3 999 999 (outputs become increasingly unwieldy beyond 3 999 due to the
unbounded `M` prefix, but the function never throws).

#### Subtractive notation

The standard subtractive pairs are used:
`IV` (4), `IX` (9), `XL` (40), `XC` (90), `CD` (400), `CM` (900).

## Examples

```js
romanize(42);   // 'XLII'
romanize(99);   // 'XCIX'
romanize(399);  // 'CCCXCIX'
romanize(1776); // 'MDCCLXXVI'
romanize(3999); // 'MMMCMXCIX'
```

## License

GPL-3.0-or-later — © Christoph Fischer <chris@toph.de>


<!-- managed-by: import-open-source-repos -->
