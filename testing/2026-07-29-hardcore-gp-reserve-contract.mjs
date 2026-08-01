import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { LightSystem } from "../systems/lighting/LightSystem.js";
import {
  HARDCORE_MODE_CONFIG,
  resolveHardcoreUpkeepGpFloor,
} from "../values/hardcoreMode.js";

const armedHardcore = {
  mode: HARDCORE_MODE_CONFIG.modes.hardcore,
  armed: true,
};
const pendingHardcore = {
  mode: HARDCORE_MODE_CONFIG.modes.hardcore,
  armed: false,
};
const casual = {
  mode: HARDCORE_MODE_CONFIG.modes.casual,
  armed: false,
};

assert.equal(resolveHardcoreUpkeepGpFloor(armedHardcore, "flight"), 1);
assert.equal(resolveHardcoreUpkeepGpFloor(armedHardcore, "torch"), 1);
assert.equal(resolveHardcoreUpkeepGpFloor(armedHardcore, "stress"), 0);
assert.equal(resolveHardcoreUpkeepGpFloor(armedHardcore, "graveborerWurm"), 0);
assert.equal(resolveHardcoreUpkeepGpFloor(pendingHardcore, "flight"), 0);
assert.equal(resolveHardcoreUpkeepGpFloor(casual, "torch"), 0);

const body = {
  x: 16,
  y: 16,
  w: 12,
  h: 12,
  vy: 0,
  setClimbing(value) {
    this.climbing = value;
  },
};
const flashes = [];
const sprite = {
  scene: {
    floatingTextSystem: { getUnlockedConstellations: () => [] },
    hudSystem: {
      flashStatus: (...args) => flashes.push(args),
    },
  },
};
const upgradeSystem = {
  isGemPowerUnlocked: () => true,
  getEffectiveGemPowerMax: base => base,
  getEffectiveGemPowerDrain: base => base,
  getEffectiveGemPowerRegen: () => 0,
  getEffectiveLevitationSpeed: base => base,
  getUpgradeEffects: () => ({}),
};
const abilities = new PlayerAbilities(
  sprite,
  { isSolid: () => false },
  { tileSize: 16, climbSpeedPxPerSec: 252 },
  upgradeSystem,
  body,
);
const floorProvider = context => resolveHardcoreUpkeepGpFloor(
  armedHardcore,
  context?.source,
);
abilities.setGemPowerFloorProvider(floorProvider);

abilities.setGemPowerExact(5, { silent: true });
assert.equal(abilities.consumeGemPower(10, { source: "flight" }), 4);
assert.equal(abilities.getGemPowerExact(), 1);
assert.equal(abilities.hasSpendableGemPower({ source: "flight" }), false);

abilities.setGemPowerExact(5, { silent: true });
assert.equal(abilities.drainAllGemPower({ source: "torch" }), 4);
assert.equal(abilities.getGemPowerExact(), 1);

abilities.setGemPowerExact(1, { silent: true });
assert.equal(abilities.consumeGemPower(1, { source: "stress" }), 1);
assert.equal(
  abilities.getGemPowerExact(),
  0,
  "Stress must still consume the protected final GP",
);

abilities.setGemPowerExact(1, { silent: true });
assert.equal(abilities.consumeGemPower(1, { source: "graveborerWurm" }), 1);
assert.equal(
  abilities.getGemPowerExact(),
  0,
  "Hardcore hazards must remain lethal at the final GP",
);

abilities.setGemPowerExact(1.1, { silent: true });
abilities._flying = true;
abilities._warnedLowGemPower = false;
const heldFlightInput = {
  getFlyInput: () => true,
  getFlyDownInput: () => false,
  getQuickslashInput: () => false,
  isUp: () => false,
};
abilities.update(1, heldFlightInput, false, true);
assert.equal(abilities.getGemPowerExact(), 1);
assert.equal(abilities.isFlying(), false);
assert.equal(body.climbing, false);
assert.ok(
  flashes.some(([message]) => /1 GP reserve protected/i.test(message)),
  "Protected Flight exhaustion must explain why Flight stopped",
);
abilities.update(0.016, heldFlightInput, false, true);
assert.equal(abilities.getGemPowerExact(), 1);
assert.equal(abilities.isFlying(), false, "Holding Flight at 1 GP must not become free Flight");

const torchHudStates = [];
const torchSystem = Object.create(LightSystem.prototype);
torchSystem.playerController = {
  consumeGemPower: (amount, context) => abilities.consumeGemPower(amount, context),
  hasGemPower: () => abilities.hasGemPower(),
  hasSpendableGemPower: context => abilities.hasSpendableGemPower(context),
};
torchSystem.scene = {
  hudSystem: {
    setTorchState: value => torchHudStates.push(value),
  },
};
torchSystem._torchActive = true;
torchSystem._manualTorchOff = false;
torchSystem._currentTorchDrainGpPerSecond = 2;
abilities.setGemPowerExact(1.2, { silent: true });
assert.ok(Math.abs(torchSystem._drainTorchGemPower(2) - 0.2) < 0.000001);
assert.equal(abilities.getGemPowerExact(), 1);
assert.equal(torchSystem._torchActive, false);
assert.equal(
  torchSystem._manualTorchOff,
  true,
  "A torch stopped by the Hardcore reserve must not auto-relight every frame",
);
assert.equal(torchSystem._hasTorchFuel(), false);
torchSystem._toggleTorch();
assert.equal(torchSystem._torchActive, false, "Torch cannot be re-lit at the protected floor");
assert.ok(torchHudStates.includes(false));

abilities.setGemPowerFloorProvider(context => resolveHardcoreUpkeepGpFloor(
  casual,
  context?.source,
));
abilities.setGemPowerExact(1, { silent: true });
assert.equal(abilities.consumeGemPower(2, { source: "flight" }), 1);
assert.equal(
  abilities.getGemPowerExact(),
  0,
  "The injected floor must not change existing Casual GP behavior",
);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bridgeSource = readFileSync(
  resolve(root, "world/playScene/HardcoreModeBridge.js"),
  "utf8",
);
assert.match(bridgeSource, /setGemPowerFloorProvider/);
assert.match(bridgeSource, /resolveHardcoreUpkeepGpFloor/);

console.log("Hardcore Flight and torch 1-GP reserve contract passed.");
