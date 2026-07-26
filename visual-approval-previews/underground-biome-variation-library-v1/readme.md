# Underground Biome Variation Library V1

Fifty review-only gameplay mockups for increasing underground and background
variation across every live material band without changing digging, collision,
save data, HUD layout, player scale, or the hard-black exploration contract.

- `reviewOnly: true`
- `productionChanged: false`
- Generated with the built-in ImageGen workflow on 2026-07-26.
- Edit target:
  `ai-tools/2026-07-17-steam-screenshot-04-torchlit-depths.png`.
- Output count: 50 PNG mockups.
- Prompt manifest:
  `2026-07-26-imagegen-prompt-manifest.md`.
- Placement plan:
  `../../markdown/2026-07-26-underground-biome-variation-placement-map.md`.

Nothing in this folder is preloaded, registered, or referenced by Phaser.

## Coverage Matrix

Each live depth band receives five deliberately different composition types:

1. **Open chamber** — broad negative space and a strong far-wall identity.
2. **Vertical shaft** — strong vertical rhythm and depth scale.
3. **Landmark vista** — one memorable, non-interactive navigation anchor.
4. **Threshold** — a controlled geological or industrial transition into the
   next band.
5. **Dense passage** — local storytelling and close material variety.

| Mockups | Live material band | Rows | Review identity |
|---|---|---:|---|
| 01-05 | `surface-earth` | 65-159 | Weathered Roots |
| 06-10 | `level1-shallow` | 160-519 | Blue Caverns |
| 11-15 | `level1-amber` | 520-1039 | Amber Depths |
| 16-20 | `level1-silver` | 1040-1599 | Silver Core |
| 21-25 | `level1-deep-magma` | 1600-2064 | Core Magma |
| 26-30 | `level2-magma` | 2065-2664 | Slagworks |
| 31-35 | `level2-obsidian` | 2665-3264 | Obsidian Catacombs |
| 36-40 | `level2-foundry` | 3265-3864 | Pressure Foundry |
| 41-45 | `level2-blackglass` | 3865-4464 | Blackglass Abyss |
| 46-50 | `level2-starfire` | 4465-5064 | Starfire Rift |

## Where These Fit

These PNGs are whole-screen art-direction composites, not drop-in runtime
textures. An approved direction should be split into production planes:

1. Far backwall card at the current `backwallDepth: -6.4`.
2. Optional new mid-silhouette card near `-6.25`.
3. Localized emissive companion at the current `emissiveDepth: -6.1`.
4. Low-alpha atmosphere at the current `mistDepth: -5.8`.
5. Existing cave backdrop at `caveBackdropDepth: -3.5`.
6. Existing authoritative solid facade at `terrainDepth: 0.1`.
7. Existing terrain edge, semantic, damage, resource, feedback, and darkness
   layers above it.

The current 1536x1024 logical card footprint and one-neighbor streaming contract
remain suitable. Level 1 already has backdrop descriptors through row 2064.
Level 2 currently has material facades but no equivalent regional far-backdrop
descriptors, so mockups 26-50 address the largest live presentation gap.

## Suggested Runtime Distribution

- Open chamber: common scenic card, roughly 25-30% of non-transition cards.
- Vertical shaft: roughly 15-20%, selected by deterministic segment hashing.
- Landmark vista: authored sparingly, normally one anchor sequence per band.
- Threshold: restricted to the final 10-15% of its named band.
- Dense passage: roughly 30-35%, alternating with open cards.

The exact weights are provisional. They should live in `values/`, be
deterministic for a saved world, and remain presentation-only.

## Mockup Index

### 01-05 — Weathered Roots

- `2026-07-26-01-weathered-roots-root-cathedral-v1.png`
- `2026-07-26-02-weathered-roots-rainwell-shaft-v1.png`
- `2026-07-26-03-weathered-roots-buried-shrine-v1.png`
- `2026-07-26-04-weathered-roots-blue-earth-threshold-v1.png`
- `2026-07-26-05-weathered-roots-timber-nursery-v1.png`

### 06-10 — Blue Caverns

- `2026-07-26-06-blue-caverns-crystal-cathedral-v1.png`
- `2026-07-26-07-blue-caverns-glacier-shaft-v1.png`
- `2026-07-26-08-blue-caverns-moonwell-grotto-v1.png`
- `2026-07-26-09-blue-caverns-amber-fault-threshold-v1.png`
- `2026-07-26-10-blue-caverns-fossil-river-v1.png`

### 11-15 — Amber Depths

- `2026-07-26-11-amber-depths-honeycomb-hall-v1.png`
- `2026-07-26-12-amber-depths-resin-fall-shaft-v1.png`
- `2026-07-26-13-amber-depths-miner-sanctum-v1.png`
- `2026-07-26-14-amber-depths-silver-vein-threshold-v1.png`
- `2026-07-26-15-amber-depths-buried-railworks-v1.png`

### 16-20 — Silver Core

- `2026-07-26-16-silver-core-ribbed-basilica-v1.png`
- `2026-07-26-17-silver-core-quicksilver-shaft-v1.png`
- `2026-07-26-18-silver-core-mirror-floor-vista-v1.png`
- `2026-07-26-19-silver-core-magma-seam-threshold-v1.png`
- `2026-07-26-20-silver-core-fossil-machine-v1.png`

### 21-25 — Core Magma

- `2026-07-26-21-core-magma-basalt-cathedral-v1.png`
- `2026-07-26-22-core-magma-emberfall-shaft-v1.png`
- `2026-07-26-23-core-magma-heart-forge-vista-v1.png`
- `2026-07-26-24-core-magma-slagworks-threshold-v1.png`
- `2026-07-26-25-core-magma-charred-rail-vault-v1.png`

### 26-30 — Slagworks

- `2026-07-26-26-slagworks-furnace-nave-v1.png`
- `2026-07-26-27-slagworks-chainlift-shaft-v1.png`
- `2026-07-26-28-slagworks-titan-crucible-v1.png`
- `2026-07-26-29-slagworks-obsidian-threshold-v1.png`
- `2026-07-26-30-slagworks-ruined-conveyor-v1.png`

### 31-35 — Obsidian Catacombs

- `2026-07-26-31-obsidian-catacomb-vault-v1.png`
- `2026-07-26-32-obsidian-razor-shaft-v1.png`
- `2026-07-26-33-obsidian-monolith-sanctum-v1.png`
- `2026-07-26-34-obsidian-foundry-threshold-v1.png`
- `2026-07-26-35-obsidian-glass-forest-v1.png`

### 36-40 — Pressure Foundry

- `2026-07-26-36-pressure-foundry-machine-cathedral-v1.png`
- `2026-07-26-37-pressure-foundry-pipe-shaft-v1.png`
- `2026-07-26-38-pressure-foundry-turbine-vista-v1.png`
- `2026-07-26-39-pressure-foundry-blackglass-threshold-v1.png`
- `2026-07-26-40-pressure-foundry-boiler-graveyard-v1.png`

### 41-45 — Blackglass Abyss

- `2026-07-26-41-blackglass-reflection-hall-v1.png`
- `2026-07-26-42-blackglass-prism-shaft-v1.png`
- `2026-07-26-43-blackglass-eclipse-window-v1.png`
- `2026-07-26-44-blackglass-starfire-threshold-v1.png`
- `2026-07-26-45-blackglass-shattered-observatory-v1.png`

### 46-50 — Starfire Rift

- `2026-07-26-46-starfire-rift-cosmic-cathedral-v1.png`
- `2026-07-26-47-starfire-rift-comet-shaft-v1.png`
- `2026-07-26-48-starfire-rift-understar-vista-v1.png`
- `2026-07-26-49-starfire-rift-infernal-threshold-v1.png`
- `2026-07-26-50-starfire-rift-ancient-orrery-v1.png`

## Approval Boundary

Promotion requires selecting specific mockups, authoring native 1536x1024
far/mid/emissive assets, extending the backdrop descriptor where needed, and
validating transitions, torch visibility, camera crops, texture residency, and
FPS behind a reversible query flag.
