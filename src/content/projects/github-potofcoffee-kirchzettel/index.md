---
title: "kirchzettel"
summary: "Kirchzettel =========== Create various church bulletins in Microsoft Word format from a JSON calendar source."
date: 2019-02-04
updated: 2019-02-04
repository_owner: "potofcoffee"
repository_owner_url: "https://github.com/potofcoffee"
repository_url: "https://github.com/potofcoffee/kirchzettel"
repository_platform: "GitHub"
homepage_url: ""
license: "GPL-3.0"
license_url: "https://github.com/potofcoffee/kirchzettel/blob/master/LICENSE"
language: "PHP"
tags:
  - "project"
  - "open-source"
  - "github"
  - "user"
  - "php"
technologies:
  - "PHP"
---

Kirchzettel
===========
Create various church bulletins in Microsoft Word format from a JSON calendar source.

Author: Christoph Fischer, christoph.fischer@elkw.de

This collection of scripts creates several kinds of preconfigured church bulletin files from 
a list of events provided in JSON format. The event list follows the same format as is needed
for [FullCalendar.js](https://fullcalendar.io/).

## How to install

- Clone the Git repository to a directory on your web server.
- Import dependencies with `composer install`
- Copy `Configuration/Kirchzettel.dist.yaml` to `Configuration/Kirchzettel.yaml` and edit the file to suit your needs. Be sure to provide at least a source URL for your JSON list.
- Base your output formats on the two classes provided here (`KirchzettelDocument` and `BekanntgabenDocument`), or
  create entirely new descendants of `AbstractDocument`.
- Build a form that calls `index.php?format=YourFormat` (which would then depend on a class called `YourFormatDocument`) and send the necessary arguments you need for your output.

## References

Microsoft Word output is based on [PhpWord](https://github.com/PHPOffice/PHPWord).

## License

This software is released under the conditions of the GNU General Public License (GPL) v. 3.0 or higher.


<!-- managed-by: import-open-source-repos -->

