# Titan Locator Clues and Creature-Footprint Unlock

**Status:** production implementation  
**Date:** 2026-07-28  
**Scope:** ESC catalog clue economy, locked-safe navigation, progressive Titan
reveal, discovery authority, archive/statue lore, trophy/save continuity, and
rollback

## Player Contract

The `TITANS` tab in the ESC catalog now gives every locked Titan a locator
control:

- `BUY LOCATION CLUE` spends ordinary wallet money.
- The price increases with the selected Titan's depth and with the number of
  clues already purchased.
- A purchased clue can be tracked again for free and survives save/load.
- The active clue provides exact horizontal/vertical directions at any distance
  without revealing the locked Titan's name.
- A clue provides navigation only. It cannot discover a Titan, remove terrain,
  award a trophy, or satisfy the 50% creature-cover threshold.

Representative first-clue prices are 75 M for Titan 1 and 1,400 M for Titan 8
at roughly 735 m. Titan 8 costs 2,200 M when seven earlier clues were already
bought. The curve was benchmarked against the existing upgrade/key economy:
early clues sit between the Bronze Pickaxe and Quick Slash, while late clues
remain meaningful alongside Mithril, World Two access, and Rune-tier spending.

## Discovery Authority

Production discovery uses the real high-resolution creature stance, not a
rectangular percentage or player-entry shortcut:

1. Each approved 768x768 alpha stance is projected into its deterministic
   15-22 by 8-13 tile search window using the production fit fraction.
2. Source alpha of at least 24 marks visible creature pixels.
3. A projected tile with at least one visible source pixel is included in that
   Titan's versioned row-mask footprint.
4. Only currently solid authoritative world cells in that footprint count as
   covering tiles.
5. Discovery remains locked until `ceil(footprint tiles × 0.5)` covering cells
   have been dug.
6. Reaching that threshold destroys every remaining footprint cell through
   `WorldModel.applyDugTileKeys`, redraws those cells without granting mining
   resources, and admits the existing canonical discovery path.

Non-creature chamber terrain may remain. Player position, chamber entry,
proximity, a bought clue, remote digging, and high-resolution card residency do
not independently award a Titan.

## Visual Representation

The approved 768px stance stays fixed behind terrain while sealed, so the
texture and alpha-derived cell mask cannot drift apart. It renders near-opaque
instead of stretching the former 256px archive art. A compact 1024px
ImageGen-authored basalt dais sits beneath it at less than 60% of the smallest
Titan's rendered width.

The normal location pointer still guides the player toward the chamber. Once
inside, that UI disappears. Every still-solid authoritative covering cell uses
the authored mineral-resonance overlay, tinted to the Titan's own biome color
and pulsed on the shared depth-898 emissive layer. Terrain and underground
compositors cannot bury it, while the darkness mask still governs distant
visibility. No cover count or `CLEAR CREATURE COVER` instruction remains in
the UI.

At the 50% threshold, the existing unlock ring, grit, glow, collection echo,
archive entry, retention write, autosave request, and matching surface Titan
Walk trophy execute after the remaining cover collapses. The 1536x848 chamber
painting remains only as low-alpha, depth-graded environmental context, so its
large baked floor no longer reads as the Titan's platform.

## Surface Trophy Presentation

Every unlocked surface trophy uses its own independently generated
identity-matched 768x768 ImageGen stance. Underground now reuses that sharp
identity-matched inventory at chamber scale. The surface gallery now reuses the
newer basalt dais instead of the oversized legacy walk plinth and renders that
footing at only 2.1 by 0.36 tiles. Each identity has its own bounded 0.92-1.18
scale over a 3.2-tile base envelope, making every statue larger than the former
uniform 3x treatment while a 4.25-tile height cap keeps the composition mostly
inside the camera. The stances retain normal blending, 98.5% base alpha, and
only a 1.5% idle alpha pulse.

The first plinth begins five tiles beyond the approved town benchmark. All 25
slots use 3.4-tile spacing inside a calculated clear zone that includes the
largest configured creature width, compact footing, and two tiles of padding.
The shared 24px transparent stance baseline is compensated at runtime so feet
settle into the dais lip rather than hovering or sinking. Level 1 modular props
are absent from this corridor, the gallery is above terrain and background
props, and the player remains above the gallery, so no surface prop or
decorative asset blocks the unlocked Titan.

### Lore and Inspection Amendment

Every one of the 25 Titans now has one shared production text record containing
a unique epithet, a short plinth inscription, and an expanded archive account.
An unlocked surface stance shows the player's remapped interact key when the
player enters a 2.4-tile range. Inspecting it opens the approved notification
card with the Titan name, epithet, inscription, and an `ESC > TITANS` archive
hint. Locked slots create no prompt, resolve no lore, and cannot be inspected.

The ESC `TITANS` detail panel now pairs the streamed discovered chamber vignette
with the same epithet, expanded field account, and plinth inscription. Locked
entries retain their sealed identity, locked-safe copy, and locator-clue
control. The text is presentation-only and does not change discovery, trophy,
terrain, money, or save authority.

Rapid travel between a Titan chamber, the archive, and its surface plinth is
render-safe: unused chamber display objects detach immediately, but the
stream-owned texture is released only after Phaser finishes the current frame.
Returning or pinning that Titan before `postrender` cancels the pending release.

## Persistence and Privacy

Purchased clues use index-only journal keys such as
`titan-locator-clue:08`. Locked names and lore are not written into the clue
key. On load, the most recently purchased still-undiscovered clue becomes
active. Discovering its Titan clears active tracking but retains the purchase
record.

## Authority Boundaries

- `values/titanClueCatalog.js` owns clue prices, copy, layout, result ids,
  journal-key format, and `?titanClues=0`.
- `systems/progression/TitanClueSystem.js` owns wallet transactions,
  persistence, restoration, active selection, and purchase rollback.
- `ui/overlays/TitanArchiveClueControl.js` owns catalog interaction and
  affordability presentation.
- `systems/visual/titanDirection.js` owns shared zone-distance and direction
  formatting.
- `values/titanCreatureFootprints.js` owns the generated row-mask inventory.
- `values/titanLore.js` owns the 25 epithets, plinth inscriptions, and expanded
  discovered archive accounts.
- `systems/visual/titanCreatureFootprint.js` maps masks to authoritative cells
  and counts remaining cover.
- `systems/visual/TitanCoverageGlowSystem.js` renders the exact still-solid
  covering cells with the authored color-tinted resonance overlay.
- `systems/visual/TitanUnlockController.js` owns 50% admission, automatic
  remainder destruction, redraw, and canonical unlock handoff.
- `systems/visual/TitanSurfaceInspection.js` owns unlocked-only proximity,
  remapped input prompts, and approved notification presentation.
- `ui/overlays/TitanArchiveLoreView.js` owns discovered lore layout while
  `TitanArchiveView.js` retains selection and chamber-vignette orchestration.
- `TitanDiscoverySystem` remains the only runtime discovery presenter;
  `RetentionProgressSystem` remains the only Titan save authority; `WorldModel`
  remains the only terrain/dig/collision authority.

## Rollback

- `?titanClues=0` disables clue purchasing/tracking without deleting journal
  keys.
- `?titanGuidance=0` disables resonance and clue HUD messages without changing
  purchases or discovery.
- `?titanEncounter=legacy` uses the stricter full rectangular-zone clear plus
  proximity admission.
- `?titanChambers=0` disables high-resolution chamber cards while retaining the
  sharp stance, compact dais, resonance tiles, and footprint authority.
- `?titanStatueLore=0` disables surface prompts and inspection without changing
  unlocked trophies or ESC archive lore.
- `?titans=0` disables the entire Titan presentation without deleting saved
  discoveries or clue keys.

## Validation

- `testing/2026-07-27-titan-clue-catalog-contract.mjs` covers price benchmarks,
  escalation, atomic money handling, persistence/restore, identity privacy,
  exact long-range directions, autosave, UI wiring, and renderer parity.
- `testing/2026-07-28-titan-creature-footprint-contract.mjs` verifies the
  hash-pinned 25-stance footprint manifest, exact runtime row-mask parity,
  odd/even 50% admission, remainder collapse, stance/dais layering, tile-led
  guidance, and health wiring.
- `testing/2026-07-28-titan-underground-presentation-v2-contract.mjs` verifies
  the final alpha assets, high-resolution stance preloads, compact dais scale,
  exact solid-cell glow behavior, UI-count removal, threshold math, and
  no-reward remainder auto-clear.
- `testing/2026-07-28-titan-surface-gallery-polish-contract.mjs` verifies all
  25 unique transparent surface assets, compact shared basalt footing, at least
  ten bounded identity scales, baseline contact, strong opacity, raster-only
  creature rendering, player-safe depth, town/tunnel clearance, and the Level 1
  prop-free corridor.
- `testing/2026-07-28-titan-lore-and-statue-inspection-contract.mjs` verifies
  25 complete unique lore records, unlocked-only surface prompts, native
  notification copy, renderer parity, nearest-target arbitration, locked
  privacy, rollback, and the save-safe `Ctrl+Alt+I` plinth preview.
- The existing Titan discovery, experience, chamber production, retention,
  relic, pause UI, renderer lifecycle, and release-safety contracts guard the
  surrounding trophy/archive/save systems.
