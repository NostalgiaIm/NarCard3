# NarCard3

[简体中文](./README.zh-CN.md)

A complete dark, gothic-inspired Astro blog template with the original visual system, article browsing, archives, tags, gallery, search, Markdown content pages, and an integrated local Markdown/LaTeX editor.

> This repository contains template code and neutral example content. It does not include personal articles, private images, private audio, or local development files.
>
> Repository: https://github.com/NostalgiaIm/NarCard3

## Features

- Astro static site structure
- Dark gothic-inspired visual theme
- Switchable Blood Moon theme
- Home page article browsing and detail views
- Archives, tags, gallery, and search entry points
- Markdown content collection and article routes
- RSS, sitemap, and robots.txt
- Canonical URLs, Open Graph, Twitter Cards, and JSON-LD metadata
- SCSS design tokens, mixins, and incremental enhancement styles
- KaTeX formula rendering
- Standalone Markdown editor
- Optional Tauri v2 + Rust desktop editor prototype
- Formula editor with templates, matrices, colors, fonts, environments, and favorites
- Source/visual formula editing modes
- Article switching and draft persistence in the editor
- Markdown export and main-site import entry points
- Responsive layout and keyboard interactions

## Requirements

- Node.js 18 or later
- npm
- A modern JavaScript-enabled browser

## Run locally

From the project root:

```bash
npm install
npm run dev
```

Open the site:

```text
http://localhost:4321/
```

Open the local editor:

```text
http://localhost:4321/editor.html
```

## Build and preview

```bash
npm run check
npm run build
npm run preview
```

The build output is written to `dist/`. The `dist/` directory is excluded by `.gitignore` and should not normally be committed.

## Project structure

```text
src/
├── components/              # Global, blog, and UI components
├── content/blog/            # Markdown example articles
├── data/posts.ts            # Home page article metadata
├── layouts/                 # Astro layouts and SEO metadata
├── pages/                   # Home, blog, archive, tag, search, and utility routes
└── styles/                  # CSS, SCSS tokens, mixins, and enhancements

public/
└── editor.html              # Standalone Markdown/LaTeX editor

narcard-editor/              # Optional Tauri v2 + Rust desktop editor prototype
├── index.html                # Desktop editor shell
├── src/main.js              # Frontend bridge and editor interactions
└── src-tauri/                # Rust commands, permissions, and Tauri config

astro.config.mjs             # Astro configuration and site URL
package.json                 # Scripts and dependencies
```

## Adding articles

### Markdown articles

Place articles in:

```text
src/content/blog/
```

Use frontmatter such as:

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

### Home page article data

The home page demo list uses:

```text
src/data/posts.ts
```

Keep slugs, titles, dates, tags, categories, and excerpts consistent when editing the data. A production project may further unify the home-page data and the Markdown content collection.

## Editor

Open:

```text
/editor.html
```

The editor includes:

- Live Markdown preview
- Article metadata editing
- Draft persistence
- Article switching
- Markdown import and export
- LaTeX formula editing
- Formula templates and matrix tools
- Formula favorites
- Image/document formula import entry points
- One-click copying of main-site code
- One-click import after a directory has been selected

The browser File System Access API requires the user to explicitly select a directory and grant permission. The template does not bypass browser permissions or upload local files in the background.

### Optional Tauri editor

The repository also contains an independent desktop editor prototype in `narcard-editor/`. It is deliberately kept separate from the Astro root project so the browser editor and the website remain usable while the native workflow is being tested.

The Tauri prototype currently supports:

- Selecting and validating an Astro project directory
- Checking for `src/data/posts.ts` and `src/pages/index.astro`
- Reading the number of existing home-page articles
- Validating slugs and ISO dates before writing
- Detecting duplicate slugs
- Writing a new article into the home-page article system
- Creating `.bak` backups before replacing source files
- Using temporary files during replacement, including Windows handling
- Basic Markdown-to-HTML conversion with HTML escaping
- Markdown export when running in browser preview mode

The current prototype writes only to the home-page article system. It does not automatically synchronize `src/content/blog/*.md`, process cover images, publish through Git, or replace the existing browser editor. Those capabilities are intentionally left for later stages.

To install and run the desktop prototype:

```bash
cd narcard-editor
bun install
bun run tauri:dev
```

Rust checks can be run from `narcard-editor/src-tauri/`:

```bash
cargo fmt --check
cargo test
cargo check
```

Before testing writes, use a copy of an Astro project rather than the only working copy. The desktop editor creates backups, but testing against a disposable project makes rollback and failure testing safer. Windows development also requires Rust/Cargo, Microsoft C++ Build Tools, and WebView2.

## SCSS

The project uses Sass/SCSS as an incremental design layer:

```text
src/styles/_tokens.scss
src/styles/_mixins.scss
src/styles/scss-enhancements.scss
```

The existing `global.css` is intentionally preserved. SCSS provides scoped enhancements for shared blog and Markdown layouts, reducing migration risk.

## SEO and site configuration

Before production deployment, update the site URL in `astro.config.mjs`:

```js
site: 'https://your-domain.example'
```

This value affects:

- Canonical URLs
- RSS links
- Sitemap
- robots.txt
- JSON-LD
- Open Graph URLs

The template uses `https://example.com` as a placeholder.

## Media assets

The template does not include private media. Only add images, audio, and fonts that you own or are explicitly licensed to use. Consider removing EXIF and other metadata from images before publishing.

Suggested directories:

```text
public/images/
public/audio/
```

## Publishing to GitHub

The template includes a `.gitignore` that excludes:

```text
node_modules/
dist/
.astro/
.vscode/
*.bak
*.prev.html
*.before-final-*.html
Private media files
```

Before the first commit, review the staged files:

```bash
git status
git ls-files
```

Make sure local paths, private articles, backup files, build caches, and unlicensed media are not included.

This documentation does not create a Git remote, push code, or add collaborators automatically.

## Features not enabled by default

### Pagefind

The template keeps its existing search entry point and does not force Pagefind into the project. Add it separately if full-text search is needed for your deployment and content size.

### Giscus

The template is not connected to any GitHub Discussions repository or comment configuration. Configure your own public repository and Discussion category before adding comments.

## License

This project is released under the MIT License. See [LICENSE](./LICENSE).

Third-party dependencies, fonts, images, audio, and external services may have separate license terms. Review them before use.
