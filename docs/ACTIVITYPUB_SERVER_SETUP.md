# ActivityPub Backend Server Setup

This document describes how to install and run the ActivityPub backend on a server behind Caddy.

It assumes:

- static site output is served from `/var/www/christoph-fischer.de`
- a separate backend deployment directory lives outside the webroot
- the key files live outside the webroot at `../cfde/keys/public.pem` and `../cfde/keys/private.pem` relative to the backend deployment directory
- Caddy reverse proxies ActivityPub routes to a localhost-only Node process

## 1. Recommended Server Layout

Use a layout like this:

```text
/srv/
  cfde/
    current/                  # deployed backend bundle
      backend/
      scripts/
      docs/
      package.json
      .env
    keys/
      public.pem
      private.pem

/var/www/
  christoph-fischer.de/       # static _site/ output only
```

With that layout, the backend `.env` can safely use:

```dotenv
ACTIVITYPUB_PUBLIC_KEY_PATH=../keys/public.pem
ACTIVITYPUB_PRIVATE_KEY_PATH=../keys/private.pem
```

These are relative to the deployed project root. The backend resolves relative key paths against the project root automatically.

## 2. Create the Backend Deployment Directory

Create a backend location outside the webroot:

```bash
sudo mkdir -p /srv/cfde
sudo chown -R www-data:www-data /srv/cfde
```

Create the target directory for the deployed backend bundle:

```bash
sudo -u www-data mkdir -p /srv/cfde/current
```

Set this path locally in your project `.env`:

```dotenv
BACKEND_SERVER_PATH=/srv/cfde/current
```

Then deploy the backend bundle from your local machine:

```bash
npm run deploy:backend
```

That command:

- copies the backend runtime files to `BACKEND_SERVER_PATH` on the same host as `DEPLOY_TARGET`
- writes a backend `.env` there from your local `ACTIVITYPUB_*` variables
- does not upload key files
- does not upload `_site/`
- does not overwrite backend runtime state in `backend/data/`

No Git checkout is required on the server for this deployment model.

## 3. Install the Keys

Create the key directory outside the webroot:

```bash
sudo -u www-data mkdir -p /srv/cfde/keys
```

Place the existing key files there:

```text
/srv/cfde/keys/public.pem
/srv/cfde/keys/private.pem
```

Permissions should prevent other users from reading the private key:

```bash
sudo chown www-data:www-data /srv/cfde/keys/public.pem /srv/cfde/keys/private.pem
sudo chmod 644 /srv/cfde/keys/public.pem
sudo chmod 600 /srv/cfde/keys/private.pem
```

## 4. Create the Backend `.env`

`npm run deploy:backend` creates `/srv/cfde/current/.env` automatically.

If you need to create or adjust it manually, use at least:

```dotenv
ACTIVITYPUB_BASE_URL=https://www.christoph-fischer.de
ACTIVITYPUB_DOMAIN=christoph-fischer.de
ACTIVITYPUB_HOST=127.0.0.1
ACTIVITYPUB_PORT=8787
ACTIVITYPUB_PUBLIC_KEY_PATH=../keys/public.pem
ACTIVITYPUB_PRIVATE_KEY_PATH=../keys/private.pem
```

Optional but commonly useful:

```dotenv
ACTIVITYPUB_USERNAME=christoph
ACTIVITYPUB_DISPLAY_NAME=Christoph Fischer
ACTIVITYPUB_WEBSITE_URL=https://www.christoph-fischer.de
ACTIVITYPUB_DATA_DIR=backend/data
ACTIVITYPUB_DB_PATH=backend/data/activitypub.sqlite
```

Notes:

- `ACTIVITYPUB_BASE_URL` must be the public HTTPS origin.
- `ACTIVITYPUB_HOST` should stay `127.0.0.1` when Caddy is proxying.
- Do not point the key paths into `_site/` or any other public directory.
- The custom `.env` loader is line-based. Keep each variable on a single line.
- `npm run deploy:backend` generates this file from the local `ACTIVITYPUB_*` values.

## 5. Install the systemd Service

The repository includes a service template at `deploy/activitypub-backend.service`.

Install it as:

```bash
sudo cp /srv/cfde/current/deploy/activitypub-backend.service /etc/systemd/system/cfde-activitypub.service
```

Review the paths and runtime user in the unit. The template assumes:

- working directory: `/srv/cfde/current`
- runtime user: `www-data`
- Node binary from `/usr/bin/env node`

As currently implemented, the backend uses Node built-ins and local files only. It does not require `npm install` on the server just to run `backend/server.mjs`.

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cfde-activitypub.service
```

Check status and logs:

```bash
sudo systemctl status cfde-activitypub.service
sudo journalctl -u cfde-activitypub.service -f
```

## 6. Configure Caddy

Use the example Caddy config from `deploy/Caddyfile.activitypub`.

The important routes are:

- `/.well-known/webfinger`
- `/users/*`
- `/activity/*`

Those routes must reverse proxy to `127.0.0.1:8787`, while all other paths should be served from the static site root.

Example:

```caddyfile
www.christoph-fischer.de {
  root * /var/www/christoph-fischer.de
  encode zstd gzip

  handle /.well-known/webfinger* {
    reverse_proxy 127.0.0.1:8787
  }

  handle /users/* {
    reverse_proxy 127.0.0.1:8787
  }

  handle /activity/* {
    reverse_proxy 127.0.0.1:8787
  }

  try_files {path} {path}/ =404
  file_server
}
```

After updating Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 7. First Start Validation

Once the backend service is running, verify:

```bash
curl -i http://127.0.0.1:8787/.well-known/webfinger?resource=acct:christoph@christoph-fischer.de
curl -i https://www.christoph-fischer.de/.well-known/webfinger?resource=acct:christoph@christoph-fischer.de
curl -i https://www.christoph-fischer.de/users/christoph
```

You should see:

- local backend responds on `127.0.0.1:8787`
- public HTTPS requests succeed through Caddy
- actor URLs use `https://www.christoph-fischer.de/...`, not localhost URLs

## 8. Updates and Deploy Flow

This project's `npm run deploy` only rsyncs `_site/` to the webroot. It does not deploy:

- `.env`
- backend code
- `node_modules`
- key files
- systemd service definitions

That means backend updates are a separate server workflow:

```bash
cd /path/to/local/repo
npm run deploy:backend

sudo systemctl restart cfde-activitypub.service
```

If the static site also changed, run the normal static deploy workflow separately.

## 9. Troubleshooting

If the service fails immediately:

- check `journalctl -u cfde-activitypub.service`
- confirm `.env` exists in the backend deployment root
- confirm the key paths resolve from the deployment root
- confirm the private key is readable by the service user

If public ActivityPub routes 404:

- confirm Caddy proxies `/.well-known/webfinger`, `/users/*`, and `/activity/*`
- confirm the backend is listening on `127.0.0.1:8787`
- confirm `ACTIVITYPUB_HOST=127.0.0.1` and `ACTIVITYPUB_PORT=8787`

If actor URLs are wrong:

- confirm `ACTIVITYPUB_BASE_URL=https://www.christoph-fischer.de`
- confirm `ACTIVITYPUB_DOMAIN=christoph-fischer.de`

If relative key paths fail:

- switch to absolute paths such as `/srv/cfde/keys/public.pem` and `/srv/cfde/keys/private.pem`
- or confirm the backend checkout path matches the expected server layout
