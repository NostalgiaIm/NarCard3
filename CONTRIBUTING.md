# Contributing to NarCard3

Thank you for helping improve NarCard3. Contributions to the Astro website, browser editor, Tauri editor, documentation, accessibility, and tests are welcome.

## Before opening an issue

- Search existing issues and pull requests first.
- Use the provided bug or feature template and include the requested context.
- Report security vulnerabilities privately according to [SECURITY.md](./SECURITY.md).
- Keep personal articles, credentials, absolute local paths, logs containing private data, and unlicensed media out of reports and commits.

## Development setup

The website and desktop editor are separate Node.js projects and have separate lockfiles.

Website:

```bash
npm ci
npm run check
npm run build
```

Tauri editor frontend:

```bash
cd narcard-editor
npm ci
npm run build
```

Tauri Rust backend:

```bash
cd narcard-editor/src-tauri
cargo fmt --check
cargo clippy --locked --no-default-features -- -D warnings
cargo test --locked --no-default-features
```

Windows contributors can run `narcard-editor/setup-windows.cmd` for prerequisite checks and a reproducible first setup. See the [editor guide](./narcard-editor/README.md) for MSVC/GNU and WebView2 details.

## Project boundaries

- Edit articles under `src/content/blog/`; do not edit generated `src/data/posts.ts` by hand.
- Keep the Astro website and `narcard-editor/` dependency installations separate.
- Do not commit `node_modules/`, `dist/`, `.astro/`, Cargo `target/`, backups, credentials, or personal media.
- Preserve filesystem validation, backup, atomic-write, WebView, and Git-publishing safety boundaries in the Tauri editor.
- Follow [CODE_STYLE.md](./CODE_STYLE.md) for code organization, comments, SCSS, and validation conventions.

## Pull requests

1. Keep each pull request focused on one coherent change.
2. Explain the motivation and user-visible behavior.
3. List the checks you ran and any platform limitations.
4. Update English and Chinese documentation together when behavior or setup changes.
5. Allow the required GitHub Actions checks to finish before requesting a merge.

Desktop release automation intentionally remains disabled. Do not enable installer publishing until application metadata, platform icons, signing/notarization, updater policy, and platform smoke tests are ready.

## Maintainer response rhythm

NarCard3 is maintained by one person in their available time, so there is no guaranteed response SLA. The maintainer generally aims to triage well-formed issues and pull requests within 7 days. Complex work, platform-specific bugs, and dependency migrations may take longer. A quiet period does not mean the contribution has been rejected; concise follow-ups after one week are welcome.

Please keep discussions respectful, technical, and focused on the project.

## 简体中文说明

提交前请先搜索已有 Issue/PR，按模板提供环境与复现信息；安全问题请通过 [SECURITY.md](./SECURITY.md) 中的私密渠道报告。主站与 Tauri 编辑器是两套独立项目，请分别安装依赖和运行检查；文章元数据应通过 Markdown 自动生成，不要手改 `src/data/posts.ts`。

项目由个人利用业余时间维护，不承诺固定 SLA；通常会尽量在 7 天内初步分类信息完整的 Issue/PR。行为或配置变化请同步更新中英文文档。
