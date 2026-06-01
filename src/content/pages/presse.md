---
layout: layouts/page.njk
title: Presse
summary: Hinweise und Material zum Pressebereich.
permalink: /presse/
---
Die Presseberichte aus dem bisherigen Auftritt werden hier als zugängliche, direkt verlinkbare Sammlung weitergeführt.

{% set items = legacyMedia.press %}
{% include "components/gallery-grid.njk" %}
