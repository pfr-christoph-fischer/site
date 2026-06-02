---
title: "hochschulstart"
summary: "This PHP tool logs into hochschulstart.de, navigates through the service procedures, and retrieves the waitlist status for a prospective student."
date: 2025-08-11
updated: 2025-08-13
repository_owner: "peregrinus"
repository_owner_url: "https://christoph-fischer.de"
repository_url: "https://codeberg.org/peregrinus/hochschulstart"
repository_platform: "Codeberg"
homepage_url: ""
license: "GPL 3.0+"
license_url: "https://codeberg.org/peregrinus/hochschulstart/src/branch/main/LICENSE"
language: "PHP"
tags:
  - "project"
  - "open-source"
  - "codeberg"
  - "user"
  - "php"
technologies:
  - "PHP"
---

# Hochschulstart

This PHP tool logs into [hochschulstart.de](https://hochschulstart.de), navigates through the service procedures, and retrieves the waitlist status for a prospective student.

## Features
- Automated login with username and password
- Selects a specific *Serviceverfahren* (admission procedure)
- Retrieves application details and waitlist positions
- Supports prioritizing universities
- Outputs results in a structured format

## Requirements
- PHP 8.1+
- Composer
- Internet connection
- Valid Hochschulstart.de account

## Installation

1. **Clone the repository**
   ```bash
   git clone https://codeberg.org/peregrinus/hochschulstart.git
   cd hochschulstart
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Copy and edit environment configuration**
   ```bash
   cp .env.sample .env
   ```
   Open `.env` and fill in your credentials and settings:
   ```env
   HS_USER=your-username
   HS_PASSWORD=your-password
   VERFAHREN="Wintersemester 2025/26 Koordinierungsverfahren"
   PRIO=Uni1,Uni2,Uni3
   ```

   **Configuration options:**
   - `HS_USER` – Your Hochschulstart.de username
   - `HS_PASSWORD` – Your Hochschulstart.de password
   - `VERFAHREN` – Name of the admission procedure to select
   - `PRIO` – Comma-separated list of university identifiers (optional, to filter/sort results)

## Usage

Run the scraper from the project root:

```bash
cd public
php index.php
```

The script will:
1. Log in to Hochschulstart.de
2. Select the configured service procedure
3. Retrieve your submitted applications
4. Display the details and waitlist information. 

Since the output is HTML, this is designed to be run on a web server. In this case, 
set the web root to the ``public`` directory.

## Automatic email notifications
You can set up automatic email notifications by setting up a cron job to call notify.php

## License
This project is licensed under the **GPL-3.0-or-later** license.
See the LICENSE file for details.


<!-- managed-by: import-open-source-repos -->
