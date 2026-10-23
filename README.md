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

- Node.js 22.20+ or 24.12+ (use the version recorded in `.nvmrc` for CI parity)
- npm
- A modern JavaScript-enabled browser

## Run locally

From the project root:

```bash
npm ci
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

## Continuous integration

GitHub Actions runs three independent quality gates for pushes and pull requests targeting `main` or `Exp`:

- Astro type/content checks, a production site build, and a check that generated `src/data/posts.ts` is committed.
- A clean install and production build of the Tauri editor frontend using its own lockfile.
- Linux Tauri system dependencies followed by Rust formatting, Clippy with warnings denied, and locked tests.

Both Node.js jobs read `.nvmrc`, so local development and CI use the same baseline. Dependabot separately monitors the website npm project, editor npm project, Cargo dependencies, and GitHub Actions. Its configuration becomes active after it exists on the repository's default branch.

The repository intentionally does not publish desktop installers automatically yet. Tauri bundling is disabled in `tauri.conf.json`; release automation should only be enabled after package identifiers, icons, signing/notarization, updater policy, and per-platform smoke tests are ready.

## Code and engineering standards

See [`CODE_STYLE.md`](./CODE_STYLE.md) for the project conventions covering Astro/SCSS organization, frontend formatting, comments, AI-assisted changes, Linguist settings, and pre-commit checks.

Contributions are welcome. Before opening an issue or pull request, read [CONTRIBUTING.md](./CONTRIBUTING.md). Use [GitHub Discussions](https://github.com/NostalgiaIm/NarCard3/discussions) for questions, early ideas, showcases, and general conversation. Report suspected vulnerabilities privately according to [SECURITY.md](./SECURITY.md), never in an Issue or Discussion.

NarCard3 is maintained by one person in their available time and has no guaranteed response SLA. Well-formed issues and pull requests are normally triaged within 7 days when possible.

Deferred desktop release work and community milestones are tracked in [ROADMAP.md](./ROADMAP.md). English is the canonical documentation language; designated Chinese counterparts are maintained alongside user-facing guides and checked by `npm run check:docs`.

## Architecture

NarCard3 is organized as an Astro site, a shared SCSS layer, and an independent Tauri/Rust editor:

- Astro owns routes, build-time data, SEO, RSS, and content collections.
- `src/styles/` owns design tokens, mixins, and shared Markdown enhancements; layouts import the SCSS layer at the top level.
- `public/editor.html` remains the browser editor and keeps its File System Access API fallback.
- `narcard-editor/` is an independent Tauri v2 + Rust desktop editor and is not part of the Astro site build.

## Project structure

```text
src/
├── components/              # Global, blog, and UI components
├── content/blog/            # Markdown example articles
├── data/posts.ts            # Generated home page metadata (do not edit manually)
├── layouts/                 # Astro layouts and SEO metadata
├── pages/                   # Home, blog, archive, tag, search, and utility routes
└── styles/                  # CSS, SCSS tokens, mixins, and enhancements

public/
└── editor.html              # Standalone Markdown/LaTeX editor

narcard-editor/              # Optional Tauri v2 + Rust desktop editor prototype
├── README.md                 # Primary English setup and troubleshooting guide
├── README.zh-CN.md           # Simplified Chinese setup guide
├── docs/                     # English and Chinese setup implementation notes
├── setup-windows.cmd         # Auditable first-run setup entry point
├── doctor-windows.cmd        # Read-only Windows environment diagnosis
├── start-editor-windows.cmd  # Desktop editor launcher
├── scripts/                  # PowerShell setup implementation
├── src/                      # Frontend bridge, interactions, and styles
└── src-tauri/                # Rust commands, permissions, and Tauri config

astro.config.mjs             # Astro configuration and site URL
package.json                 # Scripts and dependencies
scripts/generate-posts.mjs   # Generates home-page metadata from Markdown
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

### Generated home page data

`src/data/posts.ts` is generated automatically from the Markdown collection before every production build:

```text
src/content/blog/*.md  →  scripts/generate-posts.mjs  →  src/data/posts.ts
```

Do not edit `src/data/posts.ts` manually. Add or update Markdown frontmatter instead. The generator reads `title`, `description`, `pubDate` (or `date`), `tags`, `category`, `cover`, `coverAlt`, `coverPosition`, `variant`, and `draft`. Draft articles are excluded from the home page data.

Run the generator manually when needed:

```bash
npm run generate:posts
```

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
- Checking for `src/data/posts.ts`, `src/pages/index.astro`, and `src/content/blog`
- Reading home-page article counts, source contents, and version fingerprints
- Validating slugs and real ISO dates before writing
- Detecting duplicate slugs and external file changes
- Writing a new article into the home-page article system
- Listing, reading, creating, and overwriting `src/content/blog/*.md`
- Restricting Markdown filenames to safe slugs and rejecting traversal, symlinks, and oversized files
- Creating `.bak` backups before replacing source files
- Using temporary files during replacement, including Windows handling
- Basic Markdown-to-HTML conversion with HTML escaping
- Markdown export when running in browser preview mode
- Automatic WebP cover compression in the Tauri desktop editor
- Git commit and push from the Tauri desktop editor

Markdown is the single article source for the site. The generated `src/data/posts.ts` file is a build-time compatibility layer for the home-page data shape; it is not an independent authoring system. Git publishing modifies the local repository and pushes to the configured remote; configure Git identity and credentials before using it.

To install and run the desktop prototype:

```bash
cd narcard-editor
npm ci
npm run tauri:dev
```

On Windows, the recommended first-run path is the auditable one-click setup:

```powershell
cd narcard-editor
.\setup-windows.cmd
.\start-editor-windows.cmd
```

See the [complete Tauri editor setup and troubleshooting guide](./narcard-editor/README.md) and the [one-click setup implementation notes](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.md). Chinese versions are also available in the [editor guide](./narcard-editor/README.zh-CN.md) and [implementation notes](./narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md). The setup checks prerequisites, installs only repository-local npm dependencies, and verifies both frontend and Rust builds; it does not elevate privileges or install system packages silently.

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

## Maintenance checklist

- Keep build-time page logic and data decisions in Astro frontmatter or the relevant component data section.
- Put new shared styles in `src/styles/*.scss` instead of creating duplicate page-level CSS.
- Do not change stable runtime boundaries only to influence language statistics.
- Run `npm run check` and `npm run build` after Astro or SCSS changes.
- After Tauri changes, also run `cargo test` and `cargo check` from `narcard-editor/src-tauri/`.
- Before committing, remove build products, debug logs, and dead code; confirm `git status` does not include `node_modules` or `target`.

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
