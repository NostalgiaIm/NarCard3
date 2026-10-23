# NarCard Editor 一键配置包实现说明

[English](./ONE_CLICK_SETUP_IMPLEMENTATION.md)

本文面向代码审查者和维护者，解释 Windows 一键配置包如何工作、为什么这样设计，以及它对本机的影响范围。

## 文件组成

```text
narcard-editor/
├── setup-windows.cmd                # 完整配置入口
├── doctor-windows.cmd               # 只读诊断入口
├── start-editor-windows.cmd         # 缺依赖时先配置，然后启动
├── scripts/setup-windows.ps1        # 实际检测、安装和验证逻辑
├── src-tauri/build.rs               # GNU windres 兼容层调度
└── src-tauri/windres-wrapper.c      # windres 参数转发器源码
```

三个 `.cmd` 文件只是稳定的双击入口。它们把脚本目录作为绝对基准，不依赖用户当前工作目录，也不包含管理员提权逻辑。

## 执行流程

### 阶段 1：环境诊断

PowerShell 脚本首先检查：

1. 当前系统是否为 Windows。
2. `node.exe` 是否存在，并满足锁文件基线：Node.js `22.20+` 或 `24.12+`。
3. `npm.cmd` 是否存在。
4. `cargo.exe` 和 `rustc.exe` 是否存在。
5. `rustc -vV` 返回的 host 类型。
6. GNU host 是否能找到 `gcc.exe` 与 `windres.exe`。
7. WebView2 Evergreen Runtime 是否存在于标准安装目录或 EdgeUpdate 注册信息中。

`doctor-windows.cmd` 到这里就结束。它不运行 npm、Cargo，不创建构建目录。

### 阶段 2：本地依赖安装

完整配置执行：

```powershell
npm ci
```

选择 `npm ci` 而不是 `npm install`，因为它以 `package-lock.json` 为准：

- 依赖树更容易复现；
- 不会在正常情况下重写 lockfile；
- lockfile 与 `package.json` 不一致时直接失败，避免悄悄生成不同依赖组合。

所有 npm 包只写入 `narcard-editor/node_modules/`。脚本不使用 `npm install -g`。

### 阶段 3：前端和后端验证

脚本先运行：

```powershell
npm run build
```

这会验证 HTML、JavaScript、CSS 和 Vite 配置，并把产物写入已忽略的 `narcard-editor/dist/`。

然后运行：

```powershell
cargo check --manifest-path src-tauri/Cargo.toml --no-default-features
```

这会验证 Rust 类型、Tauri 配置、capabilities、资源文件生成和平台链接准备。Cargo 下载缓存仍由用户自己的 Cargo 配置管理；脚本不会修改 `CARGO_HOME`。

## GNU windres 自愈机制

### 为什么不能只写一个 `.cmd` 包装器

Windows 下 Rust 的 `std::process::Command` 和 `embed-resource` 需要定位可执行程序。仅在 `PATH` 前放置 `windres.cmd` 并不可靠；在当前 GNU 构建链中，它仍可能直接选中后面的 `windres.exe`。

因此项目使用一个极小的本机 `.exe` shim。源码公开保存在 `src-tauri/windres-wrapper.c`，构建过程可审查。

### `build.rs` 的职责

`build.rs` 在调用 `tauri_build::build()` 前执行：

1. 检查 `CARGO_CFG_TARGET_ENV`。只有值为 `gnu` 才继续。
2. 从原始 `PATH` 定位真实 `windres.exe`。
3. 优先从同一目录定位 `gcc.exe`，避免混用 MinGW 发行版。
4. 在 Cargo `OUT_DIR/windres-shim/` 生成 `windres.exe`。
5. 设置仅对当前构建进程有效的 `NARCARD_REAL_WINDRES`。
6. 把 shim 目录临时放到当前构建进程 `PATH` 的开头。
7. 调用正常的 `tauri_build::build()`。

真实路径没有编译进仓库，也没有写入用户配置。换电脑、换盘符或换 MinGW 目录后会重新探测。

### C shim 的职责

shim 读取 `NARCARD_REAL_WINDRES`，构造新的参数数组：

```text
真实 windres.exe --use-temp-file <Tauri 原始参数...>
```

随后使用 `_spawnv(_P_WAIT, ...)` 同步运行真实程序，并返回相同退出码。它不读取资源文件内容，不删除文件，也不联网。

### 为什么生成到 `OUT_DIR`

- `OUT_DIR` 由 Cargo 为当前 package、profile 和 target 隔离。
- `cargo clean` 可以自然清理它。
- 不需要提交二进制文件，用户可以从源码构建并审查。
- 不污染系统 MinGW 目录，也不替换真正的 `windres.exe`。

## WebView2 开发目录隔离

在 `debug_assertions` 且 Windows 平台时，Rust 入口设置：

```text
WEBVIEW2_USER_DATA_FOLDER=<src-tauri>/target/webview2-dev
```

设置发生在 `tauri::Builder` 创建窗口之前，因此 WebView2 会使用项目内的开发 profile。Release 构建不会进入这段条件编译代码，正式用户 profile 行为保持默认。

这项设置解决的是开发会话被中断后默认 profile 锁未及时释放的问题，不是关闭 WebView2 的安全机制。

## 安全与隐私清单

一键配置包：

- 不包含远程脚本下载并执行逻辑；
- 不要求 Administrator；
- 不更改注册表或永久环境变量；
- 不关闭杀毒软件或 Windows 安全功能；
- 不结束未知进程；
- 不读取项目文章和媒体内容；
- 不读取 Git remote、token、SSH key；
- 不执行 Git 操作；
- 不上传诊断信息。

可能发生的网络访问只有 npm 和 Cargo 按各自标准配置下载声明的依赖。用户可通过 lockfile、Cargo.lock 和企业镜像策略审计这些下载。

## 参数与自动化

PowerShell 脚本支持：

- `-DoctorOnly`：只读检测，适合 issue 排查。
- `-SkipNpmInstall`：已有可信 `node_modules` 时跳过 `npm ci`。
- `-SkipChecks`：只安装依赖，跳过 Vite/Cargo 验证。

CI 通常不需要 `.cmd` 入口，可以直接调用：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File ./narcard-editor/scripts/setup-windows.ps1 `
  -SkipNpmInstall
```

如果 CI 已有独立的依赖安装和检查步骤，使用 `-DoctorOnly` 或完全不调用一键脚本即可。

## 维护规则

修改配置包后至少执行：

```powershell
cd narcard-editor
.\doctor-windows.cmd
.\setup-windows.cmd -SkipNpmInstall
npm run tauri:dev
```

还应验证：

- MSVC host 不会编译或调用 GNU shim；
- GNU host 删除 `target/` 后能自动重建 shim；
- 路径包含空格时仍可运行；
- 缺少 Node、Rust、WebView2、gcc 或 windres 时提示明确；
- Release 构建不使用开发 WebView2 数据目录；
- `git status` 不包含 `node_modules/`、`dist/` 或 `src-tauri/target/`。

不要把个人绝对路径、预编译的兼容 exe、访问令牌或本机日志提交到仓库。
