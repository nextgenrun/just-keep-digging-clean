[CmdletBinding()]
param(
    [string]$FeatureCommit = "HEAD",
    [string]$NodePath = "",
    [string]$PythonPath = "",
    [ValidateRange(15, 600)]
    [int]$ContractTimeoutSeconds = 90,
    [switch]$NoRollback,
    [switch]$ForceFailureForRollbackProof
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = ""
$featureSha = ""
$featureBaseSha = ""
$rollbackEligible = $false
$rollbackSha = ""
$buildDirectory = ""
$reportLines = [System.Collections.Generic.List[string]]::new()

function Add-ReportLine {
    param([string]$Line)
    $reportLines.Add($Line)
    Write-Host $Line
}

function Invoke-GitText {
    param([string[]]$Arguments)
    $output = & git @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Resolve-RequiredExecutable {
    param(
        [string]$ExplicitPath,
        [string]$CommandName,
        [string[]]$FallbackPaths
    )
    if ($ExplicitPath) {
        $resolved = [IO.Path]::GetFullPath($ExplicitPath)
        if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
            throw "$CommandName was not found at the supplied path: $resolved"
        }
        return $resolved
    }

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($command -and $command.Source) {
        return $command.Source
    }

    foreach ($candidate in $FallbackPaths) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return [IO.Path]::GetFullPath($candidate)
        }
    }
    throw "$CommandName was not found on PATH or in the bundled Codex runtime."
}

function Invoke-HealthStep {
    param(
        [string]$Name,
        [string]$Executable,
        [string[]]$Arguments
    )
    $started = Get-Date
    Add-ReportLine "[RUN] $Name"
    & $Executable @Arguments
    $exitCode = $LASTEXITCODE
    $elapsed = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode after ${elapsed}s."
    }
    Add-ReportLine "[PASS] $Name (${elapsed}s)"
}

function Assert-SafeBuildDirectory {
    param([string]$Path)
    $resolved = [IO.Path]::GetFullPath($Path)
    $resolvedRepoRoot = [IO.Path]::GetFullPath($repoRoot).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar
    )
    $expectedPrefix = Join-Path $resolvedRepoRoot ".canary-dist\heavenblocks-"
    if (-not $resolved.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing recursive cleanup outside the dedicated ignored Heavenblocks build directory: $resolved"
    }
    return $resolved
}

function Write-GateReport {
    param(
        [string]$Status,
        [string]$Failure
    )
    $reportDirectory = Join-Path ([IO.Path]::GetTempPath()) "dig-game-heavenblocks-health-reports"
    New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
    $reportPath = Join-Path $reportDirectory "heavenblocks-$stamp.json"
    $report = [ordered]@{
        feature = "heavenblocks-progression-v1"
        status = $Status
        featureCommit = $featureSha
        featureBase = $featureBaseSha
        rollbackCommit = $rollbackSha
        rollbackEnabled = -not $NoRollback.IsPresent
        rollbackEligible = $rollbackEligible
        failure = $Failure
        timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
        steps = @($reportLines)
    }
    $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding utf8
    Write-Host "Health-gate report: $reportPath"
}

try {
    $repoRoot = Invoke-GitText @("rev-parse", "--show-toplevel")
    Set-Location -LiteralPath $repoRoot

    $releasePath = Join-Path $repoRoot "tools/version-control/2026-07-26-heavenblocks-release.json"
    if (-not (Test-Path -LiteralPath $releasePath -PathType Leaf)) {
        throw "Heavenblocks release manifest is missing: $releasePath"
    }
    $release = Get-Content -LiteralPath $releasePath -Raw | ConvertFrom-Json

    $featureSha = Invoke-GitText @("rev-parse", "--verify", "$FeatureCommit^{commit}")
    $headSha = Invoke-GitText @("rev-parse", "--verify", "HEAD^{commit}")
    if ($featureSha -ne $headSha) {
        throw "Fail-closed: FeatureCommit must resolve to the checked-out HEAD."
    }

    $parentRow = (Invoke-GitText @("rev-list", "--parents", "-n", "1", $featureSha)) -split "\s+"
    if ($parentRow.Count -ne 2) {
        throw "Fail-closed: the feature commit must have exactly one parent."
    }
    $featureBaseSha = $parentRow[1]

    $dirty = Invoke-GitText @("status", "--porcelain=v1", "--untracked-files=all")
    if ($dirty) {
        throw "Fail-closed: automatic rollback requires a clean worktree. No files were changed."
    }

    $changedPaths = @(
        (Invoke-GitText @("diff-tree", "--no-commit-id", "--name-only", "-r", $featureSha)) `
            -split "`n" |
            Where-Object { $_ }
    )
    if ($changedPaths.Count -eq 0) {
        throw "Fail-closed: the feature commit contains no changed paths."
    }
    $outsideManifest = @(
        foreach ($path in $changedPaths) {
            $allowed = $false
            foreach ($pattern in $release.allowedCommitPaths) {
                if ($path -like $pattern) {
                    $allowed = $true
                    break
                }
            }
            if (-not $allowed) {
                $path
            }
        }
    )
    if ($outsideManifest.Count -gt 0) {
        throw "Fail-closed: feature commit contains paths outside the release manifest: $($outsideManifest -join ', ')"
    }
    $rollbackEligible = $true

    $userProfile = [Environment]::GetFolderPath("UserProfile")
    $node = Resolve-RequiredExecutable `
        -ExplicitPath $NodePath `
        -CommandName "node" `
        -FallbackPaths @(
            (Join-Path $userProfile ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")
        )
    $python = Resolve-RequiredExecutable `
        -ExplicitPath $PythonPath `
        -CommandName "python" `
        -FallbackPaths @(
            (Join-Path $userProfile ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe")
        )

    Add-ReportLine "[SAFE] clean single-parent feature commit $featureSha"
    Add-ReportLine "[SAFE] $($changedPaths.Count) commit paths are inside the release manifest"

    foreach ($contract in $release.requiredContracts) {
        $contractPath = Join-Path $repoRoot $contract
        if (-not (Test-Path -LiteralPath $contractPath -PathType Leaf)) {
            throw "Required release contract is missing: $contract"
        }
        $extension = [IO.Path]::GetExtension($contractPath).ToLowerInvariant()
        $runner = if ($extension -eq ".py") { $python } else { $node }
        Invoke-HealthStep -Name "contract $contract" -Executable $runner -Arguments @($contractPath)
    }

    Invoke-HealthStep `
        -Name "full deep game-logic health" `
        -Executable $python `
        -Arguments @(
            (Join-Path $repoRoot "testing/2026-07-22-deep-game-logic-health.py"),
            "--timeout",
            "$ContractTimeoutSeconds"
        )
    Invoke-HealthStep `
        -Name "production deployment smoke" `
        -Executable $python `
        -Arguments @((Join-Path $repoRoot "testing/2026-07-18-production-deployment-smoke.py"))

    $buildDirectory = Join-Path $repoRoot (
        ".canary-dist/heavenblocks-$([guid]::NewGuid().ToString('N'))"
    )
    $buildDirectory = Assert-SafeBuildDirectory -Path $buildDirectory
    if (Test-Path -LiteralPath $buildDirectory) {
        throw "Refusing to overwrite an existing production canary directory: $buildDirectory"
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $buildDirectory -Parent) | Out-Null
    Invoke-HealthStep `
        -Name "isolated production build" `
        -Executable $python `
        -Arguments @(
            (Join-Path $repoRoot "tools/2026-07-17-build-production.py"),
            "--out-dir",
            $buildDirectory
        )
    Invoke-HealthStep `
        -Name "production HTTP canary" `
        -Executable $python `
        -Arguments @(
            (Join-Path $repoRoot "testing/2026-07-25-production-http-canary.py"),
            "--directory",
            $buildDirectory
        )

    if ($ForceFailureForRollbackProof) {
        throw "Intentional post-check failure requested to prove the Git rollback path."
    }

    Write-GateReport -Status "PASS" -Failure ""
    exit 0
}
catch {
    $failure = $_.Exception.Message
    Write-Host "[FAIL] $failure" -ForegroundColor Red

    if ($rollbackEligible -and -not $NoRollback) {
        try {
            $currentHead = Invoke-GitText @("rev-parse", "--verify", "HEAD^{commit}")
            $dirtyNow = Invoke-GitText @("status", "--porcelain=v1", "--untracked-files=all")
            if ($currentHead -ne $featureSha -or $dirtyNow) {
                throw "Rollback refused because HEAD moved or the worktree became dirty."
            }
            Add-ReportLine "[ROLLBACK] reverting exact feature commit $featureSha"
            & git revert --no-edit $featureSha
            if ($LASTEXITCODE -ne 0) {
                & git revert --abort 2>$null
                throw "git revert failed; the revert was aborted and HEAD was not accepted as rolled back."
            }

            $rollbackSha = Invoke-GitText @("rev-parse", "--verify", "HEAD^{commit}")
            $rollbackParent = Invoke-GitText @("rev-parse", "--verify", "$rollbackSha^1")
            $rollbackTree = Invoke-GitText @("rev-parse", "--verify", "$rollbackSha^{tree}")
            $baseTree = Invoke-GitText @("rev-parse", "--verify", "$featureBaseSha^{tree}")
            if ($rollbackParent -ne $featureSha -or $rollbackTree -ne $baseTree) {
                throw "Rollback verification failed: the revert commit is not an exact return to the feature parent tree."
            }
            Add-ReportLine "[ROLLED BACK] exact parent tree restored by $rollbackSha"
        }
        catch {
            $failure = "$failure | AUTOMATIC ROLLBACK ERROR: $($_.Exception.Message)"
            Write-Host "[ROLLBACK ERROR] $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    elseif (-not $rollbackEligible) {
        Add-ReportLine "[NO MUTATION] rollback preflight never became eligible"
    }
    else {
        Add-ReportLine "[NO ROLLBACK] -NoRollback was explicitly supplied"
    }

    Write-GateReport -Status "FAIL" -Failure $failure
    exit 1
}
finally {
    if ($buildDirectory -and (Test-Path -LiteralPath $buildDirectory)) {
        $safeBuildDirectory = Assert-SafeBuildDirectory -Path $buildDirectory
        Remove-Item -LiteralPath $safeBuildDirectory -Recurse -Force
    }
}
