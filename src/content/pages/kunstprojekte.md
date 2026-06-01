---
layout: layouts/page.njk
title: Kunstprojekte
summary: Überblick über künstlerische und experimentelle Arbeiten.
permalink: /kunstprojekte/
---
Kunst ist eine starke Möglichkeit, Räume, Geschichten und Glauben sinnlich erfahrbar zu machen. Die bisherigen Projekte aus dem alten Auftritt werden hier als statische Galeriesammlungen weitergeführt.

{% for project in legacyMedia.artProjects %}
## {{ project.title }}

{% set items = project.images %}
{% include "components/gallery-grid.njk" %}
{% endfor %}
