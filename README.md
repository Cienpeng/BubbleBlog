# BubbleBlog 项目代码结构与操作指南

中文 | [English](./README_en.md)
---
## 概述

个人技术博客，基于 **Bun** monorepo，**PostgreSQL** 数据库，**React + Vite + Tailwind CSS** 前端，JWT 认证。

[效果展示](./samples.md)
---
[项目结构与API列表](./API.md)
---



## 项目使用与部署指南

<<<<<<< HEAD
### 1. 环境配置 (`.env`)
在项目根目录复制 `.env.example` 命名为 `.env`，并配置您的 PostgreSQL 数据库连接凭证：
```ini
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=bubbleblog
PORT=3000
JWT_SECRET=your_custom_jwt_secret_string
```

### 2. 创建数据库表 (Migrations)
我们已经将所有数据库变更（初始结构、个人设置列扩展、安全会话表、统计数据表、封禁锁表与验证码表）整合进统一的迁移文件中，可以直接一键生成所有结构：
```bash
# 导航到服务器 package
cd packages/server

# 执行数据库迁移
bun run db:migrate
```
*(如果运行成功，控制台将输出 `Running migrations...` 并提示 `Migrations complete.`)*

### 3. 创建管理员账户 (Admin Setup)
本项目属于单用户个人博客，管理员账户固定为 `admin`。当数据库全新建立、且尚未创建 `admin` 账户时：
1. 启动后端服务器并启动前端 Vite 开发服务器。
2. 在浏览器中访问：`http://localhost:5173/login`（或者您部署的域名 `/login`）。
3. 前端检测到数据库无账户，会自动展示 **系统初始化账户注册** 界面。
4. 输入您期望的初始密码，点击“创建管理员”即可自动初始化您的密码并创建好 `admin` 账号。
5. 或者直接执行: `curl -X POST http://localhost/api/auth/setup -H "Content-Type: application/json" -d '{"password": "你的密码"}'`
*(注： setup 初始化接口在一经创建管理员账户后，后端会自动锁死该接口，防止重复提交和撞库风险)*

### 4. 启动后端服务
在开发及生产模式下，在 `packages/server` 目录中运行：
```bash
# 进入后端包目录
cd packages/server

# 选项 A：开发环境（支持代码修改自动重载）
bun run dev

# 选项 B：生产运行
bun start
```

### 5. 启动前端服务
在 `packages/web` 前端目录中运行：

* **本地开发环境**：
  ```bash
  cd packages/web
  bun run dev
  ```
  *(开发服务器将默认在 `http://localhost:5173` 启动，并自动将所有 `/api/*` 请求代理到 `http://localhost:3000`)*

* **生产构建部署**：
  ```bash
  cd packages/web
  
  # 执行构建，结果将输出至 `packages/web/dist`
  bun run build
  ```
  *(您可以将生成的 `dist` 目录交由 Caddy 或 Nginx 进行静态资源分发服务，根据项目根目录的 [Caddyfile] 配置)*
=======
BubbleBlog 是面向单管理员的个人博客。后端直接运行于 Bun，使用 `postgres` 客户端连接 PostgreSQL；前端构建为静态文件，由 Caddy 提供并将 API、媒体文件及站点地图转发到仅监听回环地址的后端。

### 功能与安全特性

- Markdown 文章编辑、预览、发布、全文搜索、标签、轮播图与图片上传。
- 公开作者资料、文章点赞、浏览量和阅读时长统计。
- 浏览量和阅读时长属于持久业务数据，应用不会按时间自动删除。
- 单一 `admin` 管理员、验证码登录、递增登录锁定，以及连续空闲 60 小时后过期的 HttpOnly 滑动会话。
- 登录、点赞、验证码和统计上报独立限流；所有 API 另有全局限流。
- 上传内容有大小、MIME 类型和文件特征校验；草稿及所有管理接口均在服务端鉴权。
- Caddy 提供 HTTPS、安全响应头、压缩、静态缓存和 6 MB 请求体上限。

完整路由、请求字段及限制见 [API.md](./API.md)。

## 环境要求

- [Bun](https://bun.sh/) 运行时与包管理器
- PostgreSQL 数据库
- 生产环境使用 Caddy 和 systemd（仓库不依赖容器运行）

## 安装与配置

在项目根目录安装 workspace 依赖：

```bash
bun install
cp .env.example .env
```

编辑根目录 `.env`。生产环境中的两个 secret 必须分别使用不同的、至少 32 字符的随机值，例如分别执行两次 `openssl rand -hex 32`。

| 变量 | 用途 |
| --- | --- |
| `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` | PostgreSQL 连接信息；生产环境不接受占位数据库密码 |
| `JWT_SECRET` | HS256 会话签名密钥，生产环境至少 32 字符且不能使用示例值 |
| `ANALYTICS_HASH_SECRET` | 匿名访客标识的独立哈希密钥，不得与 `JWT_SECRET` 相同 |
| `UPLOAD_DIR` | 上传文件目录；相对路径以服务端工作目录为基准 |
| `PORT` | 后端监听端口，默认 `3000` |
| `HOST` | 后端监听地址；生产环境必须为 `127.0.0.1`、`::1` 或 `localhost` |
| `NODE_ENV` | `development` 或 `production`；生产模式会启用安全 Cookie 和严格配置检查 |
| `PUBLIC_ORIGIN` | 允许通过 CORS 预检的公开站点 HTTPS Origin |
| `PUBLIC_BASE_URL` | 生成 `sitemap.xml` 中绝对链接时使用的公开 HTTPS 根地址 |

应用优先读取当前工作目录中的 `.env`；不存在时再读取项目根目录 `.env`，父进程或 systemd 已设置的变量始终优先。建议只在项目根目录维护一份 `.env`。Caddy 不读取该文件，以免数据库密码和应用密钥进入 Caddy 进程环境。

## 初始化数据库和管理员

```bash
cd packages/server
bun run db:migrate
```

管理员用户名固定为 `admin`。项目没有公开的账户初始化 API；首次部署应通过本机命令创建管理员，密码要求为 12–128 字符。下面的写法不会把密码保存在 shell 历史中：

```bash
cd packages/server
read -rsp "Initial admin password: " ADMIN_PASSWORD; echo
printf '%s' "$ADMIN_PASSWORD" | bun run admin:setup
unset ADMIN_PASSWORD
```

如果 `admin` 已存在，命令会拒绝覆盖。

## 本地开发

本地 HTTP 开发时，将 `.env` 中 `NODE_ENV` 设为 `development`，并将 `PUBLIC_ORIGIN` 设为 `http://localhost:5173`。

分别启动后端和前端：

```bash
cd packages/server
bun run dev
```

```bash
cd packages/web
bun run dev
```

Vite 默认监听 `http://localhost:5173`，并将 `/api`、`/media` 和 `/sitemap.xml` 代理到 `http://localhost:3000`。

## 生产构建与运行

构建前端：

```bash
cd packages/web
bun run build
```

产物位于 `packages/web/dist`。后端生产启动命令为：

```bash
cd packages/server
bun start
```

建议由 systemd 管理后端，并保持 `HOST=127.0.0.1`，使 3000 端口不能绕过 Caddy 从公网访问。服务的 `WorkingDirectory` 应为 `packages/server`，`ExecStart` 可使用 Bun 的绝对路径执行 `run src/index.ts`。

项目根目录的 [Caddyfile](./Caddyfile) 还需要 Caddy 服务环境中的三个变量：

| 变量 | 用途 |
| --- | --- |
| `ACME_EMAIL` | ACME 证书通知邮箱 |
| `SITE_ADDRESS` | Caddy 站点地址，例如 `blog.example.com` |
| `WEB_ROOT` | 前端构建产物的绝对路径，例如 `/srv/bubbleblog/packages/web/dist` |

可将它们放入 `/etc/caddy/bubbleblog.env`，再通过 Caddy 的 systemd drop-in 添加 `EnvironmentFile=/etc/caddy/bubbleblog.env`。修改后先验证再重载：

```bash
sudo bash -c '
set -a
. /etc/caddy/bubbleblog.env
set +a
/usr/bin/caddy validate --config /etc/caddy/Caddyfile
'
sudo systemctl reload caddy
```

仓库中的 Caddy 配置按 Cloudflare 反向代理场景校验客户端地址。请同步维护 Cloudflare 官方 IP 段，并在主机防火墙中继续限制不需要的入站端口。

## 常用脚本

| 目录 | 命令 | 作用 |
| --- | --- | --- |
| `packages/server` | `bun run dev` | 监听源码变更并启动后端 |
| `packages/server` | `bun start` | 启动后端 |
| `packages/server` | `bun run db:migrate` | 创建或升级数据库结构 |
| `packages/server` | `bun run admin:setup` | 从标准输入创建首次管理员 |
| `packages/web` | `bun run dev` | 生成混淆图片并启动 Vite |
| `packages/web` | `bun run build` | 生成混淆图片、类型检查并构建生产静态文件 |
| `packages/web` | `bun run preview` | 本地预览生产构建 |
>>>>>>> develop
