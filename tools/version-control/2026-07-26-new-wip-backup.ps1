[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Label,
    [string]$BackupRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$Arguments)

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repoRoot) {
    throw "Run this script from inside the Dig Game Git checkout."
}

if (-not $BackupRoot) {
    $workspaceParent = Split-Path -Parent $repoRoot
    $BackupRoot = Join-Path $workspaceParent "back-ups-dig-game"
}

$safeLabel = ($Label.ToLowerInvariant() -replace "[^a-z0-9-]+", "-").Trim("-")
if (-not $safeLabel) {
    throw "Label must contain at least one letter or number."
}

$timestamp = Get-Date
$snapshotName = "{0}-{1}" -f $timestamp.ToString("dd-MM-yyyy-HHmmss"), $safeLabel
$backupRootFull = [System.IO.Path]::GetFullPath($BackupRoot)
$snapshotRoot = [System.IO.Path]::GetFullPath((Join-Path $backupRootFull $snapshotName))

if ($snapshotRoot -eq [System.IO.Path]::GetFullPath($repoRoot) -or
    -not $snapshotRoot.StartsWith($backupRootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Resolved snapshot path is outside the intended backup root: $snapshotRoot"
}
if (Test-Path -LiteralPath $snapshotRoot) {
    throw "Snapshot already exists: $snapshotRoot"
}

New-Item -ItemType Directory -Path $snapshotRoot -Force | Out-Null
$filesRoot = Join-Path $snapshotRoot "working-tree"
$metadataRoot = Join-Path $snapshotRoot "metadata"
New-Item -ItemType Directory -Path $filesRoot, $metadataRoot -Force | Out-Null

Push-Location $repoRoot
try {
    $beforeHead = (& git rev-parse HEAD).Trim()
    $beforeStatus = @(& git status --porcelain=v1 -uall)

    $robocopyLog = Join-Path $metadataRoot "robocopy.log"
    $excludedDirectories = @(
        ".git",
        ".git-safety",
        ".canary-dist",
        "dist",
        "dist-*",
        ".production-stage-*",
        "__pycache__",
        "Binaries",
        "DerivedDataCache",
        "Intermediate",
        "Saved",
        ".venv"
    )

    $copyArguments = @(
        $repoRoot,
        $filesRoot,
        "/E",
        "/COPY:DAT",
        "/DCOPY:DAT",
        "/R:2",
        "/W:1",
        "/XJ",
        "/MT:8",
        "/NP",
        "/LOG:$robocopyLog",
        "/XD"
    ) + $excludedDirectories + @(
        "/XF",
        "*.log",
        "*.tmp"
    )

    $copyPasses = 0
    $stableCopy = $false
    $recentSourceWrites = @()
    do {
        $copyPasses += 1
        $passStartedUtc = (Get-Date).ToUniversalTime()
        $passArguments = @($copyArguments)
        if ($copyPasses -gt 1) {
            $passArguments = @($passArguments | Where-Object { $_ -ne "/LOG:$robocopyLog" })
            $passArguments += "/LOG+:$robocopyLog"
        }

        & robocopy @passArguments
        $robocopyExitCode = $LASTEXITCODE
        if ($robocopyExitCode -ge 8) {
            throw "Robocopy failed with exit code $robocopyExitCode. See $robocopyLog"
        }

        $recentSourceWrites = @(
            Get-ChildItem -LiteralPath $repoRoot -File -Recurse -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.LastWriteTimeUtc -gt $passStartedUtc -and
                    $_.FullName -notmatch "\\.git(\\|$)" -and
                    $_.FullName -notmatch "\\.git-safety(\\|$)" -and
                    $_.FullName -notmatch "\\dist[^\\]*(\\|$)" -and
                    $_.FullName -notmatch "\\.canary-dist(\\|$)" -and
                    $_.FullName -notmatch "\\.production-stage-[^\\]*(\\|$)"
                } |
                Select-Object -ExpandProperty FullName
        )
        $stableCopy = $recentSourceWrites.Count -eq 0
    } while (-not $stableCopy -and $copyPasses -lt 3)

    if (-not $stableCopy) {
        Write-Warning "Source files changed during all three copy passes. The manifest records the affected paths."
    }

    $bundlePath = Join-Path $snapshotRoot "repository-history.bundle"
    Invoke-Git @("bundle", "create", $bundlePath, "--all")
    Invoke-Git @("bundle", "verify", $bundlePath)

    $reportScript = Join-Path $repoRoot "tools/version-control/2026-07-26-write-safety-report.ps1"
    $reportPath = & $reportScript -Reason backup -OutputDirectory $metadataRoot
    $afterStatus = @(& git status --porcelain=v1 -uall)

    $manifest = [ordered]@{
        SchemaVersion = 1
        CreatedAtUtc = $timestamp.ToUniversalTime().ToString("o")
        Label = $Label
        RepositoryRoot = $repoRoot.Replace("\", "/")
        SnapshotRoot = $snapshotRoot.Replace("\", "/")
        Head = $beforeHead
        Branch = (& git branch --show-current).Trim()
        Origin = (& git remote get-url origin).Trim()
        RobocopyExitCode = $robocopyExitCode
        CopyPasses = $copyPasses
        StableCopy = $stableCopy
        RecentSourceWrites = @($recentSourceWrites | ForEach-Object {
            $_.Substring($repoRoot.Length).TrimStart("\").Replace("\", "/")
        })
        ExcludedDirectories = $excludedDirectories
        StatusEntryCountBefore = $beforeStatus.Count
        StatusEntryCountAfter = $afterStatus.Count
        StatusChangedDuringBackup = (($beforeStatus -join "`n") -ne ($afterStatus -join "`n"))
        SafetyReport = (Split-Path -Leaf $reportPath)
        Bundle = "repository-history.bundle"
    }
    $manifestPath = Join-Path $metadataRoot "snapshot-manifest.json"
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8

    if ($manifest.StatusChangedDuringBackup -or -not $stableCopy) {
        Write-Warning "The working tree changed during the copy. The snapshot is usable, but rerun after active generators finish for a stable checkpoint."
    }

    Write-Host "WIP backup created: $snapshotRoot"
    Write-Host "Git history bundle verified: $bundlePath"
    Write-Host "Safety report: $reportPath"
    $snapshotRoot
}
finally {
    Pop-Location
}
