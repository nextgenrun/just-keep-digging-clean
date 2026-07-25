$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$project = Join-Path $projectDir 'SurvivalMotionV2.uproject'
$editor = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$script = Join-Path $PSScriptRoot 'export_survival_motion_fbx.py'
$report = Join-Path $projectDir 'SourceAssets\survival-motion-export-report.json'

if (Test-Path -LiteralPath $report) {
    Remove-Item -LiteralPath $report -Force
}

# FBX animation export with a preview mesh requires initialized skinned-mesh
# render resources in UE 5.8; -nullrhi asserts inside SkinnedMeshComponent.
& $editor $project "-ExecutePythonScript=$script" -unattended -nop4 -nosplash -log
if ($LASTEXITCODE -ne 0) {
    throw "Unreal motion export failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $report)) {
    throw "Unreal exited without the motion export report. Inspect Saved/Logs/SurvivalMotionV2.log"
}

Write-Host "Survival motion export complete. Report: $report"
