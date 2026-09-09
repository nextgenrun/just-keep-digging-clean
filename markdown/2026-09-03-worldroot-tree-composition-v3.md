# Taller, naturally coloured Root Sanctuary

Date: 2026-09-03. Presentation-only work in the canonical source checkout.

## Result and ownership

The default ground-only tree now has a taller neutral-bark skeleton, natural
green foliage, and clearly leafless dead branches. It is still a decorative
sanctuary around the real Campfire, not a climbable platform layout. No
collision, save schema, Star authority, upgrade prices, blessings, Ember
charges or Crown requirements changed in this pass.

- `values/worldrootSanctuary.js` owns the presentation settings.
- `WorldrootSanctuaryView` composes one trunk and five independent canopy
  regions from one shared living/dead artwork pair. Reusing pixels does not
  merge the regions' discovery or consumption state. Each living region now
  overlaps three offset/mirrored instances of the shared bush (15 total), while
  the dead state retains one readable branch silhouette per region.
- `WorldrootSanctuaryStars` keeps every known Star/scar as a separate game
  object using the existing identity atlas. Anonymous signals stay anonymous.
  Sorted region keys distribute across an organic spiral, including consumed
  keys, so death does not reshuffle survivors. Discovery can expand the layout.
- The extra SCREEN-blended Star light layer is disabled. Actual authored Star
  pixels remain unchanged; the tree has no baked Stars or coloured glow.
- Existing vines, ferns and falling leaves remain separately state-driven.
  Living movement stops in dead regions and respects reduced motion.

The main trunk begins at 78% mature width and 66% mature height. Discovery
contributes 45% of its growth progress (saturating at 50 known Stars), and the
ten Campfire tiers contribute 55%. Every paid Campfire upgrade increases both
dimensions. Mature trunk dimensions are 846 by 564 world pixels at 94 px per
tile, over 1.5 times the initial height. Consumption exposes a full-grown ruin
instead of shrinking the skeleton away.

Tree growth is anchored to the existing hearth. Ground Talent, Crown access,
Archive and fern footprints retain their original world positions; canopy
Stars and vines follow the growing transform. Existing Campfire sprites,
ten-stage sizes and Campfire/Ember mini-evolution presentations stay active.
The separately generated pending Campfire artwork was not promoted here.

## Artwork and approved processing

Active art: `sprites/environment/worldroot-sanctuary-v3/`.

- `trunk.png`: 1536 by 1024, neutral upright root pillars and open hearth arch.
- `foliage-living.png`: 1254 by 1254, restrained olive/forest-green crown.
- `foliage-consumed.png`: 1254 by 1254, charcoal leafless branch fan.
- `source/`: untouched generated masters, never loaded by the game.
- `generation.json`: exact built-in ImageGen prompts and source references.
- `manifest.json`: native dimensions, bounds, original/output SHA-256 and
  transparency metrics.

ImageGen supplied a painted neutral carrier instead of usable transparency.
The user explicitly approved local background and coloured-fringe removal
while preserving originals. `ai-tools/2026-09-03-build-worldroot-sanctuary-v3.mjs`
uses `values/worldrootSanctuaryArt.js` to extract alpha, clear enclosed carrier
gaps and unmix the background only at silhouette edges. Interior foreground
and native dimensions remain unchanged. The final manifest reports zero
detected carrier pixels and zero detected magenta contamination for all three
assets. The dead branch image has 40.7% of the living image's visible pixel
area, so death removes canopy volume rather than merely changing its hue.

The original V1/V2 artwork is retained. The old V1 importer now refuses to
write into the active V3 directory. Runtime preload deduplicates the shared
branch pair: ten unique Sanctuary textures including retained detail assets.

Rebuild and verify from the repository root:

```powershell
node ai-tools/2026-09-03-build-worldroot-sanctuary-v3.mjs
node testing/2026-09-03-worldroot-sanctuary-contract.mjs
```

## Surface framing

`world/playScene/worldrootSurfaceFraming.js` gives the nearby tree headroom,
easing the ground toward 79% of screen height. The effect is full within five
tiles of the hearth, fades by nine tiles, and returns to ordinary camera
follow underground. Zoom, HUD coordinates and player/interaction geometry are
not changed.

`CameraShakeSystem.setBaseFollowOffset` adds existing shake on top of the
framing offset and restores the baseline when shake stops. The helper resizes
the current deadzone rectangle rather than repeatedly calling Phaser's
`setDeadzone`, which also snaps scroll to the follow target. Scene setup
clears the transient framing state. The explicit legacy-tree routes do not
activate this framing.

## Verification

Seven focused contracts passed after the camera review:

1. `testing/2026-09-03-worldroot-sanctuary-contract.mjs`
2. `testing/2026-09-03-worldroot-framing-contract.mjs`
3. `testing/2026-08-29-camera-shake-gamefeel-contract.mjs`
4. `testing/2026-09-03-campfire-evolution-contract.mjs`
5. `testing/2026-09-03-campfire-buffered-interaction-contract.mjs`
6. `testing/2026-09-03-star-consumption-held-input-contract.mjs`
7. `testing/2026-08-20-player-jump-flight-motion-contract.mjs` (15 shared-input
   traversal cases included).

The source-server RoboPlay runs passed 34/34 phases. The latest three-bush run
completed in 274.9 seconds with zero fatal/error findings. Its report and
unedited screenshots are saved in `2026-09-03-tree-three-bushes-proof`, linked
below. It uses the current checkout's `serve.py 8081`,
a fresh browser context and `jkd_e2e` save suppression, not a dist snapshot or
the user's save.

The latest mature-tree state has 15 living bushes, three per region, with no
new texture asset. Its ground remains at screen Y 569 of 720, the highest Star
at Y 62, zoom 1 and zero extra Star lights. Initial, mature, independently
consumed and fully consumed screenshots were visually inspected. All three
original source hashes were checked against the manifest; scoped whitespace
validation passed.

Real inputs cover A/D ground walking, E blessings, a typed-and-held Star
destruction, nine paid Campfire upgrades and their mini-reveals, two generated
Ember seams and charge rules, Talent/Map/Archive/Crown interaction routes,
independent regional death, full death and restoration. Travel, funds, bulk
discovery/consumption and one Titan discovery are accelerated through existing
systems. Final Crown readiness is an explicitly labelled preview fixture.
This is not a full playthrough, legacy climbing-tree audit or all-Titans test.

- [Latest RoboPlay summary](<C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-tree-three-bushes-proof/summary.md>)
- [Structured report](<C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-tree-three-bushes-proof/report.json>)
- [Initial tree](<C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-tree-three-bushes-proof/03-sanctuary-dormant.png>)
- [Mature tree and tier-ten Campfire](<C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-tree-three-bushes-proof/24-sanctuary-campfire-10.png>)
- [One region consumed](<C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-tree-three-bushes-proof/31-sanctuary-killed-level1-blue.png>)
- [Completely consumed tree](<C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-tree-three-bushes-proof/32-sanctuary-killed-all.png>)

The latest run retained two warnings: the
game-wide decoded-texture estimate exceeded its 704 MiB watermark (1484.1 MiB),
and a Mossback Titan-chamber background request was cancelled with
`net::ERR_ABORTED`. Those are not a claim of repository-wide health or a
shipping performance benchmark. The full reports preserve the warning evidence.

## Review and rollback boundary

Normal source gameplay selects this new tree automatically. Do not use
`?worldrootArt=v3` to select these V3 Sanctuary assets: that existing query
deliberately restores the older composite climbing tree. Likewise,
`?worldrootArt=v4` and `?worldrootWhitebox=1` retain their legacy/review routes.
Original sources and previous runtime art are preserved; no user save was
rewritten, no dist snapshot was built, and no deployment was performed.
