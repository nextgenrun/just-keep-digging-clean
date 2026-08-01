# Review-only implementation map

Status: pending visual approval. Nothing in this package is wired into Phaser.

## Non-negotiable runtime contract

- World tiles, collision, damage, saves, light reveal radius, ability timing,
  hazard timing, and UI hit areas remain authoritative in existing code.
- Approved art may present an event or state; it may not redefine that event or
  state.
- Production must never load directly from `visual-approval-previews`.
- Later promotion copies only explicitly approved IDs into a separate,
  family-specific runtime pack.
- The complete 10,000-file library is a review and selection pool. It is never
  a preload target.
- Solid in-world interactable object state sprites are intentionally excluded
  so this library does not overlap the separately coordinated object library.

## Where and how each family would be used

| Family | Proposed consumer | Runtime moment | Draw/blend proposal | Integration shape | Main risk |
|---|---|---|---|---|---|
| Earth, stone, metal, crystal, and volcanic mining | `DigSystem`, PlayScene mining-feedback dispatch, tile-destruction presentation | First contact, repeated hit, final break, overkill | World front around existing mining FX; `NORMAL` debris with restrained additive sparks | Material atlas; pooled one-shot sprite; event frame locked to the actual damage result | Art origin drifting away from the struck tile or implying damage on unbreakable material |
| Quickslash | Ability runtime and authored player-animation event marker | Charge, swing, contact, combo, insufficient GP | Player-front; additive arc, normal fragments | One atlas; horizontal direction remains runtime-owned; no baked mirrored library | Arc reach or peak frame disagreeing with the character sheet and damage event |
| Thunder Strike | `ThunderStrikeImpactFxSystem` and chain timing | Charge, bolt descent, slam, chain echo, finale | Additive world-front with a strictly capped flash layer | One staged sequence per authoritative chain stage | Strobe, excessive white clipping, or visual escalation diverging from chain timing |
| Teleport and powered flight | `SpecialTileSystem`, teleport runtime, `FlightFootParticleSystem` | Departure, transit, arrival, ignition, hover, shutdown | Player-front additive/screen | Cancelable one-shots; reposition and cleanup must be atomic | Orphan particles at the old location or trails implying an unsafe landing |
| Heavy Punch, Gem Power, and Arc Core effects | Dig/ability result path and GP spend/recovery events | Charge, paid activation, impact, failure, recovery | Normal fracture plus additive energy core | Result-driven one-shots; effects never decide damage or cost | Charge, spend, failure, and actual damage becoming visually ambiguous |
| Rewards and discoveries | `LootPickupFxSystem`, relic, star, pillar, titan, combo, and gamble presentation | Pickup, reveal, attunement, milestone | Normal dust/fragments plus additive glints/rings | Rarity-tiered one-shots with explicit event ownership | Ordinary pickups becoming as loud as relic, titan, or constellation events |
| Rain, snow, wind, and storm | Existing weather controllers and collision samplers | Fall, ground/ceiling impact, ripple, steam, lightning | Weather depths 56-58; normal alpha; additive lightning only | Current-weather atlas loaded on demand; emitter pooling and density tiers | Overdraw, collision-alignment drift, opaque storms, photosensitive flashing |
| Underground ambience and biome identity | `AmbientParticleSystem`, cave/deep-world presentation | Continuous low-density regional atmosphere | Beneath major gameplay FX; normal alpha plus tiny additive mineral accents | Region-selected pooled emitters, hard count cap, FPS gate | Visual noise, too many emitters, and material readability loss |
| Graveborer and cave hazards | Wurm visual system and `CaveHazardView` | Warning, breach/pass, gate, spike, vent, impact | Hazard layers at their current configured depths | Footprint-locked frames driven only by authoritative hazard state | A beautiful telegraph lying about collision area, tangent, or timing |
| Earthquake and danger telegraphs | Existing earthquake warning/impact views | Warning, ceiling fracture, fall, impact, rubble return | Normal world hazard layers with a restrained warning edge | Exact-footprint state sequences | Warning art leading or lagging mutation/collision timing |
| Decorative light companions | `LightSystem`, steady-light renderer, owner-local auras | Torch, flight, crystal, portal, relic, pillar, titan, cave identity | Additive companion close to existing darkness/light layers | Visual child of an existing authoritative light source | Double lighting, white clipping, or increasing gameplay reveal radius |
| Core UI chrome | `UiModalShell`, `PhaserUiKit`, Settings, Shop, Inventory, Journey, Archive | Modal, panel, card, button, tab, slider, toggle | Fixed UI, normal blend; small additive focus edge only | Nine-slice/cap-inset components with explicit safe areas | Distortion, state geometry jumping, text collision, hit-area mismatch |
| HUD and state feedback | `HUDSystem`, notifications, ability readiness, Hardcore status | Resource, cooldown, warning, success, failure, objective, save | Fixed HUD depth; normal blend with limited ready/reward accents | Geometry-locked state sets; values and text remain code-rendered | Semantic ambiguity, color-only communication, excessive HUD occupation |
| Inventory, talent, journey, map, shop, archive, and recap states | Existing overlay views | Hover, selected, locked, affordable, current, complete, danger | Fixed modal UI | Empty frames only; existing code supplies icons, labels, values, and hit targets | Generated frames silently redefining navigation or content layout |

## Loading and memory plan

The review package contains 10,000 normalized 320x256 RGBA images. If all were
decoded simultaneously they would occupy about 3.052 GiB before atlas overhead.
That is intentionally unacceptable as a runtime strategy.

Later production promotion would use this topology:

1. Boot loads only the small approved core HUD/UI set.
2. Player ability atlases load when the player profile/ability becomes
   available.
3. Mining atlases load by active material band and unload after the stream
   retention window.
4. Weather loads only the current precipitation family.
5. Cave/Wurm/hazard atlases load on cave entry and release on exit.
6. Biome ambience loads by current streamed region.
7. Relic, titan, and major discovery assets load immediately before their
   presentation and release afterward.
8. Modal-specific UI packs load when the owning overlay first opens.

Before promotion, every shortlisted family receives a real atlas-packing and
telemetry pass. No atlas or memory cap is considered approved until it is tested
against current performance telemetry and the low-quality presentation mode.

## Derivative safety

Each of the 1,000 authored sources has exactly nine first-generation variants:

- restrained
- emphasized
- shadow-safe
- highlight-safe
- cool-context
- warm-context
- compact-read
- broad-read
- detail-alt

All variants start from the canonical source, never from another variant.

- UI and hazard geometry, alpha support, anchors, and canvas remain locked.
- Directional effects are not rotated or mirrored.
- Ability signature colors and material identity colors remain protected.
- Light variants cannot change authoritative reveal radius.
- Five-frame sequences use one group-wide recipe and deterministic seed.
- No solid in-world interactable object states are derived here.

## Approval evidence required before wiring

1. Exact 10,000-file count and complete source-to-variant lineage.
2. Chroma, alpha, transparent-corner, clipping, duplicate, and hash checks.
3. Authored-source sheets plus 100 lineage matrices.
4. Current-game before/proposed context boards for mining, abilities, weather,
   ambience, hazards, lighting, HUD, and modal UI.
5. Every context board watermarked `REVIEW COMPOSITE — NOT WIRED`.
6. Zero requests for this review folder in the live game and zero related
   Phaser cache keys.
7. Production asset discovery returns zero review paths and zero candidate
   hash matches.
8. User approval recorded per asset or per explicitly bounded family; no
   implicit approval of the whole library.

## Promotion sequence after approval

1. Record approved candidate IDs and rejected/needs-edit IDs.
2. Copy only approved source/profile files into a new runtime package.
3. Pack atlases per consumer and scene lifetime.
4. Add explicit asset keys and on-demand loaders.
5. Wire one family at a time behind a presentation rollback flag.
6. Verify in live gameplay at real scale, darkness, weather, and UI density.
7. Measure texture residency, draw calls, emitter counts, and frame time.
8. Keep the procedural/current fallback until the approved family passes.

