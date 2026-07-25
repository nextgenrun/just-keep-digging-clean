param(
    [switch]$Rebuild,
    [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'values\blenderAnimationLab.json'
$config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
$blender = $config.blender.executable
$master = Join-Path $root ($config.paths.outputBlend -replace '/', '\')
$target = Join-Path $root ($config.groundContactWorkspace.outputBlend -replace '/', '\')
$builder = Join-Path $PSScriptRoot '2026-07-22-build-ground-strike-hand-contact-workspace.py'
$bootstrap = Join-Path $PSScriptRoot '2026-07-17-build-blender-animation-lab.py'

if ($Rebuild -or -not (Test-Path -LiteralPath $target -PathType Leaf)) {
    & $blender --background $master --python-exit-code 1 --python $builder -- --config $configPath
    if ($LASTEXITCODE -ne 0) { throw "Ground-contact workspace build failed: $LASTEXITCODE" }
}

& $blender --background $target --python-exit-code 1 --python $builder -- --config $configPath --validate-only
if ($LASTEXITCODE -ne 0) { throw "Ground-contact workspace validation failed: $LASTEXITCODE" }

if ($BuildOnly) {
    Write-Output "GROUND_STRIKE_HAND_CONTACT_BUILD_ONLY_OK $target"
    exit 0
}

$arguments = @(
    ('"{0}"' -f $target),
    '--python',
    ('"{0}"' -f $bootstrap),
    '--',
    '--config',
    ('"{0}"' -f $configPath),
    '--register-only'
)
Start-Process -FilePath $blender -ArgumentList $arguments
Write-Output "GROUND_STRIKE_HAND_CONTACT_LAUNCHED $target"
