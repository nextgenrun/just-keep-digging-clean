# Sound Library V3 — Digging Game Expanded Source Plan

This is the expanded source of truth for the game sound library. It combines the earlier weather/surface direction, the depth-impact batch, and a new 200-sound expansion focused on UI, level-up, boot, robot, hover/fly, special tiles, better digging feel, darkness, deep presence, void, star formation, and galaxy sounds.

Current prompt coverage:

```text
WS-001 to WS-100: Weather / surface / day-night / town / building / rain / wind / thunder / small foley
DI-001 to DI-200: Depth impact / cave-in / hazards / ancient mechanisms / scary depth
GX-001 to GX-200: Boot / UI / reward / discovery / combo / robot / hoverboard / digging / special tiles / darkness / void / cosmic
TOTAL: 500 planned sound prompts
```

The goal is to build a scalable sound library so the game can grow without constantly needing new asset requests.

---

## 1. Core Audio Direction

The game should feel physical, reactive, and alive. Common actions should feel satisfying and varied. Deep areas should become threatening through believable underground events, not horror music. The surface should feel wider through layered weather, day-night changes, town exterior, and building interior filtering.

Main priorities:

```text
1. Digging must feel good. This is the most important sound family.
2. UI must be clean, fast, and not musical.
3. Rewards and level-ups should feel satisfying without becoming songs.
4. Robot movement should sell the character without needing voice lines.
5. Weather should be layered, not baked into every ambience.
6. Deep scary sounds should be physical: rock, air, pressure, dust, distance.
7. Darkness should use sparse cues, not a constant scary loop.
8. Void and cosmic sounds should be rare, special, and mostly one-shots.
```

Avoid prompts that ask for songs, cinematic music, drones, pads, melody, rhythm, choir, vocals, atmosphere, or emotional scoring. Prefer physical source words: dirt, gravel, stone, crack, dust, pressure, latch, relay, metal, crystal, air, water, heat, fuse, cable, socket, battery, servo.

---

## 2. Suno Sound Settings

For short gameplay sounds:

```text
Type: One Shot
BPM: blank or Auto
Key: blank or Any
```

For stable environment layers:

```text
Type: Loop
BPM: blank or Auto
Key: blank or Any
```

If Suno adds synthetic hums to loops:

```text
1. Regenerate the same prompt as One Shot.
2. Trim the cleanest 2 to 8 seconds manually.
3. Loop it in-game with a tiny crossfade.
4. Mark the original loop as ROBOT_HUM or TOO_SYNTHETIC.
```

---

## 3. Manual Review Tags

Use exact tags during manual review:

```text
UNTESTED
GOOD
GOOD_LAYER_ONLY
GOOD_ONE_SHOT
GOOD_BUT_NEEDS_TRIM
GOOD_BUT_TOO_LOUD
GOOD_BUT_NEEDS_EQ
GOOD_BUT_LOOP_CLICK
KEEP_FOR_OTHER_USE
KEEP_FOR_DEEP_LAYER
KEEP_FOR_BOSS_AREA
KEEP_FOR_VOID_LAYER
TOO_LONG
TOO_SHORT
TOO_MUSICAL
ROBOT_HUM
TOO_SYNTHETIC
TOO_CARTOON
TOO_REALISTIC_LOUD
TOO_BUSY
WRONG_SOUND
HAS_VOICE
HAS_ANIMAL
HAS_INSTRUMENTS
HAS_BACKGROUND_MUSIC
BAD_LOOP
BAD_TRANSIENT
REJECTED
```

Recommended manual filenames:

```text
ASSETID__take01__TAG.wav
ASSETID__take02__TAG.wav
ASSETID__take03__TAG.wav
```

Examples:

```text
GX121_dig_soft_dirt_tap_01__take01__GOOD.wav
DI007_cavein_large_collapse_01__take02__GOOD_BUT_NEEDS_TRIM.wav
WS020_surface_outside_night_wind_only_loop__take03__ROBOT_HUM.wav
```

---

## 4. Scalable Folder Structure

Final accepted files should eventually live under this structure:

```text
audio/
  ambience/
    weather_surface/
    town/
    building/
    depth/
    robot/
    hoverboard/
    fly/
    void/
    menu/
  sfx/
    boot/
    ui/
    reward/
    discovery/
    combo/
    digging/
      dirt/
      clay/
      sand/
      gravel/
      stone/
      ore/
      crystal/
      rare/
      fail/
      critical/
      fast/
      break/
    robot/
      steps/
      movement/
      system/
      damage/
      repair/
      upgrade/
      hazard/
    hoverboard/
    fly/
    tiles/
    weather/
    surface_foley/
    town_building/
    cavein/
    rockfall/
    earthquake/
    hazards/
      lava/
      water/
      mud/
      gas/
      pressure/
      electric/
      acid/
    ancient/
    darkness/
    deep_presence/
    void/
    cosmic/
```

The PowerShell file delivered with this document creates a full review version of this structure automatically.

---

## 5. Audio Runtime Plan

The game should not simply play raw files directly. It should route events through an AudioManager with buses, variant selection, cooldowns, pitch variation, loop fades, and priorities.

Audio buses:

```text
master
sfx
ui
ambience
weather
voice
music optional later
```

Event features:

```text
files: one or more variants
bus: sfx, ui, ambience, weather, voice, music
volume: default event gain
loop: true or false
fadeMs: for loops and transitions
cooldownMs: prevents spam
pitchRandom: small range for common foley
priority: low, normal, high, critical
maxInstances: stops overload
stateRules: outside, inside, town, depth tier, darkness, weather
```

Core methods:

```text
play(eventName)
stop(eventName)
startLoop(eventName)
stopLoop(eventName)
crossfadeLoop(oldEvent, newEvent)
playDigSound(material, intensity)
playPickupSound(resourceType)
setSurfaceContext(location, timeOfDay)
setWeather(type, intensity)
setDepthAmbience(depthTier)
setDarknessLevel(level)
playScaryDepthAccent(depthTier)
setHoverActive(active)
```

---

## 6. Mixing Rules

Recommended starting volumes:

```text
UI: 0.55 to 0.85
Common digging hits: 0.45 to 0.75
Block breaks: 0.65 to 0.95
Pickups: 0.45 to 0.75
Rewards: 0.60 to 0.90
Cave-ins: 0.75 to 1.00
Earthquakes: 0.60 to 0.95
Ambient loops: 0.08 to 0.28
Weather loops: 0.10 to 0.35
Robot idle loops: 0.03 to 0.12
Hover loops: 0.05 to 0.18
Darkness scary accents: 0.12 to 0.45
Void/cosmic accents: 0.20 to 0.65
```

Pitch randomization:

```text
Common digging: 0.94 to 1.06
Footsteps: 0.95 to 1.05
Dirt/stone debris: 0.92 to 1.08
Pickups: 0.97 to 1.03
UI: usually no pitch randomization
Large impacts: 0.98 to 1.02
Scary accents: 0.90 to 1.04, low chance only
```

Cooldown examples:

```text
digging hit: 35 to 70 ms
footstep: 60 to 140 ms
pickup: 50 to 120 ms
UI click: 35 to 80 ms
reward: 300 to 800 ms
cave-in accent: 1200 to 6000 ms
scary depth accent: 8000 to 45000 ms
void accent: 20000 to 90000 ms
```

---

## 7. Layering Logic

### Surface / town / building

Mix base context plus weather:

```text
Outside mine day = surface_outside_day + weather outside layer
Outside mine night = surface_outside_night + weather outside layer
Town day = town_outside_day + weather outside layer
Town night = town_outside_night + weather outside layer
Inside building day = building_inside_day + inside weather layer
Inside building night = building_inside_night + inside weather layer
```

When entering a building:

```text
outside rain fades out over 1.0s
inside roof rain fades in over 1.0s
outside wind fades out over 1.0s
inside muffled wind fades in over 1.0s
```

### Digging

A good dig event should combine or choose variants based on material:

```text
dig.hit.dirt.soft
dig.hit.dirt.packed
dig.hit.gravel
dig.hit.stone
dig.hit.ore
dig.hit.crystal
dig.break.material
dig.fail.too_hard
dig.critical
```

Do not play every layer every time. Pick one hit and optionally a small debris tail.

### Darkness

Darkness should not be a constant loop. Use sparse one-shots:

```text
light fails
torch sputters
pebble behind player
far wall tap
air pressure cue
battery panic tick
```

Suggested schedule when darkness level is high:

```text
Every 12 to 35 seconds, 35% chance to play a darkness accent.
Never play immediately after a cave-in, earthquake, or reward.
Lower volume when player is in town or building.
```

### Someone is watching in the deep

Use physical cues only. No whispers, no creature sounds, no footsteps unless the design later asks for an actual enemy.

```text
far stone shift
side wall scrape
ceiling grit fall
single pebble behind player
pressure thump
hidden mechanism shift
```

### Void / star / galaxy

Void and cosmic sounds should feel rare and special. Use mostly one-shots. Avoid long loop layers unless a late-game void area explicitly needs one.

---

## 8. Generation Priority Waves

### Wave 1 — Core feel

```text
GX121-GX155 expanded digging
GX016-GX040 UI
GX041-GX075 reward/discovery/combo
```

### Wave 2 — World presence

```text
WS001-WS100 weather/surface/town/building
DI161-DI180 depth ambience
```

### Wave 3 — Dangers

```text
DI001-DI020 cave-in/earthquake
DI081-DI140 lava/water/gas/electric hazards
GX176-GX190 darkness/deep presence
```

### Wave 4 — Character movement

```text
GX076-GX100 robot
GX101-GX120 hoverboard/fly
```

### Wave 5 — Late game identity

```text
DI141-DI160 ancient mechanisms
GX191-GX200 void/star/galaxy
```

---

## 9. Review Workflow

1. Pick one batch and generate sounds in Suno one prompt at a time.
2. Save raw outputs into `00_INBOX_RAW_EXPORTS/<batch>`.
3. Rename raw takes with asset ID and take number.
4. Listen and move copies into `01_REVIEW_BY_TAG/<tag>`.
5. Promote good candidates into `02_ACCEPTED_CANDIDATES`.
6. Trim, normalize, EQ, and loop-fix in `03_EDITING_QUEUE`.
7. Export final game-ready files into `05_FINAL_LIBRARY/audio/...`.
8. Add selected files to the audio manifest.
9. Keep rejected files. Some rejected assets may later fit boss areas, void areas, or special events.

---

## 10. Batch Status Overview

```text
WS-001 to WS-100: planned and included here
DI-001 to DI-200: planned and included here
GX-001 to GX-200: planned and included here
```

---

# Batch WS-001 to WS-100 — Weather / Surface / Town / Building

Format:

```text
ASSET_ID | SUNO_TYPE | TARGET_FOLDER | PROMPT
```

## Surface Outside — Day Loops

```text
WS001_surface_outside_day_dry_air_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable field recording, dry outdoor dirt surface during daytime, soft natural air moving across open ground, light dirt texture, clean game sound effect only, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS002_surface_outside_day_soft_breeze_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable outdoor foley, daytime soft breeze over compact dirt and small stones, simple natural ground texture, steady and clean for gameplay, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS003_surface_outside_day_open_ground_loop | Loop | audio/ambience/weather_surface/ | Loopable natural sound effect, empty outdoor mining surface in daylight, open ground with dry dirt and faint wind movement, realistic field recording style, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machines, no fade in, no fade out.
WS004_surface_outside_day_dust_air_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable foley sound, daytime dry dirt field, gentle breeze carrying light dust across bare ground, clean natural surface layer, no music, no instruments, no voices, no animals, no insects, no water, no rain, no thunder, no machinery, no fade in, no fade out.
WS005_surface_outside_day_sparse_gravel_loop | Loop | audio/ambience/weather_surface/ | Loopable outdoor ground foley, daytime dirt and sparse gravel surface, very soft air movement with tiny natural grit texture, quiet but physical, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS006_surface_outside_day_flat_dirt_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable sound effect, flat dry dirt ground outside during the day, faint natural wind passing over the surface, simple realistic foley texture, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS007_surface_outside_day_sandy_surface_loop | Loop | audio/ambience/weather_surface/ | Loopable natural foley recording, daytime sandy dirt surface outdoors, soft breeze lightly brushing dry soil, clean surface weather layer, no music, no instruments, no voices, no animals, no insects, no water, no rain, no thunder, no machinery, no fade in, no fade out.
WS008_surface_outside_day_mine_yard_empty_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable foley, empty mining yard in daytime, dirt ground and small rocks with soft outdoor wind only, clean playable game layer, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS009_surface_outside_day_wide_open_air_loop | Loop | audio/ambience/weather_surface/ | Loopable field recording style sound, wide open dirt surface during daylight, smooth light wind over bare ground, minimal realistic texture, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS010_surface_outside_day_clean_surface_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable game sound effect, clean daytime outdoor surface layer, faint breeze over dry dirt and stones, neutral natural foley, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machines, no fade in, no fade out.
```

## Surface Outside — Night Loops

```text
WS011_surface_outside_night_breeze_dirt_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable field recording, outdoor dirt ground after sunset, soft natural breeze moving across dry soil, clean physical wind texture only, no music, no instruments, no voices, no animals, no insects, no owls, no rain, no thunder, no machinery, no fade in, no fade out.
WS012_surface_outside_night_empty_ground_loop | Loop | audio/ambience/weather_surface/ | Loopable natural foley sound, empty dry ground at night, light wind over dirt surface, simple realistic outdoor texture, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no water, no machinery, no fade in, no fade out.
WS013_surface_outside_night_desert_air_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable sound effect, dry desert-like ground after sunset, gentle wind over dirt and fine gravel, clean natural field recording feel, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS014_surface_outside_night_ground_wind_loop | Loop | audio/ambience/weather_surface/ | Loopable ground-level foley, night wind brushing across compact dirt, dry surface movement only, realistic outdoor sound, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS015_surface_outside_night_plain_air_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable natural sound effect, plain outdoor night air over dirt ground, faint steady breeze, clean physical foley layer, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no water, no machinery, no fade in, no fade out.
WS016_surface_outside_night_dry_grit_loop | Loop | audio/ambience/weather_surface/ | Loopable foley recording, nighttime dry grit surface, soft wind passing over dirt and tiny gravel, low-detail realistic texture, no music, no instruments, no voices, no animals, no insects, no owls, no rain, no thunder, no machinery, no fade in, no fade out.
WS017_surface_outside_night_no_event_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable outdoor foley, dry dirt ground at night, steady light wind only, no sudden events, clean natural game sound effect, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS018_surface_outside_night_soft_surface_loop | Loop | audio/ambience/weather_surface/ | Loopable natural field recording, soft nighttime breeze across open dirt surface, simple dry soil texture, calm physical outdoor sound, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no water, no machinery, no fade in, no fade out.
WS019_surface_outside_night_gravel_air_loop | Loop | audio/ambience/weather_surface/ | Seamless loopable foley, outside at night on gravel and dirt, gentle air movement over the ground, clean non-musical game sound, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS020_surface_outside_night_wind_only_loop | Loop | audio/ambience/weather_surface/ | Loopable natural sound effect, wind only over empty dry ground at night, smooth soft outdoor air movement, clean foley source, no music, no instruments, no voices, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
```

## Town Outside — Day / Night Loops

```text
WS021_town_outside_day_dirt_street_loop | Loop | audio/ambience/town/ | Seamless loopable foley, small mining town dirt street during daytime, soft wind over dusty road and wooden buildings, clean natural exterior layer, no music, no instruments, no voices, no crowd, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS022_town_outside_day_wooden_fronts_loop | Loop | audio/ambience/town/ | Loopable outdoor foley, daytime wooden mining town exterior, light breeze moving around wood storefronts and dirt path, sparse natural wood movement, no music, no instruments, no voices, no crowd, no animals, no insects, no rain, no thunder, no machines, no fade in, no fade out.
WS023_town_outside_day_quiet_yard_loop | Loop | audio/ambience/town/ | Seamless loopable sound effect, quiet town yard in daylight, dirt ground, wood fences, soft outdoor wind, clean environmental foley only, no music, no instruments, no voices, no people, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS024_town_outside_day_shop_exterior_loop | Loop | audio/ambience/town/ | Loopable foley recording, outside a small wooden shop in a mining town during the day, light wind over dirt and wood, simple clean surface texture, no music, no instruments, no voices, no crowd, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS025_town_outside_day_empty_settlement_loop | Loop | audio/ambience/town/ | Seamless loopable natural foley, empty small settlement in daytime, dirt road and wooden buildings with gentle breeze, clean game audio layer, no music, no instruments, no voices, no crowd, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS026_town_outside_night_dirt_street_loop | Loop | audio/ambience/town/ | Seamless loopable foley, small mining town dirt street after sunset, soft wind moving along empty road and wooden walls, clean physical exterior sound, no music, no instruments, no voices, no crowd, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS027_town_outside_night_empty_shopfronts_loop | Loop | audio/ambience/town/ | Loopable outdoor foley, empty wooden shopfronts at night, light wind over dirt path and wood surfaces, simple natural texture, no music, no instruments, no voices, no people, no animals, no insects, no owls, no rain, no thunder, no machinery, no fade in, no fade out.
WS028_town_outside_night_wood_fence_loop | Loop | audio/ambience/town/ | Seamless loopable field recording style, nighttime mining town exterior, soft breeze around wooden fence and dry dirt ground, clean sparse foley, no music, no instruments, no voices, no crowd, no animals, no insects, no birds, no rain, no thunder, no machines, no fade in, no fade out.
WS029_town_outside_night_quiet_street_loop | Loop | audio/ambience/town/ | Loopable natural sound effect, quiet empty town street at night, dry dirt road, faint wind around wooden buildings, clean non-musical game layer, no music, no instruments, no voices, no people, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS030_town_outside_night_open_yard_loop | Loop | audio/ambience/town/ | Seamless loopable foley, open mining town yard at night, soft wind over dry dirt and wood structures, realistic outdoor surface sound, no music, no instruments, no voices, no crowd, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
```

## Building Interior — Day / Night Loops

```text
WS031_building_inside_day_wood_room_loop | Loop | audio/ambience/building/ | Seamless loopable foley, inside small wooden mining building during daytime, quiet dry wooden room, faint muffled outdoor air through walls, clean interior game sound, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS032_building_inside_day_shop_room_loop | Loop | audio/ambience/building/ | Loopable interior foley, empty wooden shop room in daytime, soft wood presence and faint outside air, clean dry indoor sound effect, no music, no instruments, no voices, no people, no footsteps, no animals, no insects, no rain, no thunder, no machines, no fade in, no fade out.
WS033_building_inside_day_storage_room_loop | Loop | audio/ambience/building/ | Seamless loopable sound effect, quiet storage room inside wooden mining building, daytime, dry wood and faint exterior air, stable interior layer, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS034_building_inside_day_office_loop | Loop | audio/ambience/building/ | Loopable natural foley, small empty mining office interior during day, wooden walls, dry room sound, faint outside air leakage, clean game layer, no music, no instruments, no voices, no people, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS035_building_inside_day_muffled_exterior_loop | Loop | audio/ambience/building/ | Seamless loopable interior sound, inside a simple wooden building in daytime, faint muffled outdoor wind through closed walls, dry clean indoor foley, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS036_building_inside_night_wood_room_loop | Loop | audio/ambience/building/ | Seamless loopable foley, inside small wooden mining building at night, quiet dry room, faint outside air through walls, clean interior sound effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS037_building_inside_night_shop_room_loop | Loop | audio/ambience/building/ | Loopable interior foley recording, empty wooden shop room at night, closed room with soft natural wood presence, faint exterior wind leakage, no music, no instruments, no voices, no people, no footsteps, no animals, no insects, no rain, no thunder, no machines, no fade in, no fade out.
WS038_building_inside_night_storage_room_loop | Loop | audio/ambience/building/ | Seamless loopable sound effect, quiet storage room inside wooden building at night, dry interior wood texture and faint outside air, clean game layer, no music, no instruments, no voices, no footsteps, no animals, no insects, no birds, no rain, no thunder, no machinery, no fade in, no fade out.
WS039_building_inside_night_muffled_wind_loop | Loop | audio/ambience/building/ | Loopable indoor foley, inside wooden building at night with closed walls, faint muffled outside wind, dry room sound, clean non-musical game audio, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS040_building_inside_night_empty_room_loop | Loop | audio/ambience/building/ | Seamless loopable interior sound effect, empty small wooden room at night, faint exterior air and dry wooden wall presence, simple clean foley, no music, no instruments, no voices, no people, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
```

## Rain Outside Loops

```text
WS041_rain_light_outside_dirt_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Seamless loopable natural rain sound, light rain falling on dry dirt and small stones outdoors, clean surface weather effect, no music, no instruments, no voices, no animals, no insects, no thunder, no wind gusts, no fade in, no fade out.
WS042_rain_medium_outside_dirt_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Loopable field recording, medium rain falling on dirt ground and scattered gravel outdoors, steady natural rainfall texture, game sound effect only, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS043_rain_heavy_outside_mud_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Seamless loopable sound effect, heavy rain hitting muddy dirt ground outdoors, wet soil impacts and dense rainfall texture, clean weather layer, no music, no instruments, no voices, no animals, no insects, no thunder, no wind gusts, no fade in, no fade out.
WS044_rain_light_outside_stone_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Loopable natural rain foley, light rain tapping on small stones and compact dirt outside, crisp but soft rainfall, clean game weather sound, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS045_rain_heavy_outside_stone_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Seamless loopable field recording, heavy rain striking dirt, gravel, and flat stones outdoors, dense wet surface texture, clean natural sound effect, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS046_rain_drizzle_outside_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Loopable natural sound effect, very light drizzle on outdoor dirt ground, soft scattered raindrops on soil and small rocks, clean weather layer, no music, no instruments, no voices, no animals, no insects, no thunder, no wind, no fade in, no fade out.
WS047_rain_storm_outside_ground_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Seamless loopable rain foley, strong storm rain hitting open dirt ground outdoors, wet mud texture and constant rainfall, no thunder included, no music, no instruments, no voices, no animals, no insects, no machinery, no fade in, no fade out.
WS048_rain_puddles_outside_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Loopable natural rainfall sound, rain falling on dirt ground with small shallow puddles, soft splashes and wet soil texture, clean game weather layer, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS049_rain_town_outside_dirt_wood_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Seamless loopable rain foley, rain falling on dirt street and wooden buildings outside a small mining town, natural wet surface texture, no thunder, no music, no instruments, no voices, no crowd, no animals, no insects, no machinery, no fade in, no fade out.
WS050_rain_town_outside_heavy_loop | Loop | audio/ambience/weather_surface/rain_outside/ | Loopable natural sound effect, heavy rain on a small mining town exterior, rain hitting dirt road, wood walls, and roof edges, clean weather layer, no thunder, no music, no instruments, no voices, no animals, no insects, no machinery, no fade in, no fade out.
```

## Rain Inside Building / Roof Loops

```text
WS051_rain_light_inside_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Seamless loopable indoor rain sound, light rain heard from inside a small wooden building, raindrops tapping on roof above, muffled outside rain, no music, no instruments, no voices, no footsteps, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS052_rain_medium_inside_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Loopable natural indoor foley, medium rain hitting wooden roof while listener is inside, muffled wet exterior and roof taps, clean interior weather sound, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS053_rain_heavy_inside_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Seamless loopable sound effect, heavy rain heard inside wooden mining building, dense rain hitting roof and walls, muffled outdoor rainfall, no music, no instruments, no voices, no people, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS054_rain_inside_shop_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Loopable foley recording, inside empty wooden shop during rain, raindrops on roof, muffled wet outside air, dry room interior, no music, no instruments, no voices, no footsteps, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS055_rain_inside_storage_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Seamless loopable indoor weather sound, rain hitting roof above a small wooden storage room, muffled rain outside, dry enclosed interior, no music, no instruments, no voices, no animals, no insects, no thunder, no machines, no fade in, no fade out.
WS056_rain_inside_metal_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Loopable indoor rain foley, rain tapping on a small metal roof heard from inside a mining shed, crisp roof impacts and muffled exterior rain, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS057_rain_inside_wood_roof_heavy_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Seamless loopable sound effect, heavy rain on wooden roof heard from inside, dense roof tapping with muffled outside rainfall, clean interior weather layer, no music, no instruments, no voices, no people, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS058_rain_inside_roof_edges_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Loopable natural indoor sound, rain heard from inside wooden building with water running off roof edges outside, soft roof taps and muffled exterior, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS059_rain_inside_window_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Seamless loopable foley, rain heard from inside a wooden building near a closed window, soft window rain taps and muffled outdoor rainfall, no music, no instruments, no voices, no footsteps, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
WS060_rain_inside_distant_roof_loop | Loop | audio/ambience/weather_surface/rain_inside/ | Loopable indoor rain sound effect, rain on roof heard softly from inside a small building, distant muffled rainfall and gentle roof taps, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery, no fade in, no fade out.
```

## Wind Loops / Gust One-Shots

```text
WS061_wind_light_outside_loop | Loop | audio/ambience/weather_surface/wind/ | Seamless loopable natural wind sound, light wind over dry dirt and small rocks outdoors, clean weather effect only, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS062_wind_medium_outside_loop | Loop | audio/ambience/weather_surface/wind/ | Loopable outdoor wind foley, medium wind across open dirt ground and gravel, steady natural air movement, clean game weather layer, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machines, no fade in, no fade out.
WS063_wind_strong_outside_loop | Loop | audio/ambience/weather_surface/wind/ | Seamless loopable field recording, strong wind across exposed dirt and small stones outdoors, physical natural air movement, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS064_wind_town_wood_loop | Loop | audio/ambience/weather_surface/wind/ | Loopable wind foley, wind moving through a small wooden mining town exterior, dirt road and wood walls, natural surface weather sound, no music, no instruments, no voices, no people, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS065_wind_inside_muffled_loop | Loop | audio/ambience/weather_surface/wind/ | Seamless loopable indoor wind sound, wind heard from inside a closed wooden building, muffled exterior air pressing around walls, dry interior foley, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS066_wind_inside_heavy_muffled_loop | Loop | audio/ambience/weather_surface/wind/ | Loopable indoor foley, strong wind heard from inside a small wooden building, muffled gust pressure around closed walls and roof, clean weather layer, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery, no fade in, no fade out.
WS067_wind_gust_soft_outside_01 | One Shot | audio/sfx/weather/wind/ | Single natural wind gust over dry dirt ground outdoors, soft short air movement, clean isolated weather sound effect, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery.
WS068_wind_gust_strong_outside_01 | One Shot | audio/sfx/weather/wind/ | Single strong wind gust across exposed dirt and gravel outdoors, short natural air rush, isolated weather sound effect, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery.
WS069_wind_gust_town_wood_01 | One Shot | audio/sfx/weather/wind/ | Single wind gust through a small wooden mining town, short air rush around wood walls and dirt street, isolated natural sound effect, no music, no instruments, no voices, no people, no animals, no insects, no rain, no thunder, no machinery.
WS070_wind_gust_inside_muffled_01 | One Shot | audio/sfx/weather/wind/ | Single muffled wind gust heard from inside a closed wooden building, short pressure sound around walls, isolated indoor weather effect, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery.
```

## Thunder / Lightning One-Shots

```text
WS071_thunder_distant_outside_01 | One Shot | audio/sfx/weather/thunder/ | Single distant natural thunder rumble outdoors, far storm sound with short low tail, isolated weather sound effect, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS072_thunder_medium_outside_01 | One Shot | audio/sfx/weather/thunder/ | Single medium-distance thunder outside, natural crack followed by short rumble, clean isolated weather effect, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS073_thunder_close_outside_01 | One Shot | audio/sfx/weather/thunder/ | Single close thunder crack outdoors with short natural rumble tail, realistic storm sound, isolated effect only, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS074_thunder_rolling_outside_01 | One Shot | audio/sfx/weather/thunder/ | Single rolling thunder rumble outdoors, natural distant storm roll, clean isolated weather sound, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS075_lightning_crack_outside_01 | One Shot | audio/sfx/weather/thunder/ | Single sharp lightning crack outdoors followed by very short thunder snap, realistic natural weather effect, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS076_thunder_distant_inside_01 | One Shot | audio/sfx/weather/thunder/ | Single distant thunder heard from inside a small wooden building, muffled low rumble through walls, isolated weather effect, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS077_thunder_close_inside_01 | One Shot | audio/sfx/weather/thunder/ | Single close thunder heard from inside a wooden building, muffled crack and short low rumble through roof and walls, isolated weather sound, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS078_thunder_roof_shake_inside_01 | One Shot | audio/sfx/weather/thunder/ | Single thunder hit heard inside wooden building, muffled thunder crack with slight roof shake, realistic isolated weather effect, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
WS079_lightning_flash_electric_01 | One Shot | audio/sfx/weather/thunder/ | Single dry electrical lightning snap, short bright static crack for weather flash, isolated sound effect, no music, no instruments, no voices, no rain bed, no wind bed, no machinery loop, no cinematic impact.
WS080_storm_rumble_far_01 | One Shot | audio/sfx/weather/thunder/ | Single far storm rumble outside, low natural thunder rolling in distance, short isolated weather accent, no music, no instruments, no voices, no animals, no insects, no rain bed, no wind bed, no cinematic impact.
```

## Surface Foley One-Shots

```text
WS081_dirt_shift_tiny_01 | One Shot | audio/sfx/surface_foley/ | Single tiny dry dirt shift on empty ground, small loose soil movement, short isolated foley sound effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS082_dirt_slide_small_01 | One Shot | audio/sfx/surface_foley/ | Single small dry dirt slide, loose soil softly moving down a tiny slope, short clean foley sound effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS083_gravel_shift_tiny_01 | One Shot | audio/sfx/surface_foley/ | Single tiny gravel shift on dry ground, a few small stones softly moving, short isolated natural foley effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS084_gravel_scatter_small_01 | One Shot | audio/sfx/surface_foley/ | Single small gravel scatter on dirt ground, several tiny stones rolling briefly, short isolated foley sound effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS085_dust_puff_small_01 | One Shot | audio/sfx/surface_foley/ | Single small dust puff from dry dirt ground, soft air and powdery soil movement, short isolated foley effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS086_mud_squelch_small_01 | One Shot | audio/sfx/surface_foley/ | Single small mud squelch on wet dirt ground, short soft sticky surface sound, isolated foley effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS087_puddle_splash_small_01 | One Shot | audio/sfx/surface_foley/ | Single small puddle splash on dirt ground, short wet surface foley, isolated natural sound effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no machinery.
WS088_water_drip_roof_edge_01 | One Shot | audio/sfx/surface_foley/ | Single water drip falling from wooden roof edge onto dirt, small wet impact, short isolated foley sound effect, no music, no instruments, no voices, no animals, no insects, no machinery.
WS089_roof_water_runoff_01 | One Shot | audio/sfx/surface_foley/ | Short burst of rainwater running off a wooden roof edge onto dirt, isolated wet foley sound effect, no music, no instruments, no voices, no animals, no insects, no thunder, no machinery.
WS090_wet_dirt_drip_01 | One Shot | audio/sfx/surface_foley/ | Single wet dirt drip after rainfall, small water drop hitting muddy soil, short isolated natural foley sound, no music, no instruments, no voices, no animals, no insects, no machinery.
```

## Town / Building Weather Accents

```text
WS091_wood_sign_creak_soft_01 | One Shot | audio/sfx/town_building/ | Single soft wooden sign creak in light wind, small mining town exterior, short isolated foley sound effect, no music, no instruments, no voices, no crowd, no animals, no insects, no rain, no thunder, no machinery.
WS092_wood_sign_creak_strong_01 | One Shot | audio/sfx/town_building/ | Single stronger wooden sign creak during wind, short natural town foley sound, isolated effect only, no music, no instruments, no voices, no people, no animals, no insects, no rain, no thunder, no machinery.
WS093_window_rattle_wind_01 | One Shot | audio/sfx/town_building/ | Single closed wooden window rattle from wind, short dry building foley effect, isolated sound, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery.
WS094_roof_creak_wind_01 | One Shot | audio/sfx/town_building/ | Single wooden roof creak from wind pressure, short building foley accent, isolated sound effect, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery.
WS095_door_rattle_wind_01 | One Shot | audio/sfx/town_building/ | Single closed wooden door rattle from outside wind, short dry foley sound, isolated building weather accent, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery.
WS096_shutter_knock_wind_01 | One Shot | audio/sfx/town_building/ | Single wooden shutter knock from a wind gust, short isolated town building foley, no music, no instruments, no voices, no people, no animals, no insects, no rain, no thunder, no machinery.
WS097_tarp_flap_soft_01 | One Shot | audio/sfx/town_building/ | Single soft canvas tarp flap in wind, small mining town exterior, short isolated foley sound effect, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery.
WS098_tarp_flap_strong_01 | One Shot | audio/sfx/town_building/ | Single stronger canvas tarp flap from wind gust, short outdoor town foley effect, isolated sound, no music, no instruments, no voices, no animals, no insects, no rain, no thunder, no machinery.
WS099_shop_bell_door_soft_01 | One Shot | audio/sfx/town_building/ | Single small shop door bell jingle, soft and short, wooden mining town shop entrance, isolated UI-like foley effect, no music, no instruments backing, no voices, no crowd, no animals, no insects, no machinery.
WS100_building_enter_muffle_01 | One Shot | audio/sfx/town_building/ | Single short transition sound entering a wooden building from outside, exterior wind becomes muffled behind closed door, clean foley transition, no music, no instruments, no voices, no footsteps, no animals, no insects, no rain, no thunder, no machinery.
```

---

# Batch DI-001 to DI-200

Format:

```text
ASSET_ID | SUNO_TYPE | TARGET_FOLDER | PROMPT
```

---

## Earthquake / Cave-In / Rockfall

```text
DI001_cavein_pebble_warning_01 | One Shot | audio/sfx/cavein/ | Single small cave-in warning, tiny pebbles falling from a stone ceiling onto dirt, short isolated underground game sound, no music, no instruments, no voices.
DI002_cavein_dust_fall_01 | One Shot | audio/sfx/cavein/ | Single dry dust fall from underground ceiling, soft dirt particles landing on stone floor, short isolated cave sound effect, no music, no instruments, no voices.
DI003_cavein_crack_start_01 | One Shot | audio/sfx/cavein/ | Single cave ceiling crack starting, dry stone fracture and small dirt fall, short isolated danger sound, no music, no instruments, no voices.
DI004_cavein_ceiling_split_01 | One Shot | audio/sfx/cavein/ | Single underground ceiling split, sharp rock crack followed by small debris fall, isolated game sound effect, no music, no instruments, no voices.
DI005_cavein_small_collapse_01 | One Shot | audio/sfx/cavein/ | Small cave-in collapse, several rocks and dirt chunks falling onto underground floor, short natural impact sound, no music, no instruments, no voices.
DI006_cavein_medium_collapse_01 | One Shot | audio/sfx/cavein/ | Medium underground cave-in, stone chunks breaking loose and crashing onto dirt floor, high impact game sound effect, no music, no instruments, no voices.
DI007_cavein_large_collapse_01 | One Shot | audio/sfx/cavein/ | Large cave-in collapse, heavy rocks crashing down with dirt and gravel falling, powerful underground game sound, no music, no instruments, no voices.
DI008_cavein_tunnel_blocked_01 | One Shot | audio/sfx/cavein/ | Tunnel entrance blocked by falling rocks, heavy stone chunks slam into dirt and settle, short isolated collapse sound, no music, no instruments, no voices.
DI009_cavein_distant_collapse_01 | One Shot | audio/sfx/cavein/ | Distant underground collapse, far rock crash and muffled dirt rumble through tunnels, isolated depth danger sound, no music, no instruments, no voices.
DI010_cavein_wall_slide_01 | One Shot | audio/sfx/cavein/ | Underground wall sliding and breaking apart, stone grinding then dirt chunks falling, high impact cave sound effect, no music, no instruments, no voices.
DI011_rockfall_single_heavy_01 | One Shot | audio/sfx/rockfall/ | Single heavy rock falling from above and hitting stone floor, deep impact with small debris, isolated game sound, no music, no instruments, no voices.
DI012_rockfall_many_small_01 | One Shot | audio/sfx/rockfall/ | Many small rocks falling and bouncing across underground stone floor, short natural debris sound, no music, no instruments, no voices.
DI013_rockfall_boulder_roll_01 | One Shot | audio/sfx/rockfall/ | Large boulder rolls a short distance underground then hits stone wall, heavy natural rock impact, no music, no instruments, no voices.
DI014_rockfall_boulder_drop_01 | One Shot | audio/sfx/rockfall/ | Huge boulder drops onto dirt floor inside cave, massive dry impact with gravel scatter, isolated game sound, no music, no instruments, no voices.
DI015_earthquake_tiny_tremor_01 | One Shot | audio/sfx/earthquake/ | Tiny underground tremor, dirt and small stones shaking briefly, short physical cave sound effect, no music, no instruments, no voices.
DI016_earthquake_small_tremor_01 | One Shot | audio/sfx/earthquake/ | Small underground earthquake, stone tunnel shaking and loose dirt falling, short high pressure tremor sound, no music, no instruments, no voices.
DI017_earthquake_medium_01 | One Shot | audio/sfx/earthquake/ | Medium underground earthquake, tunnel walls rumble and rocks shift under pressure, strong game hazard sound, no music, no instruments, no voices.
DI018_earthquake_large_01 | One Shot | audio/sfx/earthquake/ | Large underground earthquake, heavy stone pressure, rocks crashing, dirt falling, powerful natural cave hazard sound, no music, no instruments, no voices.
DI019_earthquake_deep_far_01 | One Shot | audio/sfx/earthquake/ | Deep distant earthquake far below the player, muffled rock pressure and heavy tunnel vibration, isolated underground sound, no music, no instruments, no voices.
DI020_earthquake_aftershock_01 | One Shot | audio/sfx/earthquake/ | Short earthquake aftershock underground, quick stone shake and small debris fall, isolated hazard sound effect, no music, no instruments, no voices.
```

---

## Heavy Digging / Mining Impacts

```text
DI021_pickaxe_dirt_heavy_01 | One Shot | audio/sfx/digging/ | Heavy pickaxe strike into packed dirt, dry thud with gritty soil burst, short isolated mining game sound, no music, no instruments, no voices.
DI022_pickaxe_dirt_heavy_02 | One Shot | audio/sfx/digging/ | Strong pickaxe impact on hard dirt block, compact soil cracks and crumbles, isolated digging sound effect, no music, no instruments, no voices.
DI023_pickaxe_stone_heavy_01 | One Shot | audio/sfx/digging/ | Heavy pickaxe strike on hard stone, sharp metal impact and rock chips, short isolated mining sound, no music, no instruments, no voices.
DI024_pickaxe_stone_heavy_02 | One Shot | audio/sfx/digging/ | Powerful pickaxe hit into dense stone wall, dry rock crack and metal ring, isolated game sound effect, no music, no instruments, no voices.
DI025_pickaxe_ore_heavy_01 | One Shot | audio/sfx/digging/ | Heavy pickaxe hit on metal ore inside rock, dull metallic clank with stone chips, isolated mining sound, no music, no instruments, no voices.
DI026_pickaxe_ore_heavy_02 | One Shot | audio/sfx/digging/ | Strong mining strike on ore vein, metal clank and mineral crack, short isolated game sound, no music, no instruments, no voices.
DI027_pickaxe_crystal_heavy_01 | One Shot | audio/sfx/digging/ | Heavy pickaxe hit on large crystal deposit, glassy mineral crack and shard ticks, isolated game sound, no music, no instruments, no voices.
DI028_pickaxe_crystal_heavy_02 | One Shot | audio/sfx/digging/ | Strong crystal mining strike, bright brittle crack with small glassy fragments, short isolated sound, no music, no instruments, no voices.
DI029_block_dirt_break_big_01 | One Shot | audio/sfx/blocks/ | Large packed dirt block breaks apart, dry soil chunks collapse and settle, high impact digging sound, no music, no instruments, no voices.
DI030_block_stone_break_big_01 | One Shot | audio/sfx/blocks/ | Large stone block breaks apart into chunks, heavy rock crumble and hard impacts, isolated mining sound, no music, no instruments, no voices.
DI031_block_ore_break_big_01 | One Shot | audio/sfx/blocks/ | Large ore block breaks free from rock, heavy clank, stone crumble, mineral debris, isolated game sound, no music, no instruments, no voices.
DI032_block_crystal_shatter_big_01 | One Shot | audio/sfx/blocks/ | Large crystal block shatters, brittle mineral crack and falling shards, high impact isolated game sound, no music, no instruments, no voices.
DI033_block_obsidian_hit_01 | One Shot | audio/sfx/blocks/ | Heavy strike on black volcanic stone, extremely hard dull impact and tiny sharp chips, isolated mining sound, no music, no instruments, no voices.
DI034_block_obsidian_break_01 | One Shot | audio/sfx/blocks/ | Black volcanic stone breaks apart, dense glassy rock fracture and heavy chunks falling, isolated game sound, no music, no instruments, no voices.
DI035_block_slate_crack_01 | One Shot | audio/sfx/blocks/ | Flat slate rock cracks under heavy pickaxe hit, layered stone fracture, short isolated mining sound, no music, no instruments, no voices.
DI036_block_granite_hit_01 | One Shot | audio/sfx/blocks/ | Heavy pickaxe strike on granite, solid hard stone impact with dry chip scatter, isolated sound effect, no music, no instruments, no voices.
DI037_block_granite_break_01 | One Shot | audio/sfx/blocks/ | Granite block breaks into heavy pieces, hard stone crack and chunk fall, high impact mining sound, no music, no instruments, no voices.
DI038_block_basalt_hit_01 | One Shot | audio/sfx/blocks/ | Pickaxe slams into basalt rock, dense low stone hit with small fragments, isolated game sound, no music, no instruments, no voices.
DI039_block_basalt_break_01 | One Shot | audio/sfx/blocks/ | Basalt rock block breaks apart, dark heavy stone crumble and hard debris impacts, isolated sound, no music, no instruments, no voices.
DI040_mining_combo_hit_01 | One Shot | audio/sfx/digging/ | Rapid three-hit mining combo on hard rock, pickaxe impacts, chips, final crack, short isolated game effect, no music, no instruments, no voices.
```

---

## Ore / Crystal / Treasure High Impact

```text
DI041_ore_vein_exposed_01 | One Shot | audio/sfx/pickups/ | Ore vein exposed inside broken rock, stone cracks open with dull metallic reveal, short isolated game sound, no music, no instruments, no voices.
DI042_ore_chunk_drop_01 | One Shot | audio/sfx/pickups/ | Heavy ore chunk drops onto stone floor, metallic mineral thud and small rock scatter, isolated sound effect, no music, no instruments, no voices.
DI043_ore_cache_break_01 | One Shot | audio/sfx/pickups/ | Hidden ore cache breaks open, metal chunks and stone debris spilling out, high impact reward sound, no music, no instruments, no voices.
DI044_gold_vein_crack_01 | One Shot | audio/sfx/pickups/ | Gold vein cracks inside rock, dense stone fracture with soft metallic glint texture, isolated game sound, no music, no instruments, no voices.
DI045_gold_chunk_fall_01 | One Shot | audio/sfx/pickups/ | Heavy gold nugget falls onto rock floor, rich metal thud and small clinks, short isolated reward sound, no music, no instruments, no voices.
DI046_gold_cache_spill_01 | One Shot | audio/sfx/pickups/ | Small cache of gold nuggets spills onto stone, satisfying heavy clinks and dirt crumble, isolated game sound, no music, no instruments, no voices.
DI047_gem_large_found_01 | One Shot | audio/sfx/pickups/ | Large gemstone breaks free from rock, glassy crystal crack and clean mineral drop, isolated reward sound, no music, no instruments, no voices.
DI048_gem_cache_spill_01 | One Shot | audio/sfx/pickups/ | Several gemstones spill from cracked stone pocket, glassy mineral clinks and tiny shard ticks, no music, no instruments, no voices.
DI049_crystal_cluster_break_01 | One Shot | audio/sfx/pickups/ | Crystal cluster breaks apart, sharp brittle crack with many mineral shards falling, high impact isolated sound, no music, no instruments, no voices.
DI050_crystal_cluster_fall_01 | One Shot | audio/sfx/pickups/ | Large crystal cluster falls onto underground stone floor, glassy heavy impact and shard scatter, no music, no instruments, no voices.
DI051_rare_mineral_pulse_01 | One Shot | audio/sfx/pickups/ | Rare mineral exposed, short physical crystal vibration and rock dust fall, clean game reward sound, no music, no instruments, no voices.
DI052_rare_mineral_crack_01 | One Shot | audio/sfx/pickups/ | Rare mineral node cracks open, dense stone split and bright glassy fragments, isolated sound effect, no music, no instruments, no voices.
DI053_treasure_chest_drop_01 | One Shot | audio/sfx/pickups/ | Heavy treasure chest drops onto dirt floor, wooden thud, metal latch clink, short isolated game sound, no music, no instruments, no voices.
DI054_treasure_chest_open_01 | One Shot | audio/sfx/pickups/ | Old treasure chest opens, wood creak and metal latch snap, short isolated reward foley, no music, no instruments, no voices.
DI055_treasure_cache_break_01 | One Shot | audio/sfx/pickups/ | Buried treasure cache breaks open from dirt and stone, wood splinter, coin clinks, soil crumble, no music, no instruments, no voices.
DI056_artifact_found_heavy_01 | One Shot | audio/sfx/pickups/ | Heavy ancient artifact pulled from dirt, stone scrape and metal thud, isolated reward sound, no music, no instruments, no voices.
DI057_artifact_stone_tablet_01 | One Shot | audio/sfx/pickups/ | Ancient stone tablet breaks free from wall, heavy slab shift and dust fall, short isolated game sound, no music, no instruments, no voices.
DI058_mineral_slot_insert_01 | One Shot | audio/sfx/pickups/ | Heavy mineral inserted into stone socket, dense click and grinding lock, isolated puzzle reward sound, no music, no instruments, no voices.
DI059_resource_big_pickup_01 | One Shot | audio/sfx/pickups/ | Large valuable resource pickup, heavy mineral clack and clean inventory snap, isolated game sound, no music, no instruments, no voices.
DI060_resource_jackpot_spill_01 | One Shot | audio/sfx/pickups/ | Jackpot resource spill, many stones, metal chunks, and gems tumble briefly onto dirt, no music, no instruments, no voices.
```

---

## Tool / Machine / Robot Impact

```text
DI061_drill_start_heavy_01 | One Shot | audio/sfx/tools/ | Heavy mining drill starts up, motor cough, metal vibration, short power-on burst, isolated tool sound, no music, no instruments, no voices.
DI062_drill_stop_heavy_01 | One Shot | audio/sfx/tools/ | Heavy mining drill powers down, motor spin drops and metal body settles, isolated tool sound, no music, no instruments, no voices.
DI063_drill_bite_stone_01 | One Shot | audio/sfx/tools/ | Drill bit bites into hard stone, rough grinding burst and rock chips, short isolated mining sound, no music, no instruments, no voices.
DI064_drill_bite_ore_01 | One Shot | audio/sfx/tools/ | Drill bit hits metal ore in rock, harsh short metallic grind and mineral crack, isolated game sound, no music, no instruments, no voices.
DI065_drill_jam_01 | One Shot | audio/sfx/tools/ | Mining drill jams suddenly, metal grind, hard stop, small rock crunch, isolated malfunction sound, no music, no instruments, no voices.
DI066_drill_overheat_01 | One Shot | audio/sfx/tools/ | Mining drill overheats, short motor strain, metal rattle, steam-like hiss, isolated tool sound, no music, no instruments, no voices.
DI067_hydraulic_punch_rock_01 | One Shot | audio/sfx/tools/ | Hydraulic mining punch slams into rock, heavy mechanical hit and stone crack, high impact game sound, no music, no instruments, no voices.
DI068_hydraulic_punch_miss_01 | One Shot | audio/sfx/tools/ | Hydraulic mining punch hits empty stone floor, heavy metal piston thud and echo-free impact, no music, no instruments, no voices.
DI069_mining_laser_short_01 | One Shot | audio/sfx/tools/ | Short mining laser burst cutting stone, dry electrical zap and rock surface crackle, isolated game sound, no music, no instruments, no voices.
DI070_mining_laser_overload_01 | One Shot | audio/sfx/tools/ | Mining laser overloads, short electric surge, sharp pop, small metal casing rattle, isolated sound, no music, no instruments, no voices.
DI071_robot_heavy_land_dirt_01 | One Shot | audio/sfx/robot/ | Heavy robot lands on dirt, metal body thud, soil compression, small gravel scatter, isolated game sound, no music, no instruments, no voices.
DI072_robot_heavy_land_stone_01 | One Shot | audio/sfx/robot/ | Heavy robot lands on stone floor, metal feet slam and hard rock impact, isolated game sound, no music, no instruments, no voices.
DI073_robot_damage_heavy_01 | One Shot | audio/sfx/robot/ | Robot takes heavy damage, metal body dent, broken parts rattle, short electric spark, no music, no instruments, no voices.
DI074_robot_crushed_01 | One Shot | audio/sfx/robot/ | Robot crushed by falling rock, heavy stone impact, metal crunch, small debris scatter, isolated damage sound, no music, no instruments, no voices.
DI075_robot_reboot_hard_01 | One Shot | audio/sfx/robot/ | Robot hard reboot, mechanical click sequence, short electrical restart, metal casing vibrates, no music, no instruments, no voices.
DI076_robot_upgrade_heavy_01 | One Shot | audio/sfx/robot/ | Heavy robot upgrade installed, thick mechanical lock, bolts snap into place, short power confirmation, no music, no instruments, no voices.
DI077_elevator_start_01 | One Shot | audio/sfx/tools/ | Mining elevator starts moving, metal brake release and heavy cable tension, short isolated machine sound, no music, no instruments, no voices.
DI078_elevator_stop_01 | One Shot | audio/sfx/tools/ | Mining elevator stops hard, metal brake clamp and platform thud, isolated machine sound effect, no music, no instruments, no voices.
DI079_mine_cart_crash_01 | One Shot | audio/sfx/tools/ | Empty mine cart crashes into rock barrier, heavy metal clang and loose stones scatter, no music, no instruments, no voices.
DI080_mine_cart_rollby_01 | One Shot | audio/sfx/tools/ | Mine cart rolls past on metal track underground, short heavy wheel rumble and track clack, no music, no instruments, no voices.
```

---

## Lava / Heat / Fire Hazards

```text
DI081_lava_bubble_pop_01 | One Shot | audio/sfx/hazards/lava/ | Single lava bubble pops, thick molten rock burst with hot wet slap, isolated underground hazard sound, no music, no instruments, no voices.
DI082_lava_burst_small_01 | One Shot | audio/sfx/hazards/lava/ | Small lava burst from cracked rock, hot liquid splash and brief hiss, isolated game hazard sound, no music, no instruments, no voices.
DI083_lava_burst_large_01 | One Shot | audio/sfx/hazards/lava/ | Large lava burst from underground fissure, heavy molten splash and steam hiss, high impact hazard sound, no music, no instruments, no voices.
DI084_lava_rock_drop_01 | One Shot | audio/sfx/hazards/lava/ | Rock falls into lava, heavy splash of molten liquid and short steam burst, isolated hazard sound, no music, no instruments, no voices.
DI085_lava_floor_crack_01 | One Shot | audio/sfx/hazards/lava/ | Hot stone floor cracks open with lava underneath, dry rock split and heat hiss, isolated danger sound, no music, no instruments, no voices.
DI086_lava_pressure_release_01 | One Shot | audio/sfx/hazards/lava/ | Underground heat pressure releases through cracked rock, short violent steam and stone hiss, no music, no instruments, no voices.
DI087_geyser_steam_burst_01 | One Shot | audio/sfx/hazards/lava/ | Hot steam geyser bursts from underground vent, sharp pressure hiss and wet rock spray, isolated sound, no music, no instruments, no voices.
DI088_geyser_steam_short_01 | One Shot | audio/sfx/hazards/lava/ | Short steam vent burst from cave wall, hot air hiss and tiny rock grit, isolated hazard sound, no music, no instruments, no voices.
DI089_fire_torch_whoosh_big_01 | One Shot | audio/sfx/hazards/lava/ | Large torch flame ignites suddenly, flint click and strong fire whoosh, isolated game sound, no music, no instruments, no voices.
DI090_fire_torch_extinguish_big_01 | One Shot | audio/sfx/hazards/lava/ | Large torch flame extinguished, heavy puff, smoke hiss, tiny ember crackle, isolated sound, no music, no instruments, no voices.
DI091_fire_ember_scatter_01 | One Shot | audio/sfx/hazards/lava/ | Burning embers scatter on stone floor, tiny hot crackles and ash movement, short isolated sound, no music, no instruments, no voices.
DI092_fire_wood_snap_01 | One Shot | audio/sfx/hazards/lava/ | Single burning wood snap, sharp ember crack and small fire spit, isolated fire foley, no music, no instruments, no voices.
DI093_heat_shield_break_01 | One Shot | audio/sfx/hazards/lava/ | Heat shield breaks under pressure, glassy crack, metal strain, short steam puff, isolated game sound, no music, no instruments, no voices.
DI094_hot_rock_crumble_01 | One Shot | audio/sfx/hazards/lava/ | Hot rock crumbles apart, dry stone pieces with heat hiss and ash fall, isolated hazard sound, no music, no instruments, no voices.
DI095_magma_vein_expose_01 | One Shot | audio/sfx/hazards/lava/ | Magma vein exposed in rock wall, stone crack and thick hot liquid movement, isolated danger sound, no music, no instruments, no voices.
DI096_magma_vein_seal_01 | One Shot | audio/sfx/hazards/lava/ | Magma vein seals with cooling stone, sizzling crackle and hard crust forming, short isolated sound, no music, no instruments, no voices.
DI097_lava_drip_01 | One Shot | audio/sfx/hazards/lava/ | Single thick lava drip falls onto stone, hot sticky impact and small hiss, isolated hazard foley, no music, no instruments, no voices.
DI098_lava_splash_small_01 | One Shot | audio/sfx/hazards/lava/ | Small molten lava splash against rock, thick wet heat impact and short hiss, no music, no instruments, no voices.
DI099_lava_splash_large_01 | One Shot | audio/sfx/hazards/lava/ | Large molten lava splash in underground chamber, heavy hot liquid movement and steam burst, no music, no instruments, no voices.
DI100_heat_warning_physical_01 | One Shot | audio/sfx/hazards/lava/ | Physical heat warning sound, stone expanding, small cracks, hot air hiss, short isolated danger cue, no music, no instruments, no voices.
```

---

## Water / Mud / Flood Hazards

```text
DI101_water_drip_large_01 | One Shot | audio/sfx/hazards/water/ | Single large cave water drip hitting stone floor, wet echo-free impact, isolated underground sound, no music, no instruments, no voices.
DI102_water_drip_chain_01 | One Shot | audio/sfx/hazards/water/ | Short chain of cave water drips hitting wet stone, irregular natural impacts, isolated sound effect, no music, no instruments, no voices.
DI103_water_pocket_break_01 | One Shot | audio/sfx/hazards/water/ | Underground water pocket breaks open, stone crack and sudden water spill, isolated hazard sound, no music, no instruments, no voices.
DI104_water_rush_small_01 | One Shot | audio/sfx/hazards/water/ | Small water rush through cracked tunnel wall, short wet surge and stone splash, isolated game sound, no music, no instruments, no voices.
DI105_water_rush_large_01 | One Shot | audio/sfx/hazards/water/ | Large underground water rush bursts through rock wall, heavy wet impact and fast flow, high impact sound, no music, no instruments, no voices.
DI106_flood_warning_crack_01 | One Shot | audio/sfx/hazards/water/ | Flood warning crack in wet cave wall, water pressure creak, stone split, tiny leak spray, isolated hazard sound, no music, no instruments, no voices.
DI107_flood_gate_break_01 | One Shot | audio/sfx/hazards/water/ | Old underground barrier breaks and releases water, wood crack, stone hit, strong water surge, no music, no instruments, no voices.
DI108_waterfall_distant_underground_01 | One Shot | audio/sfx/hazards/water/ | Distant underground waterfall heard through tunnel, short natural water roar accent, isolated sound, no music, no instruments, no voices.
DI109_mud_collapse_small_01 | One Shot | audio/sfx/hazards/water/ | Small mud wall collapses, wet dirt slumps onto cave floor, short sticky impact sound, no music, no instruments, no voices.
DI110_mud_collapse_large_01 | One Shot | audio/sfx/hazards/water/ | Large wet mud wall collapses underground, heavy sticky dirt slide and water splash, high impact hazard sound, no music, no instruments, no voices.
DI111_mud_pull_step_01 | One Shot | audio/sfx/hazards/water/ | Heavy boot or robot foot pulled from sticky mud, wet suction pop, isolated movement sound, no music, no instruments, no voices.
DI112_mud_slam_heavy_01 | One Shot | audio/sfx/hazards/water/ | Heavy object slams into wet mud, thick splat and dirt splash, isolated game impact, no music, no instruments, no voices.
DI113_mud_slide_fast_01 | One Shot | audio/sfx/hazards/water/ | Fast mud slide down underground slope, wet soil rushing and stones tumbling, no music, no instruments, no voices.
DI114_mud_slide_slow_01 | One Shot | audio/sfx/hazards/water/ | Slow heavy mud slide, wet dirt mass moving across stone floor, isolated hazard sound, no music, no instruments, no voices.
DI115_puddle_heavy_splash_01 | One Shot | audio/sfx/hazards/water/ | Heavy splash into underground puddle, water slap and muddy floor impact, isolated sound effect, no music, no instruments, no voices.
DI116_wet_stone_slip_01 | One Shot | audio/sfx/hazards/water/ | Wet stone slip sound, metal foot skids briefly on slick rock, short isolated hazard sound, no music, no instruments, no voices.
DI117_pipe_leak_burst_01 | One Shot | audio/sfx/hazards/water/ | Old mine pipe bursts with water pressure, metal pop and short water spray, isolated game sound, no music, no instruments, no voices.
DI118_pipe_drip_metal_01 | One Shot | audio/sfx/hazards/water/ | Single water drip hits rusty metal pipe, wet metallic tick, isolated underground foley, no music, no instruments, no voices.
DI119_underwater_pickup_01 | One Shot | audio/sfx/hazards/water/ | Mineral picked up underwater, muffled clack and small bubbles, short isolated game sound, no music, no instruments, no voices.
DI120_water_block_break_01 | One Shot | audio/sfx/hazards/water/ | Wet dirt block breaks and releases trapped water, mud crumble and small water spill, no music, no instruments, no voices.
```

---

## Gas / Pressure / Electricity Hazards

```text
DI121_gas_leak_short_01 | One Shot | audio/sfx/hazards/gas/ | Short gas leak from cracked rock wall, sharp natural hiss and tiny grit movement, isolated hazard sound, no music, no instruments, no voices.
DI122_gas_leak_heavy_01 | One Shot | audio/sfx/hazards/gas/ | Heavy toxic gas leak from underground fissure, strong pressure hiss and rock dust, isolated game sound, no music, no instruments, no voices.
DI123_gas_pocket_pop_01 | One Shot | audio/sfx/hazards/gas/ | Underground gas pocket pops open, dry crack and sudden hiss burst, short isolated danger sound, no music, no instruments, no voices.
DI124_gas_ignition_small_01 | One Shot | audio/sfx/hazards/gas/ | Small gas ignition in cave, quick fire puff and pressure snap, isolated hazard sound, no music, no instruments, no voices.
DI125_gas_ignition_large_01 | One Shot | audio/sfx/hazards/gas/ | Large gas ignition underground, powerful pressure burst, rock dust and hot air snap, no music, no instruments, no voices.
DI126_pressure_pipe_strain_01 | One Shot | audio/sfx/hazards/gas/ | Pressurized pipe strains inside mine, metal groan and small bolt rattle, isolated danger sound, no music, no instruments, no voices.
DI127_pressure_pipe_burst_01 | One Shot | audio/sfx/hazards/gas/ | Pressurized pipe bursts underground, metal crack and violent air release, high impact game sound, no music, no instruments, no voices.
DI128_pressure_rock_pop_01 | One Shot | audio/sfx/hazards/gas/ | Deep rock pressure pop, stone snaps from stress and small fragments fall, isolated depth hazard sound, no music, no instruments, no voices.
DI129_pressure_wall_groan_01 | One Shot | audio/sfx/hazards/gas/ | Underground wall groans from pressure, stone grinding and dust fall, short scary physical sound, no music, no instruments, no voices.
DI130_pressure_floor_buckle_01 | One Shot | audio/sfx/hazards/gas/ | Stone floor buckles under pressure, deep crack and gravel shift, high impact cave sound, no music, no instruments, no voices.
DI131_electric_spark_small_01 | One Shot | audio/sfx/hazards/electric/ | Small electrical spark from mining equipment, dry snap and tiny metal tick, isolated game sound, no music, no instruments, no voices.
DI132_electric_spark_large_01 | One Shot | audio/sfx/hazards/electric/ | Large electrical spark burst, sharp crackle and metal casing pop, isolated hazard sound, no music, no instruments, no voices.
DI133_electric_panel_short_01 | One Shot | audio/sfx/hazards/electric/ | Mining control panel shorts out, electric crackle, plastic pop, metal buzz snap, isolated sound, no music, no instruments, no voices.
DI134_electric_cable_snap_01 | One Shot | audio/sfx/hazards/electric/ | Power cable snaps under tension, electric arc and cable whip, short isolated hazard sound, no music, no instruments, no voices.
DI135_electric_door_lock_01 | One Shot | audio/sfx/hazards/electric/ | Electrical lock opens on underground door, heavy click, short spark, mechanical release, no music, no instruments, no voices.
DI136_power_core_start_01 | One Shot | audio/sfx/hazards/electric/ | Underground power core starts, heavy mechanical click and short electrical surge, isolated game sound, no music, no instruments, no voices.
DI137_power_core_shutdown_01 | One Shot | audio/sfx/hazards/electric/ | Underground power core shuts down, electrical drop, metal relay click, short final spark, no music, no instruments, no voices.
DI138_power_core_overload_01 | One Shot | audio/sfx/hazards/electric/ | Underground power core overload, sharp electric surges and metal casing strain, high impact hazard sound, no music, no instruments, no voices.
DI139_radiation_crackle_01 | One Shot | audio/sfx/hazards/electric/ | Unstable mineral radiation crackle, dry electrical particles and stone tick, short isolated hazard sound, no music, no instruments, no voices.
DI140_acid_sizzle_rock_01 | One Shot | audio/sfx/hazards/gas/ | Acid liquid sizzles on underground rock, sharp chemical fizz and tiny stone crumble, isolated hazard sound, no music, no instruments, no voices.
```

---

## Ancient Ruins / Mechanisms

```text
DI141_ancient_door_unlock_01 | One Shot | audio/sfx/ancient/ | Ancient stone door unlocks underground, heavy stone latch drops and dust falls, isolated puzzle sound, no music, no instruments, no voices.
DI142_ancient_door_open_01 | One Shot | audio/sfx/ancient/ | Massive ancient stone door opens, grinding slab movement and falling dust, high impact underground sound, no music, no instruments, no voices.
DI143_ancient_door_close_01 | One Shot | audio/sfx/ancient/ | Massive ancient stone door closes, heavy stone scrape and final slam, isolated game sound, no music, no instruments, no voices.
DI144_ancient_switch_stone_01 | One Shot | audio/sfx/ancient/ | Ancient stone switch pressed, dry stone click and hidden mechanism shift, short isolated puzzle sound, no music, no instruments, no voices.
DI145_ancient_lever_heavy_01 | One Shot | audio/sfx/ancient/ | Heavy ancient lever pulled, metal and stone grinding, mechanism locks into place, isolated sound, no music, no instruments, no voices.
DI146_ancient_pillar_shift_01 | One Shot | audio/sfx/ancient/ | Ancient stone pillar shifts underground, heavy grinding and dust fall, isolated puzzle sound, no music, no instruments, no voices.
DI147_ancient_floor_plate_01 | One Shot | audio/sfx/ancient/ | Hidden floor pressure plate activates, stone click and internal gears move, short isolated sound, no music, no instruments, no voices.
DI148_ancient_trap_arm_01 | One Shot | audio/sfx/ancient/ | Ancient trap arms inside wall, stone panel slides and metal tension locks, isolated danger sound, no music, no instruments, no voices.
DI149_ancient_trap_trigger_01 | One Shot | audio/sfx/ancient/ | Ancient trap triggers suddenly, stone snap, metal strike, debris tick, short isolated hazard sound, no music, no instruments, no voices.
DI150_ancient_chain_drop_01 | One Shot | audio/sfx/ancient/ | Heavy ancient chain drops inside stone chamber, metal links crash and settle, isolated sound effect, no music, no instruments, no voices.
DI151_ancient_chain_pull_01 | One Shot | audio/sfx/ancient/ | Heavy ancient chain pulled through stone slot, metal scrape and dust fall, isolated puzzle sound, no music, no instruments, no voices.
DI152_ancient_bridge_extend_01 | One Shot | audio/sfx/ancient/ | Ancient stone bridge extends from wall, grinding blocks and heavy stone lock, high impact puzzle sound, no music, no instruments, no voices.
DI153_ancient_bridge_collapse_01 | One Shot | audio/sfx/ancient/ | Ancient stone bridge collapses, blocks falling into deep pit, heavy debris crash, no music, no instruments, no voices.
DI154_ancient_crystal_socket_01 | One Shot | audio/sfx/ancient/ | Crystal inserted into ancient stone socket, glassy mineral click and stone lock, isolated puzzle sound, no music, no instruments, no voices.
DI155_ancient_crystal_power_01 | One Shot | audio/sfx/ancient/ | Ancient crystal powers mechanism, short mineral vibration and stone device activation, no music, no instruments, no voices.
DI156_ancient_wall_reveal_01 | One Shot | audio/sfx/ancient/ | Hidden ancient wall opens, stone blocks slide apart with dust and grit, isolated reveal sound, no music, no instruments, no voices.
DI157_ancient_cache_open_01 | One Shot | audio/sfx/ancient/ | Ancient treasure cache opens inside stone wall, heavy slab scrape and small metal clinks, no music, no instruments, no voices.
DI158_ancient_mechanism_fail_01 | One Shot | audio/sfx/ancient/ | Ancient mechanism fails, gears grind, stone cracks, internal parts collapse, isolated sound, no music, no instruments, no voices.
DI159_ancient_seal_break_01 | One Shot | audio/sfx/ancient/ | Ancient stone seal breaks, heavy crack, dust burst, small carved pieces falling, high impact game sound, no music, no instruments, no voices.
DI160_ancient_depth_gate_01 | One Shot | audio/sfx/ancient/ | Deep ancient gate activates, stone locks rotate and heavy underground mechanism engages, isolated sound, no music, no instruments, no voices.
```

---

## Scary Depth Loops

```text
DI161_depth_ambience_stone_pressure_loop | Loop | audio/ambience/depth/ | Seamless loopable underground cave foley, deep stone pressure, tiny irregular rock stress, faint dust movement, physical cave sound only, no music, no instruments, no voices.
DI162_depth_ambience_far_rock_shift_loop | Loop | audio/ambience/depth/ | Seamless loopable deep tunnel foley, distant rock shifting far below, sparse dirt falls, heavy underground space, no music, no instruments, no voices.
DI163_depth_ambience_narrow_tunnel_loop | Loop | audio/ambience/depth/ | Seamless loopable narrow underground tunnel sound, close stone walls, faint air movement, tiny grit falling, no music, no instruments, no voices.
DI164_depth_ambience_deep_empty_chamber_loop | Loop | audio/ambience/depth/ | Seamless loopable deep empty stone chamber, faint air movement through rock, occasional dust settling, physical underground foley, no music, no instruments, no voices.
DI165_depth_ambience_unstable_wall_loop | Loop | audio/ambience/depth/ | Seamless loopable underground unstable wall foley, irregular stone stress, soft grit falls, close cave pressure, no music, no instruments, no voices.
DI166_depth_ambience_abandoned_mine_loop | Loop | audio/ambience/depth/ | Seamless loopable abandoned underground mine foley, old tunnel air, distant wood strain, small dust falls, no machinery, no music, no instruments, no voices.
DI167_depth_ambience_metal_supports_loop | Loop | audio/ambience/depth/ | Seamless loopable deep mine support foley, faint metal strain, distant rock pressure, dry dirt settling, no music, no instruments, no voices.
DI168_depth_ambience_wet_stone_loop | Loop | audio/ambience/depth/ | Seamless loopable wet underground stone foley, sparse water drops, damp rock texture, faint air movement, no music, no instruments, no voices.
DI169_depth_ambience_crystal_cavern_loop | Loop | audio/ambience/depth/ | Seamless loopable crystal cavern foley, tiny natural mineral ticks, cold stone air, sparse grit movement, no music, no instruments, no voices.
DI170_depth_ambience_lava_distance_loop | Loop | audio/ambience/depth/ | Seamless loopable deep geothermal cave foley, distant molten rock movement, hot air hiss, occasional stone crack, no music, no instruments, no voices.
DI171_depth_ambience_gas_layer_loop | Loop | audio/ambience/depth/ | Seamless loopable underground gas pocket foley, soft irregular pressure hisses from stone cracks, no music, no instruments, no voices.
DI172_depth_ambience_deep_water_loop | Loop | audio/ambience/depth/ | Seamless loopable deep underground water foley, far water movement through rock cracks, sparse drips, no music, no instruments, no voices.
DI173_depth_ambience_ancient_ruin_loop | Loop | audio/ambience/depth/ | Seamless loopable buried stone ruin foley, old stone chamber air, tiny dust falls, faint stone settling, no music, no instruments, no voices.
DI174_depth_ambience_black_cavern_loop | Loop | audio/ambience/depth/ | Seamless loopable very deep cavern foley, massive empty stone space, faint air shifts, irregular rock dust, no music, no instruments, no voices.
DI175_depth_ambience_under_pressure_loop | Loop | audio/ambience/depth/ | Seamless loopable deep pressure zone, stone stress, small gravel movement, heavy underground physical tension, no music, no instruments, no voices.
DI176_depth_ambience_deep_shaft_loop | Loop | audio/ambience/depth/ | Seamless loopable deep vertical mine shaft foley, faint air moving through stone shaft, tiny falling grit, no music, no instruments, no voices.
DI177_depth_ambience_forgotten_tunnel_loop | Loop | audio/ambience/depth/ | Seamless loopable forgotten underground tunnel foley, dry stone, old dust, faint far rock shift, no music, no instruments, no voices.
DI178_depth_ambience_buried_machine_room_loop | Loop | audio/ambience/depth/ | Seamless loopable buried machine room foley, old metal cooling ticks, stone dust, no active engine, no music, no instruments, no voices.
DI179_depth_ambience_cracked_floor_loop | Loop | audio/ambience/depth/ | Seamless loopable cracked underground floor foley, tiny stone pressure pops, dry grit settling, faint air movement, no music, no instruments, no voices.
DI180_depth_ambience_final_depth_loop | Loop | audio/ambience/depth/ | Seamless loopable deepest cave layer foley, huge stone pressure, distant rock movement, sparse dust falls, physical underground sound, no music, no instruments, no voices.
```

---

## Scary Depth One-Shots / Threat Accents

```text
DI181_scary_depth_far_impact_01 | One Shot | audio/sfx/scary_depth/ | Distant heavy impact far below the mine, muffled stone hit and faint debris fall, scary underground accent, no music, no instruments, no voices.
DI182_scary_depth_wall_knock_01 | One Shot | audio/sfx/scary_depth/ | Single deep knock from behind underground stone wall, physical rock impact, short unsettling cave sound, no music, no instruments, no voices.
DI183_scary_depth_floor_shift_01 | One Shot | audio/sfx/scary_depth/ | Underground floor shifts slightly beneath player, stone scrape and gravel movement, scary hazard accent, no music, no instruments, no voices.
DI184_scary_depth_ceiling_scrape_01 | One Shot | audio/sfx/scary_depth/ | Stone ceiling scrapes under pressure above player, grit falls and rock surface grinds, no music, no instruments, no voices.
DI185_scary_depth_far_chain_01 | One Shot | audio/sfx/scary_depth/ | Heavy chain moves far away inside deep underground chamber, short metal scrape through stone space, no music, no instruments, no voices.
DI186_scary_depth_hidden_movement_01 | One Shot | audio/sfx/scary_depth/ | Large unseen object moves behind rocks, heavy stone scrape and dirt displacement, short scary physical sound, no music, no instruments, no voices.
DI187_scary_depth_boulder_breath_01 | One Shot | audio/sfx/scary_depth/ | Huge boulder slowly shifts and settles like pressure releasing, stone grind and dust fall, no music, no instruments, no voices.
DI188_scary_depth_crack_underfoot_01 | One Shot | audio/sfx/scary_depth/ | Sudden crack under player on deep stone floor, sharp fracture and tiny falling gravel, no music, no instruments, no voices.
DI189_scary_depth_far_collapse_01 | One Shot | audio/sfx/scary_depth/ | Far collapse echoes through deep tunnels, muffled rock crash and dirt fall, short scary cave sound, no music, no instruments, no voices.
DI190_scary_depth_void_pebble_drop_01 | One Shot | audio/sfx/scary_depth/ | Pebble falls into very deep pit, tiny stone bounces fading downward, physical depth cue, no music, no instruments, no voices.
DI191_scary_depth_slow_stone_drag_01 | One Shot | audio/sfx/scary_depth/ | Slow heavy stone dragged across underground floor, short unsettling scrape, no music, no instruments, no voices.
DI192_scary_depth_metal_stress_01 | One Shot | audio/sfx/scary_depth/ | Old metal support bends under pressure deep underground, short strained creak and bolt tick, no music, no instruments, no voices.
DI193_scary_depth_ancient_lock_shift_01 | One Shot | audio/sfx/scary_depth/ | Ancient lock shifts by itself deep below, stone click and hidden mechanism scrape, no music, no instruments, no voices.
DI194_scary_depth_gas_whisper_no_voice_01 | One Shot | audio/sfx/scary_depth/ | Thin gas escapes through narrow rock crack, soft sharp hiss like air only, no speech, no music, no instruments, no voices.
DI195_scary_depth_crystal_ping_far_01 | One Shot | audio/sfx/scary_depth/ | Single distant crystal ping from deep cavern, natural mineral tick and tiny shard vibration, no music, no instruments, no voices.
DI196_scary_depth_rock_teeth_crunch_01 | One Shot | audio/sfx/scary_depth/ | Sharp rocks grind together underground, brittle crunch and stone scrape, scary physical cave sound, no music, no instruments, no voices.
DI197_scary_depth_dust_burst_01 | One Shot | audio/sfx/scary_depth/ | Sudden dust burst from cracked tunnel wall, dry air puff and falling grit, short scary hazard cue, no music, no instruments, no voices.
DI198_scary_depth_black_water_drop_01 | One Shot | audio/sfx/scary_depth/ | Heavy water drop lands in unseen deep pool, dark wet impact and tiny stone drip, no music, no instruments, no voices.
DI199_scary_depth_close_rumble_01 | One Shot | audio/sfx/scary_depth/ | Close underground rumble passes through stone wall, short heavy pressure movement, no music, no instruments, no voices.
DI200_scary_depth_warning_sequence_01 | One Shot | audio/sfx/scary_depth/ | Three physical danger cues in sequence, stone crack, dirt fall, distant heavy impact, isolated scary cave warning, no music, no instruments, no voices.
```

---

---

# Batch GX-001 to GX-200 — Game Expansion / UI / Robot / Digging / Cosmic

Format:

```text
ASSET_ID | SUNO_TYPE | TARGET_FOLDER | PROMPT
```

## Game Boot / Startup / Main Menu

```text
GX001_boot_logo_soft_power_01 | One Shot | audio/sfx/boot/ | Game boot logo sound, clean mechanical power click, tiny screen glow, short isolated startup cue, no music, no melody, no instruments, no voices.
GX002_boot_logo_deep_power_01 | One Shot | audio/sfx/boot/ | Game boot logo sound, heavier machine power-on, relay click and soft electrical rise, short isolated cue, no music, no melody, no instruments, no voices.
GX003_boot_system_wake_01 | One Shot | audio/sfx/boot/ | Small mining robot system waking up, relay ticks, battery contact, clean electronic chirp, isolated boot sound, no music, no instruments, no voices.
GX004_boot_system_wake_old_01 | One Shot | audio/sfx/boot/ | Old machine startup, dusty switch click, weak capacitor charge, tiny metal rattle, short game boot sound, no music, no instruments, no voices.
GX005_boot_save_loaded_01 | One Shot | audio/sfx/boot/ | Save file loaded confirmation, short soft data tick and mechanical click, clean UI startup sound, no music, no melody, no instruments, no voices.
GX006_boot_new_game_confirm_01 | One Shot | audio/sfx/boot/ | New game confirmation, firm mechanical button lock and clean digital blip, short isolated UI cue, no music, no melody, no instruments, no voices.
GX007_boot_menu_open_01 | One Shot | audio/sfx/boot/ | Main menu opens, small mechanical panel slide and soft electronic tick, isolated game interface sound, no music, no instruments, no voices.
GX008_boot_menu_loop_clean_01 | Loop | audio/ambience/menu/ | Seamless loopable quiet menu machine bed, tiny relay ticks and soft computer fan movement only, no music, no melody, no rhythm, no instruments, no voices.
GX009_boot_intro_terminal_01 | One Shot | audio/sfx/boot/ | Mining terminal turns on, old screen static snap, key relay click, short isolated boot cue, no music, no melody, no instruments, no voices.
GX010_boot_press_start_01 | One Shot | audio/sfx/boot/ | Press start confirmation, satisfying chunky button click and tiny digital tick, isolated UI sound, no music, no melody, no instruments, no voices.
GX011_boot_error_old_save_01 | One Shot | audio/sfx/boot/ | Old save warning, soft negative computer beep and weak relay clack, short isolated UI sound, no music, no instruments, no voices.
GX012_boot_factory_stamp_01 | One Shot | audio/sfx/boot/ | Factory stamp startup cue, heavy metal stamp and small robotic servo click, short isolated game sound, no music, no instruments, no voices.
GX013_boot_splash_impact_01 | One Shot | audio/sfx/boot/ | Logo splash impact, compact stone-and-metal hit with dust puff, short clean game boot sound, no music, no melody, no instruments, no voices.
GX014_boot_deep_mine_open_01 | One Shot | audio/sfx/boot/ | Mine entrance opens for title screen, wooden latch, stone scrape, dust fall, short isolated cue, no music, no instruments, no voices.
GX015_boot_game_ready_01 | One Shot | audio/sfx/boot/ | Game ready sound, crisp mechanical lock-in and clean success blip, short isolated UI cue, no music, no melody, no instruments, no voices.
```

## UI Navigation / Shop / Inventory / Settings

```text
GX016_ui_click_soft_01 | One Shot | audio/sfx/ui/ | Short clean game UI click, small plastic and metal button press, isolated interface sound, no music, no melody, no instruments, no voices.
GX017_ui_click_chunky_01 | One Shot | audio/sfx/ui/ | Chunky mechanical UI click, satisfying small lever tap, short isolated game interface sound, no music, no melody, no instruments, no voices.
GX018_ui_hover_tick_01 | One Shot | audio/sfx/ui/ | Tiny UI hover tick, soft dry electronic blip, very short isolated sound, no music, no melody, no instruments, no voices.
GX019_ui_tab_switch_01 | One Shot | audio/sfx/ui/ | Inventory tab switches, paperless mechanical panel slide and click, short isolated UI sound, no music, no instruments, no voices.
GX020_ui_back_cancel_01 | One Shot | audio/sfx/ui/ | Cancel or back button, small dry negative tick and muted click, short isolated UI sound, no music, no melody, no instruments, no voices.
GX021_ui_error_denied_01 | One Shot | audio/sfx/ui/ | Action denied UI sound, dry low electronic tick and tiny relay refusal, short isolated game sound, no music, no melody, no instruments, no voices.
GX022_ui_confirm_clean_01 | One Shot | audio/sfx/ui/ | Positive confirmation UI sound, clean short electronic blip with mechanical click, isolated game sound, no music, no melody, no instruments, no voices.
GX023_ui_window_open_01 | One Shot | audio/sfx/ui/ | Interface window opens, compact panel slide and soft terminal tick, short isolated UI sound, no music, no instruments, no voices.
GX024_ui_window_close_01 | One Shot | audio/sfx/ui/ | Interface window closes, compact panel slide shut and small click, short isolated UI sound, no music, no instruments, no voices.
GX025_ui_inventory_open_01 | One Shot | audio/sfx/ui/inventory/ | Inventory opens, small metal compartment latch and dry item rattle, short isolated game sound, no music, no instruments, no voices.
GX026_ui_inventory_close_01 | One Shot | audio/sfx/ui/inventory/ | Inventory closes, small compartment shut and clean latch click, short isolated game sound, no music, no instruments, no voices.
GX027_ui_map_open_01 | One Shot | audio/sfx/ui/map/ | Map opens, thin mechanical scanner panel extends with tiny paper-like rustle, no music, no instruments, no voices.
GX028_ui_map_marker_01 | One Shot | audio/sfx/ui/map/ | Map marker placed, tiny pin click and clean terminal tick, short isolated UI cue, no music, no melody, no instruments, no voices.
GX029_ui_shop_open_02 | One Shot | audio/sfx/ui/shop/ | Shop interface opens, small bell tick, wood drawer slide, mechanical UI click, short isolated sound, no music, no instruments, no voices.
GX030_ui_shop_close_02 | One Shot | audio/sfx/ui/shop/ | Shop interface closes, wood drawer shut and tiny terminal tick, short isolated sound, no music, no instruments, no voices.
GX031_ui_buy_item_01 | One Shot | audio/sfx/ui/shop/ | Buy item sound, coin clink and clean mechanical confirmation click, short isolated game sound, no music, no melody, no instruments, no voices.
GX032_ui_sell_items_02 | One Shot | audio/sfx/ui/shop/ | Sell items sound, several mineral clinks drop into metal tray, clean confirmation tick, no music, no melody, no instruments, no voices.
GX033_ui_cannot_afford_01 | One Shot | audio/sfx/ui/shop/ | Cannot afford sound, small empty coin tray rattle and negative terminal tick, isolated UI sound, no music, no instruments, no voices.
GX034_ui_upgrade_select_01 | One Shot | audio/sfx/ui/upgrade/ | Upgrade selected, precision mechanical selector click and clean digital snap, short isolated UI sound, no music, no instruments, no voices.
GX035_ui_upgrade_install_preview_01 | One Shot | audio/sfx/ui/upgrade/ | Upgrade preview sound, small parts rotate and lock softly, short isolated UI-machine cue, no music, no instruments, no voices.
GX036_ui_slider_move_01 | One Shot | audio/sfx/ui/settings/ | Settings slider move, smooth tiny mechanical tick, very short isolated interface sound, no music, no melody, no instruments, no voices.
GX037_ui_toggle_on_01 | One Shot | audio/sfx/ui/settings/ | Settings toggle on, compact switch click and clean electric contact, isolated UI sound, no music, no melody, no instruments, no voices.
GX038_ui_toggle_off_01 | One Shot | audio/sfx/ui/settings/ | Settings toggle off, compact switch click and muted power tick, isolated UI sound, no music, no melody, no instruments, no voices.
GX039_ui_pause_open_01 | One Shot | audio/sfx/ui/pause/ | Pause menu opens, soft mechanical panel lock and dry terminal blip, short isolated interface sound, no music, no instruments, no voices.
GX040_ui_pause_close_01 | One Shot | audio/sfx/ui/pause/ | Pause menu closes, panel unlock and clean game resume tick, short isolated UI sound, no music, no melody, no instruments, no voices.
```

## Level Up / Rewards / Discovery / Combo

```text
GX041_level_up_small_01 | One Shot | audio/sfx/reward/level_up/ | Small level up reward, quick mechanical unlock, mineral sparkle ticks, clean positive game cue, no music, no melody, no instruments, no voices.
GX042_level_up_big_01 | One Shot | audio/sfx/reward/level_up/ | Major level up reward, heavy upgrade lock, bright mineral ticks, satisfying short impact, no music, no melody, no instruments, no voices.
GX043_xp_tick_01 | One Shot | audio/sfx/reward/xp/ | Tiny experience gain tick, clean dry digital-mineral click, very short isolated sound, no music, no melody, no instruments, no voices.
GX044_xp_tick_cluster_01 | One Shot | audio/sfx/reward/xp/ | Small cluster of experience ticks, quick mineral clicks into inventory counter, short isolated sound, no music, no rhythm, no instruments, no voices.
GX045_reward_common_01 | One Shot | audio/sfx/reward/ | Common reward pickup, small stone clack and clean UI confirmation tick, short isolated cue, no music, no melody, no instruments, no voices.
GX046_reward_uncommon_01 | One Shot | audio/sfx/reward/ | Uncommon reward pickup, crisp ore clink and soft mechanical click, short isolated positive cue, no music, no melody, no instruments, no voices.
GX047_reward_rare_01 | One Shot | audio/sfx/reward/ | Rare reward pickup, bright gemstone ticks and compact metal lock-in, short isolated cue, no music, no melody, no instruments, no voices.
GX048_reward_epic_01 | One Shot | audio/sfx/reward/ | Epic reward pickup, heavy crystal crackle and strong chest latch snap, high value game cue, no music, no melody, no instruments, no voices.
GX049_reward_jackpot_01 | One Shot | audio/sfx/reward/ | Jackpot reward, minerals spill into metal tray with satisfying heavy clinks, short isolated reward sound, no music, no melody, no instruments, no voices.
GX050_discovery_new_area_01 | One Shot | audio/sfx/discovery/ | New underground area discovered, stone dust falls and hidden space opens with soft air release, short discovery sound, no music, no instruments, no voices.
GX051_discovery_hidden_room_01 | One Shot | audio/sfx/discovery/ | Hidden room discovered behind rock wall, stone crack opens, dust puff, small mineral tick, no music, no melody, no instruments, no voices.
GX052_discovery_ore_vein_01 | One Shot | audio/sfx/discovery/ | Ore vein discovered, rock face splits and dull metal glint texture appears, short isolated game sound, no music, no instruments, no voices.
GX053_discovery_gem_pocket_01 | One Shot | audio/sfx/discovery/ | Gem pocket discovered, small crystal shards tick inside stone cavity, short clean reward sound, no music, no melody, no instruments, no voices.
GX054_discovery_ancient_ruin_01 | One Shot | audio/sfx/discovery/ | Ancient ruin discovered, stone slab shifts, dust falls, hidden mechanism click, short isolated reveal sound, no music, no instruments, no voices.
GX055_discovery_void_crack_01 | One Shot | audio/sfx/discovery/ | Void crack discovered underground, brittle stone split and strange air pressure snap, short non-musical reveal, no instruments, no voices.
GX056_combo_start_01 | One Shot | audio/sfx/combo/ | Digging combo starts, sharp pick click and clean counter tick, short isolated arcade-free game sound, no music, no melody, no instruments, no voices.
GX057_combo_increase_01 | One Shot | audio/sfx/combo/ | Combo increases, compact mineral click stack and short mechanical ratchet, isolated game cue, no music, no melody, no instruments, no voices.
GX058_combo_high_01 | One Shot | audio/sfx/combo/ | High combo cue, strong ore clink sequence and quick clean confirmation, short isolated sound, no music, no melody, no instruments, no voices.
GX059_combo_max_01 | One Shot | audio/sfx/combo/ | Maximum combo reached, heavy mineral lock-in and crystal shard flourish without music, short isolated reward, no melody, no instruments, no voices.
GX060_combo_break_01 | One Shot | audio/sfx/combo/ | Combo breaks, small counter snap, dirt crumble, muted negative tick, short isolated game sound, no music, no melody, no instruments, no voices.
GX061_perfect_dig_01 | One Shot | audio/sfx/combo/ | Perfect dig hit, crisp pickaxe contact, clean rock chip, satisfying mineral click, short isolated feedback sound, no music, no instruments, no voices.
GX062_perfect_chain_01 | One Shot | audio/sfx/combo/ | Perfect digging chain, two quick mineral clicks and a compact mechanical lock, short game cue, no music, no rhythm, no instruments, no voices.
GX063_milestone_depth_01 | One Shot | audio/sfx/reward/milestone/ | Depth milestone reached, stone pressure settles and mining gauge clicks forward, short isolated progression sound, no music, no melody, no instruments, no voices.
GX064_milestone_resource_01 | One Shot | audio/sfx/reward/milestone/ | Resource milestone reached, pile of ore clinks into metal storage, clean confirmation tick, no music, no melody, no instruments, no voices.
GX065_milestone_speed_01 | One Shot | audio/sfx/reward/milestone/ | Speed milestone achieved, quick servo snap and clean timer click, short isolated game sound, no music, no melody, no instruments, no voices.
GX066_quest_complete_01 | One Shot | audio/sfx/reward/quest/ | Quest complete sound, compact tool lock, mineral clink, clean terminal confirmation, no music, no melody, no instruments, no voices.
GX067_quest_update_01 | One Shot | audio/sfx/reward/quest/ | Quest updated sound, dry paperless terminal tick and small mechanical marker click, no music, no melody, no instruments, no voices.
GX068_new_blueprint_01 | One Shot | audio/sfx/reward/blueprint/ | New blueprint acquired, metal plate slide, tiny scanner tick, clean reward cue, no music, no melody, no instruments, no voices.
GX069_new_upgrade_unlocked_01 | One Shot | audio/sfx/reward/upgrade/ | New upgrade unlocked, bolts rotate, mechanical latch opens, crisp confirmation tick, no music, no melody, no instruments, no voices.
GX070_badge_unlock_01 | One Shot | audio/sfx/reward/badge/ | Badge unlocked, small metal emblem lands on table, clean bright tick, short isolated reward cue, no music, no instruments, no voices.
GX071_daily_bonus_01 | One Shot | audio/sfx/reward/ | Daily bonus received, small metal box opens and minerals clink inside, short clean reward, no music, no melody, no instruments, no voices.
GX072_resource_bonus_01 | One Shot | audio/sfx/reward/ | Bonus resources awarded, several ore chunks drop into inventory with satisfying clacks, no music, no melody, no instruments, no voices.
GX073_secret_found_01 | One Shot | audio/sfx/discovery/ | Secret found, small hidden latch opens behind stone and gem tick appears, short isolated reveal, no music, no melody, no instruments, no voices.
GX074_treasure_room_reveal_01 | One Shot | audio/sfx/discovery/ | Treasure room revealed, stone wall opens and many minerals softly clink in darkness, no music, no melody, no instruments, no voices.
GX075_achievement_pop_01 | One Shot | audio/sfx/reward/achievement/ | Achievement pop, clean compact UI snap and small metal badge tick, isolated reward sound, no music, no melody, no instruments, no voices.
```

## Robot Character / Movement / Damage / System Foley

```text
GX076_robot_step_dirt_light_01 | One Shot | audio/sfx/robot/steps/ | Small robot footstep on dry dirt, light metal foot compressing soil, short isolated movement sound, no music, no instruments, no voices.
GX077_robot_step_dirt_heavy_01 | One Shot | audio/sfx/robot/steps/ | Heavy robot footstep on packed dirt, metal foot thud with gritty soil crunch, isolated movement sound, no music, no instruments, no voices.
GX078_robot_step_stone_light_01 | One Shot | audio/sfx/robot/steps/ | Small robot footstep on stone, light metal clack and tiny rock tick, short isolated sound, no music, no instruments, no voices.
GX079_robot_step_stone_heavy_01 | One Shot | audio/sfx/robot/steps/ | Heavy robot footstep on underground stone, metal sole hit with hard rock slap, isolated movement sound, no music, no instruments, no voices.
GX080_robot_step_mud_01 | One Shot | audio/sfx/robot/steps/ | Robot footstep in wet mud, metal foot presses into sticky dirt with small suction, no music, no instruments, no voices.
GX081_robot_jump_start_01 | One Shot | audio/sfx/robot/movement/ | Small robot jump start, servo compression, metal spring click, dirt push-off, short isolated sound, no music, no instruments, no voices.
GX082_robot_jump_land_01 | One Shot | audio/sfx/robot/movement/ | Small robot lands after jump, metal body thump and ground crunch, short isolated movement sound, no music, no instruments, no voices.
GX083_robot_short_fall_01 | One Shot | audio/sfx/robot/movement/ | Robot drops a short distance, light metal fall and dirt landing thud, isolated game sound, no music, no instruments, no voices.
GX084_robot_long_fall_01 | One Shot | audio/sfx/robot/movement/ | Robot falls hard into underground floor, heavy metal crash and dirt scatter, high impact movement sound, no music, no instruments, no voices.
GX085_robot_idle_servo_loop_01 | Loop | audio/ambience/robot/ | Seamless loopable small robot idle foley, tiny servo ticks and faint mechanical body movement only, no music, no melody, no rhythm, no instruments, no voices.
GX086_robot_idle_low_battery_loop_01 | Loop | audio/ambience/robot/ | Seamless loopable robot low battery idle foley, weak servo ticks and occasional faint electrical contact, no music, no rhythm, no instruments, no voices.
GX087_robot_battery_insert_01 | One Shot | audio/sfx/robot/system/ | Robot battery inserted, metal slot click, contact snap, short power tick, isolated sound, no music, no instruments, no voices.
GX088_robot_battery_empty_01 | One Shot | audio/sfx/robot/system/ | Robot battery empty cue, weak relay click and tiny failed spark, short isolated game sound, no music, no instruments, no voices.
GX089_robot_scan_start_01 | One Shot | audio/sfx/robot/system/ | Robot scan starts, small lens servo and dry electronic pulse, short isolated system sound, no music, no melody, no instruments, no voices.
GX090_robot_scan_found_01 | One Shot | audio/sfx/robot/system/ | Robot scan finds target, clean scanner tick and tiny mineral click, short isolated cue, no music, no melody, no instruments, no voices.
GX091_robot_scan_fail_01 | One Shot | audio/sfx/robot/system/ | Robot scan fails, weak scanner tick and dry negative relay click, short isolated cue, no music, no instruments, no voices.
GX092_robot_damage_light_01 | One Shot | audio/sfx/robot/damage/ | Robot takes light damage, small metal dent and tiny loose screw rattle, isolated game sound, no music, no instruments, no voices.
GX093_robot_damage_medium_01 | One Shot | audio/sfx/robot/damage/ | Robot takes medium damage, metal panel crunch, spark snap, parts rattle, short isolated sound, no music, no instruments, no voices.
GX094_robot_damage_critical_01 | One Shot | audio/sfx/robot/damage/ | Robot critical damage, heavy metal crunch, electrical arc, loose bolts scatter, no music, no instruments, no voices.
GX095_robot_repair_small_01 | One Shot | audio/sfx/robot/repair/ | Small robot repair, tiny wrench click, panel snap, clean electrical contact, short isolated sound, no music, no instruments, no voices.
GX096_robot_repair_full_01 | One Shot | audio/sfx/robot/repair/ | Full robot repair, several mechanical clicks, panel locks, healthy power contact, no music, no melody, no instruments, no voices.
GX097_robot_upgrade_slot_01 | One Shot | audio/sfx/robot/upgrade/ | Robot upgrade slot opens, metal panel slide and socket click, short isolated sound, no music, no instruments, no voices.
GX098_robot_upgrade_mount_01 | One Shot | audio/sfx/robot/upgrade/ | Robot upgrade mounted, bolts tighten and module locks into place, satisfying mechanical sound, no music, no instruments, no voices.
GX099_robot_overheat_01 | One Shot | audio/sfx/robot/hazard/ | Robot overheats, short fan strain, hot metal tick, small steam hiss, isolated game sound, no music, no instruments, no voices.
GX100_robot_shutdown_01 | One Shot | audio/sfx/robot/system/ | Robot shuts down, relay drop, servo release, small body settling click, short isolated sound, no music, no instruments, no voices.
```

## Hoverboard / Flight / Anti-Gravity

```text
GX101_hoverboard_power_on_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard powers on, compact magnetic lift click and clean energy contact, short isolated movement sound, no music, no instruments, no voices.
GX102_hoverboard_power_off_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard powers off, magnetic lift drops and small chassis click, short isolated sound, no music, no instruments, no voices.
GX103_hoverboard_idle_loop_01 | Loop | audio/ambience/hoverboard/ | Seamless loopable hoverboard idle sound, soft magnetic hover vibration and tiny electric ticks, no music, no melody, no rhythm, no instruments, no voices.
GX104_hoverboard_move_loop_01 | Loop | audio/ambience/hoverboard/ | Seamless loopable hoverboard movement, steady soft magnetic air displacement and chassis vibration, no music, no rhythm, no instruments, no voices.
GX105_hoverboard_boost_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard boost starts, quick magnetic surge and air push, short isolated movement effect, no music, no instruments, no voices.
GX106_hoverboard_boost_end_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard boost ends, energy drops to normal hover and chassis settles, short isolated sound, no music, no instruments, no voices.
GX107_hoverboard_brake_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard magnetic brake, short air drag and mechanical stabilizer click, isolated movement sound, no music, no instruments, no voices.
GX108_hoverboard_scrape_stone_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard bottom scrapes stone wall, metal skid, rock grit, quick isolated collision sound, no music, no instruments, no voices.
GX109_hoverboard_bump_dirt_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard bumps packed dirt, soft chassis thud and soil scatter, short isolated movement sound, no music, no instruments, no voices.
GX110_hoverboard_bump_rock_01 | One Shot | audio/sfx/hoverboard/ | Hoverboard bumps rock, metal frame tap and stone chip tick, short isolated collision sound, no music, no instruments, no voices.
GX111_jetpack_burst_short_01 | One Shot | audio/sfx/fly/ | Short jetpack burst, compact air thrust and tiny metal valve click, isolated movement sound, no music, no instruments, no voices.
GX112_jetpack_loop_light_01 | Loop | audio/ambience/fly/ | Seamless loopable light jetpack thrust, steady air pressure and small valve texture only, no music, no rhythm, no instruments, no voices.
GX113_jetpack_overheat_01 | One Shot | audio/sfx/fly/ | Jetpack overheats, sharp valve hiss, hot metal tick, short power drop, isolated hazard sound, no music, no instruments, no voices.
GX114_fly_pickup_wings_01 | One Shot | audio/sfx/fly/ | Temporary flight pickup activates, small mechanical wings unfold and lock, short isolated ability sound, no music, no melody, no instruments, no voices.
GX115_fly_timer_warning_01 | One Shot | audio/sfx/fly/ | Flight timer warning, dry warning tick and weak thruster flutter, isolated UI-movement sound, no music, no instruments, no voices.
GX116_fly_land_soft_01 | One Shot | audio/sfx/fly/ | Soft hover landing on dirt, air cushion drops and robot feet touch soil, short isolated sound, no music, no instruments, no voices.
GX117_fly_land_hard_01 | One Shot | audio/sfx/fly/ | Hard hover landing on stone, air cushion collapse and metal foot slam, high impact movement sound, no music, no instruments, no voices.
GX118_anti_gravity_start_01 | One Shot | audio/sfx/fly/ | Anti-gravity field starts, compact pressure pop and small electric texture, short isolated ability sound, no music, no instruments, no voices.
GX119_anti_gravity_loop_01 | Loop | audio/ambience/fly/ | Seamless loopable anti-gravity device foley, soft pressure shimmer and tiny contact ticks only, no music, no melody, no rhythm, no voices.
GX120_anti_gravity_fail_01 | One Shot | audio/sfx/fly/ | Anti-gravity device fails, field sputter, metal drop, short electric snap, isolated sound, no music, no instruments, no voices.
```

## Expanded Digging Feel — High Priority

```text
GX121_dig_soft_dirt_tap_01 | One Shot | audio/sfx/digging/dirt/ | Soft pickaxe tap into loose dirt, powdery impact and small soil crumble, very short satisfying digging sound, no music, no instruments, no voices.
GX122_dig_soft_dirt_tap_02 | One Shot | audio/sfx/digging/dirt/ | Soft tool strike into loose dry soil, rounded thud and tiny dirt grains falling, isolated digging feedback, no music, no instruments, no voices.
GX123_dig_packed_dirt_hit_01 | One Shot | audio/sfx/digging/dirt/ | Pickaxe hit into packed dirt, firm earthy thump and gritty crack, short isolated mining sound, no music, no instruments, no voices.
GX124_dig_packed_dirt_hit_02 | One Shot | audio/sfx/digging/dirt/ | Strong tool impact on compact soil block, hard dirt break texture and small crumbs, no music, no instruments, no voices.
GX125_dig_dirt_block_break_clean_01 | One Shot | audio/sfx/digging/dirt/ | Dirt block breaks cleanly, dry clods crumble and settle with satisfying finish, isolated game sound, no music, no instruments, no voices.
GX126_dig_dirt_block_break_messy_01 | One Shot | audio/sfx/digging/dirt/ | Dirt block breaks messily, many crumbly soil pieces fall and scatter, short digging sound, no music, no instruments, no voices.
GX127_dig_clay_hit_sticky_01 | One Shot | audio/sfx/digging/clay/ | Pickaxe hit into sticky clay, dull wet thump and slight suction texture, isolated mining sound, no music, no instruments, no voices.
GX128_dig_clay_break_01 | One Shot | audio/sfx/digging/clay/ | Clay block breaks apart, sticky chunks tear and drop heavily, short isolated digging sound, no music, no instruments, no voices.
GX129_dig_sand_hit_soft_01 | One Shot | audio/sfx/digging/sand/ | Tool hits dry sand block, soft granular impact and tiny sand slide, isolated gameplay sound, no music, no instruments, no voices.
GX130_dig_sand_collapse_01 | One Shot | audio/sfx/digging/sand/ | Dry sand block collapses, soft falling grains and small settling slide, short isolated sound, no music, no instruments, no voices.
GX131_dig_gravel_hit_crunch_01 | One Shot | audio/sfx/digging/gravel/ | Pickaxe hits gravel, crunchy small stones shift under metal point, short isolated digging sound, no music, no instruments, no voices.
GX132_dig_gravel_break_01 | One Shot | audio/sfx/digging/gravel/ | Gravel block breaks, pebbles scatter and bounce with gritty soil movement, isolated game sound, no music, no instruments, no voices.
GX133_dig_shale_hit_01 | One Shot | audio/sfx/digging/stone/ | Pickaxe hits shale layer, thin brittle stone crack and flaky chips, short satisfying mining sound, no music, no instruments, no voices.
GX134_dig_shale_break_01 | One Shot | audio/sfx/digging/stone/ | Shale block breaks into flat brittle pieces, crisp layers snapping, isolated sound, no music, no instruments, no voices.
GX135_dig_limestone_hit_01 | One Shot | audio/sfx/digging/stone/ | Tool strikes limestone, chalky stone impact and dry powder chips, short mining feedback, no music, no instruments, no voices.
GX136_dig_limestone_break_01 | One Shot | audio/sfx/digging/stone/ | Limestone block breaks, chalky chunks and dust fall, short isolated game sound, no music, no instruments, no voices.
GX137_dig_hard_stone_hit_01 | One Shot | audio/sfx/digging/stone/ | Pickaxe hits hard stone, sharp metal contact and dense rock chip, very satisfying short sound, no music, no instruments, no voices.
GX138_dig_hard_stone_hit_02 | One Shot | audio/sfx/digging/stone/ | Strong hit on hard rock wall, metal bite, stone crack, tiny fragments fall, isolated mining sound, no music, no instruments, no voices.
GX139_dig_stone_break_clean_01 | One Shot | audio/sfx/digging/stone/ | Stone block breaks cleanly, large crack and compact rock chunks falling, high feedback digging sound, no music, no instruments, no voices.
GX140_dig_stone_break_gritty_01 | One Shot | audio/sfx/digging/stone/ | Stone block breaks with gritty debris, hard fracture and small rocks scatter, short isolated sound, no music, no instruments, no voices.
GX141_dig_ore_hit_dull_01 | One Shot | audio/sfx/digging/ore/ | Pickaxe hits dull ore vein, low metallic clank mixed with stone chip, short mining sound, no music, no instruments, no voices.
GX142_dig_ore_hit_bright_01 | One Shot | audio/sfx/digging/ore/ | Pickaxe hits bright ore vein, clean metal tick and mineral crack, isolated satisfying sound, no music, no instruments, no voices.
GX143_dig_ore_break_rough_01 | One Shot | audio/sfx/digging/ore/ | Ore breaks free from rock, heavy mineral clank and stone crumble, short isolated game sound, no music, no instruments, no voices.
GX144_dig_crystal_tap_01 | One Shot | audio/sfx/digging/crystal/ | Pickaxe taps crystal deposit, clear glassy mineral tick and tiny shard movement, short sound, no music, no melody, no instruments, no voices.
GX145_dig_crystal_hit_02 | One Shot | audio/sfx/digging/crystal/ | Strong hit on crystal node, brittle glassy crack and rock chip, isolated game sound, no music, no melody, no instruments, no voices.
GX146_dig_crystal_break_02 | One Shot | audio/sfx/digging/crystal/ | Crystal block breaks, sharp mineral shatter and small shards falling, satisfying isolated sound, no music, no melody, no instruments, no voices.
GX147_dig_rare_node_hit_01 | One Shot | audio/sfx/digging/rare/ | Tool hits rare mineral node, dense stone impact with unusual dry crystal tick, short isolated sound, no music, no instruments, no voices.
GX148_dig_rare_node_break_01 | One Shot | audio/sfx/digging/rare/ | Rare mineral node breaks open, stone fracture, bright shard scatter, heavy valuable chunk drop, no music, no melody, no instruments, no voices.
GX149_dig_failed_too_hard_01 | One Shot | audio/sfx/digging/fail/ | Tool fails to damage very hard block, dull rejected impact and tiny metal recoil, short negative sound, no music, no instruments, no voices.
GX150_dig_low_power_hit_01 | One Shot | audio/sfx/digging/fail/ | Weak low-power dig hit, soft metal tap and barely any dirt movement, short feedback sound, no music, no instruments, no voices.
GX151_dig_critical_hit_01 | One Shot | audio/sfx/digging/critical/ | Critical mining hit, powerful pickaxe impact, clean fracture, satisfying mineral pop, short isolated game sound, no music, no melody, no instruments, no voices.
GX152_dig_speed_hit_01 | One Shot | audio/sfx/digging/fast/ | Fast digging hit, quick crisp pick contact and small dirt burst, short responsive game sound, no music, no rhythm, no instruments, no voices.
GX153_dig_speed_hit_02 | One Shot | audio/sfx/digging/fast/ | Rapid mining strike, compact metal tick, stone chip, no long tail, isolated gameplay sound, no music, no rhythm, no instruments, no voices.
GX154_dig_final_block_pop_01 | One Shot | audio/sfx/digging/break/ | Final hit breaks block, compact impact then resource chunk pops free, satisfying short feedback, no music, no instruments, no voices.
GX155_dig_chain_break_reward_01 | One Shot | audio/sfx/digging/break/ | Chain dig block break reward, rock crack, dirt crumble, small mineral clack, short isolated game sound, no music, no melody, no instruments, no voices.
```

## Special Tile / Tile Interaction Sounds

```text
GX156_tile_cracked_stone_warning_01 | One Shot | audio/sfx/tiles/cracked_stone/ | Cracked stone tile warning, dry fracture line opens with small grit fall, short isolated tile sound, no music, no instruments, no voices.
GX157_tile_cracked_stone_break_01 | One Shot | audio/sfx/tiles/cracked_stone/ | Cracked stone tile breaks under pressure, brittle snap and chunk fall, isolated game sound, no music, no instruments, no voices.
GX158_tile_loose_sand_start_01 | One Shot | audio/sfx/tiles/loose_sand/ | Loose sand tile starts falling, grains slide and tiny dirt edge breaks, short isolated hazard sound, no music, no instruments, no voices.
GX159_tile_loose_sand_fall_01 | One Shot | audio/sfx/tiles/loose_sand/ | Loose sand tile falls down, soft granular cascade and dusty landing, isolated tile sound, no music, no instruments, no voices.
GX160_tile_pressure_plate_on_01 | One Shot | audio/sfx/tiles/pressure_plate/ | Stone pressure plate activates, heavy click and internal mechanism starts, short isolated tile sound, no music, no instruments, no voices.
GX161_tile_pressure_plate_off_01 | One Shot | audio/sfx/tiles/pressure_plate/ | Stone pressure plate releases, heavy click and mechanism resets, short isolated tile sound, no music, no instruments, no voices.
GX162_tile_ancient_lock_on_01 | One Shot | audio/sfx/tiles/ancient/ | Ancient lock tile activates, carved stone clicks and hidden latch engages, isolated puzzle sound, no music, no instruments, no voices.
GX163_tile_ancient_lock_fail_01 | One Shot | audio/sfx/tiles/ancient/ | Ancient lock tile rejects input, stone grinds and snaps back, short negative tile sound, no music, no instruments, no voices.
GX164_tile_lava_warning_01 | One Shot | audio/sfx/tiles/lava/ | Lava tile warning, hot stone crack and small molten hiss, short isolated hazard cue, no music, no instruments, no voices.
GX165_tile_lava_contact_01 | One Shot | audio/sfx/tiles/lava/ | Robot touches lava tile, hot contact hiss, small metal sizzle, short damage sound, no music, no instruments, no voices.
GX166_tile_ice_slide_01 | One Shot | audio/sfx/tiles/ice/ | Ice tile slide, metal foot skims slick frozen stone, short clean movement sound, no music, no instruments, no voices.
GX167_tile_ice_crack_01 | One Shot | audio/sfx/tiles/ice/ | Ice tile cracks, brittle frozen snap and small shards, short isolated hazard sound, no music, no instruments, no voices.
GX168_tile_magnet_on_01 | One Shot | audio/sfx/tiles/magnet/ | Magnet tile activates, metal pull snap and short magnetic pressure sound, isolated tile cue, no music, no instruments, no voices.
GX169_tile_magnet_release_01 | One Shot | audio/sfx/tiles/magnet/ | Magnet tile releases, metal tension drops and compact click, short isolated tile sound, no music, no instruments, no voices.
GX170_tile_bounce_pad_01 | One Shot | audio/sfx/tiles/bounce/ | Bounce pad tile launches robot, rubbery mechanical spring thump and air push, isolated movement sound, no music, no instruments, no voices.
GX171_tile_teleporter_start_01 | One Shot | audio/sfx/tiles/teleporter/ | Teleporter tile starts, compact energy snap, stone dust lift, short isolated tile sound, no music, no melody, no instruments, no voices.
GX172_tile_teleporter_arrive_01 | One Shot | audio/sfx/tiles/teleporter/ | Teleporter arrival, short pressure pop, dust falls, metal feet land lightly, isolated sound, no music, no instruments, no voices.
GX173_tile_void_crack_expand_01 | One Shot | audio/sfx/tiles/void/ | Void crack tile expands, stone fractures inward and air pressure collapses briefly, no music, no instruments, no voices.
GX174_tile_resource_node_spawn_01 | One Shot | audio/sfx/tiles/resource/ | Resource node appears inside rock, small mineral growth crackle and dirt displacement, short isolated sound, no music, no melody, no instruments, no voices.
GX175_tile_locked_block_unlock_01 | One Shot | audio/sfx/tiles/locked/ | Locked block unlocks, stone pins retract and heavy latch releases, satisfying isolated tile sound, no music, no instruments, no voices.
```

## Darkness / Someone Is Watching / Deep Presence

```text
GX176_darkness_torch_sputter_01 | One Shot | audio/sfx/darkness/ | Torch sputters in darkness, small flame choke, ash tick, brief weak fire sound, no music, no instruments, no voices.
GX177_darkness_light_fail_01 | One Shot | audio/sfx/darkness/ | Mining lamp fails briefly, electric click, weak glass tick, darkness cue, short isolated sound, no music, no instruments, no voices.
GX178_darkness_close_air_01 | One Shot | audio/sfx/darkness/ | Darkness pressure closes in, short physical air compression and tiny dust fall, no music, no instruments, no voices, no creature sounds.
GX179_darkness_deep_pebble_behind_01 | One Shot | audio/sfx/darkness/ | Single pebble drops behind the player in deep tunnel, tiny stone bounce, unsettling physical cue, no music, no instruments, no voices, no animals.
GX180_darkness_far_wall_tap_01 | One Shot | audio/sfx/darkness/ | Distant single tap behind underground wall, physical rock contact, short unsettling sound, no music, no instruments, no voices, no creatures.
GX181_watching_depth_stillness_01 | One Shot | audio/sfx/deep_presence/ | Someone is watching feeling without voice, tiny gravel shift stops suddenly behind stone, short physical cue, no music, no instruments, no voices, no creatures.
GX182_watching_depth_close_shift_01 | One Shot | audio/sfx/deep_presence/ | Close unseen movement behind rock wall, slow dirt scrape then silence, scary physical cave sound, no music, no instruments, no voices, no creatures.
GX183_watching_depth_far_shift_01 | One Shot | audio/sfx/deep_presence/ | Far unseen movement deep below, heavy stone shifts once and settles, unsettling depth cue, no music, no instruments, no voices, no creatures.
GX184_watching_depth_ceiling_grit_01 | One Shot | audio/sfx/deep_presence/ | Ceiling grit falls directly above player in darkness, tiny dirt rain and stone tick, no music, no instruments, no voices, no animals.
GX185_watching_depth_side_scrape_01 | One Shot | audio/sfx/deep_presence/ | Short scrape along side tunnel wall, stone against stone, hidden presence cue, no music, no instruments, no voices, no creatures.
GX186_darkness_heartbeat_fake_01 | One Shot | audio/sfx/darkness/ | Non-musical pressure thump in deep darkness, like rock pulse through stone, one short impact only, no music, no instruments, no voices.
GX187_darkness_battery_panic_01 | One Shot | audio/sfx/darkness/ | Battery panic cue, weak electric tick sequence and lamp glass rattle, short isolated game sound, no music, no rhythm, no instruments, no voices.
GX188_darkness_path_lost_01 | One Shot | audio/sfx/darkness/ | Path lost cue, small rocks slide behind player and air pressure changes, short physical sound, no music, no instruments, no voices.
GX189_darkness_return_warning_01 | One Shot | audio/sfx/darkness/ | Return warning in darkness, dry mechanical warning tick and tiny falling dust, no music, no melody, no instruments, no voices.
GX190_darkness_deep_breath_no_voice_01 | One Shot | audio/sfx/darkness/ | Deep cave air exhales through narrow crack, natural wind hiss only, scary darkness cue, no speech, no music, no instruments, no voices, no animals.
```

## Void / Star Formation / Galaxy Sounds

```text
GX191_void_gate_open_01 | One Shot | audio/sfx/void/ | Void gate opens inside deep stone, air pressure snaps inward, rock dust lifts, short strange physical sound, no music, no instruments, no voices.
GX192_void_gate_close_01 | One Shot | audio/sfx/void/ | Void gate closes, pressure collapses, stone fragments settle, short isolated cosmic cave sound, no music, no melody, no instruments, no voices.
GX193_void_tile_contact_01 | One Shot | audio/sfx/void/ | Robot touches void tile, dry static crack, gravity pop, tiny stone dust pull, short isolated hazard sound, no music, no instruments, no voices.
GX194_void_space_pressure_loop_01 | Loop | audio/ambience/void/ | Seamless loopable void cave foley, unstable air pressure, tiny stone particles drifting and settling, physical texture only, no music, no melody, no rhythm, no instruments, no voices.
GX195_star_formation_small_01 | One Shot | audio/sfx/cosmic/ | Small star formation sound, cosmic dust compresses with dry crystalline crackle and pressure pop, short isolated effect, no music, no melody, no instruments, no voices.
GX196_star_formation_large_01 | One Shot | audio/sfx/cosmic/ | Large star formation sound, gravity pressure build, crystal dust snaps into bright mass, high impact non-musical effect, no instruments, no voices.
GX197_galaxy_map_open_01 | One Shot | audio/sfx/cosmic/ | Galaxy map opens, mechanical observatory panel unfolds with tiny star-data ticks, short isolated UI sound, no music, no melody, no instruments, no voices.
GX198_galaxy_node_select_01 | One Shot | audio/sfx/cosmic/ | Galaxy node selected, clean crystalline tick and small gravity click, short isolated UI effect, no music, no melody, no instruments, no voices.
GX199_cosmic_resource_pickup_01 | One Shot | audio/sfx/cosmic/ | Cosmic resource pickup, small star-metal shard clinks and static dust crackles, short isolated reward sound, no music, no melody, no instruments, no voices.
GX200_black_hole_warning_01 | One Shot | audio/sfx/cosmic/ | Black hole warning cue, pressure drop, stone particles pull inward, single heavy gravity pop, no music, no instruments, no voices, no sustained tone.
```

---

# 11. Minimal Manifest Example

```json
{
  "dig.dirt.hit": {
    "bus": "sfx",
    "files": [
      "audio/sfx/digging/dirt/GX121_dig_soft_dirt_tap_01.ogg",
      "audio/sfx/digging/dirt/GX122_dig_soft_dirt_tap_02.ogg",
      "audio/sfx/digging/dirt/GX123_dig_packed_dirt_hit_01.ogg"
    ],
    "volume": 0.68,
    "pitchRandom": [0.94, 1.06],
    "cooldownMs": 45,
    "maxInstances": 3
  },
  "surface.day": {
    "bus": "ambience",
    "files": ["audio/ambience/weather_surface/WS001_surface_outside_day_dry_air_loop.ogg"],
    "loop": true,
    "volume": 0.16,
    "fadeMs": 1200
  },
  "darkness.accent": {
    "bus": "sfx",
    "files": [
      "audio/sfx/darkness/GX176_darkness_torch_sputter_01.ogg",
      "audio/sfx/deep_presence/GX181_watching_depth_stillness_01.ogg"
    ],
    "volume": 0.32,
    "pitchRandom": [0.92, 1.03],
    "cooldownMs": 12000,
    "priority": "low"
  }
}
```

---

# End Of Sound Library V3
