# NarCard Editor

NarCard Editor 是一个独立的 Tauri v2 + Rust 本地编辑器原型，目标是安全地把文章写入 Astro 项目。它位于 `NarCard3/narcard-editor`，与 Astro 根应用和浏览器版 `public/editor.html` 分开，方便逐阶段测试和回滚。

## 当前垂直切片

- Tauri 桌面窗口与 Rust `get_app_info` 通信。
- 通过 Tauri dialog 选择并验证 Astro 项目目录。
- Rust 校验 `src/data/posts.ts`、`src/pages/index.astro` 和 `src/content/blog`。
- 读取主框架文件内容及版本指纹，保存时检查外部修改，避免旧内容覆盖新内容。
- 支持列出、读取和保存 `src/content/blog/*.md`，创建和覆盖使用不同模式；覆盖时要求版本指纹一致。
- Markdown 文件名限制为安全 slug，拒绝路径穿越、符号链接、设备名和超大文件。
- 主框架文章写入支持 slug、日期、结构锚点和重复检测。
- 写入前保留原始内容到 `.bak`，使用同目录临时文件替换；第二个主框架文件失败时恢复第一个文件。
- 前端显示项目、Markdown 目录、文件列表、读取/保存状态和冲突错误。
- 浏览器预览模式仍支持 Markdown 导出，但不会执行本地文件写入。

## 环境

Windows 开发需要 Rust/Cargo、Node/Bun、Microsoft C++ Build Tools，以及 WebView2。WebView2 在 Windows 11 通常已安装。

依赖安装：

```powershell
cd D:\MyyyyDesign\NarCard3\narcard-editor
npm install
```

## 运行与验证

```powershell
npm run build
npm run tauri:dev
```

Rust 侧可以在 `src-tauri` 中运行：

```powershell
cargo fmt --check
cargo test
cargo check
```

请先复制一份 Astro 项目用于写入测试。不要直接把真实项目目录作为首次测试目标。

## 安全边界

文件系统访问仍由 Rust `std::fs` 统一执行，前端只通过 `invoke` 调用受限的业务命令，不使用通用的任意路径读写接口，也没有引入 `tauri-plugin-fs`。项目目录会在每次操作时重新验证，Markdown 目录只允许项目内的 `src/content/blog`；文件名只允许安全 slug，拒绝 `..`、路径分隔符、符号链接、Windows 设备名和超过 5 MB 的文件。覆盖 Markdown 时必须提供上次读取的版本指纹，检测到外部修改会拒绝写入。

两套文章系统仍然分别处理：主框架写入不会自动同步 Markdown 内容集合，Markdown 写入也不会修改首页文章数据。第一次测试写入时，请使用 Astro 项目的副本。
