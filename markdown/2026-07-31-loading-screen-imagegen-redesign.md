# Loading Screen ImageGen Redesign

## Outcome

Boot and World Load now share one dedicated 16:9 ImageGen mine-console
presentation. The active loader no longer crops the Thunderstrike panel or
draws visible `Graphics`, primitive rectangles, circles, HTML, or CSS UI.

The screen has four physically separate authored zones:

1. upper-left logo crest;
2. two stacked loading-meter bays;
3. right-side 8 by 4 mining chamber;
4. seven-slot pickaxe path rail below the chamber.

The measured layout keeps the left meter edge at least 120 logical pixels away
from every minigame/tool-rail asset. Runtime scaling uses one 1280 by 720
reference composition with centered letterboxing, so density changes cannot
move the zones into each other.

## ImageGen production art

`sprites/UI/loading-screen-v1/` contains:

- `loading-screen-foundation-v1.webp` — opaque 1672 by 941 authored shell;
- `loading-progress-amber-v1.webp` — overall readiness energy lane;
- `loading-progress-cyan-v1.webp` — current-phase energy lane;
- `loading-retry-plate-v1.webp` — empty authored retry plate.

The three alpha assets were generated on flat chroma green, processed with the
installed ImageGen soft-matte/despill helper, cropped to painted bounds, and
encoded as high-quality alpha WebP. Their corners remain fully transparent.
The complete dedicated screen pack is about 750 KB against a 900 KB contract.

## Two progress meters

Both meters consume the same real `setProgress()` value already owned by the
scene:

- `EXPEDITION READINESS` shows total loader progress.
- `CURRENT LOAD PHASE` shows normalized progress inside the contiguous current
  phase: survey, supply, calibration, or mine access.

The second meter is not random or minigame-driven. It is derived from the real
overall value and resets only when that value crosses a phase boundary.
Phaser crops authored energy bitmaps; it does not draw a procedural fill.

## Minigame presentation

The gameplay state remains session-only and reward-free. The opening board
still shows all thirteen material assets before weighted refills begin.

Visual changes:

- counters now sit inside the mining chamber above the grid;
- the 8 by 4 board has a dedicated measured footprint;
- all seven approved pickaxe assets are visible in the authored lower rail;
- the active tier is emphasized through bounded scale and alpha only;
- the strike pickaxe is hidden while idle and appears only for a real swing;
- target, fracture, debris, collapse, and column-drop feedback remain active.

## Architecture

- `values/loadingScreenPresentation.js` owns screen art, slots, two-meter
  phases, copy, typography, timing, and budget.
- `values/loadingMiningMinigame.js` owns board art, state tuning, FX tuning,
  tool-rail layout, diagnostics, and rollback.
- `ui/components/AuthoredLoadingScreenView.js` owns the authored composition.
- `ui/components/AuthoredLoadingProgressMeters.js` owns bitmap meter cropping.
- `ui/components/AuthoredLoadingMiningBoard.js` owns board rendering.
- `ui/components/AuthoredLoadingMiningMinigame.js` owns input and lifecycle.
- `ui/components/LoadingMiningMinigameFx.js` owns break/drop animation.
- `ui/components/LoadingMiningPickaxeFx.js` owns strike/contact/rest animation.
- `ui/components/LoadingScreenView.js` routes to authored or legacy display.

Boot mini-preloads all four screen assets before starting the full queue.
World Load reuses those cached textures.

## Rollback and failures

- `?loadingMine=0` restores the existing legacy loader and disables the
  minigame.
- Missing any required screen or minigame texture also selects the legacy view;
  no procedural substitute is placed over the authored screen.
- Real load failures hide the board and reveal the authored retry plate.

## Verification

```powershell
& '<bundled-node>' --check values/loadingScreenPresentation.js
& '<bundled-node>' --check ui/components/AuthoredLoadingScreenView.js
& '<bundled-node>' testing/2026-07-30-loading-mining-minigame-contract.mjs
& '<bundled-node>' testing/2026-07-30-loading-mining-minigame-live-qa.mjs
```

The live QA captures the default interactive screen, an authored break-contact
state, the rollback loader, and optional production Boot. It guards both meter
identities, all seven tool icons, hidden idle pickaxe, continuing loader
progress during mining, singular keyboard handlers, and browser errors.
