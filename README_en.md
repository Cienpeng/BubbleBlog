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