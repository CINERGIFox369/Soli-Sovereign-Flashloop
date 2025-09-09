<#
Ensures lib\forge-std is present and healthy. If missing or clearly broken, optionally reclones it from GitHub.
Then verifies `forge` is on PATH and runs `forge test -vv`.

Usage:
  .\scripts\ensure-forge-std.ps1           # interactive prompts
  .\scripts\ensure-forge-std.ps1 -AutoYes  # non-interactive, yes to removals
#>
[CmdletBinding()]
param(
    [switch]$AutoYes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path -LiteralPath $scriptDir | ForEach-Object { Split-Path -Parent $_ }
$libPath = Join-Path $repoRoot 'lib\forge-std'

function Confirm-Or($message) {
    if ($AutoYes) { return $true }
    $r = Read-Host "$message [y/N]"
    return $r -match '^[Yy]'
}

Write-Host "Repo root: $repoRoot"
Write-Host "Checking: $libPath"

$needClone = $false
if (Test-Path -LiteralPath $libPath) {
    Write-Host "Found existing directory: $libPath"
    if (Test-Path -LiteralPath (Join-Path $libPath '.git')) {
        Write-Host "Directory is a git repo. Quick health check..."
        $srcDir = Join-Path $libPath 'src'
        if (Test-Path -LiteralPath $srcDir) {
            $fileCount = (Get-ChildItem -LiteralPath $srcDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Host "Files under src: $fileCount"
            if ($fileCount -ge 5) {
                Write-Host "Looks healthy. Skipping reclone."
            } else {
                Write-Host "Unexpectedly few files ($fileCount). Will reclone."
                $needClone = $true
            }
        } else {
            Write-Host "Missing src folder. Will reclone."
            $needClone = $true
        }
    } else {
        Write-Host "Directory exists but is not a git repo. Will reclone."
        $needClone = $true
    }
} else {
    Write-Host "lib\forge-std not found. Will clone."
    $needClone = $true
}

if ($needClone) {
    if (Confirm-Or "Remove and reclone '$libPath' from https://github.com/foundry-rs/forge-std.git ?") {
        if (Test-Path -LiteralPath $libPath) {
            Write-Host "Removing $libPath"
            Remove-Item -LiteralPath $libPath -Recurse -Force -ErrorAction Stop
        }
        Write-Host "Cloning forge-std..."
        try {
            git clone https://github.com/foundry-rs/forge-std.git $libPath 2>&1 | Write-Host
            Write-Host "Clone finished."
        } catch {
            Write-Error "git clone failed: $_"
            exit 2
        }
    } else {
        Write-Host "User chose not to reclone. Exiting."
        exit 0
    }
}

# Verify forge exists
Write-Host "Verifying 'forge' is available on PATH..."
$forge = Get-Command forge -ErrorAction SilentlyContinue
if (-not $forge) {
    Write-Host "Foundry 'forge' not found on PATH. Install Foundry first."
    Write-Host "Recommended (run in Git Bash or WSL):" 
    Write-Host "  curl -L https://foundry.paradigm.xyz | bash" 
    Write-Host "  foundryup"
    exit 3
}

# Run tests
Write-Host "Running: forge test -vv (this may take a bit)"
Push-Location -LiteralPath $repoRoot
try {
    $proc = Start-Process -FilePath (Get-Command forge).Source -ArgumentList 'test','-vv' -NoNewWindow -Wait -PassThru -ErrorAction Stop
    if ($proc.ExitCode -eq 0) {
        Write-Host "forge test completed successfully."
        exit 0
    } else {
        Write-Error "forge test failed with exit code $($proc.ExitCode)."
        exit $proc.ExitCode
    }
} catch {
    Write-Error "Failed to run 'forge test': $_"
    exit 4
} finally {
    Pop-Location
}
