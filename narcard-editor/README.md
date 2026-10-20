# NarCard Editor

NarCard Editor 是一个独立的 Tauri v2 + Rust 本地编辑器原型，目标是安全地把文章写入 Astro 项目。它与 `D:\MyyyyDesign\Nar3` 分离，现阶段不改变原 Astro 博客和浏览器版 `public/editor.html`。

## 当前垂直切片

- Tauri 桌面窗口与 Rust `get_app_info` 通信。
- 通过 Tauri dialog 选择 Astro 项目目录。
- Rust 校验 `src/data/posts.ts` 与 `src/pages/index.astro` 是否存在，并读取文章数量。
- Rust 校验 slug、结构锚点和重复文章后写入主框架。
- 写入前生成 `posts.ts.bak` 与 `index.astro.bak`，使用临时文件替换；第二个文件失败时恢复第一个文件。
- 浏览器预览模式仍支持 Markdown 导出，但不会执行本地文件写入。

## 环境

Windows 开发需要 Rust/Cargo、Node/Bun、Microsoft C++ Build Tools，以及 WebView2。WebView2 在 Windows 11 通常已安装。

依赖安装（用户确认允许外部依赖后）：

```powershell
cd D:\MyyyyDesign\narcard-editor
bun install
```

## 运行与验证

```powershell
bun run build
bun run tauri:dev
```

Rust 侧可以在 `src-tauri` 中运行：

```powershell
cargo fmt --check
cargo test
cargo check
```

请先复制一份 Astro 项目用于写入测试。不要直接把真实项目目录作为首次测试目标。

## 安全边界

第一版只允许选择并验证用户明确选择的项目目录，且只操作两个预期文件。slug 只允许 ASCII 字母、数字和连字符；不允许 `..`、路径分隔符或任意文件路径。两套文章系统仍然分别处理：当前切片写入主框架，不会自动同步 `src/content/blog/*.md`。
