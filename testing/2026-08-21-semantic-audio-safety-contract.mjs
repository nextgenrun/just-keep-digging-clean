import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  APPROVED_SFX_FAMILIES,
  AUDIO_SEMANTIC_CUE_POLICY,
} from "../values/audioConfig.js";
import { SoundSystem } from "../sound/SoundSystem.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { handleHardcoreGpChanged } from "../world/playScene/HardcoreDeathBridge.js";

assert.deepEqual(Object.keys(APPROVED_SFX_FAMILIES), [
  "seismicWarning",
  "rareDiscovery",
]);
for (const cueId of [
  "hardcoreStressWarning",
  "hardcoreStressCritical",
  "hardcoreNearDeath",
  "lowGemPower",
  "portalStart",
  "portalLoop",
  "portalArrival",
  "levelReward",
]) {
  const policy = AUDIO_SEMANTIC_CUE_POLICY[cueId];
  assert.ok(policy, `${cueId} must have a semantic slot`);
  assert.equal(policy.approvedFamily, null);
  assert.equal(policy.approvalStatus, "awaiting-human-audition");
  assert.ok(policy.caption.length > 0);
  assert.ok(policy.cooldownMs >= 800);
}
assert.ok(
  AUDIO_SEMANTIC_CUE_POLICY.hardcoreNearDeath.priority
    > AUDIO_SEMANTIC_CUE_POLICY.hardcoreStressCritical.priority,
);

const lowGpEvents = [];
const lowGpFlashes = [];
const lowGpScene = {
  _hardcoreRuntime: {
    config: HARDCORE_MODE_CONFIG,
    system: { state: { mode: "casual", armed: false } },
    lowGpCueActive: false,
    flash: (text) => lowGpFlashes.push(text),
  },
  playerController: { getGemPowerMax: () => 100 },
  soundSystem: {
    playSemanticCue: cueId => {
      lowGpEvents.push(cueId);
      return { caption: AUDIO_SEMANTIC_CUE_POLICY[cueId].caption };
    },
  },
};
handleHardcoreGpChanged(lowGpScene, { previous: 25, current: 20 });
handleHardcoreGpChanged(lowGpScene, { previous: 20, current: 19 });
handleHardcoreGpChanged(lowGpScene, { previous: 19, current: 31 });
handleHardcoreGpChanged(lowGpScene, { previous: 31, current: 20 });
assert.deepEqual(lowGpEvents, ["lowGemPower", "lowGemPower"]);
assert.equal(lowGpFlashes.length, 2);
assert.match(lowGpFlashes[0], /Gem Power low/);

const soundHarness = Object.create(SoundSystem.prototype);
soundHarness.scene = { time: { now: 1000 } };
soundHarness.semanticCueHistory = new Map();
soundHarness.playApprovedSfxFamily = () => {
  throw new Error("audition-pending cues must never reach playback");
};
const pendingCue = soundHarness.playHardcoreNearDeath();
assert.deepEqual(
  {
    played: pendingCue.played,
    reason: pendingCue.reason,
    cueId: pendingCue.cueId,
  },
  {
    played: false,
    reason: "awaiting-human-audition",
    cueId: "hardcoreNearDeath",
  },
);
assert.equal(soundHarness.playHardcoreNearDeath().reason, "cooldown");
soundHarness.scene.time.now = 9000;
assert.equal(
  soundHarness.playHardcoreStressWarning("critical").cueId,
  "hardcoreStressCritical",
);
assert.ok(
  soundHarness.getSemanticCueSnapshot().pendingAuditionCueIds
    .includes("portalArrival"),
);
assert.ok(
  AUDIO_SEMANTIC_CUE_POLICY.hardcoreStressCritical.hysteresis.exit
    < AUDIO_SEMANTIC_CUE_POLICY.hardcoreStressCritical.hysteresis.enter,
);

const [soundSource, hardcoreSource, deathSource, specialTileSource] = await Promise.all([
  readFile(new URL("../sound/SoundSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/HardcoreModeBridge.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/HardcoreDeathBridge.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/mining/SpecialTileSystem.js", import.meta.url), "utf8"),
]);
assert.match(soundSource, /playSemanticCue\("hardcoreNearDeath"\)/);
assert.match(soundSource, /playHardcoreStressWarning\(band/);
assert.doesNotMatch(
  soundSource.match(/playHardcoreNearDeath\(\)[\s\S]*?\n  }/)?.[0] || "",
  /seismic/i,
);
assert.match(hardcoreSource, /playHardcoreStressWarning\?\.\(event\.band\)/);
assert.doesNotMatch(
  hardcoreSource.match(/function processSystemEvents[\s\S]*?\n}/)?.[0] || "",
  /playSeismicWarning/,
);
assert.match(hardcoreSource, /stressWarningText/);
assert.match(hardcoreSource, /stressCriticalText/);
assert.match(deathSource, /playSemanticCue\?\.\("lowGemPower"\)/);
assert.match(deathSource, /ratio >= exitRatio/);
assert.match(deathSource, /ratio <= enterRatio/);
assert.ok(
  (specialTileSource.match(/playSemanticCue\?\.\("portalStart"\)/g) || []).length >= 3,
);
assert.match(specialTileSource, /playSemanticCue\?\.\("portalArrival"\)/);

console.log("SEMANTIC_AUDIO_SAFETY_CONTRACT_OK");
