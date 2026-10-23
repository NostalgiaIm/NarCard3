[CmdletBinding()]
param(
    [switch] $DoctorOnly,
    [switch] $SkipNpmInstall,
    [switch] $SkipChecks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$editorRoot = Split-Path -Parent $PSScriptRoot
$minimumNode20Version = [Version]"20.19.0"
$minimumNode22Version = [Version]"22.12.0"
$problems = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Write-Step([string] $Message) {
    Write-Host "[NarCard] $Message" -ForegroundColor Cyan
}

function Find-Command([string] $Name) {
    return Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Invoke-Checked([string] $Program, [string[]] $Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Program $($Arguments -join ' ')"
    }
}

function Test-WebView2Runtime {
    $roots = @(
        "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
        "$env:ProgramFiles\Microsoft\EdgeWebView\Application"
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    foreach ($root in $roots) {
        if (Get-ChildItem -LiteralPath $root -Filter "msedgewebview2.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1) {
            return $true
        }
    }

    $clientId = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    $registryPaths = @(
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$clientId",
        "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$clientId",
        "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$clientId"
    )
    return [bool]($registryPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
}

Write-Step "Checking the Windows Tauri development environment..."

if ($env:OS -ne "Windows_NT") {
    $problems.Add("This setup package is for Windows. On macOS/Linux, install the official Tauri prerequisites and run npm ci manually.")
}

$nodeCommand = Find-Command "node.exe"
$npmCommand = Find-Command "npm.cmd"
$cargoCommand = Find-Command "cargo.exe"
$rustcCommand = Find-Command "rustc.exe"

if (-not $nodeCommand) {
    $problems.Add("Node.js was not found. Install Node.js 20.19+ LTS from https://nodejs.org/.")
} else {
    $nodeVersionText = (& $nodeCommand.Source --version).Trim().TrimStart("v")
    $nodeVersion = $null
    if (-not [Version]::TryParse($nodeVersionText, [ref]$nodeVersion)) {
        $problems.Add("Unable to parse the Node.js version: $nodeVersionText")
    } elseif (-not (
        ($nodeVersion.Major -eq 20 -and $nodeVersion -ge $minimumNode20Version) -or
        ($nodeVersion.Major -ge 22 -and $nodeVersion -ge $minimumNode22Version)
    )) {
        $problems.Add("Node.js $nodeVersion is unsupported. Install Node.js 20.19+ or 22.12+ (current LTS recommended).")
    } else {
        Write-Host "  OK  Node.js $nodeVersion"
    }
}

if (-not $npmCommand) {
    $problems.Add("npm.cmd was not found. Reinstall Node.js with npm enabled.")
} else {
    $npmVersion = ((& $npmCommand.Source --version) | Select-Object -Last 1).Trim()
    Write-Host "  OK  npm $npmVersion"
}

if (-not $cargoCommand -or -not $rustcCommand) {
    $problems.Add("Rust/Cargo was not found. Install rustup from https://rustup.rs/ and restart the terminal.")
} else {
    $rustVersion = (& $rustcCommand.Source --version).Trim()
    $rustDetails = (& $rustcCommand.Source -vV | Out-String)
    $hostMatch = [regex]::Match($rustDetails, "(?m)^host:\s*(.+)$")
    $rustHost = if ($hostMatch.Success) { $hostMatch.Groups[1].Value.Trim() } else { "unknown" }
    Write-Host "  OK  $rustVersion ($rustHost)"

    if ($rustHost.EndsWith("windows-gnu")) {
        $gnuToolsReady = $true
        if (-not (Find-Command "windres.exe")) {
            $problems.Add("The GNU Rust host is active, but windres.exe is missing from PATH. Install a complete MinGW-w64 toolchain.")
            $gnuToolsReady = $false
        }
        if (-not (Find-Command "gcc.exe")) {
            $problems.Add("The GNU Rust host is active, but gcc.exe is missing from PATH. Install a complete MinGW-w64 toolchain.")
            $gnuToolsReady = $false
        }
        if ($gnuToolsReady) {
            Write-Host "  OK  GNU resource tools detected; the project windres compatibility shim will be enabled automatically."
        }
    } elseif (-not $rustHost.EndsWith("windows-msvc")) {
        $warnings.Add("Unexpected Rust host '$rustHost'. The Windows editor is tested with windows-msvc and windows-gnu.")
    }
}

if (Test-WebView2Runtime) {
    Write-Host "  OK  Microsoft Edge WebView2 Runtime"
} else {
    $problems.Add("Microsoft Edge WebView2 Runtime was not detected. Install the Evergreen Runtime from https://developer.microsoft.com/microsoft-edge/webview2/.")
}

$runningEditor = Get-Process -Name "narcard-editor" -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and $_.Path.StartsWith($editorRoot, [StringComparison]::OrdinalIgnoreCase) } |
    Select-Object -First 1
if ($runningEditor) {
    $problems.Add("NarCard Editor is already running (PID $($runningEditor.Id)). Close its window before setup so Cargo can replace build files.")
}

$listenerLine = & "$env:SystemRoot\System32\netstat.exe" -ano -p TCP 2>$null |
    Select-String -Pattern "^\s*TCP\s+\S+:1420\s+\S+\s+LISTENING\s+(\d+)\s*$" |
    Select-Object -First 1
if ($listenerLine -and $listenerLine.Matches.Count -gt 0) {
    $listenerPid = $listenerLine.Matches[0].Groups[1].Value
    $problems.Add("Port 1420 is already in use by PID $listenerPid. Stop the old Vite/Tauri development session before setup.")
}

foreach ($warning in $warnings) {
    Write-Warning $warning
}

if ($problems.Count -gt 0) {
    Write-Host ""
    Write-Host "Environment check failed:" -ForegroundColor Red
    foreach ($problem in $problems) {
        Write-Host "  - $problem" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "No system settings were changed. Install the missing prerequisite(s), reopen the terminal, and run this file again."
    exit 1
}

if ($DoctorOnly) {
    Write-Host ""
    Write-Host "NarCard Editor environment check passed." -ForegroundColor Green
    exit 0
}

Push-Location $editorRoot
try {
    if (-not $SkipNpmInstall) {
        Write-Step "Installing exact frontend dependencies from package-lock.json (npm ci)..."
        Invoke-Checked $npmCommand.Source @("ci")
    }

    if (-not $SkipChecks) {
        Write-Step "Building the Vite frontend..."
        Invoke-Checked $npmCommand.Source @("run", "build")

        Write-Step "Checking the Rust/Tauri backend..."
        Invoke-Checked $cargoCommand.Source @(
            "check",
            "--manifest-path",
            (Join-Path $editorRoot "src-tauri\Cargo.toml"),
            "--no-default-features"
        )
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "NarCard Editor setup completed successfully." -ForegroundColor Green
Write-Host "Start it with:  npm run tauri:dev"
Write-Host "Or double-click: start-editor-windows.cmd"
