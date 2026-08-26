# Environment Sprites

Runtime art for world-space environmental actors and effects.

- `approved-pillars-v1/`: approved Milestone and Star Pillar progression sprites.
- `graveborer-wurm-v1/`: Graveborer Wurm parts.
- `star-block-crystal-v2/`: six active normalized ImageGen crystal cores shared
  exactly by the Star Block tile atlas and its mined release.
- `star-block-idle-v1/`: three OpenRouter-derived, motion-only neutral caustic
  loops layered over all 250 exact Star identities, with a compact 72-frame
  atlas, source/cost provenance, pixel contracts, preview, and `?starIdle=0`
  rollback.
- `star-block-destruction-v1/`: retained high-resolution core masters plus the
  six active asymmetric crystalline break blooms.
- `star-block-pulse-v1/`: six ImageGen-authored, rarity-coloured additive
  sprites for the rare long-range Star Block beacon.
- `star-identities-v1/`: six transparent ImageGen atlases containing fifty
  named colour identities with distinct crystal/light art. Exact frames are
  shared by world Stars, darkness light, mined releases, discovery popups, and
  the I-key Star Atlas; runtime tinting is forbidden.
- `star-identities-v2/`: the active 250-light library. It preserves the V1
  frames, adds fourteen built-in ImageGen source sheets, and compiles six
  capped 256 px atlases shared by the world, light, release, popup, and paged
  Star Atlas routes.
- `surface-props-v1/`: physically scaled, independent Level 1/Level 2 surface props.
- `surface-props-v2/`: seven additive moon-free Level 2 chapter anchors that
  build on the v1 kit without replacing it.
- `surface-sky-props-v3/`: ten lossless-alpha atlases containing 140 additive
  Level 2 surface props and 60 portal-island/Heavenblock props, plus ImageGen
  sources, prompt provenance, exact placements, hashes, and rollback notes.
- `heavenblocks-sky-altars-v1/`: nine ImageGen-authored RGBA surface altars,
  with dormant, attuning, and awakened art for each upward route.
- `ground-damage-imggen-v1/`: review-first twelve-state ImageGen fissure atlas
  for continuous, material-neutral ground damage; production promotion remains
  blocked pending real-material visual approval.
- `v11-skyline-weather-vfx-v1/`: approved skyline atmosphere plus the compact
  ImageGen world-precipitation sheet and its provenance manifest.
- `fire-light-v3/`: ten 4x4 production ImageGen atlases for carried flame,
  state, rays, atmosphere, and 96 authored illumination frames; the expanded
  80-frame light-only family has exact hashes, true-black cell borders, and an
  isolated `?fireLightTextures=0` rollback. Ten editable Piskel authorities
  now remove grid-row drift with source-root, luminous-core, or state-row
  registration and retain a byte-exact asset rollback.
- `old-school-lamp-light-v1/`: seven conditional 4x4 ImageGen atlases for the
  physical safety lamp, shielded volume, reflector rays, glass-rib penumbra,
  floor bounce, hot core, and sparse atmosphere. The 112-frame package keeps
  source masters, prompts, fixed-anchor editable Piskels, hashes, and original
  rollback; it loads only with `?carriedLightStyle=lamp-review`.

Each asset family keeps its own provenance and usage notes in its subfolder.
