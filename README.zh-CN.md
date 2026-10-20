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

- Node.js 18 或更高版本
- npm
- 支持现代 JavaScript 的浏览器

## 本地启动

在项目根目录执行：

```bash
npm install
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

## 项目结构

```text
src/
├── components/              # 全局、博客和 UI 组件
├── content/blog/            # Markdown 示例文章
├── data/posts.ts            # 首页文章元数据
├── layouts/                 # Astro 布局与 SEO 元数据
├── pages/                   # 首页、博客、归档、标签、搜索等路由
└── styles/                  # CSS、SCSS 令牌、mixins 和增强样式

public/
└── editor.html              # 独立 Markdown/LaTeX 编辑器

narcard-editor/              # 可选的 Tauri v2 + Rust 桌面编辑器原型
├── index.html                # 桌面编辑器外壳
├── src/main.js              # 前端通信桥接与编辑器交互
└── src-tauri/                # Rust 命令、权限和 Tauri 配置

astro.config.mjs             # Astro 配置和站点 URL
package.json                 # 项目脚本与依赖
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

### 首页文章数据

首页演示列表使用：

```text
src/data/posts.ts
```

修改文章后，请确保 slug、标题、日期、标签、分类和摘要保持一致。正式项目可以进一步统一首页数据和 Markdown 内容集合。

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
- 检查 `src/data/posts.ts` 和 `src/pages/index.astro`
- 读取首页文章数量
- 在写入前校验 slug 和 ISO 日期
- 检测重复 slug
- 向首页文章系统写入新文章
- 替换源文件前自动创建 `.bak` 备份
- 使用临时文件进行替换，并处理 Windows 文件替换差异
- 基础 Markdown 转 HTML，并对 HTML 特殊字符进行转义
- 浏览器预览模式下导出 Markdown

当前原型只写入首页文章系统，不会自动同步 `src/content/blog/*.md`，也暂不负责封面图片处理、Git 发布或替换现有浏览器编辑器。这些功能会在文件写入流程稳定后再分阶段加入。

安装并运行桌面原型：

```bash
cd narcard-editor
bun install
bun run tauri:dev
```

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
