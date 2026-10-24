<p align="center">
  <img src="./docs/media/narcard3-hero.png" alt="NarCard3 — Where shadows write and silence speaks" width="100%" />
</p>

<h1 align="center">NarCard3</h1>

<p align="center">
  一个拥有沉浸式书籍阅览空间与可选本地 Tauri 编辑器的暗色哥特风 Astro 博客。
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="#功能展示">功能展示</a>
  ·
  <a href="#快速开始">快速开始</a>
  ·
  <a href="#编辑器">编辑器</a>
  ·
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

<p align="center">
  <a href="https://github.com/NostalgiaIm/NarCard3/actions/workflows/ci.yml"><img alt="CI 状态" src="https://github.com/NostalgiaIm/NarCard3/actions/workflows/ci.yml/badge.svg?branch=Exp" /></a>
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" />
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white" />
  <a href="./LICENSE"><img alt="MIT 许可" src="https://img.shields.io/badge/License-MIT-C9A96E" /></a>
</p>

> NarCard3 是一个使用中性示例内容的可复用模板，不包含个人文章、私人媒体、凭据或与特定机器绑定的开发文件。

## 为什么选择 NarCard3？

NarCard3 将具有舞台感的视觉系统与实用的静态内容工作流结合起来。主站提供归档、标签、图库、搜索、文章路由、RSS、站点地图和完整元数据；阅览空间则会把同一套 Markdown 内容转换为专注的书籍式阅读体验。

网站仍由 Astro 静态生成。作者既可以直接编写 Markdown，也可以使用独立浏览器编辑器，或尝试可选的 Tauri 桌面编辑器，而无需改变网站的文章数据来源。

## 功能展示

这一部分专门按连续演示的方式组织。以后可以在对应标题下逐步加入 GIF，而不需要再次调整 README 的整体结构。

### 01 · 哥特风主站体验

<!-- GIF 插槽：docs/media/showcase-home.gif -->

- 暗色哥特视觉系统与可切换的血月主题
- 圆形轨道导航、幕布转场、环境动效与键盘交互
- 首页、归档、标签、图库、搜索、关于和文章视图

### 02 · 沉浸式阅览空间

<!-- GIF 插槽：docs/media/showcase-reading-mode.gif -->

- 书籍展开动画与展开后保持高清的平面阅读布局
- 主站 Markdown 文章和标签直接渲染到同一阅览界面
- 文章搜索、标签筛选、页内文字标记和最新标记定位
- 可拉伸并自动保存尺寸的阅览索引
- 进入和退出阅览模式时使用统一幕布转场

### 03 · Markdown 发布流程

<!-- GIF 插槽：docs/media/showcase-publishing.gif -->

- Markdown 内容集合与自动生成的首页文章元数据
- 文章路由、RSS、sitemap、robots.txt、canonical、Open Graph、Twitter Card 和 JSON-LD
- KaTeX 公式渲染与共享 Markdown 样式

### 04 · 浏览器与桌面编辑

<!-- GIF 插槽：docs/media/showcase-editor.gif -->

- 独立 Markdown/LaTeX 浏览器编辑器
- 公式模板、矩阵、颜色、字体、环境和收藏夹
- 可选 Tauri v2 + Rust 桌面编辑器，支持项目校验、备份、图片处理与 Git 发布

添加 GIF 时，将文件放入 `docs/media/`，并把对应的隐藏注释替换为：

~~~html
<p align="center">
  <img src="./docs/media/showcase-example.gif" alt="对演示功能的简短说明" width="100%" />
</p>
~~~

建议每个 GIF 只聚焦一个功能，裁掉无关区域并适当压缩，避免仓库首页加载过慢。

## 快速开始

### 环境要求

- Node.js 22.20+ 或 24.12+；建议使用 `.nvmrc` 中与 CI 一致的版本
- npm
- 支持现代 JavaScript 的浏览器

### 本地运行

~~~bash
git clone https://github.com/NostalgiaIm/NarCard3.git
cd NarCard3
npm ci
npm run dev
~~~

常用本地入口：

| 地址 | 用途 |
| --- | --- |
| `http://localhost:4321/` | 主网站 |
| `http://localhost:4321/read-mode/` | 沉浸式阅览空间 |
| `http://localhost:4321/editor.html` | 独立浏览器编辑器 |

### 检查与构建

~~~bash
npm run check:docs
npm run check
npm run build
npm run preview
~~~

生产构建输出到 `dist/`，该目录已排除在 Git 提交之外。

## 内容工作流

Markdown 是文章的唯一事实来源。

~~~text
src/content/blog/*.md
        │
        ├── Astro 内容集合 ──────────> 标准文章页面
        ├── 阅览模式渲染 ────────────> /read-mode/
        └── scripts/generate-posts.mjs ─> src/data/posts.ts
~~~

在 `src/content/blog/` 中创建文章：

~~~md
---
title: A New Example Entry
description: A short description for this article.
pubDate: 2025-04-01
tags: [Example, Notes]
category: Notes
draft: false
---

Write your article here.
~~~

`src/data/posts.ts` 会在每次生产构建前自动生成，请勿手动修改。生成器读取 `title`、`description`、`pubDate`（或 `date`）、`tags`、`category`、`cover`、`coverAlt`、`coverPosition`、`variant` 和 `draft`；草稿文章不会进入公开数据。

需要时可以手动运行：

~~~bash
npm run generate:posts
~~~

## 阅览模式

直接访问 `/read-mode/`，或从主站右侧圆形工具菜单点击打开书籍图标进入。

- 文章元数据来自主站自动生成的数据。
- 正文在 Astro 构建时直接从 `src/content/blog/*.md` 渲染。
- 点击标签会列出所有对应文章。
- 点击文章后会在当前书籍中装入正文，无需离开阅览模式。
- 左右圆形工具菜单继续提供主站栏目和阅览控制。
- 明确的退出入口会通过共用幕布转场返回主站。
- 文字标记、最新标记定位、主题切换、滚动、背景音乐和阅览索引拉伸均可继续使用。

不要为阅览模式维护第二份文章正文。更新 Markdown 并重新构建后，标准文章页面和书籍阅览界面会同时更新。

## 编辑器

### 浏览器编辑器

打开 `/editor.html`，可以使用：

- Markdown 实时预览
- 文章元数据编辑与文章切换
- 草稿保存
- Markdown 导入和导出
- LaTeX 源码与可视化编辑
- 公式模板、矩阵、收藏夹、颜色、字体和环境
- 公式图片/文档导入入口
- 主站代码复制和基于目录选择的导入入口

File System Access API 始终要求用户主动选择目录并授予浏览器权限。NarCard3 不会绕过这些权限，也不会在后台上传本地文件。

### 可选 Tauri 桌面编辑器

独立的 `narcard-editor/` 项目提供原生项目访问能力，同时不会影响网站和浏览器编辑器单独使用。

<details>
<summary>桌面编辑器能力与配置方式</summary>

当前原型支持项目校验、安全 slug 与日期检查、重复检测、外部修改检测、Markdown 文件创建与替换、`.bak` 备份、临时文件替换、基础 Markdown 预览、WebP 封面压缩以及 Git commit/push 工作流。

安装并运行：

~~~bash
cd narcard-editor
npm ci
npm run tauri:dev
~~~

Windows 推荐配置方式：

~~~powershell
cd narcard-editor
.\setup-windows.cmd
.\start-editor-windows.cmd
~~~

Windows 开发需要 Rust/Cargo、Microsoft C++ Build Tools 和 WebView2。第一次测试写入时，请先使用可丢弃的项目副本。

相关文档：

- [中文桌面编辑器指南](./narcard-editor/README.zh-CN.md)
- [英文桌面编辑器指南](./narcard-editor/README.md)
- [一键配置实现说明](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md)
- [One-click setup implementation](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.md)

</details>

## 项目架构

~~~text
src/
├── components/              # 全局、博客和 UI 组件
├── content/blog/            # Markdown 文章
├── data/posts.ts            # 自动生成的文章元数据
├── layouts/                 # Astro 布局与 SEO 元数据
├── pages/                   # 主站、阅览模式、博客和工具路由
└── styles/                  # SCSS 令牌、mixins 和增强样式

public/
└── editor.html              # 独立 Markdown/LaTeX 编辑器

docs/media/                  # README 头图与后续功能展示 GIF

narcard-editor/
├── src/                     # 桌面编辑器前端
├── src-tauri/               # Rust 命令、权限和 Tauri 配置
├── scripts/                 # Windows 配置实现
└── docs/                    # 桌面端配置文档
~~~

职责边界：

- Astro 负责路由、构建期数据、SEO、RSS 和内容集合。
- `/read-mode/` 将同一内容集合渲染为书籍界面。
- `src/styles/` 维护共享设计令牌和 Markdown 增强样式。
- `public/editor.html` 保持为浏览器编辑器。
- `narcard-editor/` 保持为独立 Tauri/Rust 项目。

## 配置与维护

### 站点地址与 SEO

正式部署前，替换 `astro.config.mjs` 中的占位地址：

~~~js
site: 'https://your-domain.example'
~~~

它会影响 canonical URL、RSS、sitemap、robots.txt、JSON-LD 和 Open Graph URL。

### 样式

增量 Sass 层位于：

~~~text
src/styles/_tokens.scss
src/styles/_mixins.scss
src/styles/scss-enhancements.scss
~~~

可复用样式优先放入共享 SCSS；页面专属行为则保留在对应 Astro 页面或组件附近。

### 媒体资源

只提交你拥有版权或明确获得分发授权的图片、音频和字体，并在适当时清除敏感 EXIF。网站运行时资源放入 `public/images/` 或 `public/audio/`；README 演示资源放入 `docs/media/`。

### 质量检查

GitHub Actions 始终检查 Astro 主站。Pull Request 只有在相关路径发生变化时才运行编辑器前端或 Tauri/Rust 任务；功能分支已有开放 PR 时，普通推送不会再对同一提交重复运行第二套检查。合并进入 `main` 或手动触发工作流时，仍会执行完整检查。

这样可以让网站和文档类 PR 更快，同时保留受保护分支的完整验证。编辑器或 Rust 任务显示为跳过，表示对应项目未受影响，并不代表 CI 失败。创建 Pull Request 前，请运行与改动相关的检查：

~~~bash
npm run check:docs
npm run check
npm run build
~~~

如果修改了 Tauri，还需要运行桌面编辑器指南中列出的 Rust 格式、lint 和测试命令。

<details>
<summary>发布前检查清单</summary>

- 确认 `git status` 中没有 `node_modules`、`dist`、`.astro`、`target`、备份、日志、私人文章或未授权媒体。
- 确认生成的 `src/data/posts.ts` 与 Markdown frontmatter 一致。
- 检查站点地址和公开元数据配置。
- 不要提交构建产物。
- 编辑器文件写入功能应先在项目副本中测试。

</details>

## 项目文档

- [代码与工程规范](./CODE_STYLE.md)
- [贡献指南](./CONTRIBUTING.md)
- [开发路线图](./ROADMAP.md)
- [安全策略](./SECURITY.md)
- [GitHub Discussions](https://github.com/NostalgiaIm/NarCard3/discussions)

NarCard3 由个人利用业余时间维护，不承诺固定响应 SLA；信息完整的 Issue 和 Pull Request 通常会尽量在七天内完成初步分类。英文是规范文档主版本，指定的中文文档会与用户指南同步维护。

## 可选集成

- **Pagefind：** 模板保留现有搜索入口，不强制添加 Pagefind 依赖。
- **Giscus：** 默认未连接任何评论仓库或 Discussion 分类。

启用这些集成前，请先按自己的部署环境完成配置。

## 许可

NarCard3 使用 [MIT License](./LICENSE)。第三方依赖、字体、图片、音频和服务可能具有独立许可条款，分发前请分别确认。
