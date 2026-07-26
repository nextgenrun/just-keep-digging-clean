[CmdletBinding()]
param(
    [ValidateSet("manual", "install", "pre-commit", "pre-push", "backup")]
    [string]$Reason = "manual",
    [string]$OutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-GitText {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    $output = @(& git @Arguments 2>&1 | ForEach-Object { "$_" })
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "git $($Arguments -join ' ') failed with exit code $exitCode"
    }

    [pscustomobject]@{
        ExitCode = $exitCode
        Lines = $output
    }
}

$repoResult = Invoke-GitText @("rev-parse", "--show-toplevel")
$repoRoot = $repoResult.Lines[0].Trim()

Push-Location $repoRoot
try {
    if (-not $OutputDirectory) {
        $OutputDirectory = Join-Path $repoRoot ".git-safety/logs"
    }
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

    $timestamp = Get-Date
    # Keep zero-, one-, and many-line Git results as arrays. PowerShell otherwise
    # unwraps pipeline output, and StrictMode makes `.Count` fail for `$null`.
    $statusLines = @((Invoke-GitText @("status", "--porcelain=v1", "-uall")).Lines)
    $untrackedFiles = @(
        (Invoke-GitText @("ls-files", "--others", "--exclude-standard")).Lines |
            Where-Object { $_ }
    )
    $candidateFiles = @(
        (Invoke-GitText @("ls-files", "--cached", "--others", "--exclude-standard")).Lines |
            Where-Object { $_ }
    )
    $upstreamResult = Invoke-GitText @("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}") -AllowFailure
    $upstream = if ($upstreamResult.ExitCode -eq 0) { $upstreamResult.Lines[0].Trim() } else { $null }

    $divergence = $null
    if ($upstream) {
        $divergenceResult = Invoke-GitText @("rev-list", "--left-right", "--count", "HEAD...$upstream") -AllowFailure
        if ($divergenceResult.ExitCode -eq 0) {
            $parts = $divergenceResult.Lines[0].Trim() -split "\s+"
            $divergence = [ordered]@{
                Ahead = [int]$parts[0]
                Behind = [int]$parts[1]
            }
        }
    }

    $largeFiles = foreach ($candidateFile in $candidateFiles) {
        if (Test-Path -LiteralPath $candidateFile -PathType Leaf) {
            $item = Get-Item -LiteralPath $candidateFile
            if ($item.Length -ge 25MB) {
                $attributeResult = Invoke-GitText @("check-attr", "filter", "--", $candidateFile) -AllowFailure
                $filter = if (@($attributeResult.Lines).Count -gt 0) {
                    ($attributeResult.Lines[0] -split ":\s*", 3)[-1]
                } else {
                    "unspecified"
                }
                [ordered]@{
                    Path = $candidateFile.Replace("\", "/")
                    Bytes = $item.Length
                    MiB = [math]::Round($item.Length / 1MB, 2)
                    Filter = $filter
                }
            }
        }
    }

    $stateCounts = [ordered]@{
        Entries = $statusLines.Count
        Staged = @($statusLines | Where-Object { $_.Length -ge 2 -and $_[0] -notin @(" ", "?") }).Count
        Worktree = @($statusLines | Where-Object { $_.Length -ge 2 -and $_[1] -notin @(" ", "?") }).Count
        Untracked = $untrackedFiles.Count
    }

    $diffCheck = Invoke-GitText @("diff", "--check") -AllowFailure
    $report = [ordered]@{
        SchemaVersion = 1
        RecordedAtUtc = $timestamp.ToUniversalTime().ToString("o")
        Reason = $Reason
        Repository = [ordered]@{
            Root = $repoRoot.Replace("\", "/")
            Branch = (Invoke-GitText @("branch", "--show-current")).Lines[0].Trim()
            Head = (Invoke-GitText @("rev-parse", "HEAD")).Lines[0].Trim()
            Upstream = $upstream
            Divergence = $divergence
            Origin = (Invoke-GitText @("remote", "get-url", "origin") -AllowFailure).Lines | Select-Object -First 1
        }
        Worktree = [ordered]@{
            Counts = $stateCounts
            Status = $statusLines
            DiffCheckExitCode = $diffCheck.ExitCode
            DiffCheckFindings = $diffCheck.Lines
            LargeFiles = @($largeFiles | Sort-Object Bytes -Descending)
        }
        Recovery = [ordered]@{
            RecentCommits = (Invoke-GitText @("log", "-n", "20", "--date=iso-strict", "--pretty=format:%H%x09%ad%x09%s")).Lines
            RecentReflog = (Invoke-GitText @("reflog", "-n", "30", "--date=iso-strict", "--pretty=format:%H%x09%gd%x09%gs")).Lines
        }
    }

    $fileStamp = $timestamp.ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ssZ")
    $reportPath = Join-Path $OutputDirectory "$fileStamp-$Reason-repository-safety.json"
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
    (Resolve-Path -LiteralPath $reportPath).Path
}
finally {
    Pop-Location
}
