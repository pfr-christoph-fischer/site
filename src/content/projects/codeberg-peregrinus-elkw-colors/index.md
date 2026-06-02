---
title: "elkw-colors"
summary: "elkw colors ==========="
date: 2024-11-22
updated: 2024-11-22
repository_owner: "peregrinus"
repository_owner_url: "https://christoph-fischer.de"
repository_url: "https://codeberg.org/peregrinus/elkw-colors"
repository_platform: "Codeberg"
homepage_url: ""
license: "GPL 3.0+"
license_url: "https://codeberg.org/peregrinus/elkw-colors/src/branch/main/LICENSE"
language: "SCSS"
tags:
  - "project"
  - "open-source"
  - "codeberg"
  - "user"
  - "scss"
technologies:
  - "SCSS"
---

elkw-colors
===========

SCSS color definitions for ELKW corporate design

## Installation

```bash
npm install elkw-colors
```

## Use

To use these definitions, import them into your .scss file:

```sass
@import 'elkw-colors/elkw-colors.scss';
```

Then use individual colors like this:

```sass
.my-class {
    color: map-get($elkw-colors, "violett");
}
```

## Reference

To see available colors and their use, please refer to [https://www.design.elk-wue.de/farben](https://www.design.elk-wue.de/farben).


<!-- managed-by: import-open-source-repos -->

