---
title: DistributionListUpdater
summary: DistributionListUpdater =======================
date: 2018-11-04T00:00:00.000Z
updated: 2019-11-09T00:00:00.000Z
repository_owner: potofcoffee
repository_owner_url: 'https://github.com/potofcoffee'
repository_url: 'https://github.com/potofcoffee/DistributionListUpdater'
repository_platform: GitHub
homepage_url: ''
license: GPL-3.0
license_url: 'https://github.com/potofcoffee/DistributionListUpdater/blob/master/LICENSE'
language: C#
tags:
  - project
  - open-source
  - github
  - user
  - c
technologies:
  - C#
submodule_skip: true
---

DistributionListUpdater
=======================

Outlook-Add-In zum automatischen Erstellen von Verteilerlisten

Autor: Christoph Fischer, christoph.fischer@elkw.de

## Einführung
Verteilerlisten unter Outlook leiden unter zwei grundsätzlichen Problemen:

1. Bestehende Outlookkontakte können zwar zu einer Verteilerliste hinzugefügt werden, nachfolgende Änderungen an den Kontaktdaten werden aber nicht automatisch übernommen. Die Möglichkeit, eine Verteilerliste zur Bearbeitung zu öffnen und anschließend zu "aktualisieren" ist bie einer großen Anzahl von Verteilerlisten keine zufriedenstellende Lösung.
2. Verteilerlisten können nicht zu einer Kontaktliste auf Sharepoint hinzugefügt und damit auf mehreren Rechnern synchron gehalten werden. Verteilerlisten können nur in lokalen (bzw. auf Exchange gespeicherten) Kontaktordnern angelegt werden.

Das vorliegende Add-In bietet einen Lösungsansatz dazu. Mit einem Klick wird ein vordefinierter Kontaktordner nach Kategorien durchsucht. Zu jeder Kategorie wird eine Verteilerliste "VL.Kategoriename" mit den
entsprechenden Kontakten erstellt.

## Installation

1. Legen Sie einen neuen, leeren Kontaktordner für Ihre Verteilerlisten an.
2. Laden Sie das Setup-Programm zum Add-In hier unter [Releases](https://github.com/potofcoffee/DistributionListUpdater/releases) herunter.
3. Beenden Sie Outlook, falls es aktuell ausgeführt wird.
4. Führen Sie das Setup-Programm aus und übernehmen Sie die vorgeschlagenen Einstellungen.
5. Starten Sie Outlook. Falls Sie die folgende Sicherheitsabfrage (nur beim ersten Start nach der Installation) sehen, klicken Sie auf "Installieren":

6. Nach dem Start fragt das Add-In einmalig nach dem zu durchsuchenden Kontaktordner, sowie nach einem Ordner für die Verteilerlisten. *Bitte beachten: Der Ordner für die 
Verteilerlisten wird bei jeder Aktualisierung durch das Add-In komplett gelöscht und neu angelegt. Legen Sie hier keine eigenen Einträge an!* Die beim ersten Start getroffene 
Zuweisung kann jederzeit über die Schaltflächen "Ko" und "List" verändert werden.


## Bedienung

1. Ordnen sie den Kontakten im ausgewählten Kontaktordner beliebige Kategorien zu.

2. Klicken Sie im Bereich "Verteilerlisten" des Menübands auf die Schaltfläche "Alle aktualisieren". (Der Bereich "Verteilerlisten" erscheint unter dem Reiter "Start", wenn Sie sich im Bereich E-Mails oder Kontakte von Outlook befinden).

3. Im Verteilerlistenordner finden Sie ihre neuen Verteilerlisten. Zum einfacheren Auffinden bei der Adresseingabe wird dem Titel der Kategorie jeweils "VL." vorangestellt.

## Wichtige Informationen

1. Der Verteilerlistenordner wird bei jedem Klick auf die Schaltfläche "Alle aktualisieren" gelöscht und neu erstellt. Manuelle Änderungen an der Verteilerliste gehen dabei verloren. Bitte nehmen Sie Änderungen nur direkt an den Kontakten bzw. deren Kategoriezuweisungen vor.
2. Kontakte mit Kategorien können über Sharepoint zwischen mehreren Benutzern synchron gehalten werden. Dies ist grundsätzlich auch auf dem ELKW-Sharepoint möglich. Dazu muss die Einrichtung einer "Kontaktliste" beantragt werden. Bitte beachten Sie, dass in der Standardeinstellung nur bestimmte Kontaktdaten synchronisiert werden. Das Feld "Kategorien" gehört nicht dazu. Auf dem Sharepoint ist es daher nötig, dieses (und evtl. weitere benötigte Felder) erst hinzuzufügen. Im Fall des ELKW-Sharepoints muss dies durch die Datagroup geschehen.


## Danke
Das Installationsprogramm zum Add-In wurde mit Daniel Kraus' ausgezeichnetem [VstoAdd-InInstaller](https://github.com/bovender/VstoAdd-InInstaller) erstellt.

## Lizenz
Dieses Add-In wird unter der GNU GPLv3-Lizenz angeboten. Nähere Informationen dazu finden sich in der Datei LICENSE. Ausführliche deutschsprachige Lizenzinformationen finden sich [hier](http://www.gnu.de/documents/gpl.de.html).


<!-- managed-by: import-open-source-repos -->
