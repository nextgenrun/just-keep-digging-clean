import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import {
  resolveAuthoredHorizontalFlipX,
  resolveHorizontalInputDirection,
} from "../player/playerDirectionalTargets.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { CaveActionAnimationRuntime } from "../world/playScene/CaveActionAnimationRuntime.js";

const horizontalInput = { left: false, right: false };
let quickslashHeld = false;
const input = {
  getFlyInput: () => false,
  getQuickslashInput: () => quickslashHeld,
  getHorizontalMovement: () => ({ ...horizontalInput }),
  isUp: () => false,
};
const body = {
  x: 0,
  y: 0,
  w: 28,
  h: 56,
  vx: 0,
  vy: 0,
  setFlightActive() {},
};
const abilities = new PlayerAbilities(
  null,
  null,
  { tileSize: 94 },
  {
    isQuickslashUnlocked: () => true,
    getUpgradeEffects: () => ({}),
  },
  body,
);
abilities.gemPower = abilities.getGemPowerMax();

const releaseQuickslash = () => {
  quickslashHeld = false;
  abilities.update(0, input, true, abilities.getQuickslashDirection() > 0);
};
const beginQuickslash = ({ left, right, staleFacingRight }) => {
  horizontalInput.left = left;
  horizontalInput.right = right;
  quickslashHeld = true;
  abilities.update(0, input, true, staleFacingRight);
  return abilities.getQuickslashDirection();
};

// Current-frame A/D must beat the previous locomotion facing, then remain locked
// until Q is released. Repeated alternation protects against intermittent races.
for (let index = 0; index < 16; index += 1) {
  releaseQuickslash();
  const expectedDirection = index % 2 === 0 ? -1 : 1;
  assert.equal(beginQuickslash({
    left: expectedDirection < 0,
    right: expectedDirection > 0,
    staleFacingRight: expectedDirection < 0,
  }), expectedDirection);

  horizontalInput.left = expectedDirection > 0;
  horizontalInput.right = expectedDirection < 0;
  abilities.update(0, input, true, expectedDirection > 0);
  assert.equal(
    abilities.getQuickslashDirection(),
    expectedDirection,
    "held Quickslash changed direction during its committed action window",
  );
}
releaseQuickslash();

assert.equal(resolveHorizontalInputDirection({ left: true, right: false }, true), -1);
assert.equal(resolveHorizontalInputDirection({ left: false, right: true }, false), 1);
assert.equal(
  resolveHorizontalInputDirection({ left: true, right: true }, true),
  -1,
  "simultaneous A/D must match PlayerMovement's deterministic left priority",
);
assert.equal(resolveAuthoredHorizontalFlipX(-1, true), true);
assert.equal(resolveAuthoredHorizontalFlipX(1, true), false);
assert.equal(resolveAuthoredHorizontalFlipX(-1, false), false);
assert.equal(resolveAuthoredHorizontalFlipX(1, false), true);

const gameplayPrototype = {};
setupGameplayMethods(gameplayPrototype);

function makeMainWorldActionHarness(sourceFacesRight) {
  const flips = [];
  const player = {
    anims: { currentAnim: null, isPlaying: false, timeScale: 1 },
    setFlipX(value) { flips.push(value); return this; },
    play(key) {
      this.anims.currentAnim = { key };
      this.anims.isPlaying = true;
      return this;
    },
    setDisplaySize() { return this; },
  };
  const scene = {
    player,
    playerAssetProfile: {
      isUalNative: false,
      quickslashAnim: "quickslash-test",
      quickslashSourceFacesRight: sourceFacesRight,
      digDownAnim: "dig-down-test",
      preserveNativeActionCadence: true,
      weaponPolicy: "none",
    },
    playerController: {
      abilities,
      getAimLabel: () => "RIGHT",
      isFacingRight: () => true,
    },
    anims: {
      exists: () => true,
      get: () => ({ frames: [{}], frameRate: 30 }),
    },
    digSystem: {
      getEffectiveCooldownMs: () => 750,
    },
    config: { tileSize: 94, playerDisplaySizePx: 94 },
    time: { now: 100 },
  };
  return { scene, flips };
}

for (const sourceFacesRight of [true, false]) {
  const { scene, flips } = makeMainWorldActionHarness(sourceFacesRight);
  for (const directionX of [-1, 1, -1, 1]) {
    scene.isDigAnimating = false;
    assert.equal(gameplayPrototype.startDigAnimation.call(scene, {
      actionKind: "quickslash",
      actionDirectionX: directionX,
      animationKeyOverride: "quickslash-test",
    }), true);
    assert.equal(
      flips.at(-1),
      resolveAuthoredHorizontalFlipX(directionX, sourceFacesRight),
      "main-world Quickslash ignored its committed direction or authored source facing",
    );
    assert.equal(scene._postActionFacingFlipX, directionX < 0);
  }
}

let caveDirection = -1;
const caveFlips = [];
const cavePlayer = {
  anims: { currentAnim: null, isPlaying: false, timeScale: 1 },
  setFlipX(value) { caveFlips.push(value); return this; },
  play(key) { this.anims.currentAnim = { key }; return this; },
};
const caveController = {
  scene: {
    player: cavePlayer,
    playerAssetProfile: {
      isUalNative: false,
      quickslashAnim: "quickslash-test",
      quickslashSourceFacesRight: true,
    },
  },
  playerController: {
    isFacingRight: () => true,
  },
  _actionUntilMs: 0,
  _playAnim(key) { cavePlayer.play(key); },
};
const caveRuntime = new CaveActionAnimationRuntime(caveController);
const caveAbilities = { getQuickslashDirection: () => caveDirection };
for (const directionX of [-1, 1, -1, 1]) {
  caveDirection = directionX;
  assert.equal(
    caveRuntime.playMiningAnimation("quickslash", directionX < 0 ? "RIGHT" : "LEFT", 0, caveAbilities),
    true,
  );
  assert.equal(
    caveFlips.at(-1),
    resolveAuthoredHorizontalFlipX(directionX, true),
    "cave Quickslash trusted a stale aim label instead of its committed direction",
  );
}

const previewSource = await readFile(
  new URL("../systems/visual/MiningIntentPreviewSystem.js", import.meta.url),
  "utf8",
);
const retentionSource = await readFile(
  new URL("../values/retentionConfig.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(previewSource, /_drawQuickslash|quickslashColor|ROUTE/);
assert.doesNotMatch(retentionSource, /quickslashColor/);

console.log("QUICKSLASH_FACING_CONTRACT_OK");
