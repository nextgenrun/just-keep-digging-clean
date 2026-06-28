# Sound Library V2 — Digging Game

This document is the working source of truth for the expanded game sound library.

Use it to track Suno generations, accepted files, rejected files, filenames, folders, and later implementation in the game audio manifest.

---

## 1. Core Audio Goals

The game should feel like a living digging world without becoming noisy or musical.

Main priorities:

- Stronger digging, breaking, collapse, cave-in, and resource feedback.
- Separate outside, town, building, underground, and deep-layer sound behavior.
- Weather should be layered, not baked into every environment.
- Deep areas should become scary through physical cave sounds, not horror music.
- Every common action should have multiple variations.
- Loops should be quiet and stable; one-shots should carry impact.

Avoid accidental music:

- Do not request music, cinematic tone, score, melody, rhythm, instruments, ambience pad, drone, or vocal texture.
- Prefer physical words: dirt, rock, gravel, pressure, crack, collapse, scrape, drip, hiss, metal, crystal.
- For scary sounds, describe physical underground events instead of saying “horror music.”

---

## 2. Suno Sound Settings

For short effects:

```text
Type: One Shot
BPM: blank or Auto
Key: blank or Any
```

For continuous layers:

```text
Type: Loop
BPM: blank or Auto
Key: blank or Any
```

For loops that keep producing weird synthetic hums:

```text
Generate as One Shot instead.
Trim the cleanest 2–8 seconds.
Loop manually in the game with a small crossfade.
```

---

## 3. Review Tags

Use these exact tags when manually checking Suno outputs:

```text
UNTESTED
GOOD
GOOD_LAYER_ONLY
GOOD_ONE_SHOT
GOOD_BUT_NEEDS_TRIM
GOOD_BUT_TOO_LOUD
GOOD_BUT_NEEDS_EQ
KEEP_FOR_OTHER_USE
KEEP_FOR_DEEP_LAYER
KEEP_FOR_BOSS_AREA
TOO_LONG
TOO_SHORT
TOO_MUSICAL
ROBOT_HUM
TOO_SYNTHETIC
TOO_CARTOON
TOO_REALISTIC_LOUD
TOO_BUSY
WRONG_SOURCE
WRONG_ENVIRONMENT
WRONG_SOUND
REJECT
```

Suggested manual review columns:

```text
asset_id,status,selected_file,notes,trim_start,trim_end,volume_hint,loop_ok
```

---

## 4. Folder Structure

Recommended folder layout:

```text
audio/
  ambience/
    surface/
    town/
    building/
    underground/
    depth/
  weather/
    rain/
    wind/
    thunder/
  sfx/
    digging/
    blocks/
    pickups/
    cavein/
    earthquake/
    rockfall/
    hazards/
    tools/
    robot/
    ancient/
    scary_depth/
    surface_foley/
  ui/
  voice/
  music/
```

For this batch specifically:

```text
audio/sfx/cavein/
audio/sfx/earthquake/
audio/sfx/rockfall/
audio/sfx/digging/
audio/sfx/blocks/
audio/sfx/pickups/
audio/sfx/tools/
audio/sfx/robot/
audio/sfx/hazards/lava/
audio/sfx/hazards/water/
audio/sfx/hazards/gas/
audio/sfx/hazards/electric/
audio/sfx/ancient/
audio/sfx/scary_depth/
audio/ambience/depth/
```

---

## 5. Naming Rules

Use snake_case.

One-shot examples:

```text
DI007_cavein_large_collapse_01.wav
DI018_earthquake_large_01.wav
DI030_block_stone_break_big_01.wav
DI074_robot_crushed_01.wav
```

Loop examples:

```text
DI161_depth_ambience_stone_pressure_loop.wav
DI170_depth_ambience_lava_distance_loop.wav
```

Final in-game filename rule:

```text
<asset_id>.<ext>
```

Preferred production format:

```text
Source archive: .wav
Game runtime: .ogg or .mp3 depending engine support
```

---

## 6. Game Audio Buses

Suggested buses:

```text
master
sfx
ambience
weather
ui
voice
music
```

Recommended starting volumes:

```text
master: 1.00
sfx: 0.85
ambience: 0.35
weather: 0.45
ui: 0.70
voice: 0.80
music: 0.00 for now
```

Depth ambience should usually be quiet:

```text
depth ambience loops: 0.12 to 0.30
scary depth one-shots: 0.35 to 0.75
cave-in / earthquake impact: 0.70 to 1.00
```

---

## 7. Manifest Shape For Implementation

Use this later when integrating into the game:

```json
{
  "cavein.large_collapse": {
    "bus": "sfx",
    "files": [
      "audio/sfx/cavein/DI007_cavein_large_collapse_01.ogg"
    ],
    "volume": 0.95,
    "pitchRandom": [0.96, 1.04],
    "cooldownMs": 250
  },
  "depth.ambience.stone_pressure": {
    "bus": "ambience",
    "files": [
      "audio/ambience/depth/DI161_depth_ambience_stone_pressure_loop.ogg"
    ],
    "loop": true,
    "volume": 0.22,
    "fadeMs": 1500
  }
}
```

---

## 8. Batch Status Overview

Current generated prompt batches:

```text
WS-001 to WS-100: Weather / Surface / Town / Building / Wind / Rain / Thunder / Small Foley
DI-001 to DI-200: Depth Impact / Cave-In / Hazards / Ancient / Scary Depth
```

This document currently stores the full DI-001 to DI-200 prompt batch and the organization rules for both batches.

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

# Priority Test Order

Start with these first:

```text
DI007_cavein_large_collapse_01
DI018_earthquake_large_01
DI030_block_stone_break_big_01
DI032_block_crystal_shatter_big_01
DI074_robot_crushed_01
DI105_water_rush_large_01
DI125_gas_ignition_large_01
DI142_ancient_door_open_01
DI161_depth_ambience_stone_pressure_loop
DI181_scary_depth_far_impact_01
```

Then test common gameplay sounds:

```text
DI021_pickaxe_dirt_heavy_01
DI023_pickaxe_stone_heavy_01
DI025_pickaxe_ore_heavy_01
DI027_pickaxe_crystal_heavy_01
DI041_ore_vein_exposed_01
DI047_gem_large_found_01
DI071_robot_heavy_land_dirt_01
DI073_robot_damage_heavy_01
```

---

# Review Sheet Template

Copy this into a spreadsheet or keep it under each batch:

```csv
asset_id,status,selected_file,notes,trim_start,trim_end,volume_hint,loop_ok
DI001_cavein_pebble_warning_01,UNTESTED,,,,,,
DI002_cavein_dust_fall_01,UNTESTED,,,,,,
DI003_cavein_crack_start_01,UNTESTED,,,,,,
```

---

# Implementation Notes

In-game randomized variants should work like this:

```text
play("dig.stone.heavy") chooses one of:
DI023_pickaxe_stone_heavy_01
DI024_pickaxe_stone_heavy_02
DI036_block_granite_hit_01
DI038_block_basalt_hit_01
```

Use cooldowns to stop spam:

```text
dig sounds: 35–70 ms cooldown
pickup sounds: 50–120 ms cooldown
rockfall accents: 500–2000 ms cooldown
scary depth accents: 8000–45000 ms cooldown
```

Use pitch randomization:

```text
common digging: 0.94 to 1.06
stone impacts: 0.96 to 1.04
large cave-ins: 0.98 to 1.02
UI sounds: 1.00 only or very small variation
```

Depth scary system idea:

```text
Depth tier 1: no scary accents
Depth tier 2: rare rock shifts
Depth tier 3: pressure pops and distant collapses
Depth tier 4: ancient mechanism sounds and deep impacts
Depth tier 5: final depth ambience plus rare scary cues
```

Example scary depth schedule:

```text
Every 20–60 seconds at deep layers:
choose one low-priority scary_depth one-shot
play at random volume 0.18–0.45
never play if cave-in or earthquake just happened
```

---

# End Of Sound Library V2
