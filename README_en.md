# BubbleBlog Project Structure and Operation Guide

[中文](./README.md) | English
---
## Overview

Personal tech blog based on **Bun** monorepo, **PostgreSQL** database, **React + Vite + Tailwind CSS** frontend, JWT authentication.

[Demo](./samples.md)
---
[Project Structure & API List](./API.md)
---

## Project Usage and Deployment Guide

BubbleBlog is a single-admin personal blog. The backend runs directly on Bun and uses the `postgres` client for PostgreSQL. The frontend is built as static files served by Caddy, which proxies API, media, and sitemap requests to the loopback-only backend.

### Features and security

- Markdown article editing, preview, publishing, full-text search, tags, carousels, and image uploads.
- Public author profile, article likes, page-view metrics, and reading-duration metrics.
- Page-view and reading-duration records are persistent business data and are not automatically deleted by age.
- One fixed `admin` account, CAPTCHA login, escalating login lockouts, and an HttpOnly sliding session that expires after 60 hours without authenticated administration activity.
- Separate limits for login, likes, CAPTCHA, and analytics reporting, plus a global API rate limit.
- Upload size, MIME, and magic-byte validation; drafts and every administration endpoint are authorized on the server.
- Caddy supplies HTTPS, security headers, compression, static caching, and a 6 MB request-body ceiling.

See [API.md](./API.md) for all routes, request fields, and limits.

## Requirements

- [Bun](https://bun.sh/) as the runtime and package manager
- PostgreSQL
- Caddy and systemd in production (the repository does not require a container runtime)

## Installation and configuration

Install all workspace dependencies from the project root:

```bash
bun install
cp .env.example .env
```

Edit the root `.env`. In production, generate two different random values of at least 32 characters for the secrets; for example, run `openssl rand -hex 32` twice.

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection settings; placeholder database passwords are rejected in production |
| `JWT_SECRET` | HS256 session-signing key; at least 32 non-placeholder characters in production |
| `ANALYTICS_HASH_SECRET` | Separate key used to hash anonymous visitor identifiers; it must differ from `JWT_SECRET` |
| `UPLOAD_DIR` | Upload directory; relative paths are resolved from the server working directory |
| `PORT` | Backend port, default `3000` |
| `HOST` | Backend bind address; production accepts only `127.0.0.1`, `::1`, or `localhost` |
| `NODE_ENV` | `development` or `production`; production enables secure cookies and strict configuration validation |
| `PUBLIC_ORIGIN` | Public HTTPS origin accepted by CORS preflight checks |
| `PUBLIC_BASE_URL` | Public HTTPS base URL used to build absolute links in `sitemap.xml` |

The application first reads `.env` from its current working directory and falls back to the project-root `.env`; variables already supplied by the parent process or systemd always take precedence. Keep a single `.env` at the project root where possible. Caddy does not read this file, so database credentials and application secrets are not copied into the Caddy process environment.

## Initialize the database and administrator

```bash
cd packages/server
bun run db:migrate
```

The administrator username is fixed as `admin`. There is no public account-setup API. On a fresh deployment, create the administrator locally with a 12–128 character password. This example keeps the password out of shell history:

```bash
cd packages/server
read -rsp "Initial admin password: " ADMIN_PASSWORD; echo
printf '%s' "$ADMIN_PASSWORD" | bun run admin:setup
unset ADMIN_PASSWORD
```

The command refuses to overwrite an existing `admin` account.

## Local development

For local HTTP development, set `NODE_ENV=development` and `PUBLIC_ORIGIN=http://localhost:5173` in `.env`.

Start the backend and frontend in separate terminals:

```bash
cd packages/server
bun run dev
```

```bash
cd packages/web
bun run dev
```

Vite listens on `http://localhost:5173` by default and proxies `/api`, `/media`, and `/sitemap.xml` to `http://localhost:3000`.

## Production build and runtime

Build the frontend:

```bash
cd packages/web
bun run build
```

Output is written to `packages/web/dist`. Start the production backend with:

```bash
cd packages/server
bun start
```

Run the backend under systemd and keep `HOST=127.0.0.1`, preventing public access to port 3000 that would bypass Caddy. Set the service `WorkingDirectory` to `packages/server`; `ExecStart` can use Bun's absolute path to run `src/index.ts`.

The root [Caddyfile](./Caddyfile) expects three variables in the Caddy service environment:

| Variable | Purpose |
| --- | --- |
| `ACME_EMAIL` | ACME certificate notification address |
| `SITE_ADDRESS` | Caddy site address, for example `blog.example.com` |
| `WEB_ROOT` | Absolute path to the frontend build, for example `/srv/bubbleblog/packages/web/dist` |

They can be stored in `/etc/caddy/bubbleblog.env` and loaded with `EnvironmentFile=/etc/caddy/bubbleblog.env` in a Caddy systemd drop-in. Validate before reloading after any change:

```bash
sudo bash -c '
set -a
. /etc/caddy/bubbleblog.env
set +a
/usr/bin/caddy validate --config /etc/caddy/Caddyfile
'
sudo systemctl reload caddy
```

The checked-in Caddy configuration validates client addresses for a Cloudflare reverse-proxy deployment. Keep the published Cloudflare address ranges current and continue to deny unnecessary inbound ports at the host firewall.

## Scripts

| Directory | Command | Purpose |
| --- | --- | --- |
| `packages/server` | `bun run dev` | Start the backend and watch source changes |
| `packages/server` | `bun start` | Start the backend |
| `packages/server` | `bun run db:migrate` | Create or upgrade the database schema |
| `packages/server` | `bun run admin:setup` | Create the first administrator from standard input |
| `packages/web` | `bun run dev` | Generate obfuscated images and start Vite |
| `packages/web` | `bun run build` | Generate obfuscated images, type-check, and build production static files |
| `packages/web` | `bun run preview` | Preview the production build locally |
# BubbleBlog Project Structure and Operation Guide

[中文](./README.md) | English
---
## Overview

Personal tech blog based on **Bun** monorepo, **PostgreSQL** database, **React + Vite + Tailwind CSS** frontend, JWT authentication.

[Demo](./samples.md)
---
[Project Structure & API List](./API.md)
---

## Project Usage and Deployment Guide

### 1. Environment Configuration (`.env`)
Copy `.env.example` in the project root directory and rename it to `.env`, then configure your PostgreSQL database connection credentials:
```ini
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=bubbleblog
PORT=3000
JWT_SECRET=your_custom_jwt_secret_string
```

### 2. Create Database Tables (Migrations)
We have integrated all database changes (initial structure, personal settings column extensions, secure session tables, statistics tables, ban lock tables, and verification code tables) into a unified migration file. You can generate the entire structure with one command:
```bash
# Navigate to the server package
cd packages/server

# Execute database migration
bun run db:migrate
```
*(If successful, the console will output `Running migrations...` and prompt `Migrations complete.`)*

### 3. Create Admin Account (Admin Setup)
This project is a single-user personal blog, and the admin account is fixed as `admin`. When the database is newly created and the `admin` account has not been set up yet:
1. Start the backend server and start the frontend Vite development server.
2. In your browser, visit: `http://localhost:5173/login` (or `/login` on your deployed domain).
3. If the frontend detects no accounts in the database, it will automatically display the **System Initialization Account Registration** interface.
4. Enter your desired initial password and click "Create Admin" to automatically initialize your password and create the `admin` account.
5. Alternatively, run directly: `curl -X POST http://localhost/api/auth/setup -H "Content-Type: application/json" -d '{"password": "your_password"}'`
*(Note: Once the admin account is created, the backend will automatically lock the setup endpoint to prevent duplicate submissions and brute-force attacks)*

### 4. Start Backend Service
In both development and production modes, run the following in the `packages/server` directory:
```bash
# Navigate to the backend package directory
cd packages/server

# Option A: Development environment (supports auto-reload on code changes)
bun run dev

# Option B: Production run
bun start
```

### 5. Start Frontend Service
Run the following in the `packages/web` frontend directory:

* **Local Development Environment**:
  ```bash
  cd packages/web
  bun run dev
  ```
  *(The development server will start at `http://localhost:5173` by default and automatically proxy all `/api/*` requests to `http://localhost:3000`)*

* **Production Build Deployment**:
  ```bash
  cd packages/web
  
  # Run build, output will be generated in `packages/web/dist`
  bun run build
  ```
  *(You can serve the generated `dist` directory with Caddy or Nginx for static asset distribution, according to the [Caddyfile] configuration in the project root directory)*