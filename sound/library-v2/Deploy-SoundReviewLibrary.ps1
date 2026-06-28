<#
Deploy-SoundReviewLibrary.ps1
Creates a complete manual review and final audio library directory tree inside the folder where this PowerShell file is placed.

Usage:
  Right-click > Run with PowerShell
  or:
  powershell -ExecutionPolicy Bypass -File .\Deploy-SoundReviewLibrary.ps1

Safe by default: it does not delete existing files.
Use -ForceClean only if you intentionally want to remove and recreate the SoundLibrary_Review folder.
#>

param(
    [switch]$ForceClean
)

$ErrorActionPreference = "Stop"

$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$Root = Join-Path $ScriptRoot "SoundLibrary_Review"

if ($ForceClean -and (Test-Path $Root)) {
    Write-Host "ForceClean enabled. Removing existing folder: $Root" -ForegroundColor Yellow
    Remove-Item -LiteralPath $Root -Recurse -Force
}

$reviewTags = @(
    "UNTESTED",
    "GOOD",
    "GOOD_LAYER_ONLY",
    "GOOD_ONE_SHOT",
    "GOOD_BUT_NEEDS_TRIM",
    "GOOD_BUT_TOO_LOUD",
    "GOOD_BUT_NEEDS_EQ",
    "GOOD_BUT_LOOP_CLICK",
    "KEEP_FOR_OTHER_USE",
    "KEEP_FOR_DEEP_LAYER",
    "KEEP_FOR_BOSS_AREA",
    "KEEP_FOR_VOID_LAYER",
    "TOO_LONG",
    "TOO_SHORT",
    "TOO_MUSICAL",
    "ROBOT_HUM",
    "TOO_SYNTHETIC",
    "TOO_CARTOON",
    "TOO_REALISTIC_LOUD",
    "TOO_BUSY",
    "WRONG_SOUND",
    "HAS_VOICE",
    "HAS_ANIMAL",
    "HAS_INSTRUMENTS",
    "HAS_BACKGROUND_MUSIC",
    "BAD_LOOP",
    "BAD_TRANSIENT",
    "REJECTED"
)

$dirs = @(
    "00_PROMPT_SOURCE",
    "00_PROMPT_SOURCE\WS_weather_surface",
    "00_PROMPT_SOURCE\DI_depth_impact",
    "00_PROMPT_SOURCE\GX_game_expansion",

    "00_INBOX_RAW_EXPORTS",
    "00_INBOX_RAW_EXPORTS\WS_weather_surface",
    "00_INBOX_RAW_EXPORTS\DI_depth_impact",
    "00_INBOX_RAW_EXPORTS\GX_game_expansion",
    "00_INBOX_RAW_EXPORTS\unknown_unsorted",

    "01_REVIEW_BY_TAG",

    "02_ACCEPTED_CANDIDATES",
    "02_ACCEPTED_CANDIDATES\ambience",
    "02_ACCEPTED_CANDIDATES\sfx",
    "02_ACCEPTED_CANDIDATES\ui",
    "02_ACCEPTED_CANDIDATES\weather",
    "02_ACCEPTED_CANDIDATES\digging",
    "02_ACCEPTED_CANDIDATES\robot",
    "02_ACCEPTED_CANDIDATES\deep_scary",
    "02_ACCEPTED_CANDIDATES\void_cosmic",

    "03_EDITING_QUEUE",
    "03_EDITING_QUEUE\trim",
    "03_EDITING_QUEUE\normalize",
    "03_EDITING_QUEUE\eq",
    "03_EDITING_QUEUE\loop_fix",
    "03_EDITING_QUEUE\noise_reduction",
    "03_EDITING_QUEUE\needs_export",

    "04_REJECTED_ARCHIVE",
    "04_REJECTED_ARCHIVE\too_musical",
    "04_REJECTED_ARCHIVE\robot_hum",
    "04_REJECTED_ARCHIVE\has_voice",
    "04_REJECTED_ARCHIVE\wrong_sound",
    "04_REJECTED_ARCHIVE\bad_loop",
    "04_REJECTED_ARCHIVE\too_busy",
    "04_REJECTED_ARCHIVE\other",

    "05_FINAL_LIBRARY",
    "05_FINAL_LIBRARY\audio",
    "05_FINAL_LIBRARY\audio\ambience",
    "05_FINAL_LIBRARY\audio\ambience\weather_surface",
    "05_FINAL_LIBRARY\audio\ambience\weather_surface\surface_day",
    "05_FINAL_LIBRARY\audio\ambience\weather_surface\surface_night",
    "05_FINAL_LIBRARY\audio\ambience\weather_surface\rain_outside",
    "05_FINAL_LIBRARY\audio\ambience\weather_surface\rain_inside",
    "05_FINAL_LIBRARY\audio\ambience\weather_surface\wind",
    "05_FINAL_LIBRARY\audio\ambience\town",
    "05_FINAL_LIBRARY\audio\ambience\building",
    "05_FINAL_LIBRARY\audio\ambience\depth",
    "05_FINAL_LIBRARY\audio\ambience\robot",
    "05_FINAL_LIBRARY\audio\ambience\hoverboard",
    "05_FINAL_LIBRARY\audio\ambience\fly",
    "05_FINAL_LIBRARY\audio\ambience\void",
    "05_FINAL_LIBRARY\audio\ambience\menu",

    "05_FINAL_LIBRARY\audio\sfx",
    "05_FINAL_LIBRARY\audio\sfx\boot",
    "05_FINAL_LIBRARY\audio\sfx\ui",
    "05_FINAL_LIBRARY\audio\sfx\ui\inventory",
    "05_FINAL_LIBRARY\audio\sfx\ui\map",
    "05_FINAL_LIBRARY\audio\sfx\ui\shop",
    "05_FINAL_LIBRARY\audio\sfx\ui\settings",
    "05_FINAL_LIBRARY\audio\sfx\ui\pause",
    "05_FINAL_LIBRARY\audio\sfx\reward",
    "05_FINAL_LIBRARY\audio\sfx\reward\level_up",
    "05_FINAL_LIBRARY\audio\sfx\reward\xp",
    "05_FINAL_LIBRARY\audio\sfx\reward\milestone",
    "05_FINAL_LIBRARY\audio\sfx\reward\quest",
    "05_FINAL_LIBRARY\audio\sfx\reward\blueprint",
    "05_FINAL_LIBRARY\audio\sfx\reward\upgrade",
    "05_FINAL_LIBRARY\audio\sfx\reward\badge",
    "05_FINAL_LIBRARY\audio\sfx\discovery",
    "05_FINAL_LIBRARY\audio\sfx\combo",

    "05_FINAL_LIBRARY\audio\sfx\digging",
    "05_FINAL_LIBRARY\audio\sfx\digging\dirt",
    "05_FINAL_LIBRARY\audio\sfx\digging\clay",
    "05_FINAL_LIBRARY\audio\sfx\digging\sand",
    "05_FINAL_LIBRARY\audio\sfx\digging\gravel",
    "05_FINAL_LIBRARY\audio\sfx\digging\stone",
    "05_FINAL_LIBRARY\audio\sfx\digging\ore",
    "05_FINAL_LIBRARY\audio\sfx\digging\crystal",
    "05_FINAL_LIBRARY\audio\sfx\digging\rare",
    "05_FINAL_LIBRARY\audio\sfx\digging\fail",
    "05_FINAL_LIBRARY\audio\sfx\digging\critical",
    "05_FINAL_LIBRARY\audio\sfx\digging\fast",
    "05_FINAL_LIBRARY\audio\sfx\digging\break",

    "05_FINAL_LIBRARY\audio\sfx\robot",
    "05_FINAL_LIBRARY\audio\sfx\robot\steps",
    "05_FINAL_LIBRARY\audio\sfx\robot\movement",
    "05_FINAL_LIBRARY\audio\sfx\robot\system",
    "05_FINAL_LIBRARY\audio\sfx\robot\damage",
    "05_FINAL_LIBRARY\audio\sfx\robot\repair",
    "05_FINAL_LIBRARY\audio\sfx\robot\upgrade",
    "05_FINAL_LIBRARY\audio\sfx\robot\hazard",

    "05_FINAL_LIBRARY\audio\sfx\hoverboard",
    "05_FINAL_LIBRARY\audio\sfx\fly",

    "05_FINAL_LIBRARY\audio\sfx\tiles",
    "05_FINAL_LIBRARY\audio\sfx\tiles\cracked_stone",
    "05_FINAL_LIBRARY\audio\sfx\tiles\loose_sand",
    "05_FINAL_LIBRARY\audio\sfx\tiles\pressure_plate",
    "05_FINAL_LIBRARY\audio\sfx\tiles\ancient",
    "05_FINAL_LIBRARY\audio\sfx\tiles\lava",
    "05_FINAL_LIBRARY\audio\sfx\tiles\ice",
    "05_FINAL_LIBRARY\audio\sfx\tiles\magnet",
    "05_FINAL_LIBRARY\audio\sfx\tiles\bounce",
    "05_FINAL_LIBRARY\audio\sfx\tiles\teleporter",
    "05_FINAL_LIBRARY\audio\sfx\tiles\void",
    "05_FINAL_LIBRARY\audio\sfx\tiles\resource",
    "05_FINAL_LIBRARY\audio\sfx\tiles\locked",

    "05_FINAL_LIBRARY\audio\sfx\weather",
    "05_FINAL_LIBRARY\audio\sfx\weather\wind",
    "05_FINAL_LIBRARY\audio\sfx\weather\thunder",
    "05_FINAL_LIBRARY\audio\sfx\surface_foley",
    "05_FINAL_LIBRARY\audio\sfx\town_building",
    "05_FINAL_LIBRARY\audio\sfx\cavein",
    "05_FINAL_LIBRARY\audio\sfx\rockfall",
    "05_FINAL_LIBRARY\audio\sfx\earthquake",

    "05_FINAL_LIBRARY\audio\sfx\hazards",
    "05_FINAL_LIBRARY\audio\sfx\hazards\lava",
    "05_FINAL_LIBRARY\audio\sfx\hazards\water",
    "05_FINAL_LIBRARY\audio\sfx\hazards\mud",
    "05_FINAL_LIBRARY\audio\sfx\hazards\gas",
    "05_FINAL_LIBRARY\audio\sfx\hazards\pressure",
    "05_FINAL_LIBRARY\audio\sfx\hazards\electric",
    "05_FINAL_LIBRARY\audio\sfx\hazards\acid",

    "05_FINAL_LIBRARY\audio\sfx\ancient",
    "05_FINAL_LIBRARY\audio\sfx\darkness",
    "05_FINAL_LIBRARY\audio\sfx\deep_presence",
    "05_FINAL_LIBRARY\audio\sfx\void",
    "05_FINAL_LIBRARY\audio\sfx\cosmic",

    "06_ENGINE_IMPORT",
    "06_ENGINE_IMPORT\manifest_drafts",
    "06_ENGINE_IMPORT\ready_to_copy",
    "06_ENGINE_IMPORT\rejected_do_not_import",

    "07_DOCS_AND_LOGS",
    "07_DOCS_AND_LOGS\review_notes",
    "07_DOCS_AND_LOGS\mix_notes",
    "07_DOCS_AND_LOGS\implementation_notes"
)

foreach ($dir in $dirs) {
    $path = Join-Path $Root $dir
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}

foreach ($tag in $reviewTags) {
    $path = Join-Path $Root ("01_REVIEW_BY_TAG\" + $tag)
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}

# Add placeholder files so empty folders survive zip/source-control workflows.
Get-ChildItem -LiteralPath $Root -Directory -Recurse | ForEach-Object {
    $keep = Join-Path $_.FullName ".keep"
    if (-not (Test-Path $keep)) { New-Item -ItemType File -Path $keep | Out-Null }
}

$readme = @"
# Sound Library Review Folder

Created by Deploy-SoundReviewLibrary.ps1.

## Basic workflow

1. Generate a Suno sound from sound-v3-expanded.md.
2. Save raw exports into 00_INBOX_RAW_EXPORTS/<batch>.
3. Rename files using:
   ASSETID__take01__UNTESTED.wav
4. Listen and copy/move into 01_REVIEW_BY_TAG/<tag>.
5. Good files go to 02_ACCEPTED_CANDIDATES.
6. Files needing work go to 03_EDITING_QUEUE.
7. Final game-ready assets go to 05_FINAL_LIBRARY/audio/...
8. Update 06_ENGINE_IMPORT/manifest_drafts/audio-manifest.draft.json.

## Review tags

$($reviewTags -join "`n")

## Recommended final formats

Use WAV while editing. Export game-ready files as OGG or compressed WAV depending on the engine.

"@
$readmePath = Join-Path $Root "README.md"
Set-Content -Path $readmePath -Value $readme -Encoding UTF8

$reviewCsv = Join-Path $Root "07_DOCS_AND_LOGS\sound-review-log.csv"
if (-not (Test-Path $reviewCsv)) {
    "AssetId,Batch,Name,Type,Category,Prompt,GeneratedFile,TakeNumber,ReviewTag,KeepAs,Notes,FinalPath,InGameEvent,Volume,PitchRandom,CooldownMs" | Set-Content -Path $reviewCsv -Encoding UTF8
}

$manifest = @'
{
  "buses": {
    "master": { "volume": 1.0 },
    "sfx": { "volume": 1.0 },
    "ui": { "volume": 1.0 },
    "ambience": { "volume": 1.0 },
    "weather": { "volume": 1.0 },
    "voice": { "volume": 1.0 },
    "music": { "volume": 0.0 }
  },
  "events": {
    "dig.dirt.hit": {
      "bus": "sfx",
      "files": [],
      "volume": 0.68,
      "pitchRandom": [0.94, 1.06],
      "cooldownMs": 45,
      "maxInstances": 3
    },
    "ui.click": {
      "bus": "ui",
      "files": [],
      "volume": 0.65,
      "cooldownMs": 35,
      "maxInstances": 2
    },
    "surface.day": {
      "bus": "ambience",
      "files": [],
      "loop": true,
      "volume": 0.16,
      "fadeMs": 1200
    },
    "darkness.accent": {
      "bus": "sfx",
      "files": [],
      "volume": 0.32,
      "pitchRandom": [0.92, 1.03],
      "cooldownMs": 12000,
      "priority": "low"
    }
  }
}
'@
$manifestPath = Join-Path $Root "06_ENGINE_IMPORT\manifest_drafts\audio-manifest.draft.json"
if (-not (Test-Path $manifestPath)) {
    Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8
}

$batchChecklist = @'
# Batch Checklist

## WS-001 to WS-100
- [ ] Surface outside day
- [ ] Surface outside night
- [ ] Town outside
- [ ] Building inside
- [ ] Rain outside
- [ ] Rain inside roof
- [ ] Wind loops and gusts
- [ ] Thunder and lightning one-shots
- [ ] Surface foley one-shots
- [ ] Town/building accents

## DI-001 to DI-200
- [ ] Cave-in / rockfall / earthquake
- [ ] Heavy digging / mining impacts
- [ ] Ore / crystal / treasure
- [ ] Tool / machine / robot impact
- [ ] Lava / heat / fire hazards
- [ ] Water / mud / flood hazards
- [ ] Gas / pressure / electricity hazards
- [ ] Ancient ruins / mechanisms
- [ ] Scary depth loops
- [ ] Scary depth one-shots

## GX-001 to GX-200
- [ ] Boot / startup / menu
- [ ] UI / shop / inventory / settings
- [ ] Level up / rewards / discovery / combo
- [ ] Robot movement / damage / systems
- [ ] Hoverboard / fly / anti-gravity
- [ ] Expanded digging feel
- [ ] Special tile interactions
- [ ] Darkness / watching / deep presence
- [ ] Void / star formation / galaxy
'@
$checklistPath = Join-Path $Root "07_DOCS_AND_LOGS\batch-checklist.md"
Set-Content -Path $checklistPath -Value $batchChecklist -Encoding UTF8

Write-Host "Sound library review structure created:" -ForegroundColor Green
Write-Host $Root
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Put sound-v3-expanded.md in 00_PROMPT_SOURCE."
Write-Host "2. Export raw Suno files into 00_INBOX_RAW_EXPORTS."
Write-Host "3. Sort by review tag in 01_REVIEW_BY_TAG."
Write-Host "4. Promote final files into 05_FINAL_LIBRARY/audio."
