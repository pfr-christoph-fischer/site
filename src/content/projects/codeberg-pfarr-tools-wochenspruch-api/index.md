---
title: "wochenspruch-api"
summary: "Die Wochenspruch API gibt Zugriff auf die wichtigsten Daten zum Kirchenjahr im JSON Format und stellt automatisch erzeugte Bilder zu den Wochensprüchen bereit. Als Datenbasis dient www.kirchenjahr evangelisch.de."
date: 2024-07-09
updated: 2026-06-02
repository_owner: "pfarr.tools"
repository_owner_url: "https://pfarr.tools"
repository_url: "https://codeberg.org/pfarr.tools/wochenspruch-api"
repository_platform: "Codeberg"
homepage_url: ""
license: "GPL 3.0+"
license_url: "https://codeberg.org/pfarr.tools/wochenspruch-api/src/branch/main/LICENSE"
language: "PHP"
tags:
  - "project"
  - "open-source"
  - "codeberg"
  - "organization"
  - "php"
technologies:
  - "PHP"
---

# Wochenspruch API

Die Wochenspruch-API gibt Zugriff auf die wichtigsten Daten zum Kirchenjahr im JSON-Format und stellt automatisch erzeugte Bilder zu den Wochensprüchen bereit.
Als Datenbasis dient [www.kirchenjahr-evangelisch.de](https://www.kirchenjahr-evangelisch.de).

## Daten zum Kirchenjahr abfragen

Alle Daten zum Kirchenjahr lassen sich mit folgender URL abfragen:

[https://wochenspruch.pfarr.tools/api/kirchenjahr](https://wochenspruch.pfarr.tools/api/kirchenjahr)

Daten zu einem bestimmten Datum lassen sich über ````/api/kirchenjahr/datum/<datum>```` abfragen.

Beispiel: 06.12.2024 (Nikolaustag)

[https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-06](https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-06)

Wenn mehrere Proprien zu einem Tag gehören, werden alle zurückgegeben -- Beispiel: 24.12.2024

[https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-24](https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-24)

Wenn kein Proprium zum Tag gehört, wird ein leeres Array zurückgegeben -- Beispiel 21.12.2024

[https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-21](https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-21)

Soll bei solchen Tagen stattdessen der korrekte Wochenspruch zurückgegeben werden, ist stattdessen ````/api/kirchenjahr/woche/<datum>```` aufzurufen.

[https://wochenspruch.pfarr.tools/api/kirchenjahr/woche/2024-12-21](https://wochenspruch.pfarr.tools/api/kirchenjahr/woche/2024-12-21)

## Bilder mit Tages-/Wochensprüchen

Die Wochenspruch API stellt automatisch Bilder mit den Tagesversen bzw. Wochensprüchen bereit. Ein direkter Zugriff ist über die ID möglich,
die von der API für das jeweilige Proprium zurückgegeben wird. Das Bild findet sich jeweils unter ````/spruch/<id>.jpg````

Beispiel: 06.12.2024 (Nikolaustag)

[https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-06](https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-06) ergibt die ID 1353. Das Bild dazu lässt sich hier aufrufen:
[https://wochenspruch.pfarr.tools/spruch/1353.jpg](https://wochenspruch.pfarr.tools/spruch/1353.jpg)

![Bild 1353](https://wochenspruch.pfarr.tools/spruch/1353.jpg)

Alternativ lässt sich dasselbe Bild auch über das Datum aufrufen. Gehören mehrere Propria zum Datum, wird das erste verwendet.

[https://wochenspruch.pfarr.tools/spruch/2024-12-06.jpg](https://wochenspruch.pfarr.tools/spruch/2024-12-06.jpg)

![Bild 2024-12-06](https://wochenspruch.pfarr.tools/spruch/2024-12-06.jpg)

Als letzte Möglichkeit lässt sich das Bild zu einem Proprium auch über einen "Slug", d.h. ein Textkürzel aufrufen. Dieses geht aus den Daten zum Proprium hervor. [https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-06](https://wochenspruch.pfarr.tools/api/kirchenjahr/datum/2024-12-06) ergibt als Slug "nikolaustag".

[https://wochenspruch.pfarr.tools/spruch/nikolaustag.jpg](https://wochenspruch.pfarr.tools/spruch/nikolaustag.jpg)

![Bild nikolaustag](https://wochenspruch.pfarr.tools/spruch/nikolaustag.jpg)

Hiermit kann besonders bei Tagen mit mehreren Proprien geziehlt ein bestimmtes Proprium abgerufen werden -- Beispiel: 24.11.2024 (Toten-/Ewigkeitssonntag)

[https://wochenspruch.pfarr.tools/spruch/2024-11-24.jpg](https://wochenspruch.pfarr.tools/spruch/2024-11-24.jpg) ergibt das erste Proprium (Totensonntag).

![Bild 2024-11-24](https://wochenspruch.pfarr.tools/spruch/2024-11-24.jpg)

Dagegen ergibt [https://wochenspruch.pfarr.tools/spruch/ewigkeitssonntag.jpg](https://wochenspruch.pfarr.tools/spruch/ewigkeitssonntag.jpg) gezielt das gewünschte Proprium "Ewigkeitssonntag".

![Bild 2024-11-24](https://wochenspruch.pfarr.tools/spruch/ewigkeitssonntag.jpg)


## Entwicklung

Die Wochenspruch API ist Teil von [pfarr.tools](https://pfarr.tools) und wurde von Pfr. Christoph Fischer entwickelt.
Der Code steht unter der GPL 3.0+ Lizenz auf [Codeberg](https://codeberg.org/pfarr.tools/wochenspruch-api) bereit.

Bei der Entwicklung wurde darauf geachtet, möglichst sparsam auf die Datenquelle kirchenjahr-evangelisch.de zuzugreifen. Das Programm
holt sich die Liste der Proprien aus den [dort bereitgestellten Kalenderdateien](https://kirchenjahr-evangelisch.de/ical-kalender-download/)
und von der Startseite [kirchenjahr-evangelisch.de](https://www.kirchenjahr-evangelisch.de/). Weiter gehende Detaildaten werden über einen
Cron-gesteuerten Scheduler und den CLI-Befehl ````artisan import:details```` abgerufen (jeweils ein Proprium pro Aufruf).
Dabei werden Details für denselben Feiertag in anderen Jahren gleich automatisch mit aufgefüllt.


<!-- managed-by: import-open-source-repos -->

