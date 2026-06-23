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
