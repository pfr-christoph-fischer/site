---
title: aktenplan
summary: >-
  <p align="center" <a href="https://aktenplan.pfarr.tools" target=" blank" <img
  src="https://aktenplan.pfarr.tools/img/logo/logo.png" width="400" alt="Logo
  der Pfarrstellenkarte" </a </p
date: 2024-04-09T00:00:00.000Z
updated: 2024-12-20T00:00:00.000Z
repository_owner: pfarr.tools
repository_owner_url: 'https://pfarr.tools'
repository_url: 'https://codeberg.org/pfarr.tools/aktenplan'
repository_platform: Codeberg
homepage_url: ''
license: GPL 3.0+
license_url: 'https://codeberg.org/pfarr.tools/aktenplan/src/branch/main/LICENSE'
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

<p align="center"><a href="https://aktenplan.pfarr.tools" target="_blank"><img src="https://aktenplan.pfarr.tools/img/logo/logo.png" width="400" alt="Logo der Pfarrstellenkarte"></a></p>

## Aktenplansuche

Die Aktenplansuche macht den Aktenplan der [Evangelischen Landeskirche in Württemberg](https://www.elk-wue.de)
durchsuchbar und erlaubt den Druck von Ordnerrücken und Etiketten zu einzelnen Aktenzeichen. 
Die dazu benötigten Daten werden automatisch von der Seiten der Landeskirche übernommen. 

## Installation

    git clone https://codeberg.org/pfarr.tools/aktenplan.git
    cd aktenplan
    composer install
    npm install
    npm run build
    cp .env.dist .env

Lege eine neue MySQL-Datenbank samt Benutzer an, vergib die nötigen Rechte und trage die Konfiguration in ````.env````
ein.

    artisan key:generate
    artisan migrate

Lege einen VirtualHost so an, dass das Rootverzeichnis auf ````aktenplan/public```` zeigt.

## Backend

Im Backend stellt die Pfarrstellenkarte eine Reihe von CLI-Befehlen für verschiedenen Funktionen bereit:

| *Befehl*                       | *Funktion*                                                                                                                                             |
|--------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------| 
| ````artisan aktenplan:import````    | Importiert die aktuellen Datensätze vom OKR. Dieser Befehl wird über den Scheduler automatisch einmal pro Tag ausgeführt.                              |

## Lizenz

Die Aktenplansuche steht als Teil der [pfarr.tools](https://pfarr.tools) unter der GPL 3.0+ Lizenz.


<!-- managed-by: import-open-source-repos -->

