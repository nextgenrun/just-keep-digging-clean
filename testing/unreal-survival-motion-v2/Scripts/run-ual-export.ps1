$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$project = Join-Path $projectDir 'SurvivalMotionV2.uproject'
$editor = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$script = Join-Path $PSScriptRoot 'export_ual_survival_fbx.py'
$report = Join-Path $projectDir 'SourceAssets\ual-survival-export-report.json'

if (Test-Path -LiteralPath $report) {
    Remove-Item -LiteralPath $report -Force
}

# UE 5.8 preview-mesh FBX export requires initialized skinned-mesh render
# resources, so this runner intentionally does not use -nullrhi.
& $editor $project "-ExecutePythonScript=$script" -unattended -nop4 -nosplash -log
if ($LASTEXITCODE -ne 0) {
    throw "UAL-to-Survival FBX export failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $report)) {
    throw "Unreal exited without the UAL FBX export report. Inspect Saved/Logs/SurvivalMotionV2.log"
}

Write-Host "UAL-to-Survival FBX export complete. Report: $report"
