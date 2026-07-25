param(
    [string]$SourcePath = "D:\codex\cc-fork\public\models\chars\players\meshy_warrior_demo.glb",
    [string]$OutputPath = (Join-Path (Split-Path -Parent $PSScriptRoot) "testing\blender-animation-lab-v1\source-assets\meshy-warrior-demo-blender.glb"),
    [string]$NodePath = "C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
    [string]$GltfTransformCli = "D:\codex\cc-fork\node_modules\@gltf-transform\cli\bin\cli.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-GlbInfo {
    param([Parameter(Mandatory)][string]$Path)

    $bytes = [IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 20 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne "glTF") {
        throw "Not a valid binary glTF file: $Path"
    }

    $jsonLength = [BitConverter]::ToUInt32($bytes, 12)
    $jsonText = [Text.Encoding]::UTF8.GetString($bytes, 20, $jsonLength).TrimEnd([char]0, [char]32)
    $document = $jsonText | ConvertFrom-Json
    $extensionsUsed = if ($null -eq $document.extensionsUsed) { @() } else { @($document.extensionsUsed) }
    $extensionsRequired = if ($null -eq $document.extensionsRequired) { @() } else { @($document.extensionsRequired) }

    return [pscustomobject]@{
        path = [IO.Path]::GetFullPath($Path)
        bytes = $bytes.Length
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
        meshes = if ($null -eq $document.meshes) { 0 } else { @($document.meshes).Count }
        skins = if ($null -eq $document.skins) { 0 } else { @($document.skins).Count }
        animations = if ($null -eq $document.animations) { 0 } else { @($document.animations).Count }
        materials = if ($null -eq $document.materials) { 0 } else { @($document.materials).Count }
        images = if ($null -eq $document.images) { 0 } else { @($document.images).Count }
        extensionsUsed = $extensionsUsed
        extensionsRequired = $extensionsRequired
    }
}

foreach ($requiredPath in @($SourcePath, $NodePath, $GltfTransformCli)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required file is missing: $requiredPath"
    }
}

$sourceResolved = [IO.Path]::GetFullPath($SourcePath)
$outputResolved = [IO.Path]::GetFullPath($OutputPath)
if ($sourceResolved -eq $outputResolved) {
    throw "Source and output must be different files."
}

$outputDirectory = Split-Path -Parent $outputResolved
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$temporaryOutput = Join-Path $outputDirectory "meshy-warrior-demo-blender.tmp.glb"

$sourceBefore = Get-GlbInfo -Path $sourceResolved
if ($sourceBefore.extensionsUsed -notcontains "EXT_meshopt_compression") {
    throw "The approved source no longer declares EXT_meshopt_compression; review the preparation contract before continuing."
}

try {
    if (Test-Path -LiteralPath $temporaryOutput) {
        Remove-Item -LiteralPath $temporaryOutput -Force
    }

    & $NodePath $GltfTransformCli copy $sourceResolved $temporaryOutput
    if ($LASTEXITCODE -ne 0) {
        throw "glTF-Transform failed with exit code $LASTEXITCODE."
    }

    $prepared = Get-GlbInfo -Path $temporaryOutput
    if ($prepared.extensionsUsed -contains "EXT_meshopt_compression" -or
        $prepared.extensionsRequired -contains "EXT_meshopt_compression") {
        throw "Prepared GLB still requires EXT_meshopt_compression."
    }
    if ($prepared.meshes -lt 1 -or $prepared.skins -lt 1 -or $prepared.materials -lt 1) {
        throw "Prepared GLB lost required mesh, skin, or material data."
    }

    Move-Item -LiteralPath $temporaryOutput -Destination $outputResolved -Force
} finally {
    if (Test-Path -LiteralPath $temporaryOutput) {
        Remove-Item -LiteralPath $temporaryOutput -Force
    }
}

$sourceAfter = Get-GlbInfo -Path $sourceResolved
if ($sourceAfter.sha256 -ne $sourceBefore.sha256) {
    throw "The external approved source changed during preparation."
}

$outputInfo = Get-GlbInfo -Path $outputResolved
[pscustomobject]@{
    status = "prepared"
    source = $sourceBefore
    output = $outputInfo
    sourceUnchanged = $true
    meshoptRemoved = $true
    tool = "glTF-Transform copy"
} | ConvertTo-Json -Depth 5
