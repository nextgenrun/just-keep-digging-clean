# Character definition V2 and restored alignment — 2026-09-06

The accepted V2 materials and neutral lighting are enabled on all 214 registered character animations: 3,041 referenced frames across 55 atlas sets. Frames use a 512 px full-frame coordinate system (previously 256 or 192). Transparent space is trimmed into pages no larger than 4096 px; the saved trim offsets preserve each full-frame anchor. All normal, action, recovery and torch-held variants share the new appearance.

The separate Three.js walk/run presentation from “Fix player run animation” is disconnected. The existing Phaser character once again renders movement and actions with the established camera, display size and floor anchor. The approved 40% running-speed increase and dash effects remain. Existing downward-mining pose holds and the rejected leg-sweep exclusion remain.

Cloth spring shapes are disabled during every export. Both source Blend hashes remain unchanged. The accepted material values, neutral lights and 48-sample Cycles setup are reused; production renders are 512 px rather than the magnified review page's 1536 px source renders.

The older Piskel moving-attack composites had a different crop and floor position. Their native replacements use a fixed 117 px display size and fixed 469/512 vertical origin, matching the current run and moving-complex silhouettes. Scale and origin stay fixed throughout each animation; locomotion/idle calibration is preserved.

The loader supports Phaser multiatlases in both initial and deferred character packs. It waits for the complete atlas before activating an animation, validates every referenced frame, propagates page errors, and removes only its own completion listeners. Texture memory tracking includes every atlas page. The complete library occupies 941.43 MiB decoded if all sets are resident, versus 757.00 MiB previously; existing deferred loading and eviction continue to apply.

## Verification

- `2026-09-06-character-definition-runtime-contract.mjs --assets`: every currently registered animation frame exists, every page fits the limit, fixed geometry and full-load/error behavior pass.
- `2026-08-20-player-jump-flight-motion-contract.mjs`: 33 full-controller movement/input cases pass.
- `2026-09-04-player-running-contract.mjs`, the retained skeletal/dash asset contract, asset-loading coordinator, player ability/deferred asset and presentation-continuity contracts pass.
- `live-final/`: real main-world walk, Ctrl-run, turns, stop, jump, flight and crouch/recovery. No missing or old-resolution frame; no separate renderer; body attachment and animation scale/origin checks pass.
- `live-side-combo/`: all twelve SIDE stages plus wrap in both directions, moving Jab right and moving Cross left. Every action and recovery frame uses the new appearance; contact/body alignment checks pass.
- `live-downward/`: five real impacts, no crouch interruption, and sustained finished-pose holds. The rejected leg sweep never plays.
- Cave checks were excluded from final acceptance after the user said that mode is discontinued.

Two older broad animation contracts already contain stale contact/asset-count or SIDE prewarm assumptions. Their failures are recorded in `verification-summary.json`; the new coverage gate checks the complete current registry instead.

`pre-wiring/` contains exact snapshots of touched files taken before these edits. The original approval previews remain review artifacts; they are not runtime asset dependencies.
