# High-impact library v2 implementation and risk map

Status: the 10,000-file catalog is review-only. Three zero-warning Thunder
Strike sources were copied into `sprites/fx/high-impact-v1/` as a bounded
runtime pilot; the game never loads from this review directory.

## Runtime contract

- Existing gameplay owns collision, damage, resource cost, save state, timing,
  light reveal radius, UI values, and UI hit areas.
- Art presents an authoritative event or state; it never creates or changes it.
- Promote explicit candidate IDs only. Never preload or bulk-copy this library.
- A promoted family retains its existing procedural/current presentation as a
  rollback until live gameplay and performance checks pass.
- Solid in-world interactable object states are excluded to avoid overlap with
  the separately coordinated interactable-object library.

## Where each library lane belongs

| Library lane | Masters | Intended runtime consumers and use |
|---|---:|---|
| Mining contact, material break, and reject states | m01-m02, m12-m15 | `DigSystem` and mining-feedback dispatch. Register each one-shot to the struck tile and authoritative damage result. |
| Abilities, locomotion, damage, and recovery | m03, m16-m21 | Quickslash, Thunder Strike, teleport, flight, Heavy Punch, GP/Arc Core, and player-state presentation. Trigger from existing animation/result events. |
| Rewards and discoveries | m04 | `LootPickupFxSystem` plus relic, star, pillar, titan, combo, and gamble presentation. Use rarity-bounded one-shots. |
| Weather, cave ambience, machinery, and biome identity | m05, m10-m11, m22-m25, m29, m33-m35 | Existing weather controllers, collision samplers, ambient systems, and streamed region attachment points. Pool and load only the active weather/region family. |
| Decorative light companions | m08, m26-m27 | `LightSystem`, steady-light rendering, and owner-local auras. Additive presentation only; never increase gameplay reveal radius. |
| Wurm, earthquake, cave hazards, and danger telegraphs | m09, m28, m30-m32 | Existing hazard views. Footprint, timing, tangent, and collision remain authoritative in hazard systems. |
| Core UI, HUD, inventory, talent, Hardcore, shop, map, and archive states | m06-m07, m36-m41 | Existing UI/HUD views. Use geometry-locked empty frames/state chrome; code continues to supply text, values, icons, navigation, and hit targets. |

Each master entry in `manifest.json` records its exact `consumer`,
`layerBlend`, and `primaryRisk`.

## The 10,000 files

- 1,000 canonical authored sources.
- Nine first-generation context variants per source: restrained, emphasized,
  shadow-safe, highlight-safe, cool-context, warm-context, compact-read,
  broad-read, and detail-alt.
- Variants are alternatives for a specific scene/readability need. They are not
  simultaneous layers and are never chained from another variant.
- All canvases remain 320x256. UI/hazard geometry, anchors, alpha support,
  direction, signature colors, and sequence grouping stay locked.

Decoded together, the catalog would consume about 3.052 GiB before atlas
overhead. Production promotion therefore uses family atlases, explicit IDs,
scene-lifetime lazy loading, bounded residency, and release on scene/region exit.

## Slicing gate

- Packaging/lineage validation: 1,000 sources, 9,000 derivatives, exactly nine
  children per source, zero lineage/status mismatches.
- Current source statuses: 720 pending review, 279 quarantined, one rejected.
- A quarantined/rejected source propagates that status to every derivative.
- The cave-ambient m24 set remains quarantined because its faint art shares a
  baked semitransparent square matte that cannot be removed safely by automatic
  chroma extraction.
- No quarantined, rejected, or structurally warned source may be promoted.

## Wired Thunder pilot

| Promoted source | Runtime use |
|---|---|
| `a0048-thunder-ground-slam-flare` | Grounded impact flare at the authoritative strike tile. |
| `a0049-thunder-chain-echo-ring` | Replaces only the old procedural impact ellipses while the authored set is atomically ready. |
| `a0050-thunder-lingering-crackles` | Replaces only the old procedural spark particles while the authored set is atomically ready. |

Bolt geometry, branches, flash, Slam label, camera shake, damage, GP cost, chain
timing, input, collision, and save behavior are unchanged.

Rollback:

- Boot/session: `?highImpactFx=0`
- Runtime: `window.__jkdHighImpactFx.rollback()`
- Restore after a runtime rollback: `window.__jkdHighImpactFx.restore()`
- Inspect: `window.__jkdHighImpactFx.snapshot()`

If the three textures are not all ready, loading fails, the queue is disabled,
or rollback is active, the existing procedural rings and sparks render
automatically.
