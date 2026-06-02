---
title: "bible-reference-parser"
summary: "A PHP library for parsing German Bible verse references into structured data."
date: 2026-05-05
updated: 2026-05-12
repository_owner: "peregrinus"
repository_owner_url: "https://christoph-fischer.de"
repository_url: "https://codeberg.org/peregrinus/bible-reference-parser"
repository_platform: "Codeberg"
homepage_url: ""
license: "GPL 3.0+"
license_url: "https://codeberg.org/peregrinus/bible-reference-parser/src/branch/main/LICENSE"
language: "PHP"
tags:
  - "project"
  - "open-source"
  - "codeberg"
  - "user"
  - "php"
technologies:
  - "PHP"
---

# peregrinus/bible-reference-parser

A PHP library for parsing German Bible verse references into structured data.

Works as a standalone library and as a Laravel package with auto-discovery and a
publishable config file.

Handles single verses, ranges, optional verse sections, chapter-crossing ranges,
dot-separated verse lists, `f.` (following verse) notation, and inline version tags.

## Requirements

- PHP 8.4 or later
- `illuminate/support` ^10.0|^11.0|^12.0|^13.0 (pulled in automatically; also satisfies standalone use)

## Installation

```bash
composer require peregrinus/bible-reference-parser
```

## Laravel Setup

The service provider is registered automatically via package auto-discovery.

Publish the config file to customise book names, Bible versions, and copyrights:

```bash
php artisan vendor:publish --tag=bible-reference-parser-config
```

This creates `config/bible-reference-parser.php` in your application.

### Resolving the parser

Inject `ReferenceParser` from the container anywhere in your application:

```php
use Peregrinus\BibleReferenceParser\ReferenceParser;

class MyController extends Controller
{
    public function __construct(private ReferenceParser $parser) {}

    public function show(Request $request): array
    {
        return $this->parser->parse($request->input('reference'));
    }
}
```

Or resolve it manually:

```php
$parser = app(Peregrinus\BibleReferenceParser\ReferenceParser::class);
```

### Config file (`config/bible-reference-parser.php`)

```php
return [
    // Set to null to use the built-in German defaults (BookMap::defaultGerman()).
    // Provide a custom array to override or extend the book map.
    'books' => null,

    // Map version codes to file paths (or any identifier).
    // The first key is used as the default version.
    'versions' => [
        'LUT17' => resource_path('bible/lut17.txt'),
        'BB'    => resource_path('bible/bb.txt'),
    ],

    // Map version codes to copyright strings.
    'copyrights' => [
        'LUT17' => 'Lutherbibel, revidiert 2017, © 2016 Deutsche Bibelgesellschaft, Stuttgart',
        'BB'    => 'BasisBibel, © 2021 Deutsche Bibelgesellschaft, Stuttgart',
    ],
];
```

## Standalone (non-Laravel) Use

```php
use Peregrinus\BibleReferenceParser\ReferenceParser;
use Peregrinus\BibleReferenceParser\BookMap;

require 'vendor/autoload.php';

// Default German book map, no versions/copyrights configured.
$parser = new ReferenceParser();

// Custom book map.
$parser = new ReferenceParser(
    BookMap::defaultGerman(),
    ['LUT17' => '/path/lut17.txt'],
    ['LUT17' => 'Lutherbibel 2017, © Deutsche Bibelgesellschaft']
);
```

## Quick Start

```php
use Peregrinus\BibleReferenceParser\ReferenceParser;

$parser = new ReferenceParser();

// Parse a reference into a structured array.
$result = $parser->parse('Röm 1,1-5');

// Render a reference back to a canonical string.
echo $parser->render('Jak 5,7-8(9-11)');
// → Jakobus 5,7-8(9-11)

// Expand abbreviated book names.
echo $parser->beautify('Lk 1,1');
// → Lukas 1,1
```

## Supported Reference Formats

| Format | Example |
|---|---|
| Single verse | `Röm 1,1` |
| Verse range | `Röm 1,1-5` |
| Verse list | `Ps 80,2.5.7` |
| Optional verses | `Jak 5,7-8(9-11)` |
| Cross-chapter range | `Jes 63,15-64,3` |
| `f.` notation | `Röm 8,31f.` → `Röm 8,31-32` |
| Multiple sections | `Hes 2,1-5; 3,1-3` |
| Inline version tag | `Röm 1,1[LUT17]` |

## API Reference

### `ReferenceParser::__construct(?array $bookMap, array $versions, array $copyrights)`

| Parameter | Type | Description |
|---|---|---|
| `$bookMap` | `array\|null` | Book code → names map. `null` uses `BookMap::defaultGerman()`. |
| `$versions` | `array` | Optional version code → identifier map. |
| `$copyrights` | `array` | Optional version code → copyright string map. |

### `parse(string $reference, ?string $version): array`

Returns:

```php
[
    'originalReference'  => string,   // unchanged input
    'correctedReference' => string,   // canonical book names substituted
    'version'            => string,   // version code (from tag or $version param)
    'versionCopyrights'  => string,   // copyright string for version, if configured
    'parsed'             => array,    // structured sections (see below)
]
```

Each entry in `parsed`:

```php
[
    'optional' => bool,
    'range' => [
        0 => ['book' => string, 'bookTitle' => string, 'bookRaw' => string, 'chapter' => string, 'verse' => string],
        1 => [...],  // end of range (same as start for single verses)
    ],
]
```

### `render(array|string $reference): string`

Renders parsed or raw reference to a human-readable string. Omits redundant
book/chapter prefixes when multiple sections share the same context.

### `beautify(string $reference): string`

Returns the `correctedReference` — abbreviated book names are expanded to their canonical form.

### `getBookTitle(string $bookCode): string`

Returns the canonical title for a book code, or an empty string if not found.

### `getInstance(): ReferenceParser`

Returns the shared singleton instance, constructed with default German book map.
Useful outside the Laravel container.

## BookMap

The `BookMap` class provides the default German book mapping:

```php
use Peregrinus\BibleReferenceParser\BookMap;

$map = BookMap::defaultGerman();

// Extend it:
$extended = array_merge(BookMap::defaultGerman(), [
    'MyBook' => ['My Custom Book', 'MCB'],
]);
$parser = new ReferenceParser($extended);
```

## Running Tests

```bash
composer install
vendor/bin/phpunit --testdox
```

The test suite runs all 873 real-world references from `tests/fixtures/bible.txt` through
`parse()` and `render()` to ensure no exceptions are thrown. Laravel integration is
tested via Orchestra Testbench.

## License

GPL-3.0-or-later. See LICENSE.

## Author

Christoph Fischer — [christoph-fischer.de](https://christoph-fischer.de) — chris@toph.de


<!-- managed-by: import-open-source-repos -->
