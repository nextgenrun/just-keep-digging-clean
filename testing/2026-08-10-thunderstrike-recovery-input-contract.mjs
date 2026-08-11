import assert from "node:assert/strict";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { ThunderStrikeActionRuntime } from "../world/playScene/ThunderStrikeActionRuntime.js";

const gameplayPrototype = {};
setupGameplayMethods(gameplayPrototype);

// The normal, non-godmode path accepts the exact authored 300 GP threshold.
{
  const abilities = Object.assign(Object.create(PlayerAbilities.prototype), {
    _godMode: false,
    _thunderStrikeCharging: false,
    _thunderStrikeChargeStart: 0,
    _thunderStrikeFollowUpStageIndex: null,
    _thunderStrikeFollowUpSuccessCount: 0,
    gemPower: 300,
    upgradeSystem: { isThunderStrikeUnlocked: () => true },
    getConstellationStats: () => ({}),
  });

  assert.equal(abilities.getThunderStrikeCost(), 300);
  assert.equal(abilities.startThunderStrikeCharge(100), true);
  assert.equal(abilities.isThunderStrikeCharging(), true);
  assert.equal(abilities.gemPower, 300, "GP is paid at the first strike contact");

  abilities.cancelThunderStrikeChain();
  abilities.gemPower = 299;
  assert.equal(abilities.startThunderStrikeCharge(200), false);
}

{
  let timelineCancels = 0;
  let rigEnds = 0;
  const scene = Object.assign(Object.create(gameplayPrototype), {
    playerAssetProfile: { isUalNative: true },
    isDigAnimating: true,
    _ualActionContactAtMs: 120,
    ualActionContactTimeline: {
      contactFired: true,
      cancel() { timelineCancels += 1; },
    },
    playerRigContact: {
      endAction() { rigEnds += 1; },
    },
    player: { anims: { timeScale: 0.75 } },
  });

  assert.equal(scene.canInterruptUalDigRecovery(), true);
  assert.equal(scene.cancelCommittedUalDigRecovery(), true);
  assert.equal(scene.isDigAnimating, false);
  assert.equal(scene._ualActionContactAtMs, -Infinity);
  assert.equal(scene.player.anims.timeScale, 1);
  assert.equal(timelineCancels, 1);
  assert.equal(rigEnds, 1);
}

function createBufferedRecoveryRuntime({ chargeStarts = true } = {}) {
  let contactCommitted = false;
  let chargeAttempts = 0;
  let recoveryCancels = 0;
  let chainCancels = 0;
  const abilities = {
    startThunderStrikeCharge() {
      chargeAttempts += 1;
      return chargeStarts;
    },
    cancelThunderStrikeChain() { chainCancels += 1; },
  };
  const scene = {
    isDigAnimating: true,
    _teleportInAnimating: false,
    canInterruptUalDigRecovery: () => contactCommitted,
    cancelCommittedUalDigRecovery() {
      if (!contactCommitted) return false;
      recoveryCancels += 1;
      this.isDigAnimating = false;
      return true;
    },
    playerController: { abilities },
    playerAssetProfile: {
      thunderStrikeChargeAnim: "test-thunder-charge",
      displaySizePx: 64,
    },
    player: {
      flipX: false,
      anims: { timeScale: 1 },
      play() {},
      setDisplaySize() {},
    },
    anims: { exists: () => true },
    config: { playerDisplaySizePx: 64 },
  };
  const runtime = Object.assign(Object.create(ThunderStrikeActionRuntime.prototype), {
    scene,
    adapter: {},
    state: {
      beginCharge() {},
      getSnapshot: () => null,
    },
    timingBar: { update() {} },
    impactFx: {},
    animating: false,
    inputBufferedUntilMs: -Infinity,
    holdUntilMs: 0,
    facingFlipX: null,
  });

  return {
    runtime,
    scene,
    commitContact: () => { contactCommitted = true; },
    counts: () => ({ chargeAttempts, recoveryCancels, chainCancels }),
  };
}

// C may be pressed before a mining contact. The buffered press must begin the
// Thunder charge as soon as that contact commits, without waiting for the full
// mining recovery animation to finish.
{
  const harness = createBufferedRecoveryRuntime();
  harness.runtime.update(100, true);
  assert.equal(harness.runtime.isAnimating, false);
  assert.deepEqual(harness.counts(), {
    chargeAttempts: 0,
    recoveryCancels: 0,
    chainCancels: 0,
  });

  harness.commitContact();
  harness.runtime.update(250, false);
  assert.equal(harness.runtime.isAnimating, true);
  assert.equal(harness.scene.isDigAnimating, true, "Thunder owns the action lock after takeover");
  assert.deepEqual(harness.counts(), {
    chargeAttempts: 1,
    recoveryCancels: 1,
    chainCancels: 0,
  });
}

// A failed GP/unlock check must leave the committed mining recovery untouched.
{
  const harness = createBufferedRecoveryRuntime({ chargeStarts: false });
  harness.commitContact();
  harness.runtime.update(100, true);
  assert.equal(harness.runtime.isAnimating, false);
  assert.equal(harness.scene.isDigAnimating, true);
  assert.deepEqual(harness.counts(), {
    chargeAttempts: 1,
    recoveryCancels: 0,
    chainCancels: 0,
  });
}

console.log("Thunder Strike committed-recovery input contract passed.");
