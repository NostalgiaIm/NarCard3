<p align="center">
  <img src="./docs/media/narcard3-hero.png" alt="NarCard3 — Where shadows write and silence speaks" width="100%" />
</p>

<h1 align="center">NarCard3</h1>

<p align="center">
  A dark, gothic-inspired Astro journal with an immersive reading room and an optional local Tauri editor.
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>
  ·
  <a href="#feature-showcase">Feature showcase</a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#editor">Editor</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/NostalgiaIm/NarCard3/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/NostalgiaIm/NarCard3/actions/workflows/ci.yml/badge.svg?branch=Exp" /></a>
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" />
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white" />
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/License-MIT-C9A96E" /></a>
</p>

> NarCard3 is a reusable template with neutral example content. It does not include personal articles, private media, credentials, or machine-specific development files.

## Why NarCard3?

NarCard3 combines a theatrical visual system with a practical static publishing workflow. The main site provides archives, tags, gallery, search, article routes, RSS, sitemap, and metadata, while the reading room turns the same Markdown collection into a focused book-like experience.

The website stays statically generated with Astro. Authors can work directly in Markdown, use the standalone browser editor, or experiment with the optional Tauri desktop editor without changing the site's content source.

## Feature showcase

This section is intentionally organized as a sequence of small demonstrations. GIFs can be added one feature at a time under the matching heading without restructuring the rest of the README.

### 01 · Gothic home experience

<!-- GIF slot: docs/media/showcase-home.gif -->

- Dark gothic art direction with a switchable Blood Moon theme
- Orb-based navigation, curtain transitions, ambient motion, and keyboard interactions
- Home, archive, tags, gallery, search, about, and article views

### 02 · Immersive reading room

<!-- GIF slot: docs/media/showcase-reading-mode.gif -->

- Book-opening animation and high-clarity flattened reading layout
- Main-site Markdown articles and tags rendered into the same reading interface
- Article search, tag filtering, in-page text highlights, and latest-highlight navigation
- Resizable reading index with its dimensions saved locally
- Curtain transitions when entering or leaving reading mode

### 03 · Markdown publishing workflow

<!-- GIF slot: docs/media/showcase-publishing.gif -->

- Markdown content collection with generated home-page metadata
- Article routes, RSS, sitemap, robots.txt, canonical URLs, Open Graph, Twitter Cards, and JSON-LD
- KaTeX rendering and shared Markdown presentation styles

### 04 · Browser and desktop editing

<!-- GIF slot: docs/media/showcase-editor.gif -->

- Standalone Markdown/LaTeX browser editor
- Formula templates, matrices, colors, fonts, environments, and favorites
- Optional Tauri v2 + Rust desktop editor with project validation, backups, image processing, and Git publishing

When adding a GIF, store it in `docs/media/` and replace the corresponding hidden comment with:

~~~html
<p align="center">
  <img src="./docs/media/showcase-example.gif" alt="Short description of the demonstrated feature" width="100%" />
</p>
~~~

Keep GIFs focused, cropped, and reasonably compressed so the repository page remains quick to load.

## Quick start

### Requirements

- Node.js 22.20+ or 24.12+; use the version in `.nvmrc` for CI parity
- npm
- A modern JavaScript-enabled browser

### Run locally

~~~bash
git clone https://github.com/NostalgiaIm/NarCard3.git
cd NarCard3
npm ci
npm run dev
~~~

Useful local routes:

| Route | Purpose |
| --- | --- |
| `http://localhost:4321/` | Main website |
| `http://localhost:4321/read-mode/` | Immersive reading room |
| `http://localhost:4321/editor.html` | Standalone browser editor |

### Validate and build

~~~bash
npm run check:docs
npm run check
npm run build
npm run preview
~~~

The production output is written to `dist/` and is intentionally excluded from Git.

## Content workflow

Markdown is the single source of truth for articles.

~~~text
src/content/blog/*.md
        │
        ├── Astro content collection ──> standard article pages
        ├── reading mode rendering ────> /read-mode/
        └── scripts/generate-posts.mjs ─> src/data/posts.ts
~~~

Create an article in `src/content/blog/`:

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

`src/data/posts.ts` is generated before each production build. Do not edit it manually. The generator reads `title`, `description`, `pubDate` (or `date`), `tags`, `category`, `cover`, `coverAlt`, `coverPosition`, `variant`, and `draft`. Draft articles are excluded.

Run the generator manually when needed:

~~~bash
npm run generate:posts
~~~

## Reading mode

Open `/read-mode/` directly or use the open-book button in the main site's right orb menu.

- Article metadata is read from the generated main-site data.
- Article bodies are rendered from `src/content/blog/*.md` during the Astro build.
- Selecting a tag lists every matching article.
- Selecting an article loads it into the current book without leaving reading mode.
- Left and right orb menus retain access to site sections and reading controls.
- Explicit exit controls return to the main site through the shared curtain transition.
- Text highlighting, latest-highlight navigation, theme switching, scrolling, background music, and reading-index resizing remain available.

Do not maintain a second copy of article content for reading mode. Updating Markdown and rebuilding updates both article presentations.

## Editor

### Browser editor

Open `/editor.html`. It supports:

- Live Markdown preview
- Article metadata editing and switching
- Draft persistence
- Markdown import and export
- LaTeX source and visual editing
- Formula templates, matrices, favorites, colors, fonts, and environments
- Image/document formula import entry points
- Main-site code copying and directory-based import entry points

The File System Access API always requires explicit directory selection and browser permission. NarCard3 does not bypass these permissions or upload local files in the background.

### Optional Tauri desktop editor

The independent `narcard-editor/` project adds native project access while keeping the website and browser editor usable on their own.

<details>
<summary>Desktop editor capabilities and setup</summary>

The prototype supports project validation, safe slug and date checks, duplicate detection, external-change detection, Markdown file creation and replacement, `.bak` backups, temporary-file replacement, basic Markdown preview, WebP cover compression, and Git commit/push workflows.

Install and run:

~~~bash
cd narcard-editor
npm ci
npm run tauri:dev
~~~

Recommended Windows setup:

~~~powershell
cd narcard-editor
.\setup-windows.cmd
.\start-editor-windows.cmd
~~~

Windows development requires Rust/Cargo, Microsoft C++ Build Tools, and WebView2. Test write operations against a disposable project copy first.

Documentation:

- [Desktop editor guide](./narcard-editor/README.md)
- [中文桌面编辑器指南](./narcard-editor/README.zh-CN.md)
- [One-click setup implementation](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.md)
- [一键配置实现说明](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md)

</details>

## Architecture

~~~text
src/
├── components/              # Global, blog, and UI components
├── content/blog/            # Markdown articles
├── data/posts.ts            # Generated article metadata
├── layouts/                 # Astro layouts and SEO metadata
├── pages/                   # Main site, reading mode, blog, and utility routes
└── styles/                  # SCSS tokens, mixins, and enhancements

public/
└── editor.html              # Standalone Markdown/LaTeX editor

docs/media/                  # README hero image and future showcase GIFs

narcard-editor/
├── src/                     # Desktop editor frontend
├── src-tauri/               # Rust commands, permissions, and Tauri config
├── scripts/                 # Windows setup implementation
└── docs/                    # Desktop setup documentation
~~~

Responsibilities:

- Astro owns routes, build-time data, SEO, RSS, and content collections.
- `/read-mode/` renders the same content collection into the book interface.
- `src/styles/` owns shared design tokens and Markdown enhancements.
- `public/editor.html` remains the browser editor.
- `narcard-editor/` remains an independent Tauri/Rust project.

## Configuration and maintenance

### Site URL and SEO

Before deployment, replace the placeholder in `astro.config.mjs`:

~~~js
site: 'https://your-domain.example'
~~~

It controls canonical URLs, RSS links, sitemap entries, robots.txt, JSON-LD, and Open Graph URLs.

### Styling

The incremental Sass layer lives in:

~~~text
src/styles/_tokens.scss
src/styles/_mixins.scss
src/styles/scss-enhancements.scss
~~~

Prefer shared SCSS for reusable styles and keep page-specific behavior close to its Astro page or component.

### Media

Only commit images, audio, and fonts that you own or are licensed to distribute. Remove sensitive EXIF metadata when appropriate. Runtime media belongs under `public/images/` or `public/audio/`; README demonstrations belong under `docs/media/`.

### Quality gates

GitHub Actions always validates the Astro site. Pull requests run the editor frontend or Tauri/Rust jobs only when their related paths change; pushes to feature branches are not checked a second time when an open pull request already covers the same commit. A merge to `main` and a manual workflow dispatch still run the complete suite.

This keeps website and documentation pull requests fast while preserving full verification on the protected branch. A skipped editor or Rust job means that its project was not affected, not that CI failed. Before opening a pull request, run the checks relevant to your changes:

~~~bash
npm run check:docs
npm run check
npm run build
~~~

For Tauri changes, also run the Rust formatting, linting, and test commands described in the desktop editor guide.

<details>
<summary>Publishing checklist</summary>

- Confirm `git status` does not include `node_modules`, `dist`, `.astro`, `target`, backups, logs, private articles, or unlicensed media.
- Confirm generated `src/data/posts.ts` matches the Markdown frontmatter.
- Review the configured site URL and public metadata.
- Keep build products out of commits.
- Test file-writing editor changes against a project copy.

</details>

## Project documentation

- [Code and engineering standards](./CODE_STYLE.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Roadmap](./ROADMAP.md)
- [Security policy](./SECURITY.md)
- [GitHub Discussions](https://github.com/NostalgiaIm/NarCard3/discussions)

NarCard3 is maintained by one person in their available time and has no guaranteed response SLA. Well-formed issues and pull requests are normally triaged within seven days when possible. English is the canonical documentation language; designated Chinese documents are maintained alongside user-facing guides.

## Optional integrations

- **Pagefind:** the template keeps its existing search entry point and does not force a Pagefind dependency.
- **Giscus:** comments are not connected to a repository or Discussion category by default.

Configure these integrations for your own deployment before enabling them.

## License

NarCard3 is released under the [MIT License](./LICENSE). Third-party dependencies, fonts, images, audio, and services may use separate licenses; review their terms before distribution.
