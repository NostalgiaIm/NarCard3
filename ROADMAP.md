# NarCard3 Roadmap

This roadmap makes deferred work visible without promising release dates. Priorities may change with security findings, contributor availability, and platform requirements.

## Current foundation

- [x] Astro website checks and production build in CI
- [x] Tauri frontend build and Rust checks in CI
- [x] Dependabot for both npm projects, Cargo, and GitHub Actions
- [x] Windows setup diagnostics and documented GNU/MSVC support
- [x] Security policy and private vulnerability reporting
- [x] Contribution guide and structured issue forms
- [x] Enable GitHub Discussions and publish lightweight participation guidance

## Desktop release readiness

Desktop installer publishing remains intentionally disabled until every blocking item below is complete.

### 1. Product identity and packaging

- [ ] Finalize application identifier, product name, publisher, and versioning policy
- [ ] Prepare and verify complete Windows, macOS, and Linux icon sets
- [ ] Enable Tauri bundling and produce local packages on each supported platform
- [ ] Document supported operating-system versions and installation/uninstallation behavior

### 2. Trust and signing

- [ ] Choose a Windows code-signing approach and document certificate custody
- [ ] Configure macOS signing, hardened runtime, and notarization
- [ ] Decide whether Linux packages require repository signing or checksums
- [ ] Keep signing keys and tokens exclusively in protected release secrets

### 3. Update and rollback policy

- [ ] Decide between manual downloads and the Tauri updater
- [ ] Define stable, prerelease, and rollback behavior
- [ ] Document how update metadata is signed and how compromised releases are revoked
- [ ] Publish checksums and release notes for every artifact

### 4. Cross-platform verification

- [ ] Add package-build jobs for Windows, macOS, and Linux without publishing artifacts publicly
- [ ] Smoke-test startup, project selection, Markdown writes, backups, WebP covers, and Git publishing
- [ ] Test paths containing spaces and non-ASCII characters
- [ ] Test clean installation, upgrade, rollback, and uninstall paths
- [ ] Record known platform limitations

### 5. Controlled release automation

- [ ] Produce draft GitHub Releases only from signed version tags
- [ ] Require all CI and platform smoke tests before artifact upload
- [ ] Start with a prerelease channel and collect feedback
- [ ] Enable public stable releases only after the prerelease checklist passes

## Community and documentation

- [x] Enable GitHub Discussions with `General`, `Ideas`, and `Q&A` categories
- [x] Link Discussions from the README and issue chooser
- [ ] Review stale issues and roadmap status periodically
- [ ] Keep canonical English documentation and designated Chinese counterparts synchronized

## 简体中文摘要

本路线图不承诺具体发布日期。桌面安装包自动发布会继续保持关闭，直到应用信息、跨平台图标、签名/公证、更新与回滚策略、三平台打包和冒烟测试全部完成。社区方面已经启用 GitHub Discussions，并已从 README 和 Issue 入口提供链接。

英文文档是规范内容的主版本；面向用户的完整中文配套文档仍需与英文版本在同一个 PR 中同步更新。详细规则见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
