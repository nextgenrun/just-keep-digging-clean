import assert from "node:assert/strict";

import { ThunderStrikeTimingBarSystem } from "../systems/visual/ThunderStrikeTimingBarSystem.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
} from "../values/thunderStrikeChain.js";
import { ThunderStrikeActionRuntime } from "../world/playScene/ThunderStrikeActionRuntime.js";

function createTimingBarSpy() {
  return {
    updates: [],
    insufficient: [],
    clears: 0,
    update(...args) {
      this.updates.push(args);
    },
    showInsufficientGp(...args) {
      this.insufficient.push(args);
    },
    clearFeedback() {
      this.clears += 1;
    },
    destroy() {},
  };
}

function createRuntime(abilities) {
  const scene = {
    isDigAnimating: false,
    _teleportInAnimating: false,
    player: {
      flipX: false,
      anims: { timeScale: 1 },
      play() {},
      setDisplaySize() {},
      setFlipX() {},
    },
    playerController: { abilities },
    config: {},
    time: { now: 1000 },
  };
  const runtime = new ThunderStrikeActionRuntime(scene, {
    canStart: () => true,
    getAbilities: () => abilities,
  });
  runtime.timingBar.destroy();
  runtime.timingBar = createTimingBarSpy();
  return runtime;
}

{
  const abilities = {
    startThunderStrikeCharge: () => false,
    isThunderStrikeUnlocked: () => true,
    getGemPowerExact: () => 87.9,
    getThunderStrikeCost: () => 300,
  };
  const runtime = createRuntime(abilities);

  runtime.update(1000, true);

  assert.equal(runtime.animating, false);
  assert.equal(runtime.inputBufferedUntilMs, -Infinity);
  assert.equal(runtime.timingBar.insufficient.length, 1);
  assert.deepEqual(runtime.timingBar.insufficient[0].slice(0, 3), [87.9, 300, 1000]);
  assert.equal(
    runtime.timingBar.insufficient[0][3].phase,
    THUNDER_STRIKE_CHAIN_PHASES.IDLE,
  );

  runtime.update(1016, false);
  assert.equal(
    runtime.timingBar.insufficient.length,
    1,
    "the rejected buffered press must not spam the popup on later frames",
  );
}

{
  const lockedRuntime = createRuntime({
    startThunderStrikeCharge: () => false,
    isThunderStrikeUnlocked: () => false,
    getGemPowerExact: () => 0,
    getThunderStrikeCost: () => 300,
  });
  lockedRuntime.update(1000, true);
  assert.equal(
    lockedRuntime.timingBar.insufficient.length,
    0,
    "a locked ability must not masquerade as an insufficient-GP rejection",
  );
}

{
  const chargedRuntime = createRuntime({
    startThunderStrikeCharge: () => true,
  });
  chargedRuntime.update(1000, true);
  assert.equal(chargedRuntime.animating, true);
  assert.equal(
    chargedRuntime.timingBar.clears,
    1,
    "a valid cast must clear any stale rejection copy before charge presentation",
  );
}

{
  const statusCalls = [];
  const scene = {
    hudSystem: {
      flashStatus(...args) {
        statusCalls.push(args);
      },
    },
  };
  const timingBar = new ThunderStrikeTimingBarSystem(scene);
  const renders = [];
  const visibility = [];
  timingBar.view = {
    root: {},
    render(...args) {
      renders.push(args);
    },
    setVisible(value) {
      visibility.push(value);
    },
    destroy() {},
  };
  const snapshot = {
    phase: THUNDER_STRIKE_CHAIN_PHASES.IDLE,
    currentStageIndex: 0,
    completedStageIndex: -1,
    challengeStageIndex: null,
    successfulContinuations: 0,
  };

  timingBar.showInsufficientGp(87.9, 300, 1000, snapshot);

  assert.deepEqual(statusCalls, [[
    "NOT ENOUGH GP 87/300",
    THUNDER_STRIKE_CHAIN_CONFIG.timingBar.dangerColor,
    THUNDER_STRIKE_CHAIN_CONFIG.feedback.insufficientGpLingerMs,
  ]]);
  assert.equal(renders.length, 0, "rejected casts must not open the timing UI");
  assert.deepEqual(visibility, [false]);
}

{
  const renders = [];
  const visibility = [];
  const timingBar = new ThunderStrikeTimingBarSystem({});
  timingBar.view = {
    root: {},
    render(snapshot) { renders.push(snapshot); },
    setVisible(value) { visibility.push(value); },
    destroy() {},
  };
  timingBar.update({ phase: THUNDER_STRIKE_CHAIN_PHASES.CHARGE });
  timingBar.update({ phase: THUNDER_STRIKE_CHAIN_PHASES.STRIKE });
  timingBar.update({
    phase: THUNDER_STRIKE_CHAIN_PHASES.TIMING,
    challengeStageIndex: 1,
    progress: 0.5,
    windowStartProgress: 0.4,
    windowEndProgress: 0.6,
  });
  assert.deepEqual(visibility, [false, false]);
  assert.equal(renders.length, 1, "only the live timing phase may show the bar");
}

console.log("Thunder Strike minimal timing feedback contract: OK");
