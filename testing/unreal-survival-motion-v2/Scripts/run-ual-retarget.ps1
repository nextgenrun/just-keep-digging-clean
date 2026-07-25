$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$project = Join-Path $projectDir 'SurvivalMotionV2.uproject'
$editor = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$script = Join-Path $PSScriptRoot 'build_ual_survival_retarget.py'
$log = Join-Path $projectDir 'Saved\Logs\SurvivalMotionV2.log'
$report = Join-Path $projectDir 'SourceAssets\ual-survival-retarget-report.json'

if (-not (Test-Path -LiteralPath $editor)) {
    throw "UnrealEditor-Cmd.exe not found: $editor"
}
if (Test-Path -LiteralPath $report) {
    Remove-Item -LiteralPath $report -Force
}

& $editor $project "-ExecutePythonScript=$script" -unattended -nop4 -nosplash -nullrhi -log
if ($LASTEXITCODE -ne 0) {
    throw "UAL-to-Survival retarget failed with exit code $LASTEXITCODE. Inspect $log"
}
if (-not (Test-Path -LiteralPath $report)) {
    throw "Unreal exited without the UAL retarget report. Inspect $log"
}

Write-Host "UAL-to-Survival retarget complete. Report: $report"
