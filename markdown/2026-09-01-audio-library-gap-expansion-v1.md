# Audio library gap expansion v1

## Outcome

The UNDERSTAR audio decision sandbox now exposes 85 playable sources as 82
named review items across eight paged categories. The expansion adds 69 local
playable candidates and records 24 public CC0 leads without downloading or
wiring them.

This is a review-library change only. `SoundSystem`, `BootScene`, gameplay
events, production preload, mix buses, and save authority are unchanged.

## Why the apparent library size was misleading

The `sound/` tree currently contains roughly 1,900 audio files and 3.02 GiB,
but most of that is music, voice, raw source, generated batches, or review
material. Production SFX routing still exposes very small families:

| Production family | Current variation |
|---|---:|
| Ordinary dig | 2 |
| Footsteps | 3 |
| Tile break | 1 |
| Tile hit | 1 |
| Star hit chime | 1 |
| Seismic warning | 2 |
| Hardcore near-death | 1 |
| Star destruction | 1 |
| Level-up reward | 2 |
| UI select / confirm | 2 |
| Weather ambience | 6 |

Having files on disk is therefore not the same as having a varied, coherent,
approved runtime library.

## Gap matrix

| Priority | Missing or thin family | What the review library now provides |
|---|---|---|
| P0 | Material-specific mining | Dirt swing/hit/break, stone body/contact/break, crystal hit/break |
| P0 | Cave loop system | Cave beds, tunnel wind, seep, accepted deep-creepy beds, seam review |
| P0 | Panic layers | Chain warning, timber strain, distant collapse, pressure rumble, dark energy, air stop |
| P1 | Movement and Flight | Robot steps, servo/power, lift release, passes, boost, landing body/debris |
| P1 | UI and rewards | Hover, click, confirm, blocked, purchase, item/coin reward, save-card cue |
| P1 | Star lifecycle | Crystal contact/break, discovery confirm, public implosion/explosion leads |
| P1 | Portals and teleport | Four public CC0 warp/portal leads, including a loop candidate |
| P2 | Town and weather identity | Fifteen GOOD-tag exterior/interior rain, wind, night, gravel, and breeze loops |
| P2 | Environmental hazards | Public collapse lead; local water, heat, electrical, and deep-impact candidates |
| P2 | Creatures and Titans | Still open; no sufficiently specific local or public winner was promoted |

## Candidate sources and boundaries

- 46 named derivatives from the already-local Sonniss GDC mockup. Their source
  recordings were previously listened to and source-approved, but every
  derivative remains `runtimeEligible: false`.
- 15 existing `GOOD` weather loops. The GOOD tag permits continued review, not
  automatic runtime use.
- 8 accepted deep-creepy candidates. They still require loop seam, repetition,
  voice-content, and mix-context review.
- 24 canonical Freesound links whose pages declared CC0 when checked. No remote
  audio was downloaded. The two Kinoton candidates also link creator terms and
  are explicitly flagged for another license check.

Sonniss permits commercial project synchronization and modification without
attribution, but prohibits raw SFX redistribution and AI usage. Source and
license metadata remain attached to the review queue.

## Review UX

- Eight category buttons are shown in two rows.
- Six named items are visible per page.
- Page arrows change pages; `J` and `K` traverse the full category across page
  boundaries.
- The now-playing card reports candidate type, category position, and source
  collection.
- The session footer reports playable-source and online-lead counts.
- Approve, reject, clear, and JSON export remain browser-local decisions only.

## Promotion gate

A candidate can enter production only after all of the following are true:

1. The exact item is explicitly approved in context.
2. The original canonical download and license are recorded.
3. Loop seams or one-shot edit points are verified.
4. Loudness, peak, repetition, and overlap are tested against the real event.
5. The promoted derivative is hashed and attributed when required.
6. `BootScene`, `SoundSystem`, the event owner, and focused contracts are
   updated together in a separate production-wiring pass.

## Validation

The expansion contract checks every local preview path, review-only flag,
category membership, source key, transition estimate, public URL, license
declaration, and production-import boundary. Browser validation covers loading,
paging, keyboard traversal, playback visibility, and decision persistence.
