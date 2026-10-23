# NarCard Editor one-click setup implementation

[简体中文](./ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md)

This document is for reviewers and maintainers. It explains how the Windows setup package works, why it is structured this way, and which parts of the local system it can affect.

## Package layout

```text
narcard-editor/
├── setup-windows.cmd                # Full setup entry point
├── doctor-windows.cmd               # Read-only diagnostics entry point
├── start-editor-windows.cmd         # Setup-if-needed, then start
├── scripts/setup-windows.ps1        # Detection, installation, and verification
├── src-tauri/build.rs               # GNU windres compatibility orchestration
└── src-tauri/windres-wrapper.c      # Auditable windres argument-forwarding shim
```

The three `.cmd` files are stable double-click entry points. They resolve files relative to their own directory, so they do not depend on the caller's current working directory. None of them requests elevation.

## Execution flow

### Stage 1: environment diagnostics

The PowerShell script checks:

1. That the host operating system is Windows.
2. That `node.exe` exists and is in Vite 7's supported `20.19+` or `22.12+` range.
3. That `npm.cmd` exists.
4. That `cargo.exe` and `rustc.exe` exist.
5. Which host triple is reported by `rustc -vV`.
6. On a GNU host, that `gcc.exe` and `windres.exe` are available.
7. That WebView2 Evergreen Runtime is present in a standard installation directory or EdgeUpdate registration.
8. That an existing NarCard Editor process or port 1420 listener will not lock the build.

`doctor-windows.cmd` exits after this stage. It does not run npm or Cargo and does not create project build outputs.

### Stage 2: local dependency installation

The full setup runs:

```powershell
npm ci
```

`npm ci` is used instead of `npm install` because it treats `package-lock.json` as authoritative:

- the dependency tree is reproducible;
- a normal run does not rewrite the lockfile;
- a mismatch between `package.json` and the lockfile fails explicitly.

All packages are installed into `narcard-editor/node_modules/`. The script never uses `npm install -g`.

### Stage 3: frontend and backend verification

The script first runs:

```powershell
npm run build
```

This verifies the HTML, JavaScript, CSS, and Vite configuration and writes the ignored output to `narcard-editor/dist/`.

It then runs:

```powershell
cargo check --manifest-path src-tauri/Cargo.toml --no-default-features
```

This verifies Rust types, Tauri configuration, capabilities, resource generation, and platform-link preparation. Cargo downloads and caches remain governed by the user's normal Cargo configuration; the script does not modify `CARGO_HOME`.

## Self-healing GNU windres compatibility

### Why a `.cmd` wrapper is insufficient

On Windows, Rust's `std::process::Command` and the `embed-resource` crate need to resolve an executable program. Merely placing `windres.cmd` at the front of `PATH` is not reliable: the GNU build path may still resolve a later `windres.exe` directly.

The project therefore generates a tiny native `.exe` shim from reviewed source in `src-tauri/windres-wrapper.c`.

### Responsibilities of `build.rs`

Before calling `tauri_build::build()`, `build.rs`:

1. Checks `CARGO_CFG_TARGET_ENV` and continues only for `gnu`.
2. Locates the real `windres.exe` on the original `PATH`.
3. Prefers `gcc.exe` from the same directory to avoid mixing MinGW distributions.
4. Builds `windres.exe` inside Cargo's `OUT_DIR/windres-shim/`.
5. Sets `NARCARD_REAL_WINDRES` only for the current build process.
6. Temporarily places the shim directory first on the current process's `PATH`.
7. Calls the normal `tauri_build::build()` implementation.

No discovered path is written into repository configuration. Moving the checkout, changing drives, or changing MinGW installations causes a fresh discovery/build when Cargo reruns the build script.

### Responsibilities of the C shim

The shim reads `NARCARD_REAL_WINDRES` and invokes:

```text
<real windres.exe> --use-temp-file <all original Tauri arguments...>
```

It uses `_spawnv(_P_WAIT, ...)`, waits synchronously, and returns the real process's exit code. It does not inspect resource contents, delete files, access the network, or replace the real executable.

### Why the executable is generated in `OUT_DIR`

- Cargo isolates `OUT_DIR` by package, profile, and target.
- `cargo clean` removes it naturally.
- The repository stores reviewable source instead of a precompiled binary.
- No file is written to the system MinGW installation.
- The workaround remains local to the build that needs it.

## WebView2 development-profile isolation

On Windows builds with `debug_assertions`, the Rust entry point sets:

```text
WEBVIEW2_USER_DATA_FOLDER=<src-tauri>/target/webview2-dev
```

The variable is set before `tauri::Builder` creates the window, so WebView2 uses a project-local development profile. Release builds do not compile this branch and retain normal production user-data behavior.

This mitigates stale profile locks after an interrupted development session; it does not disable a WebView2 security feature.

## Security and privacy checklist

The setup package:

- contains no download-and-execute remote-script behavior;
- does not request Administrator privileges;
- does not change the registry or persistent environment variables;
- does not disable antivirus or Windows security features;
- does not terminate unknown processes;
- does not inspect articles or media files;
- does not inspect Git remotes, tokens, or SSH keys;
- does not run Git commands;
- does not upload diagnostics.

The only expected network access is npm and Cargo downloading dependencies through their standard configuration. Users and organizations can audit those downloads through `package-lock.json`, `Cargo.lock`, and their configured package mirrors.

## Flags and automation

The PowerShell script supports:

- `-DoctorOnly`: run read-only diagnostics for issue triage.
- `-SkipNpmInstall`: preserve an existing trusted `node_modules` directory.
- `-SkipChecks`: install dependencies without Vite/Cargo verification.

CI can invoke the PowerShell implementation directly:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File ./narcard-editor/scripts/setup-windows.ps1 `
  -SkipNpmInstall
```

If CI already has separate dependency and validation steps, it can use `-DoctorOnly` or omit the setup package entirely.

## Maintenance checklist

After changing the setup package, run at least:

```powershell
cd narcard-editor
.\doctor-windows.cmd
.\setup-windows.cmd -SkipNpmInstall
npm run tauri:dev
```

Also verify:

- MSVC hosts do not compile or invoke the GNU shim.
- GNU hosts recreate the shim after removing the Cargo `target/` directory.
- Repository paths containing spaces work correctly.
- Missing Node.js, Rust, WebView2, GCC, or windres produce actionable messages.
- Release builds do not use the development WebView2 profile.
- `git status` does not include `node_modules/`, `dist/`, or `src-tauri/target/`.

Never commit personal absolute paths, precompiled compatibility executables, access tokens, or local diagnostic logs.
