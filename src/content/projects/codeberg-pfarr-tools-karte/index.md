---
title: karte
summary: >-
  <p align="center" <a href="https://karte.pfarr.tools" target=" blank" <img
  src="https://karte.pfarr.tools/img/logo/logo.png" width="400" alt="Logo der
  Pfarrstellenkarte" </a </p
date: 2023-08-11T00:00:00.000Z
updated: 2024-12-03T00:00:00.000Z
repository_owner: pfarr.tools
repository_owner_url: 'https://pfarr.tools'
repository_url: 'https://codeberg.org/pfarr.tools/karte'
repository_platform: Codeberg
homepage_url: ''
license: GPL 3.0+
license_url: 'https://codeberg.org/pfarr.tools/karte/src/branch/main/LICENSE'
language: CSS
tags:
  - project
  - open-source
  - codeberg
  - organization
  - css
technologies:
  - CSS
submodule_skip: true
---

<p align="center"><a href="https://karte.pfarr.tools" target="_blank"><img src="https://karte.pfarr.tools/img/logo/logo.png" width="400" alt="Logo der Pfarrstellenkarte"></a></p>

## Pfarrstellenkarte

Die Pfarrstellenkarte zeigt eine Übersicht aller freien Pfarrstellen in
der [Evangelischen Landeskirche in Württemberg](https://www.elk-wue.de). Die dazu benötigten Daten werden automatisch
von der Seiten der Landeskirche übernommen. Aus Datenschutzgründen ist der Zugriff auf Benutzer mit einer
@elkw.de/@elk-wue.de-Adresse beschränkt. Angemeldete Benutzer können Änderungsbenachrichtigungen per E-Mail abonnieren.

## Installation

    git clone https://codeberg.org/pfarr.tools/karte.git
    cd karte
    composer install
    npm install
    npm run build
    cp .env.dist .env

Lege eine neue MySQL-Datenbank samt Benutzer an, vergib die nötigen Rechte und trage die Konfiguration in ````.env````
ein.

    artisan migrate

Lege einen VirtualHost so an, dass das Rootverzeichnis auf ````karte/public```` zeigt.

## Backend

Im Backend stellt die Pfarrstellenkarte eine Reihe von CLI-Befehlen für verschiedenen Funktionen bereit:

| *Befehl*                        | *Funktion*                                                                                                                                             |
|---------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------| 
| ````artisan import:okr````      | Importiert die aktuellen Datensätze vom OKR. Dieser Befehl wird über den Scheduler automatisch einmal pro Stunde ausgeführt.                           |
| ````artisan import:geocode````  | Erlaubt die Korrektur eines falschen Geocodings durch die Eingabe eines besseren Suchbegriffs für die Adresse der Pfarrstelle.                         |
| ````artisan login:permalink```` | Erlaubt das Anlegen eines permanenten Login-Links für Benutzer mit einer externen Adresse (oder dort, wo ein Spamfilter die Login-E-Mails unterdrückt. 

## Lizenz

Die Pfarrstellenkarte steht als Teil der [pfarr.tools](https://pfarr.tools) unter der GPL 3.0+ Lizenz.


<!-- managed-by: import-open-source-repos -->

