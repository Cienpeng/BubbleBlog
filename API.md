## 顶层目录

```
BubbleBlog/
├── packages/                  # Monorepo 工作区
│   ├── shared/                # 共享 TypeScript 类型
│   ├── server/                # Bun 后端 API 服务
│   └── web/                   # React 前端 (Vite)
├── .env.example               # 环境变量模板
├── .gitignore
├── bun.lock                   # Bun 依赖锁文件
├── bunfig.toml                # Bun 配置
├── Caddyfile                  # Caddy 反向代理配置
├── Dockerfile                 # 多阶段 Docker 构建
├── docker-compose.yml         # Caddy + Bun 容器编排
└── package.json               # 根 package.json (workspaces)
```

---

## packages/shared — 共享类型

纯 TypeScript 类型包，被 server 和 web 共同引用。

```
packages/shared/
└── src/
    └── types.ts               # 所有共享接口定义
                                #   - UserRow, Article, ArticleWithTags, ArticleListItem
                                #   - Tag, LikeInfo, SearchResult
                                #   - PaginatedResponse<T>, ApiResponse<T>
                                #   - LoginRequest/Response, LikeRequest
                                #   - CreateArticleInput, UpdateArticleInput
```

---

## packages/server — 后端

基于 Bun HTTP server（`Bun.serve`），无第三方框架。PostgreSQL 通过 `postgres` 包访问。

```
packages/server/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts               # 服务入口，路由分发
    ├── env.ts                 # 多层级 .env 加载器（向上遍历到根目录）
    │
    ├── db/
    │   ├── connection.ts      # postgres 客户端单例（通过 Proxy 懒初始化）
    │   ├── migrate.ts         # 统一数据库表迁移脚本（支持所有表结构及列字段兼容）
    │   └── queries/
    │       ├── articles.ts    # 文章 CRUD、发布/取消发布、按 slug/id 查询
    │       ├── carousel.ts    # 轮播图查询（文章专属 + 全局默认）
    │       ├── likes.ts       # 点赞切换与查询
    │       ├── profile.ts     # 用户资料 CRUD、用户标签、密码修改
    │       ├── search.ts      # PostgreSQL tsvector 全文搜索
    │       ├── settings.ts    # 站点设置键值存取
    │       ├── stats.ts       # 页面浏览与阅读会话统计
    │       ├── tags.ts        # 标签 CRUD、文章标签关联
    │       ├── users.ts       # 用户查找、创建、更新最后活跃时间
    │       ├── lockouts.ts    # 登录尝试限制与锁定数据库查询
    │       └── captchas.ts    # 验证码生成记录与单次消费数据库查询
    │
    ├── markdown/
    │   └── renderer.ts        # markdown-it 渲染器 + frontmatter 解析 + HTML 净化
    │
    ├── middleware/
    │   ├── auth.ts            # JWT 认证 + 限制单终端登录 (SSO) 检测 + 滑动过期
    │   ├── cors.ts            # CORS 头 + OPTIONS 预检处理
    │   └── ratelimit.ts       # 内存限流器（全局 100/min，登录 5/15min，点赞 10/min）
    │
    ├── routes/
    │   ├── articles.ts        # 文章 CRUD 端点 + Markdown 文件上传
    │   ├── auth.ts            # 登录校验、验证码获取 API + 一次性管理员账户初始化
    │   ├── carousel-api.ts    # 轮播图 CRUD（公开 + 管理员）
    │   ├── likes.ts           # 点赞 POST/GET（按文章 slug）
    │   ├── media.ts           # 图片上传（magic byte 校验）+ 静态文件服务
    │   ├── profile.ts         # 公开/管理员资料端点、密码修改 + 安全审计日志及导出端点
    │   ├── search.ts          # 全文搜索端点
    │   ├── seo.ts             # sitemap.xml 生成
    │   ├── settings.ts        # 站点设置 GET/PUT
    │   ├── stats-api.ts       # 管理员统计：每日浏览 + 文章阅读数据（支持分页及单卡片按需加载）
    │   ├── tags.ts            # 标签列表
    │   └── tracking.ts        # 匿名页面浏览 + 阅读会话追踪
    │
    └── services/
        ├── jwt.ts             # HMAC-SHA256 JWT 签发与验证（Web Crypto API）
        ├── security.ts        # 活跃会话管理与操作审计日志写入记录
        └── captcha.ts         # 纯 JS 生成 SVG 验证码的逻辑服务
```

### API 路由一览

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/health` | GET | — | 健康检查 |
| `/api/auth/captcha` | GET | — | 获取验证码 SVG 图像 (需携带 `cid` 参数) |
| `/api/auth/login` | POST | — | 密码登录 (校验验证码、防暴力破解锁定) |
| `/api/auth/setup` | POST | — | 一次性管理员初始化创建 |
| `/api/articles` | GET | — | 分页已发布文章列表 |
| `/api/articles/admin/all` | GET | 是 | 全部文章列表（管理员卡片面板加载） |
| `/api/articles/upload` | POST | 是 | Markdown 文件 / JSON 创建文章 |
| `/api/articles/:slug` | GET | — | 按 slug 获取单篇文章 |
| `/api/articles/:id` | PUT/DELETE | 是 | 更新 / 删除文章 |
| `/api/articles/:id/publish` | PUT | 是 | 发布草稿 |
| `/api/articles/:id/unpublish` | PUT | 是 | 取消发布 |
| `/api/articles/:id/preview` | GET | 是 | 预览草稿 |
| `/api/articles/:slug/carousel` | GET | — | 文章专属轮播图 |
| `/api/articles/:slug/likes` | GET/POST | — | 点赞计数查询 / 点赞切换状态 |
| `/api/tags` | GET | — | 全部标签列表（含文章计数） |
| `/api/search` | GET | — | 全文搜索 |
| `/api/settings` | GET/PUT | PUT 需认证 | 站点外观设置（包括背景图片 URL 等） |
| `/api/media/upload` | POST | 是 | 图片本地上传及裁剪裁剪图上传 |
| `/media/:filename` | GET | — | 静态上传文件服务 |
| `/api/admin/carousel` | GET/POST | 是 | 默认轮播图图片 CRUD |
| `/api/admin/carousel/:id` | DELETE | 是 | 删除指定的轮播图记录和磁盘物理文件 |
| `/api/admin/stats/views` | GET | 是 | 每日浏览统计图表数据 |
| `/api/admin/stats/articles-reading`| GET | 是 | 每篇文章阅读对比数据 (支持 `limit` 参数) |
| `/api/admin/stats/reading/:id` | GET | 是 | 单篇文章阅读统计 (按需加载单个 DonutChart) |
| `/api/admin/profile` | GET/PUT | 是 | 管理员资料修改 |
| `/api/admin/password` | PUT | 是 | 修改密码 |
| `/api/admin/security` | GET | 是 | 获取活跃会话、审计历史日志 (限制最新 20 条) |
| `/api/admin/security/toggle-single-session` | POST | 是 | 开启/关闭单终端登录限制 (SSO 限制) |
| `/api/admin/security/logout-others` | POST | 是 | 清除并强制注销其他设备的在线活跃会话 |
| `/api/admin/security/logs/export`| GET | 是 | 导出完整历史审计日志为 CSV 文件 (带 UTF-8 BOM) |
| `/api/profile` | GET | — | 作者公开资料获取 |
| `/api/track/view` | POST | — | 记录文章浏览量 |
| `/api/track/reading` | POST | — | 记录阅读会话时长 (基于 Beacon API 保证离开页面发送) |
| `/sitemap.xml` | GET | — | SEO 自动站点地图 |

### 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户：username, password_hash, display_name, bio, avatar_url, last_active_at |
| `articles` | 文章：title, slug, content_md, content_html, excerpt, cover_image, status, reading_time, search_vector (tsvector), published_at |
| `tags` | 标签：name, slug |
| `article_tags` | 文章-标签多对多关联 |
| `user_tags` | 用户-标签关联 |
| `likes` | 点赞：article_id, fingerprint (唯一约束) |
| `media` | 媒体文件：filename, original_name, mime_type, size |
| `site_settings` | 站点设置键值对 |
| `carousel_images` | 轮播图：article_id, image_url, sort_order, is_default |
| `page_views` | 页面浏览：article_id, fingerprint, visited_at |
| `reading_sessions` | 阅读会话：article_id, fingerprint, duration_seconds |
| `security_sessions`| 活跃在线会话：id, user_id, device, browser, ip, location, last_active_at, token |
| `security_logs` | 安全与操作审计日志：id, user_id, event, status, created_at |
| `login_lockouts` | 登录封禁限制记录：id, ip, fingerprint, attempt_count, lockout_count, locked_until, updated_at |
| `captchas` |  一次性验证码防刷：id, code, expires_at |

---

## packages/web — 前端

React 18 SPA，Vite 构建，Tailwind CSS，React Router v6。

```
packages/web/
├── package.json
├── vite.config.ts              # Vite 配置（React 插件、@/ 别名、API 代理）
├── tailwind.config.ts          # Tailwind 配置（品牌色、字体、动画、玻璃效果）
├── postcss.config.js           # PostCSS（Tailwind + Autoprefixer）
├── tsconfig.json
├── index.html                  # HTML 入口，配置了 Favicon.ico
└── src/
    ├── main.tsx                # ReactDOM 入口
    ├── App.tsx                 # 路由定义 + Provider 组合
    ├── index.css               # Tailwind 指令 + 全局样式
    │
    ├── lib/
    │   └── api.ts              # fetch 封装：api.* (公开) + adminApi.* (带 JWT 验证)
    │
    ├── hooks/
    │   ├── useAuth.tsx         # 核心认证：login/logout/token 续签管理、AuthGuard 路由守卫
    │   ├── useTheme.tsx        # 独立的主题亮/暗切换（支持公共前台与后台面板分别独立设定缓存）
    │   └── useBackground.tsx   # 全局动态背景图逻辑
    │
    ├── pages/
    │   ├── HomePage.tsx        # 首页：BentoGrid 文章卡片 + 带有 Mascot 动画和 JavaScript 联动吸底的作者栏
    │   ├── ArticlePage.tsx     # 文章详情：阅读进度条、有机标题、返回顶部、带防打扰 Corner Mascot
    │   ├── SearchPage.tsx      # 搜索结果 + 浏览全部文章模式
    │   ├── TagPage.tsx         # 按标签筛选文章
    │   ├── LoginPage.tsx       # 登录页面：集成客户端浏览器指纹生成 + 验证码加载交互
    │   └── admin/
    │       ├── Dashboard.tsx   # 文章管理：MD 上传、状态切换、删除及裁剪编辑器跳转
    │       ├── ArticleEditor.tsx # Markdown 分栏编辑器（增加自动保存开关、字体缩放、Github/OneDark 经典主题配置）
    │       ├── Stats.tsx       # 统计大屏：支持柱状图防闪烁，阅读对比限制为 3 篇，支持查看更多点击按需加载单个 DonutChart
    │       ├── Appearance.tsx  # 外观设置：背景图片 URL 自定义 + 本地上传默认轮播图管理
    │       ├── Profile.tsx     # 个人资料修改：多卡片网格响应式排版 + 自动填充防护
    │       └── Security.tsx    # 安全中心：踢掉其他活跃会话，开关单点登录 (SSO) 以及导出审计日志为 CSV 文件
    │
    └── components/
        ├── Navbar.tsx          # 固定玻璃顶栏：大字体 BubbleBlog 主题 LOGO 品牌展示
        ├── Footer.tsx          # 仅在页面层全局渲染，详情页无多余页脚
        ├── BackgroundBubbles.tsx # 渐变泡泡背景
        ├── ReadingProgress.tsx # 阅读进度条
        ├── BackToTop.tsx       # 返回顶部
        ├── SearchBar.tsx       # 搜索框
        ├── SearchModal.tsx     # ⌘K 搜索弹窗
        ├── ArticleCard.tsx     # Bento 卡片
        ├── BentoGrid.tsx       # Grid 容器
        ├── GlassCard.tsx       # 复用玻璃态卡片
        ├── ImageCarousel.tsx   # 头图轮播
        ├── LikeButton.tsx      # 心形点赞按钮
        ├── TagCloud.tsx        # 标签云（支持多于 6 个标签弹框查看全部列表）
        ├── ThemeToggle.tsx     # 亮暗模式切换
        ├── Icons.tsx           # SVG 图标组件
        ├── OrganicHeading.tsx  # 细节页面有机标题
        ├── CodeBlock.tsx       # 代码复制块
        ├── admin/
        │   ├── AdminLayout.tsx # 后台主布局：头部面包屑、主题切换快捷按钮、退出
        │   ├── CommandPalette.tsx # 后台 ⌘K 命令控制面板
        │   ├── ImageCropperModal.tsx # 用于本地图片上传裁剪的核心弹窗组件
        │   └── SlidePanel.tsx  # 右侧抽屉滑入组件
        └── charts/
            ├── BarChart.tsx    # 访问量柱状图
            └── DonutChart.tsx  # 环形比例对比图
```

### 前端路由

**公开路由（PublicLayout 内）：**

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页 |
| `/article/:slug` | ArticlePage | 文章详情页 |
| `/search` | SearchPage | 搜索 / 浏览全部 |
| `/tag/:slug` | TagPage | 标签筛选页面 |
| `/login` | LoginPage | 管理员登录 |

**管理路由（AuthGuard + AdminLayout 内）：**

| 路径 | 页面 | 说明 |
|------|------|------|
| `/admin` | Dashboard | 文章管理主控台 |
| `/admin/articles/new` | ArticleEditor | 新建文章 |
| `/admin/articles/:id/edit` | ArticleEditor | 编辑文章 |
| `/admin/stats` | Stats | 数据统计 |
| `/admin/profile` | Profile | 个人资料设置 |
| `/admin/appearance` | Appearance | 界面外观配置 |
| `/admin/security` | Security | 安全与会话控制 |

---

## 运行脚本

| 命令 | 工作目录 | 说明 |
|------|----------|------|
| `bun run dev` | server | 开发模式启动后端（watch 模式） |
| `bun start` | server | 生产模式启动后端 |
| `bun run db:migrate` | server | 执行数据库统一迁移脚本（所有表一键迁移） |
| `bun run dev` | web | 启动前端 Vite 本地开发服务器 (带有后端 API 反向代理) |
| `bun run build` | web | 前端代码生产构建（TypeScript 编译 + 静态混淆压缩） |
| `bun run preview` | web | 预览生产打包静态资源 |

---