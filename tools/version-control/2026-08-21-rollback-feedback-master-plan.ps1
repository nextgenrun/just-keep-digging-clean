[CmdletBinding()]
param(
    [string]$RepositoryPath = ".",
    [string]$BaselineTag = "safety/2026-08-20-pre-feedback-master-plan",
    [string]$TargetRef = "HEAD",
    [string]$ExpectedTargetCommit = "",
    [string]$RollbackBranch = "",
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Invoke-GitText {
    param([string[]]$Arguments)

    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = "git"
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $nativeArguments = @("-C", $script:RepoRoot) + $Arguments
    if ($null -ne $startInfo.ArgumentList) {
        foreach ($argument in $nativeArguments) {
            $startInfo.ArgumentList.Add($argument)
        }
    }
    else {
        # Windows PowerShell 5.1 runs on .NET Framework, where ArgumentList is
        # unavailable. Every rollback argument is already a discrete trusted
        # value, so quote it for the legacy Arguments string without invoking a
        # shell. This keeps the documented powershell.exe route operational.
        $startInfo.Arguments = ($nativeArguments | ForEach-Object {
            '"' + ([string]$_).Replace('"', '\"') + '"'
        }) -join " "
    }

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
        throw "Unable to start Git."
    }
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed: $stderr$stdout"
    }
    return $stdout.Trim()
}

function Test-GitRef {
    param([string]$Ref)

    & git -C $script:RepoRoot show-ref --verify --quiet $Ref
    return $LASTEXITCODE -eq 0
}

function Resolve-Commit {
    param([string]$Ref)

    return Invoke-GitText @("rev-parse", "--verify", "$Ref^{commit}")
}

function Split-GitLines {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) { return @() }
    return @($Text -split "`r?`n" | Where-Object { $_ })
}

function Invoke-FeedbackMasterPlanRollback {
    $script:RepoRoot = (Resolve-Path -LiteralPath $RepositoryPath).Path
    $insideWorktree = Invoke-GitText @("rev-parse", "--is-inside-work-tree")
    if ($insideWorktree -ne "true") {
        throw "RepositoryPath is not a Git worktree: $script:RepoRoot"
    }

    $baselineCommit = Resolve-Commit $BaselineTag
    $targetCommit = Resolve-Commit $TargetRef
    & git -C $script:RepoRoot merge-base --is-ancestor $baselineCommit $targetCommit
    if ($LASTEXITCODE -ne 0) {
        throw "Target $targetCommit is not a descendant of baseline $baselineCommit."
    }

    $range = "$baselineCommit..$targetCommit"
    $commits = Split-GitLines (Invoke-GitText @("rev-list", $range))
    $mergeCommits = Split-GitLines (Invoke-GitText @("rev-list", "--min-parents=2", $range))
    $changedPaths = Split-GitLines (Invoke-GitText @("diff", "--name-only", $range))
    $baselineTree = Invoke-GitText @("rev-parse", "$baselineCommit^{tree}")

    $plan = [ordered]@{
        mode = if ($Apply) { "apply" } else { "plan" }
        repository = $script:RepoRoot
        baselineTag = $BaselineTag
        baselineCommit = $baselineCommit
        baselineTree = $baselineTree
        targetCommit = $targetCommit
        commitCount = $commits.Count
        changedPathCount = $changedPaths.Count
        mergeCommitCount = $mergeCommits.Count
        commitsNewestFirst = $commits
        changedPaths = $changedPaths
    }

    if (-not $Apply) {
        [pscustomobject]$plan | ConvertTo-Json -Depth 5
        return
    }

    if ([string]::IsNullOrWhiteSpace($ExpectedTargetCommit)) {
        throw "-Apply requires -ExpectedTargetCommit with the reviewed full target SHA."
    }
    $expectedCommit = Resolve-Commit $ExpectedTargetCommit
    if ($expectedCommit -ne $targetCommit) {
        throw "Target moved: expected $expectedCommit but resolved $targetCommit."
    }
    $headCommit = Resolve-Commit "HEAD"
    if ($headCommit -ne $targetCommit) {
        throw "Rollback apply requires TargetRef to resolve to the current HEAD."
    }
    $dirty = Invoke-GitText @("status", "--porcelain=v1", "--untracked-files=all")
    if ($dirty) {
        throw "Rollback refused because the worktree contains uncommitted or untracked changes."
    }
    if ($mergeCommits.Count -gt 0) {
        throw "Rollback refused because the implementation range contains merge commits."
    }
    if ($commits.Count -eq 0) {
        throw "Nothing to roll back: target already equals the baseline commit."
    }

    $sourceBranch = Invoke-GitText @("symbolic-ref", "--short", "HEAD")
    if ($sourceBranch -in @("main", "master")) {
        throw "Rollback must start from a feature branch, never directly from $sourceBranch."
    }
    if ([string]::IsNullOrWhiteSpace($RollbackBranch)) {
        $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
        $RollbackBranch = "codex/rollback-feedback-master-plan-$stamp"
    }
    if ($RollbackBranch -notmatch '^codex/rollback-feedback-master-plan-[A-Za-z0-9._-]+$') {
        throw "RollbackBranch must use codex/rollback-feedback-master-plan-<slug>."
    }
    if (Test-GitRef "refs/heads/$RollbackBranch") {
        throw "Rollback branch already exists: $RollbackBranch"
    }

    Invoke-GitText @("switch", "-c", $RollbackBranch) | Out-Null
    try {
        Invoke-GitText (@("revert", "--no-commit") + $commits) | Out-Null
        $candidateTree = Invoke-GitText @("write-tree")
        if ($candidateTree -ne $baselineTree) {
            throw "Rollback tree mismatch: candidate $candidateTree, baseline $baselineTree."
        }

        Invoke-GitText @(
            "commit",
            "-m", "revert: undo feedback master plan implementation",
            "-m", "Reverts every linear commit after $BaselineTag through $targetCommit.",
            "-m", "Verified rollback tree equals baseline tree $baselineTree."
        ) | Out-Null

        $rollbackCommit = Resolve-Commit "HEAD"
        $rollbackTree = Invoke-GitText @("rev-parse", "$rollbackCommit^{tree}")
        $finalStatus = Invoke-GitText @("status", "--porcelain=v1", "--untracked-files=all")
        if ($rollbackTree -ne $baselineTree -or $finalStatus) {
            throw "Committed rollback did not finish at the clean baseline tree."
        }

        $plan.rollbackBranch = $RollbackBranch
        $plan.rollbackCommit = $rollbackCommit
        $plan.rollbackTree = $rollbackTree
        [pscustomobject]$plan | ConvertTo-Json -Depth 5
    }
    catch {
        & git -C $script:RepoRoot revert --abort 2>$null
        throw "Rollback failed on branch $RollbackBranch. Inspect it without deleting source work. $($_.Exception.Message)"
    }
}

Invoke-FeedbackMasterPlanRollback
