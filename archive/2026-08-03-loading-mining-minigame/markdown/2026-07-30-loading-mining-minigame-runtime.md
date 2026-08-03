# Loading Mining Minigame Runtime

## Outcome

The shared Boot and World Load presentation now offers a small optional
mining-board activity while the real Phaser loader continues independently.
The activity is deliberately presentation-only: it grants no GP, items,
experience, save progress, or faster loading.

## Player-facing loop

- Click a block once or hold the pointer to keep striking.
- Arrow keys move the authored target; Space or Enter mines.
- Broken blocks pull the column down and refill from the library palette.
- Fast consecutive breaks build a chain.
- Best-chain thresholds visually promote the pickaxe from Bronze through
  Dragon. The promotion lasts only for the current loading view.
- The opening 8 by 4 board includes every material at least once, so all
  approved art can be seen immediately.

## Approved production art

The runtime pack reuses existing raster assets only:

- ImageGen V3 resource blocks and dynamic-soil bases
- all seven approved ImageGen pickaxe icons
- Thunder Strike backing shared by the board and cropped loading track
- authored mining target corners
- authored seismic fracture, debris, and collapse feedback

GP and star special blocks are deliberately excluded so every board cell keeps
the same square tile silhouette. No preview, source, or mockup file is routed
into production. The 26-texture
pack is capped at 1,600,000 source bytes; the contract currently measures
1,394,089 bytes.

## Architecture

- `values/loadingMiningMinigame.js` owns assets, layout, timing, copy, budget,
  diagnostics, and rollback.
- `systems/mining/LoadingMiningMinigameState.js` owns the pure board, hit,
  refill, chain, selection, and pickaxe-tier rules.
- `ui/components/LoadingMiningMinigame.js` renders and connects pointer and
  keyboard input.
- `ui/components/LoadingMiningMinigameFx.js` owns hit, drop, debris, and swing
  tweens.
- `ui/components/LoadingScreenView.js` mounts the activity for every shared
  menu loading view, pauses it during failures, and destroys it on transition.
- `ui/scenes/BootScene.js` mini-preloads the pack before the full loader starts.

Minigame mode uses a two-column composition. The logo and subtitle retain their
authored sizes in the upper-left slot. The lower-left progress UI is an exact
crop of the electric loading track already painted into the Thunderstrike
backing frame behind the minigame tiles. It is not a new frame: the small
notification texture and its procedural inner track are absent. The live fill
and percentage use the approved dark slot, with mining controls beneath it.
The middle-left band stays intentionally empty and no strip remains below the
minigame. The complete interactive board stays uniformly scaled to 78 percent
and anchored in the right column. Only measured source crops are used; visible
art is not stretched. Runtime bounds publish the guaranteed column gap. The
legacy divider, large loading card, and bottom footer remain rollback-only.

The loader never passes its progress value into minigame state. Missing pack
textures produce the original loading view rather than procedural substitutes.

## Rollback and health

- Runtime rollback: append `?loadingMine=0`.
- Diagnostic snapshot: `window.__jkdLoadingMiningMinigame`.
- The snapshot reports active/paused state, selection, selected material and
  HP, blocks mined, current/best chain, and pickaxe tier.

## Verification

```powershell
& '<bundled-node>' --check values/loadingMiningMinigame.js
& '<bundled-node>' testing/2026-07-30-loading-mining-minigame-contract.mjs
```

The isolated Phaser harness is
`testing/2026-07-30-loading-mining-minigame-harness.html`. The Edge live QA
holds the real pointer, uses keyboard input, verifies loader progress continues,
guards the upper-left logo, lower-left approved board-track crop, intentionally
clear middle band, scaled right-column bounds, and maximum label width at
1.5 density. It checks the real
Boot scene,
captures the default presentation, then reloads with `?loadingMine=0` and
verifies the legacy view.
