# Underground Visual Differentiation Audit

## Outcome

The surface benchmark already has a strong far/mid/gameplay hierarchy. The
underground asset library contains substantial regional art, but the live scenic
runtime compresses most underground presentation into a dense backwall plus a
continuous terrain material inside a small darkness reveal. Biome identity is
there in palette and source files, but it is not consistently readable during
play.

The new review mockups are stored in
`visual-approval-previews/underground-layer-differentiation-v1/`.

## Current Library

- `sprites/backgrounds/`: 862 files, about 1.40 GB on disk.
- Active scenic production kits are concentrated in:
  - `world-visual-v2/` — surface, five Level 1 backwall families, semantic
    decals, and the first landmark pilot.
  - `world-scenic-facade-v1/` — continuous material families from shallow blue
    through starfire.
  - `start-zone-scenic-v1/` and `world-scenic-regions-v1/` — approved surface
    benchmark and terrain crop.
- The large V11 runtime/test/scale-correct packages remain valuable rollback,
  provenance, and source-art packages. They are not instantiated by the default
  scenic renderer and should not be mixed back into scenic mode ad hoc.
- Boot reported 15 scenic startup textures in the live run. Non-surface terrain
  materials and Level 1 backwalls stream on demand.

## Runtime Findings

1. `WORLD_VISUAL_MATERIAL_BANDS` provides ten continuous material bands from
   row 65 through row 5065, so solid terrain coverage is complete.
2. `WORLD_VISUAL_DEPTH_BACKDROPS` provides six Level 1 regions only, ending at
   row 2065. Level 2 currently has differentiated solid materials but no
   equivalent far-cavern backdrop regions.
3. Each Level 1 region primarily uses one opaque, detail-dense backwall family,
   plus a restrained mist and emissive duplicate. It does not have separately
   authored far-void and mid-silhouette assets.
4. Under the live darkness/torch stack, dug air often reads as pure black while
   the nearby solid terrain reads as a dense wall texture. This preserves danger
   but removes spatial depth and weakens biome recognition.
5. Blue, amber, silver, and magma changes are visible in close terrain color and
   resource accents, yet their composition and silhouette language stay similar.
6. The surface succeeds because it has a readable skyline, distant value
   grouping, warm landmark lights, and a clean gameplay baseline. Underground
   needs the same hierarchy without copying the surface brightness.

## Recommended Production Stack

For each region:

1. Opaque far-cavern plate with a clear value-grouping signature.
2. Transparent or separately masked mid-silhouette plate.
3. Existing authoritative material facade, clipped by `WorldModel` solidity.
4. Existing semantic resource/special/damage layers.
5. Region-specific emissive companion and low-alpha atmosphere.
6. Small pooled foreground silhouette set, restricted to screen/world edges.
7. Darkness/torch compositing that reveals the far plane at a lower intensity
   than the gameplay plane and keeps everything outside visibility hard black.

## Region Signatures

- Blue Caverns: large cold voids, crystalline silhouettes, cyan navigation
  anchors, cool mist.
- Amber Depths: warm mineral windows, timber remnants, suspended dust, localized
  gold light against cool charcoal shadow.
- Silver Core: broad pale mineral ribs, low-saturation blue-white glints, sparse
  reflective haze.
- Level 1 Magma: basalt arches, deep red heat seams, ember pockets, no flat red
  grade.
- Pressure Foundry: vertical machinery silhouettes, furnace depth, steam,
  chains, and localized industrial light.
- Blackglass/Starfire: near-black reflective masses, violet/blue rift light, very
  sparse high-energy anchors.

## Safe Implementation Sequence

1. Select one mockup direction.
2. Author far, mid, and emissive production plates at the existing 1536x1024
   logical card contract.
3. Extend the backdrop descriptor to accept separate planes and region-specific
   parallax/motion values.
4. Prove the stack in one Level 1 band behind a narrow query flag.
5. Validate native density, camera-edge crops, torch visibility, transitions,
   texture residency, and FPS.
6. Extend the same contract through Level 2, which is the current largest
   presentation gap.

## Invariants

- No visual layer mutates `WorldModel`.
- Solid/air, HP, resources, collision, drops, and saves remain authoritative.
- No legacy Tiled/V11 master stack is mixed into scenic mode.
- No mockup is runtime art until it is split, optimized, registered, and live
  validated.
