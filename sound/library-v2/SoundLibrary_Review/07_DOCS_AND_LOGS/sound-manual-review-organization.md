# Sound Library Manual Review & Organization Guide

## Core Rule — Asset ID First

Every generated sound file **must** keep the prompt ID at the start of the filename.  
This applies to raw exports, reviewed files, and final edited versions.

### ✅ Correct
```
GX261_dig_soft_dirt_hit_satisfying_01__take01__UNTESTED.wav
DI007_cavein_large_collapse_01__take02__GOOD.wav
WS041_rain_light_outside_dirt_loop__take01__BAD_LOOP.wav
```

### ❌ Wrong — Do Not Use
```
good_dig.wav
rain_loop.wav
final_sound.wav
suno_export.wav
```

---

## Folder Structure

```
SoundLibrary_Review/
  00_PROMPT_SOURCE/           — Original prompt source files
    WS_weather_surface/
    DI_depth_impact/
    GX_game_expansion/
  00_INBOX_RAW_EXPORTS/       — Raw Suno downloads go here first
    WS_weather_surface/
    DI_depth_impact/
    GX_game_expansion/
    unknown_unsorted/
  01_REVIEW_BY_TAG/           — Reviewed + tagged files
    (26 review tag subfolders)
  02_ACCEPTED_CANDIDATES/     — Files approved as usable
    ambience/  sfx/  ui/  weather/  digging/  robot/  deep_scary/  void_cosmic/
  03_EDITING_QUEUE/           — Files that need editing
    trim/  normalize/  eq/  loop_fix/  noise_reduction/  needs_export/
  04_REJECTED_ARCHIVE/        — Rejected files (tagged reason)
  05_FINAL_LIBRARY/           — Game-ready exported files
    audio/
      ambience/               (loops, environmental beds)
      sfx/                    (one-shots, impact sounds)
      ui/                     (menu, inventory, shop sounds)
  06_ENGINE_IMPORT/           — Engine manifest & import queue
    manifest_drafts/
    ready_to_copy/
    rejected_do_not_import/
  07_DOCS_AND_LOGS/           — Documentation & logs
    review_notes/
    mix_notes/
    implementation_notes/
    sound-review-log.csv
    batch-checklist.md
    sound-manual-review-organization.md (this file)
```

---

## Workflow (10 Steps)

1. **Generate** sound in Suno.
2. **Download** the WAV/MP3.
3. **Rename immediately** using the asset ID format.
4. **Place raw file** into `00_INBOX_RAW_EXPORTS/<BATCH>/`.
5. **Listen and tag** — copy into `01_REVIEW_BY_TAG/<TAG>/`.
6. **Good files** → move to `02_ACCEPTED_CANDIDATES/<CATEGORY>/`.
7. **Files needing edits** → move to `03_EDITING_QUEUE/<EDIT_TYPE>/`.
8. **Edit** — trim, normalize, EQ, fix loops.
9. **Final cleaned files** → export to `05_FINAL_LIBRARY/audio/<CATEGORY>/`.
10. **Add final files** to engine manifest in `06_ENGINE_IMPORT/manifest_drafts/`.

---

## Filename Format

### Raw Suno Export (after download, before review)
```
<ASSET_ID>__takeNN__UNTESTED.wav
```
**Example:**
```
GX261_dig_soft_dirt_hit_satisfying_01__take01__UNTESTED.wav
```

### After Review (replace tag)
```
<ASSET_ID>__takeNN__<REVIEW_TAG>.wav
```
**Examples:**
```
GX261_dig_soft_dirt_hit_satisfying_01__take01__GOOD.wav
GX261_dig_soft_dirt_hit_satisfying_01__take02__TOO_MUSICAL.wav
GX261_dig_soft_dirt_hit_satisfying_01__take03__GOOD_BUT_NEEDS_TRIM.wav
```

### Final Game-Ready Export (after editing)
```
<ASSET_ID>__vNN.<extension>
```
**Examples:**
```
GX261_dig_soft_dirt_hit_satisfying_01__v01.ogg
GX261_dig_soft_dirt_hit_satisfying_01__v02.wav
```

**Rule:** Use `takeNN` for raw/review files. Use `vNN` for final edited versions.

---

## Batch Inbox Routing

Put raw exports into these inbox folders by asset series:

| Asset Range | Inbox Folder |
|---|---|
| WS-001 to WS-100 | `00_INBOX_RAW_EXPORTS\WS_weather_surface\` |
| DI-001 to DI-200 | `00_INBOX_RAW_EXPORTS\DI_depth_impact\` |
| GX-001 to GX-400 | `00_INBOX_RAW_EXPORTS\GX_game_expansion\` |
| Unknown | `00_INBOX_RAW_EXPORTS\unknown_unsorted\` |

---

## Final Folder Routing Map

After review and editing, place final files into these `05_FINAL_LIBRARY/audio/...` paths:

### WS Series — Weather / Surface (WS-001 to WS-100)

| Asset Range | Final Folder |
|---|---|
| WS001-WS010 | audio/ambience/weather_surface/surface_day/ |
| WS011-WS020 | audio/ambience/weather_surface/surface_night/ |
| WS021-WS030 | audio/ambience/town/ |
| WS031-WS040 | audio/ambience/building/ |
| WS041-WS050 | audio/ambience/weather_surface/rain_outside/ |
| WS051-WS060 | audio/ambience/weather_surface/rain_inside/ |
| WS061-WS066 | audio/ambience/weather_surface/wind/ |
| WS067-WS070 | audio/sfx/weather/wind/ |
| WS071-WS080 | audio/sfx/weather/thunder/ |
| WS081-WS090 | audio/sfx/surface_foley/ |
| WS091-WS100 | audio/sfx/town_building/ |

### DI Series — Depth / Impact (DI-001 to DI-200)

| Asset Range | Final Folder |
|---|---|
| DI001-DI010 | audio/sfx/cavein/ |
| DI011-DI014 | audio/sfx/rockfall/ |
| DI015-DI020 | audio/sfx/earthquake/ |
| DI021-DI040 | audio/sfx/digging/ |
| DI041-DI060 | audio/sfx/reward/ or audio/sfx/digging/ore/crystal/ |
| DI061-DI080 | audio/sfx/robot/ |
| DI081-DI100 | audio/sfx/hazards/lava/ |
| DI101-DI120 | audio/sfx/hazards/water/ or audio/sfx/hazards/mud/ |
| DI121-DI140 | audio/sfx/hazards/gas/pressure/electric/acid/ |
| DI141-DI160 | audio/sfx/ancient/ |
| DI161-DI180 | audio/ambience/depth/ |
| DI181-DI200 | audio/sfx/deep_presence/ |

### GX Series — Game Expansion (GX-001 to GX-400)

| Asset Range | Final Folder |
|---|---|
| GX001-GX015 | audio/sfx/boot/ or audio/ambience/menu/ |
| GX016-GX040 | audio/sfx/ui/ |
| GX041-GX075 | audio/sfx/reward/ (discovery, combo) |
| GX076-GX100 | audio/sfx/robot/ |
| GX101-GX120 | audio/sfx/hoverboard/ or audio/sfx/fly/ |
| GX121-GX155 | audio/sfx/digging/ |
| GX156-GX175 | audio/sfx/tiles/ |
| GX176-GX190 | audio/sfx/darkness/ or audio/sfx/deep_presence/ |
| GX191-GX200 | audio/sfx/void/, audio/ambience/void/, audio/sfx/cosmic/ |
| GX201-GX220 | audio/sfx/robot/ |
| GX221-GX240 | audio/sfx/hoverboard/ or audio/sfx/fly/ |
| GX241-GX260 | audio/sfx/tiles/ |
| GX261-GX290 | audio/sfx/digging/ |
| GX291-GX315 | audio/sfx/boot/ or audio/sfx/ui/ or audio/sfx/reward/ |
| GX316-GX335 | audio/sfx/discovery/ |
| GX336-GX355 | audio/sfx/combo/ |
| GX356-GX370 | audio/sfx/deep_presence/ |
| GX371-GX385 | audio/sfx/darkness/ |
| GX386-GX400 | audio/sfx/void/ or audio/ambience/void/ or audio/sfx/cosmic/ |

---

## Review Tags (26 Tags)

| Tag | Meaning |
|---|---|
| UNTESTED | Raw export, not yet listened |
| GOOD | Ready to use as-is |
| GOOD_LAYER_ONLY | Good as a layer, not standalone |
| GOOD_ONE_SHOT | Perfect as a one-shot |
| GOOD_BUT_NEEDS_TRIM | Good but needs silence trimmed |
| GOOD_BUT_TOO_LOUD | Good but needs volume reduction |
| GOOD_BUT_NEEDS_EQ | Good but needs frequency adjustment |
| GOOD_BUT_LOOP_CLICK | Good loop but has a click at seam |
| KEEP_FOR_OTHER_USE | Not for current need but worth keeping |
| KEEP_FOR_DEEP_LAYER | Useful as a deep underground layer |
| KEEP_FOR_BOSS_AREA | Useful for boss encounters |
| KEEP_FOR_VOID_LAYER | Useful for void/cosmic areas |
| TOO_LONG | Too long for intended use |
| TOO_SHORT | Too short to be useful |
| TOO_MUSICAL | Has unwanted musical qualities |
| ROBOT_HUM | Contains unwanted electrical hum |
| TOO_SYNTHETIC | Sounds too artificial |
| TOO_CARTOON | Sounds too cartoony |
| TOO_REALISTIC_LOUD | Too realistic/loud for game |
| TOO_BUSY | Too much happening in the sound |
| WRONG_SOUND | Not the sound described |
| HAS_VOICE | Contains unwanted voice/vocal |
| HAS_ANIMAL | Contains unwanted animal sounds |
| HAS_INSTRUMENTS | Contains unwanted instruments |
| HAS_BACKGROUND_MUSIC | Has background music bed |
| BAD_LOOP | Loop doesn't work |
| BAD_TRANSIENT | Bad attack/impact transient |
| REJECTED | Unusable for any purpose |

---

## CSV Log Format

Column headers for `sound-review-log.csv`:

```
AssetId,Batch,Name,Type,Category,Prompt,GeneratedFile,TakeNumber,ReviewTag,KeepAs,Notes,FinalPath,InGameEvent,Volume,PitchRandom,CooldownMs
```

---

## Manifest Naming Rules

In `06_ENGINE_IMPORT/manifest_drafts/audio-manifest.draft.json`:

Use dot-separated event names that mirror the folder structure:

```json
"dig.dirt.hit": {
  "bus": "sfx",
  "files": ["GX261_dig_soft_dirt_hit_satisfying_01__v01.ogg"],
  "volume": 0.68,
  "pitchRandom": [0.94, 1.06],
  "cooldownMs": 45,
  "maxInstances": 3
}
```

Event name convention: `<category>.<subcategory>.<action>`

---

## Current Batch Status (as of 25 Jun 2026)

### WS Series — 200 raw MP3s in `00_INBOX_RAW_EXPORTS\WS_weather_surface\`
All from Suno exports. Mostly weather, surface, town, and building ambiences with duplicates (`_1`, `_2`, `_3` suffixes). Files need to be listened, tagged, and matched to WS001-WS100 asset IDs.

### DI Series — 200 raw MP3s in `00_INBOX_RAW_EXPORTS\DI_depth_impact\`
126 files have DI-prefixed asset hints in their filenames (Di037-Di160 range). Files need to be renamed to proper `<ASSET_ID>__takeNN__UNTESTED.wav` format. 74 files without clear asset hints need matching by ear.

### GX Series — 0 files in `00_INBOX_RAW_EXPORTS\GX_game_expansion\`
GX201-GX400 prompts defined in `sound-v4-gx201-gx400.csv`. Not yet generated.

---

## Quick Reference — File Extension by Phase

| Phase | Format | Example |
|---|---|---|
| Raw export | .mp3 or .wav | GX261...__take01__UNTESTED.wav |
| Reviewed | .wav | GX261...__take01__GOOD.wav |
| Editing | .wav | GX261...__take01__GOOD_BUT_NEEDS_TRIM.wav |
| Final game-ready | .ogg or .wav | GX261...__v01.ogg |

Use WAV while editing. Export game-ready files as OGG or compressed WAV depending on engine requirements.