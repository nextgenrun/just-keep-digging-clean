# Start Zone Scenic Background V1

Approved NPC-town benchmark package derived from the accepted 2026-07-15
image-generation mockup. It is the minimum visual-quality reference for the
scenic surface runtime.

- `npc-town-scenic-composite-v1.webp` is the original approved clean scenic plate:
  moonlit sky, layered cloud/mountain/forest depth, and the detailed amber-lit NPC
  town.
- `npc-town-scenic-composite-v2.webp` preserves that plate 1:1 across its original
  span and adds a mirrored right-edge continuation, preventing a hard viewport edge
  without stretching doors, buildings, or atmospheric detail.
- `npc-town-far-background-v1.webp` is retained as the clean far-distance source
  variant for a future independently parallaxed layer pass.
- `town-square-slate-strip-v3.png` is the current production promotion of
  approved village floor Option A. Its 1672x48 opaque core is cropped
  pixel-exactly from the approved mockup, preserving the wet paving and only
  the restrained upper stone lip. A 129 px mirrored alpha handoff extends the
  asset to 1801x48 after the approved core. The deeper v2 facade and separately
  generated v1 approximation remain unloaded.
- `town-benchmark-v1` is the default scenic surface pack. Runtime validates the v2
  plate at 1801x941, crops it at source Y 534, and uniformly scales it from the
  shared 1.75 m midpoint player reference so the measured 75 px lintel-to-threshold
  opening reads as 2.10 m. The beauty and approved floor align across roughly 23.05
  world tiles; the floor stays at essentially native density and only about 0.61
  tile tall.
- Earth is rendered separately from the upper beauty crop. The pack samples the
  approved 14x10 Level 1 ground facade and clips it through the authoritative solid
  terrain mask, so mining opens exact cell-shaped holes without falling back to a
  visible square-tile presentation.
- The Option A floor uses that same borrowed mask above terrain semantics and
  below damage feedback, so random depth decoration cannot bleed through the
  foundation while players, NPCs, and gameplay feedback remain above it.
- Lightning adds restrained SCREEN response to the upper plate and ground; wet
  weather adds a low-alpha cool response to the ground. Weather changes never own
  terrain or gameplay state.
- Collision, tile HP, digging, damage states, drops, air holes, resources, special
  blocks, the player, NPCs, signs, weather logic, and HUD remain live Phaser systems
  backed by `WorldModel`.
- Runtime rollback: `?surfacePack=current-v2` restores the previous split scenic
  surface assembly. The older `?townScenic=0` selector is not the rollback for this
  pack.
- Scope remains the NPC surface start zone while this benchmark composition is
  validated for later world-wide visual matching.
