# NarCard Editor

[简体中文](./README.zh-CN.md)

NarCard Editor is the standalone Tauri v2 and Rust desktop editor included with NarCard3. It can select and validate a NarCard3 project, create and edit Markdown articles, compress cover images to WebP, and—only after an explicit user action—commit and push changes with Git.

The desktop editor is intentionally isolated from the Astro website. The website dependencies are installed at the repository root, while editor dependencies are installed in this directory. Their `node_modules` directories are not shared.

## Quick start on Windows

For a first-time setup, double-click:

```text
setup-windows.cmd
```

After setup succeeds, double-click:

```text
start-editor-windows.cmd
```

The same process can be run from PowerShell:

```powershell
cd narcard-editor
.\setup-windows.cmd
npm run tauri:dev
```

To inspect the environment without installing dependencies or building anything:

```powershell
.\doctor-windows.cmd
```

For the design, security boundaries, and implementation details of the setup package, see [One-click setup implementation](./docs/ONE_CLICK_SETUP_IMPLEMENTATION.md).

## Requirements

### General requirements

- Windows 10 version 1803 or later; Windows 11 is recommended
- Node.js 22.20+ or 24.12+; use the repository `.nvmrc` version for CI parity
- npm, normally installed with Node.js
- Stable Rust, Cargo, and rustup
- Microsoft Edge WebView2 Evergreen Runtime

Older Node.js 20 releases are no longer sufficient for every dependency in the current lockfiles.

### Choosing a Rust toolchain

The recommended Windows target is the official MSVC toolchain:

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

The MSVC target requires Visual Studio 2022 Build Tools with the **Desktop development with C++** workload and a Windows SDK.

The project also supports `x86_64-pc-windows-gnu`. GNU users must have a complete MinGW-w64 toolchain on `PATH`, including compatible copies of `gcc.exe`, `windres.exe`, and the linker. NarCard Editor automatically works around a known GNU `windres 2.44` resource-compilation bug without modifying system files.

Inspect the active Rust host with:

```powershell
rustc -vV
```

Look for the `host:` line:

- `x86_64-pc-windows-msvc`: recommended
- `x86_64-pc-windows-gnu`: supported; the compatibility shim is enabled automatically

Do not mix GCC, windres, and linker binaries from different MinGW distributions in the same build.

## What the one-click setup does

`setup-windows.cmd` performs these steps in order:

1. Checks Windows, Node.js, npm, Rust, Cargo, and WebView2.
2. Reads `rustc -vV` to distinguish MSVC and GNU hosts.
3. On GNU hosts, verifies that `gcc.exe` and `windres.exe` are available.
4. Runs `npm ci` in `narcard-editor/` to install the exact dependency tree from `package-lock.json`.
5. Runs `npm run build` to verify the Vite frontend.
6. Runs `cargo check --no-default-features` to verify the Rust/Tauri backend and Windows resource compilation.

The setup package does not:

- request administrator privileges or bypass UAC;
- modify the registry, system `PATH`, or persistent PowerShell policy;
- invoke winget, Chocolatey, or another system package manager;
- install global npm packages or Rust crates;
- read, modify, or upload article content;
- run Git commit or push, or inspect Git credentials;
- send telemetry.

If a system prerequisite is missing, the script stops and prints an official installation URL. It does not silently install software.

Optional flags:

```powershell
# Diagnostics only
.\setup-windows.cmd -DoctorOnly

# Keep the existing node_modules directory and skip npm ci
.\setup-windows.cmd -SkipNpmInstall

# Install dependencies but skip the Vite and Cargo checks
.\setup-windows.cmd -SkipChecks
```

## Manual setup

To configure the editor without the one-click package:

```powershell
cd narcard-editor
npm ci
npm run build
cd src-tauri
cargo check --no-default-features
cd ..
npm run tauri:dev
```

The first Rust build downloads and compiles the WebView, Git, and image-processing dependencies. It is expected to take considerably longer than subsequent incremental builds.

## Commands

Run these commands from `narcard-editor/`:

```powershell
npm run doctor:windows # Check the Windows environment only
npm run setup:windows  # Install and verify the editor
npm run dev            # Start only the Vite browser frontend
npm run build          # Build only the Vite frontend
npm run tauri:dev      # Start the Tauri development window
npm run tauri:build    # Build the Tauri executable
```

Run the Rust checks from `narcard-editor/src-tauri/`:

```powershell
cargo fmt --check
cargo test --no-default-features
cargo check --no-default-features
```

`bundle.active` is currently `false` in `tauri.conf.json`. Therefore, `tauri:build` primarily creates the application executable and does not produce an MSI or NSIS installer. Code signing, updates, and installer policy should be designed before enabling bundles for a public release.

## Editor capabilities

- Select and validate a NarCard3/Astro project directory.
- List, open, create, and safely overwrite `src/content/blog/*.md` articles.
- Validate slugs and ISO dates before writing.
- Detect duplicate slugs and external file changes.
- Create `.bak` backups and use same-directory temporary files during replacement.
- Reject path traversal, symbolic links, Windows device names, and oversized files.
- Render Markdown previews with escaped HTML.
- Compress supported cover images to WebP.
- Commit and push through the selected project's configured Git repository.

Markdown is the single source of truth for articles. `src/data/posts.ts` is generated from Markdown frontmatter before the website build and should not be edited manually.

## Why `windres` reported `can't open file 'page:'`

During a Windows build, Tauri generates a `resource.rc` file whose first line declares UTF-8:

```rc
#pragma code_page(65001)
```

With the GNU Rust host used to reproduce the issue, MinGW GNU Binutils 2.44 processed this file through a Windows pipe. That mode incorrectly parsed part of `code_page` as a filename and produced:

```text
windres: can't open file `page:': Invalid argument
windres: preprocessing failed
```

This is not an invalid path in Astro, Vite, `tauri.conf.json`, the application icon, or the Rust business logic. The same generated resource compiles successfully when `windres` receives `--use-temp-file`, which isolates the problem to its pipe-based preprocessor transport.

NarCard Editor applies a project-local workaround:

- [build.rs](./src-tauri/build.rs) activates it only when `CARGO_CFG_TARGET_ENV=gnu`.
- It locates the real `windres.exe` and a compatible `gcc.exe` from the user's existing `PATH`.
- It compiles [windres-wrapper.c](./src-tauri/windres-wrapper.c) into Cargo's isolated `OUT_DIR`.
- It temporarily places that shim first on `PATH` for the current build process only.
- The shim adds `--use-temp-file`, forwards all original arguments, and returns the real tool's exit code.
- MSVC builds never enter this code path.

The workaround does not depend on a specific drive, username, Cargo home, repository location, or hard-coded MinGW installation directory. It never replaces the user's real `windres.exe`.

## WebView2 error `HRESULT(0x800700AA)`

After Rust compilation, Tauri creates a WebView2 window. If a previous development session was forcibly interrupted, or another process still holds the default WebView2 profile lock, Windows can return:

```text
Failed to create webview
HRESULT(0x800700AA): The requested resource is in use
```

Windows debug builds use a project-local development profile:

```text
narcard-editor/src-tauri/target/webview2-dev
```

This directory is inside Cargo's ignored `target/` tree. It is not committed and does not change the user-data behavior of release builds.

The executable itself can also remain locked while a development instance is running. Close the NarCard Editor window before restarting `npm run tauri:dev`, and do not run multiple development sessions against the same target directory.

## `Get-CimInstance: Access denied`

This message can appear after a failed Tauri run when the CLI tries to enumerate and clean up child processes from a restricted terminal. It is usually secondary. Read the first Rust, windres, linker, or WebView2 error printed above it to find the actual cause.

## Paths and development port

- Vite development server: `http://127.0.0.1:1420`
- Tauri configuration: [src-tauri/tauri.conf.json](./src-tauri/tauri.conf.json)
- Rust entry point: [src-tauri/src/main.rs](./src-tauri/src/main.rs)
- Capability configuration: [src-tauri/capabilities/default.json](./src-tauri/capabilities/default.json)
- Frontend entry point: [index.html](./index.html)
- Frontend logic: [src/editor.js](./src/editor.js)

To inspect a process occupying port 1420:

```powershell
Get-NetTCPConnection -LocalPort 1420 -State Listen
```

Confirm that the PID belongs to an old NarCard/Vite session before stopping it. Do not terminate unrelated Node.js processes blindly.

## File and publishing safety

Filesystem access is implemented by restricted Rust business commands; the frontend does not receive a generic arbitrary-path filesystem API. The backend revalidates the project directory, constrains Markdown paths and filenames, rejects traversal and links, and checks version fingerprints before overwriting files.

The Git publishing command modifies the selected repository and pushes to its configured remote. Configure Git identity and credentials first, and test write/publish behavior on a disposable copy rather than your only working copy.

## Reporting a problem

Include the following output in an issue after removing usernames, private paths, and repository credentials:

```powershell
cd narcard-editor
.\doctor-windows.cmd
node --version
npm --version
rustc -vV
cargo --version
npm run tauri:dev
```

Do not upload private articles, `.git/config`, SSH keys, access tokens, or screenshots containing an entire user directory.

## License

NarCard Editor is part of NarCard3 and is released under the repository's [MIT License](../LICENSE).
