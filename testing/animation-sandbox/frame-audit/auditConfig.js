/* global Object */

const SPRITE_AUDIT_CONFIG = Object.freeze({
  assetRoot: "../../../",
  frameSize: Object.freeze([341, 341]),
  localStorageKey: "jkd-runtime-sprite-frame-audit-v1",
  issueTypes: Object.freeze([
    "direction",
    "transition",
    "anchor-drift",
    "clipping",
    "halo",
    "gray-leakage",
    "silhouette",
    "timing",
  ]),
  animations: Object.freeze([
    { id: "idle", label: "Idle", file: "sprites/character/character-v8/runtime/legacy-idle-clean-sheet.webp", frames: 35, columns: 16, fps: 8, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/idle/idle-review.piskel", sourceStatus: "review Piskel source" },
    { id: "walk", label: "Walk", file: "sprites/character/character-v8/runtime/legacy-walk-clean-sheet.webp", frames: 51, columns: 16, fps: 14, orientation: "right", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/walk/walk-review.piskel", sourceStatus: "review Piskel source" },
    { id: "dig-sideways", label: "Dig Sideways", file: "sprites/character/character-v8/runtime/legacy-dig-sideways-clean-sheet.webp", frames: 18, columns: 16, fps: 30, orientation: "left", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/dig-sideways/dig-sideways-review.piskel", sourceStatus: "review Piskel source", views: Object.freeze([
      { id: "source", label: "Source: left", flipX: false },
      { id: "runtime-left", label: "Game: LEFT (unflipped)", flipX: false },
      { id: "runtime-right", label: "Game: RIGHT (flipped)", flipX: true },
    ]) },
    { id: "dig-up", label: "Dig Up", file: "sprites/character/character-v8/runtime/legacy-dig-up-clean-sheet.webp", frames: 9, columns: 9, fps: 30, orientation: "front-up", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/dig-up/dig-up-review.piskel", sourceStatus: "review Piskel source" },
    { id: "dig-up-sideways", label: "Dig Up Sideways", file: "sprites/character/character-v8/runtime/legacy-dig-up-sideways-clean-sheet.webp", frames: 13, columns: 13, fps: 30, orientation: "right-up", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/dig-up-sideways/dig-up-sideways-review.piskel", sourceStatus: "review Piskel source", views: Object.freeze([
      { id: "source", label: "Source: UP-RIGHT", flipX: false },
      { id: "runtime-up-right", label: "Game: UP-RIGHT (current flip)", flipX: true },
      { id: "runtime-up-left", label: "Game: UP-LEFT (current flip)", flipX: false },
      { id: "expected-up-right", label: "Expected: UP-RIGHT", flipX: false },
      { id: "expected-up-left", label: "Expected: UP-LEFT", flipX: true },
    ]) },
    { id: "fly-climb", label: "Fly / Climb", file: "sprites/character/character-v8/runtime/legacy-fly-climb-clean-sheet.webp", frames: 25, columns: 16, fps: 14, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/fly-climb/fly-climb-review.piskel", sourceStatus: "review Piskel source" },
    { id: "dig-up-look", label: "Dig Up Look", file: "sprites/character/character-v8/runtime/legacy-dig-up-look-clean.png", frames: 1, columns: 1, fps: 1, orientation: "front-up", piskelSource: "sprites/character/piskel/runtime-active/dig-up-look.piskel", sourceStatus: "Piskel editable source" },
    { id: "duck", label: "Duck", file: "sprites/character/character-v8/runtime/duck-downwards-sheet.webp", frames: 4, columns: 4, fps: 8, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/duck-downwards/duck-downwards-review.piskel", sourceStatus: "review Piskel source" },
    { id: "dig-down", label: "Dig Down", file: "sprites/character/character-v8/runtime/dig-down-sheet.webp", frames: 5, columns: 5, fps: 12, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/dig-down/dig-down-review.piskel", sourceStatus: "review Piskel source", views: Object.freeze([
      { id: "source", label: "Source", flipX: false },
      { id: "runtime-facing-right", label: "Game: normal, facing RIGHT", flipX: false },
      { id: "runtime-facing-left", label: "Game: normal, facing LEFT", flipX: true },
      { id: "runtime-third-hit", label: "Game: every third hit", flipX: true },
    ]) },
    { id: "falling", label: "Falling", file: "sprites/character/character-v8/runtime/falling-downward-through-sky-sheet.webp", frames: 7, columns: 7, fps: 12, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/falling-downward-through-sky/falling-downward-through-sky-review.piskel", sourceStatus: "review Piskel source" },
    { id: "lean-wall", label: "Lean Against Wall", file: "sprites/character/character-v8/runtime/leans-against-wall-sheet.webp", frames: 4, columns: 4, fps: 8, orientation: "side", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/leans-against-wall/leans-against-wall-review.piskel", sourceStatus: "review Piskel source" },
    { id: "combat-return", label: "Combat Return", file: "sprites/character/character-v8/runtime/combat-idle-to-normal-idle-sheet.webp", frames: 47, columns: 16, fps: 14, orientation: "action-facing", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/combat-idle-to-normal-idle/combat-idle-to-normal-idle-review.piskel", sourceStatus: "review Piskel source", views: Object.freeze([
      { id: "source", label: "Source", flipX: false },
      { id: "combat-facing-right", label: "Combat lock: action faced RIGHT", flipX: false },
      { id: "combat-facing-left", label: "Combat lock: action faced LEFT", flipX: true },
    ]) },
    { id: "quickslash", label: "Quickslash", files: ["sprites/character/character-v2/digging/abilities/quickslash/uickslash-1.webp", "sprites/character/character-v2/digging/abilities/quickslash/uickslash-2 .webp"], frames: 2, columns: 1, fps: 12, orientation: "left", piskelSource: "sprites/character/piskel/runtime-active/quickslash.piskel", sourceStatus: "Piskel editable source", views: Object.freeze([
      { id: "source", label: "Source: LEFT", flipX: false },
      { id: "runtime-right", label: "Game: RIGHT (current unflipped)", flipX: false },
      { id: "runtime-left", label: "Game: LEFT (current flipped)", flipX: true },
      { id: "expected-right", label: "Expected: RIGHT", flipX: true },
      { id: "expected-left", label: "Expected: LEFT", flipX: false },
    ]) },
    { id: "thunder-charge", label: "Thunder Charge", file: "sprites/character/character-v8/runtime/thunder-charge-sheet.webp", frames: 1, columns: 1, fps: 6, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/thunder-charge/thunder-charge-review.piskel", sourceStatus: "review Piskel source" },
    { id: "thunder-strike", label: "Thunder Strike", file: "sprites/character/character-v8/runtime/thunder-strike-sheet.webp", frames: 1, columns: 1, fps: 12, orientation: "front", piskelSource: "markdown/audit/animation-audit/2026-07-02-legacy-miner-v8-frame-review/by-animation/thunder-strike/thunder-strike-review.piskel", sourceStatus: "review Piskel source" },
  ]),
  reportedTargets: Object.freeze([
    { id: "dig-up-sideways-direction", animationId: "dig-up-sideways", issue: "direction", label: "Reported: UP-LEFT / UP-RIGHT faces the wrong way", codeRef: "world/playScene/PlaySceneGameplay.js:63, 352-357", expected: "The right-up source must be unflipped for UP-RIGHT and flipped for UP-LEFT." },
    { id: "quickslash-direction", animationId: "quickslash", issue: "direction", label: "Reported: Quickslash faces the wrong way", codeRef: "world/playScene/PlaySceneUpdate.js:349-355", expected: "The left-facing source must be flipped for RIGHT and unflipped for LEFT." },
    { id: "combat-dig-transition", animationId: "combat-return", issue: "transition", label: "Reported: combat-to-dig direction jump", codeRef: "world/playScene/PlaySceneSetup.js:455-465; world/playScene/PlaySceneGameplay.js:347-377", expected: "The combat lock and the following dig action must agree on their horizontal orientation." },
    { id: "dig-down-third-hit", animationId: "dig-down", issue: "direction", label: "Review: Dig Down intentionally flips every third hit", codeRef: "world/playScene/PlaySceneGameplay.js:367-370", expected: "Confirm whether the every-third-hit mirror is intentional; it can look like a direction jump." },
  ]),
  transitions: Object.freeze([
    { id: "combat-to-dig-down", label: "Combat lock to Dig Down", codeRef: "PlaySceneGameplay.js:347-377", steps: Object.freeze([
      { animationId: "combat-return", frames: [44, 45, 46], viewId: "combat-facing-right" },
      { animationId: "dig-down", frames: [0, 1, 2], viewId: "runtime-facing-right" },
    ]) },
    { id: "combat-to-side-right", label: "Combat lock to Side Dig RIGHT", codeRef: "PlaySceneGameplay.js:358-377", steps: Object.freeze([
      { animationId: "combat-return", frames: [44, 45, 46], viewId: "combat-facing-right" },
      { animationId: "dig-sideways", frames: [0, 1, 2], viewId: "runtime-right" },
    ]) },
    { id: "combat-to-side-left", label: "Combat lock to Side Dig LEFT", codeRef: "PlaySceneGameplay.js:358-377", steps: Object.freeze([
      { animationId: "combat-return", frames: [44, 45, 46], viewId: "combat-facing-left" },
      { animationId: "dig-sideways", frames: [0, 1, 2], viewId: "runtime-left" },
    ]) },
  ]),
});
