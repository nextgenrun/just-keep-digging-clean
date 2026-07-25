param(
    [switch]$Rebuild,
    [switch]$BuildOnly,
    [switch]$SkipContract
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'values\blenderAnimationLab.json'
$builderPath = Join-Path $PSScriptRoot '2026-07-17-build-blender-animation-lab.py'
$contractPath = Join-Path $root 'testing\2026-07-17-blender-animation-lab-contract.py'
$config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
$blender = $config.blender.executable
$outputBlend = Join-Path $root ($config.paths.outputBlend -replace '/', '\')

if (-not (Test-Path -LiteralPath $blender -PathType Leaf)) {
    throw "Configured Blender executable is missing: $blender"
}

if ($Rebuild -or -not (Test-Path -LiteralPath $outputBlend -PathType Leaf)) {
    & $blender --background --factory-startup --python-exit-code 1 --python $builderPath -- --config $configPath
    if ($LASTEXITCODE -ne 0) {
        throw "Blender animation lab build failed with exit code $LASTEXITCODE"
    }
}

if (-not $SkipContract) {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) {
        throw 'Python is required to run the Blender animation lab contract.'
    }
    & $python.Source $contractPath --config $configPath --require-build
    if ($LASTEXITCODE -ne 0) {
        throw "Blender animation lab contract failed with exit code $LASTEXITCODE"
    }
}

if ($BuildOnly) {
    Write-Output "BLENDER_ANIMATION_LAB_BUILD_ONLY_OK $outputBlend"
    exit 0
}

$arguments = @(
    ('"{0}"' -f $outputBlend),
    '--python',
    ('"{0}"' -f $builderPath),
    '--',
    '--config',
    ('"{0}"' -f $configPath),
    '--register-only'
)
Start-Process -FilePath $blender -ArgumentList $arguments
Write-Output "BLENDER_ANIMATION_LAB_LAUNCHED $outputBlend"
