---
permalink: /predigtarchiv.txt
eleventyExcludeFromCollections: true
templateEngineOverride: njk
---
# Predigtarchiv

Dieses Archiv enthält die öffentlich verfügbaren Predigten von {{ site.author.name }}. Es ist für die maschinelle Verarbeitung bestimmt.

{% for sermon in collections.sermons %}
## {{ sermon.data.title | plainText | safe }}

{% if sermon.data.subtitle %}**Untertitel:** {{ sermon.data.subtitle | plainText | safe }}
{% endif %}**Datum:** {{ sermon.date | readableDate("dd.MM.yyyy") }}
{% if sermon.data.scripture %}**Bibelstelle:** {{ sermon.data.scripture | plainText | safe }}
{% endif %}{% if sermon.data.occasion %}**Anlass:** {{ sermon.data.occasion | plainText | safe }}
{% endif %}{% if sermon.data.series %}**Reihe:** {{ sermon.data.series | plainText | safe }}
{% endif %}{% if sermon.data.events and sermon.data.events.length %}**Gottesdienste und weitere Anlässe:**
{% for event in sermon.data.events %}- {{ event.date | readableDate("dd.MM.yyyy") }}{% if event.time %}, {{ event.time | plainText | safe }}{% endif %}{% if event.title %}, {{ event.title | plainText | safe }}{% endif %}{% if event.location %}, {{ event.location | plainText | safe }}{% endif %}{% if event.occasion %}, {{ event.occasion | plainText | safe }}{% endif %}
{% endfor %}{% endif %}
{% if sermon.data.summary %}**Teaser:** {{ sermon.data.summary | plainText | safe }}
{% endif %}
**Vollständiger Predigttext:**

{{ sermon.templateContent | plainText | safe }}

---

{% endfor %}
