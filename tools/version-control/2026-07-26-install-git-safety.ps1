[CmdletBinding()]
param()

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

Push-Location $repoRoot
try {
    $requiredFiles = @(
        ".githooks/pre-commit",
        ".githooks/pre-push",
        ".gitmessage",
        "tools/version-control/2026-07-26-write-safety-report.ps1"
    )

    foreach ($requiredFile in $requiredFiles) {
        if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
            throw "Required safety file is missing: $requiredFile"
        }
    }

    Invoke-Git @("lfs", "install", "--local")

    $settings = [ordered]@{
        "core.hooksPath" = ".githooks"
        "core.logAllRefUpdates" = "true"
        "commit.template" = ".gitmessage"
        "commit.verbose" = "true"
        "pull.ff" = "only"
        "push.default" = "simple"
        "push.autoSetupRemote" = "true"
        "push.followTags" = "true"
        "rerere.enabled" = "true"
        "rerere.autoupdate" = "true"
        "gc.reflogExpire" = "180.days"
        "gc.reflogExpireUnreachable" = "90.days"
        "gc.pruneExpire" = "90.days"
        "fetch.writeCommitGraph" = "true"
    }

    foreach ($entry in $settings.GetEnumerator()) {
        Invoke-Git @("config", "--local", $entry.Key, $entry.Value)
    }

    $reportScript = Join-Path $repoRoot "tools/version-control/2026-07-26-write-safety-report.ps1"
    $reportPath = & $reportScript -Reason install
    if ($LASTEXITCODE -ne 0) {
        throw "Safety report generation failed."
    }

    Write-Host "Git safety configuration installed for $repoRoot"
    Write-Host "Initial report: $reportPath"
}
finally {
    Pop-Location
}
