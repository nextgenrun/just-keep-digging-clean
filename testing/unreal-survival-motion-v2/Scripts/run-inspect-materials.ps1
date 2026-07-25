$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$editor = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$project = Join-Path $projectDir 'SurvivalMotionV2.uproject'
$script = Join-Path $PSScriptRoot 'inspect_survival_material_slots.py'
$report = Join-Path $projectDir 'SourceAssets\survival-material-slots.json'
if (Test-Path -LiteralPath $report) { Remove-Item -LiteralPath $report -Force }
& $editor $project "-ExecutePythonScript=$script" -unattended -nop4 -nosplash -nullrhi -log
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $report)) {
    throw 'Unreal material-slot inspection failed'
}
