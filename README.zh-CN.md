# NarCard3

[English](./README.md)

一个完整的 Astro 暗色哥特风博客模板，保留首页视觉系统、文章浏览、归档、标签、图库、搜索、Markdown 内容页，以及独立的本地 Markdown/LaTeX 编辑器。

> 本仓库只提供模板代码和中性示例内容，不包含个人文章、私人图片、私人音频或本地开发环境文件。
>
> Repository: https://github.com/NostalgiaIm/NarCard3

## 特性

- Astro 静态站点结构
- 暗色哥特风视觉主题
- 可切换的血红主题
- 首页文章浏览与详情视图
- 文章归档、标签、图库和搜索入口
- Markdown 内容集合与文章路由
- RSS、sitemap、robots.txt
- canonical、Open Graph、Twitter Card 和 JSON-LD 元数据
- SCSS 设计令牌、mixins 与增量样式层
- KaTeX 公式渲染
- 独立 Markdown 编辑器
- 可选的 Tauri v2 + Rust 桌面编辑器原型
- 公式编辑器：模板、矩阵、颜色、字体、环境、收藏夹
- 编辑器源码/可视化模式
- 编辑器文章切换和草稿保存
- Markdown 导出与主站导入入口
- 响应式布局与键盘操作

## 环境要求

- Node.js 22.20+ 或 24.12+（建议使用 `.nvmrc` 中与 CI 一致的版本）
- npm
- 支持现代 JavaScript 的浏览器

## 本地启动

在项目根目录执行：

```bash
npm ci
npm run dev
```

打开网站：

```text
http://localhost:4321/
```

打开本地编辑器：

```text
http://localhost:4321/editor.html
```

## 构建与预览

```bash
npm run check
npm run build
npm run preview
```

构建产物会生成到 `dist/`。`dist/` 已被 `.gitignore` 排除，不建议提交到仓库。

## 持续集成

GitHub Actions 会为推送到 `main`、`Exp` 的提交以及以它们为目标的拉取请求运行三道独立质量闸门：

- Astro 类型/内容检查、生产构建，并确认自动生成的 `src/data/posts.ts` 已提交。
- 使用编辑器自己的 lockfile 进行全新安装和 Tauri 编辑器前端生产构建。
- 安装 Linux Tauri 系统依赖，然后执行 Rust 格式检查、禁止警告的 Clippy 和锁定依赖测试。

两个 Node.js 任务都读取 `.nvmrc`，使本地开发与 CI 使用同一版本基线。Dependabot 会分别维护主站 npm、编辑器 npm、Cargo 和 GitHub Actions 依赖；配置进入仓库默认分支后才会正式生效。

项目目前有意不自动发布桌面安装包。`tauri.conf.json` 中的 bundling 尚未启用；应在应用标识、图标、签名/公证、更新策略和各平台冒烟测试准备完成后，再启用 Release 自动化。

## 代码与工程规范

完整规范见 [`CODE_STYLE.md`](./CODE_STYLE.md)，包括 Astro/SCSS 组织、前端排版、注释标准、AI 协作约束、Linguist 配置和提交前检查清单。

## 架构说明

NarCard3 采用 Astro 主站、SCSS 样式层和独立 Tauri/Rust 编辑器的组合结构：

- Astro 负责页面路由、构建期数据、SEO、RSS 和内容集合。
- `src/styles/` 集中维护设计令牌、mixins 和共享 Markdown 样式；布局通过顶层 import 接入。
- `public/editor.html` 是浏览器编辑器入口，保留 File System Access API fallback。
- `narcard-editor/` 是独立的 Tauri v2 + Rust 桌面编辑器，不参与 Astro 主站构建。

## 项目结构

```text
src/
├── components/              # 全局、博客和 UI 组件
├── content/blog/            # Markdown 示例文章
├── data/posts.ts            # 自动生成的首页文章元数据（不要手改）
├── layouts/                 # Astro 布局与 SEO 元数据
├── pages/                   # 首页、博客、归档、标签、搜索等路由
└── styles/                  # CSS、SCSS 令牌、mixins 和增强样式

public/
└── editor.html              # 独立 Markdown/LaTeX 编辑器

narcard-editor/              # 可选的 Tauri v2 + Rust 桌面编辑器原型
├── README.md                 # 英文主配置与排错指南
├── README.zh-CN.md           # 简体中文配置指南
├── docs/                     # 中英文一键配置实现说明
├── setup-windows.cmd         # 可审查的首次配置入口
├── doctor-windows.cmd        # 只读 Windows 环境诊断
├── start-editor-windows.cmd  # 桌面编辑器启动入口
├── scripts/                  # PowerShell 配置实现
├── src/                      # 前端通信、编辑器交互和样式
└── src-tauri/                # Rust 命令、权限和 Tauri 配置

astro.config.mjs             # Astro 配置和站点 URL
package.json                 # 项目脚本与依赖
scripts/generate-posts.mjs   # 从 Markdown 生成首页文章元数据
```

## 添加文章

### Markdown 文章

将文章放入：

```text
src/content/blog/
```

文章需要包含 frontmatter，例如：

```md
---
title: A New Example Entry
description: A short description for this article.
pubDate: 2025-04-01
tags: [Example, Notes]
category: Notes
draft: false
---

Write your article here.
```

### 自动生成的首页文章数据

`src/data/posts.ts` 会在每次生产构建前由 Markdown 内容自动生成：

```text
src/content/blog/*.md  →  scripts/generate-posts.mjs  →  src/data/posts.ts
```

不要手动修改 `src/data/posts.ts`。以后只需要新增或修改 `src/content/blog/` 下的 Markdown 文件及其 frontmatter。生成器会读取 `title`、`description`、`pubDate`（或 `date`）、`tags`、`category`、`cover`、`coverAlt`、`coverPosition`、`variant` 和 `draft`；`draft: true` 的文章不会进入首页数据。

如需手动生成：

```bash
npm run generate:posts
```

## 编辑器

访问：

```text
/editor.html
```

编辑器支持：

- Markdown 实时预览
- 文章元数据编辑
- 文章草稿保存
- 文章切换
- Markdown 导入和导出
- LaTeX 公式编辑
- 公式模板和矩阵工具
- 公式收藏夹
- 公式图片/文档导入入口
- 一键复制主站代码
- 选择目录后的一键导入

浏览器的 File System Access API 需要用户明确选择目录并授予权限。模板不会绕过浏览器权限，也不会在后台上传本地文件。

### 可选的 Tauri 编辑器

仓库中另外提供了一个位于 `narcard-editor/` 的独立桌面编辑器原型。它与 Astro 根项目分开维护，这样在测试原生文件操作时，现有网站和浏览器编辑器仍然可以正常使用。

当前 Tauri 原型支持：

- 选择并校验 Astro 项目目录
- 检查 `src/data/posts.ts`、`src/pages/index.astro` 和 `src/content/blog`
- 读取首页文章数量、文件内容和版本指纹
- 在写入前校验 slug 和有效 ISO 日期
- 检测重复 slug 和外部文件修改
- 向首页文章系统写入新文章
- 列出、读取、新建和覆盖 `src/content/blog/*.md`
- Markdown 文件名限制为安全 slug，拒绝路径穿越、符号链接和超大文件
- 替换源文件前自动创建 `.bak` 备份
- 使用临时文件进行替换，并处理 Windows 文件替换差异
- 基础 Markdown 转 HTML，并对 HTML 特殊字符进行转义
- 浏览器预览模式下导出 Markdown
- Tauri 桌面端自动压缩封面图为 WebP
- Tauri 桌面端通过 Git 提交并推送当前项目

Markdown 是站点唯一的文章源。生成的 `src/data/posts.ts` 只是首页兼容现有数据结构的构建期产物，不是另一套需要手动维护的文章系统。Git 发布会修改本地仓库并推送到已配置的 remote，首次使用前请配置 Git 用户身份和凭据。

安装并运行桌面原型：

```bash
cd narcard-editor
npm ci
npm run tauri:dev
```

Windows 首次使用推荐运行可审查的一键配置包：

```powershell
cd narcard-editor
.\setup-windows.cmd
.\start-editor-windows.cmd
```

完整中文说明见 [Tauri 编辑器配置与排错指南](./narcard-editor/README.zh-CN.md) 和 [一键配置包实现说明](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md)；也可阅读 [英文主指南](./narcard-editor/README.md) 与 [英文实现说明](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.md)。配置包只检查系统前置条件、安装仓库内 npm 依赖并验证前后端构建，不会提权，也不会静默安装系统软件。

Rust 检查命令需要在 `narcard-editor/src-tauri/` 目录执行：

```bash
cargo fmt --check
cargo test
cargo check
```

第一次测试写入前，建议使用 Astro 项目的副本，不要直接操作唯一的工作副本。桌面编辑器会创建备份，但使用临时项目更适合验证异常和回滚流程。Windows 开发还需要 Rust/Cargo、Microsoft C++ Build Tools 和 WebView2。

## SCSS

项目使用 Sass/SCSS 作为增量设计层：

```text
src/styles/_tokens.scss
src/styles/_mixins.scss
src/styles/scss-enhancements.scss
```

现有 `global.css` 保留不动，SCSS 只对共享博客/Markdown 布局提供增强样式，以降低迁移风险。

## 日常维护清单

- 新增页面逻辑优先放在 Astro frontmatter 或对应组件的数据区域。
- 新增共享样式统一放入 `src/styles/*.scss`，不要重复创建页面级 CSS。
- 不要为了提高语言统计占比而改动已经稳定的运行时边界。
- 修改后运行 `npm run check` 和 `npm run build`。
- Tauri 修改后额外运行 `cd narcard-editor/src-tauri`、`cargo test` 和 `cargo check`。
- 提交前清理构建产物、调试日志和无效代码，确认 `git status` 没有误加入 `node_modules` 或 `target`。

## SEO 与站点配置

正式部署前，请修改 `astro.config.mjs` 中的站点地址：

```js
site: 'https://your-domain.example'
```

该地址会影响：

- canonical URL
- RSS 链接
- sitemap
- robots.txt
- JSON-LD
- Open Graph URL

当前模板使用 `https://example.com` 作为占位地址。

## 媒体资源

模板不附带私人媒体。请只添加你拥有版权或明确获得授权的图片、音频和字体资源，并注意清除图片 EXIF 等元数据。

建议资源目录：

```text
public/images/
public/audio/
```

## GitHub 发布

本模板已包含 `.gitignore`，会排除：

```text
node_modules/
dist/
.astro/
.vscode/
*.bak
*.prev.html
*.before-final-*.html
私有媒体文件
```

首次提交前建议检查：

```bash
git status
git ls-files
```

确认没有把本地路径、私人文章、备份文件、构建缓存或未授权媒体加入提交。

本项目文档不会自动创建 Git 远程仓库，也不会自动推送代码或添加协作者。

## 未默认启用的功能

### Pagefind

当前模板保留现有搜索入口，没有强制引入 Pagefind。若需要全文搜索，可以根据部署平台和内容规模单独接入。

### Giscus

当前模板没有绑定任何 GitHub Discussions 或评论仓库。使用者可以在配置自己的公开仓库、Discussion 分类和权限后，再单独接入评论功能。

## 许可

本项目采用 MIT License。详见 [LICENSE](./LICENSE)。

请注意：第三方依赖、字体、图片、音频和外部服务可能拥有各自的许可条款，使用前请分别确认。
