---
title: potter
summary: composer require peregrinus/potter
date: 2018-05-31T00:00:00.000Z
updated: 2018-06-02T00:00:00.000Z
repository_owner: potofcoffee
repository_owner_url: 'https://github.com/potofcoffee'
repository_url: 'https://github.com/potofcoffee/potter'
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

# potter
Auto-create .pot translation templates for WordPress plugins

## Setup
This is assumes that you already have a WordPress plugin using Composer. In this case, you'll just have to type the following command in your plugin's root directory.

    composer require peregrinus/potter
    
Composer will install the potter script into the vendor/peregrinus/potter folder. Unfortunately,
at this moment, composer still fails to assign the correct permissions on Linux, so you'll have to do a second command:

    chmod +x vendor/peregrinus/potter/potter
    
## Usage
On Linux, execute the following command in the root directory of your plugin:

    vendor/peregrinus/potter/potter
    
On windows, you would use the following command:

    php vendor\peregrinus\potter\potter

Potter will figure out the correct name and path for your .pot file from the plugin's metadata,
most notably "Domain Path" and "Text Domain". It will then scan all php files
in your plugin's folder and all subfolders and extract all relevant texts.


<!-- managed-by: import-open-source-repos -->

