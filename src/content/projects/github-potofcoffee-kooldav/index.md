---
title: kOOLDAV
summary: >-
  kOOLDAV is aiming to be a drop in CardDAV server for kOOL. It allows users to
  synchronize their devices and addressbook with an existing kOOL install.
  Currently, it is read only.
date: 2013-12-11T00:00:00.000Z
updated: 2013-12-11T00:00:00.000Z
repository_owner: potofcoffee
repository_owner_url: 'https://github.com/potofcoffee'
repository_url: 'https://github.com/potofcoffee/kOOLDAV'
repository_platform: GitHub
homepage_url: ''
license: GPL 3.0+
license_url: 'https://www.gnu.org/licenses/gpl-3.0.txt'
language: PHP
tags:
  - project
  - open-source
  - github
  - user
  - php
technologies:
  - PHP
submodule_skip: true
---

# What is kOOLDAV

kOOLDAV is aiming to be a drop-in CardDAV server for kOOL. It allows users to synchronize their devices and addressbook with an existing kOOL install. Currently, it is read-only.

### Feature list:

* Supports browsing CardDAV addressbook while honoring user rights in kOOL.
* Based on popular [SabreDAV server](http://code.google.com/p/sabredav)

### What could become of this ...

* Two-way sync could be implemented with a reasonable amount of work
* Group support could be implemented, either as CardDAV categories or with an entry for each group
* CalDAV could eventually be implemented as well

### Current state

* At the moment, kOOLDAV is read-only, i.e. it only supports reading data out of kOOL into another database/device. 
* This is still quite a hack.

### Install

To install, it should be sufficient to drop the contents of this repository right into your main kOOL folder.


<!-- managed-by: import-open-source-repos -->

