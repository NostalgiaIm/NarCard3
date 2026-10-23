# NarCard Editor：Tauri 桌面编辑器配置指南

[English](./README.md)

NarCard Editor 是 NarCard3 仓库中的独立 Tauri v2 + Rust 桌面编辑器。它负责选择并校验 Astro 项目、编辑 Markdown、压缩封面图，以及在用户明确操作后执行 Git 提交和推送。

编辑器目录与 Astro 主站相互独立：主站依赖安装在仓库根目录，桌面编辑器依赖安装在本目录。两者的 `node_modules` 不共用。

## 最快开始（Windows）

首次使用时，双击：

```text
setup-windows.cmd
```

配置成功后，双击：

```text
start-editor-windows.cmd
```

也可以在 PowerShell 中运行：

```powershell
cd narcard-editor
.\setup-windows.cmd
npm run tauri:dev
```

只想检查环境、不安装或构建任何依赖时，运行：

```powershell
.\doctor-windows.cmd
```

一键包的内部实现、安全边界和维护方式见 [一键配置包实现说明](./docs/ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md)。

## 系统要求

### 通用要求

- Windows 10 1803 或更高版本，推荐 Windows 11
- Node.js 20.19+ 或 22.12+（推荐当前 LTS）
- npm（随 Node.js 安装）
- Rust stable、Cargo 和 rustup
- Microsoft Edge WebView2 Evergreen Runtime

Node.js 18 已不足以运行当前 Vite 7 工具链，因此旧文档中的 Node.js 18 要求不再适用。

### Rust 工具链选择

Windows 上推荐使用官方默认的 MSVC Rust 工具链：

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

MSVC 工具链需要安装 Visual Studio 2022 Build Tools，并选择“使用 C++ 的桌面开发”工作负载和 Windows SDK。

项目也支持 `x86_64-pc-windows-gnu`。GNU 用户必须保证同一套 MinGW-w64 的 `gcc.exe`、`windres.exe` 和链接工具都在 `PATH` 中。项目会自动处理已知的 GNU `windres 2.44` 资源编译问题，不需要用户修改系统文件。

检查当前 Rust host：

```powershell
rustc -vV
```

查看输出中的 `host:`：

- `x86_64-pc-windows-msvc`：推荐配置
- `x86_64-pc-windows-gnu`：受支持，会自动启用兼容层

不要在同一次构建中混用来自不同发行版的 GCC、windres 和 linker。

## 一键配置包会做什么

`setup-windows.cmd` 会按顺序执行：

1. 检查 Windows、Node.js、npm、Rust、Cargo 和 WebView2。
2. 读取 `rustc -vV`，识别 MSVC 或 GNU host。
3. 如果是 GNU host，额外检查 `gcc.exe` 和 `windres.exe`。
4. 在 `narcard-editor/` 中运行 `npm ci`，严格按照 `package-lock.json` 安装本地依赖。
5. 运行 `npm run build`，验证 Vite 前端。
6. 运行 `cargo check --no-default-features`，验证 Rust/Tauri 后端和 Windows 资源编译。

它不会：

- 请求管理员权限或绕过 UAC
- 修改注册表、系统 `PATH` 或 PowerShell 策略
- 运行 `winget`、Chocolatey 或其他系统包安装器
- 全局安装 npm 包或 Rust crate
- 读取、写入或上传文章内容
- 执行 Git commit、push，或读取 Git 凭据
- 发送遥测

如果缺少系统组件，脚本会停止并显示官方安装地址。这样用户始终知道系统发生了什么变化。

可选参数：

```powershell
# 仅诊断
.\setup-windows.cmd -DoctorOnly

# 保留现有 node_modules，不运行 npm ci
.\setup-windows.cmd -SkipNpmInstall

# 安装依赖，但跳过前端和 Rust 检查
.\setup-windows.cmd -SkipChecks
```

## 手动安装

如果不使用一键配置包：

```powershell
cd narcard-editor
npm ci
npm run build
cd src-tauri
cargo check --no-default-features
cd ..
npm run tauri:dev
```

第一次 Rust 构建需要下载 crates 并编译 WebView、Git 和图片处理依赖，耗时明显长于后续增量构建，这是正常现象。

## 常用命令

在 `narcard-editor/` 中执行：

```powershell
npm run doctor:windows # 只检查环境
npm run setup:windows  # 配置并验证
npm run dev            # 只启动 Vite 浏览器前端
npm run build          # 只构建 Vite 前端
npm run tauri:dev      # 启动 Tauri 开发窗口
npm run tauri:build    # 构建 Tauri 可执行文件
```

在 `narcard-editor/src-tauri/` 中执行：

```powershell
cargo fmt --check
cargo test
cargo check --no-default-features
```

当前 `tauri.conf.json` 中 `bundle.active` 为 `false`，所以 `tauri:build` 主要生成应用可执行文件，不生成 MSI/NSIS 安装包。要发布安装器时，应单独规划签名、升级和打包策略后再开启 bundle。

## 本次问题的根因

### 1. `windres: can't open file 'page:'`

Tauri 在 Windows 构建阶段会生成 `resource.rc`，其中第一行用于声明 UTF-8 代码页：

```rc
#pragma code_page(65001)
```

当前 GNU Rust host 调用了 MinGW GNU Binutils 2.44 的 `windres.exe`。这个版本在 Windows 默认的管道预处理模式下错误处理上述 pragma，把 `code_page` 的一部分当作文件名，于是产生：

```text
windres: can't open file `page:': Invalid argument
windres: preprocessing failed
```

这不是 Astro、Vite、Tauri 配置 JSON、图标或 Rust 业务代码中的路径错误。相同 `resource.rc` 在给 `windres` 增加 `--use-temp-file` 后可以正常编译，说明问题位于资源编译器的预处理传输模式。

项目中的解决方式：

- [build.rs](./src-tauri/build.rs) 仅在 `CARGO_CFG_TARGET_ENV=gnu` 时启用兼容逻辑。
- 它从当前 `PATH` 找到用户真实的 `windres.exe` 和同工具链的 `gcc.exe`。
- 它把 [windres-wrapper.c](./src-tauri/windres-wrapper.c) 编译到 Cargo 的 `OUT_DIR`，不会往系统目录写文件。
- 构建脚本临时把 shim 目录放到当前构建进程的 `PATH` 前面，并通过 `NARCARD_REAL_WINDRES` 告诉 shim 真实工具的位置。
- shim 只添加 `--use-temp-file`，其余参数和退出码原样转发。
- MSVC 构建不会进入这段逻辑。

因此修复不依赖 `C:\mingw64`、仓库所在盘符、用户名或个人 Cargo 目录。

### 2. WebView2 `HRESULT(0x800700AA)`

Rust 编译完成后，Tauri 还需要创建 WebView2 窗口。如果上一次开发会话被强制终止，或另一个进程仍占用默认 WebView2 用户数据目录，Windows 可能返回：

```text
Failed to create webview
HRESULT(0x800700AA): 请求的资源在使用中
```

项目只在 Windows Debug 构建中把 WebView2 开发数据目录设置为：

```text
narcard-editor/src-tauri/target/webview2-dev
```

该目录已经包含在 Cargo `target/` 构建目录内，不会提交到 Git，也不会改变 Release 版本的正式用户数据位置。

如果开发实例自身仍在运行，Windows 还会锁住 `target/debug/narcard-editor.exe`。这种情况下先正常关闭编辑器窗口，再重新执行 `npm run tauri:dev`。不要同时启动多个指向同一构建目录的开发会话。

### 3. `Get-CimInstance: Access denied`

这个提示通常出现在 Tauri CLI 尝试清理失败的子进程时，是受限终端无法枚举全部系统进程产生的次级错误。应先查看它之前出现的第一条 Rust、windres 或 WebView2 错误；`Get-CimInstance` 通常不是构建失败的根因。

## 目录与端口

- Vite 开发服务器：`http://127.0.0.1:1420`
- Tauri 配置：[src-tauri/tauri.conf.json](./src-tauri/tauri.conf.json)
- Rust 入口：[src-tauri/src/main.rs](./src-tauri/src/main.rs)
- 权限配置：[src-tauri/capabilities/default.json](./src-tauri/capabilities/default.json)
- 前端入口：[index.html](./index.html)
- 前端逻辑：[src/editor.js](./src/editor.js)

如果 1420 端口已被其他程序占用：

```powershell
Get-NetTCPConnection -LocalPort 1420 -State Listen
```

确认进程属于旧的 NarCard/Vite 会话后再关闭它，不要盲目结束不认识的 Node 进程。

## 安全边界

文件系统访问由 Rust 业务命令执行，前端不拥有通用的任意路径读写权限。编辑器会重新验证项目目录，限制 Markdown 路径和文件名，拒绝路径穿越、符号链接、Windows 设备名和超大文件，并在覆盖时检查版本指纹。

Git 发布会修改所选项目并向其已配置的 remote 推送。首次验证写入和发布流程时，请使用 Astro 项目的副本，不要把唯一工作副本当作测试数据。

## 故障报告建议

提交 issue 时请附上以下输出，并删除用户名、私人目录名和远程仓库凭据：

```powershell
cd narcard-editor
.\doctor-windows.cmd
node --version
npm --version
rustc -vV
cargo --version
npm run tauri:dev
```

不要上传文章内容、`.git/config`、SSH key、访问令牌或完整用户目录截图。
