import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { executeCampfireUpgrade } from "../systems/environment/CampfireUpgradeTransaction.js";
import { PlayerInputHandler } from "../world/playScene/PlayerInputHandler.js";
import { getRuntimeFeatureAssetGroup } from "../world/rendering/runtimeFeatureAssetGroups.js";
import { CAMPFIRE_TIERS } from "../values/campfireConfig.js";
import { getCampfireFeatureAssetGroupId } from "../values/runtimeAssetLoading.js";
import { isPlaySceneSaveBlocked } from "../world/playScene/PlaySceneSaveRuntime.js";

// Real shared input buffer, including a complete press/release between frames.
const previousPhaser = globalThis.Phaser;
globalThis.Phaser = { Input: { Keyboard: { JustDown(key) {
  const pressed = key._justDown === true;
  key._justDown = false;
  return pressed;
} } } };
const key = Object.assign(new EventEmitter(), { isDown: false, _justDown: false });
const input = Object.create(PlayerInputHandler.prototype);
input.scene = { gameState: "playing" };
input.keys = { interact: key };
input.specialTileInteractBufferedUntilMs = -Infinity;
input._bindInteractBuffer(key);
const tap = () => {
  key.isDown = true;
  key._justDown = true;
  key.emit("down");
  key.isDown = false;
  key._justDown = false; // Phaser Key.onUp clears JustDown.
};
const campfire = Object.create(CampfireSystem.prototype);
Object.assign(campfire, {
  config: { tileSize: 94 }, _campX: 21.5 * 94, _campY: 64 * 94,
  _keyInteract: key, _prevInteract: false, _isSelecting: false,
  _trackTownVisit() {}, _updateBuffTimer() {},
});
let opens = 0;
let confirmations = 0;
campfire._openBuffSelection = () => { opens += 1; campfire._isSelecting = true; };
campfire._handleSelectionInput = (_w, _s, interact) => { if (interact) confirmations += 1; };
const options = { allowOpen: true, consumeInteract: () => input.consumeSpecialTileInteractInput() };
tap();
campfire.update({ tx: 20, ty: 64 }, null, 16, options);
assert.equal(opens, 1, "a released short E tap must open Campfire");
campfire.update({ tx: 20, ty: 64 }, null, 16, options);
assert.equal(confirmations, 0, "the opening press must not activate a blessing");
tap();
campfire.update({ tx: 20, ty: 64 }, null, 16, options);
assert.equal(confirmations, 1, "a separate buffered press can activate the selected blessing");
campfire.update({ tx: 20, ty: 64 }, null, 16, options);
assert.equal(confirmations, 1, "each buffered press is consumed once");

campfire._isSelecting = false;
tap();
campfire.update({ tx: 20, ty: 64 }, null, 16, { ...options, allowOpen: false });
assert.equal(opens, 1);
assert.equal(input.consumeSpecialTileInteractInput(), true, "Worldroot priority retains the E press");
tap();
campfire.update({ tx: 8, ty: 64 }, null, 16, options);
assert.equal(opens, 1);
assert.equal(input.consumeSpecialTileInteractInput(), true, "out-of-range Campfire cannot steal other interactions");

input._unbindInteractBuffer();
assert.equal(key.listenerCount("down"), 0);
globalThis.Phaser = previousPhaser;
const update = readFileSync(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8");
assert.match(update, /allowOpen: !worldrootClaimsInteraction,[\s\S]{0,120}consumeInteract: \(\) => this\.inputHandler\.consumeSpecialTileInteractInput\(\)/);
for (let tier = 1; tier <= 10; tier++) {
  const group = getRuntimeFeatureAssetGroup(getCampfireFeatureAssetGroupId(tier));
  assert.equal(group.assets.length, 1, "a requested Campfire swap admits only one sprite");
  assert.equal(group.bypassPressureGate, true);
  assert.equal(group.releaseWhenUnused, true, "previous form can still be evicted");
}
assert.equal(isPlaySceneSaveBlocked({ _saveWritesBlocked: true }), true);
const harness = readFileSync(new URL("./JkdE2EHarness.js", import.meta.url), "utf8");
assert.match(harness, /if \(!e2eEnabled\(\)\) return;[\s\S]{0,250}scene\._saveWritesBlocked = true/,
  "local visual fixtures must also block forced page-hide saves");

// The loading-policy change must retain the real transaction's payment gates.
let readyUpgrade;
const initialMoney = CAMPFIRE_TIERS[1].cost + 100;
let money = initialMoney, spends = 0;
const saveReasons = [];
const upgrade = { _campfireLevel: 1, _destroyed: false,
  scene: {
    runtimeFeatureAssetManager: { enabled: true,
      ensureGroup: async () => ({ ready: false }), releaseGroup() {} },
    upgradeSystem: { getMoney: () => money,
      spendMoney(amount) { money -= amount; spends += 1; return true; } },
    queueDugTilesSave: reason => saveReasons.push(reason),
  },
  _ensureCampfireTierTexture: async () => true, _syncMoneyUi() {},
};
assert.equal((await executeCampfireUpgrade(upgrade)).success, false);
assert.equal(money, initialMoney);
assert.equal(upgrade._campfireLevel, 1);
assert.deepEqual(saveReasons, []);
upgrade.scene.runtimeFeatureAssetManager.ensureGroup = () => new Promise(resolve => { readyUpgrade = resolve; });
const purchase = CampfireSystem.prototype.upgradeCampfire.call(upgrade);
assert.equal(CampfireSystem.prototype.upgradeCampfire.call(upgrade), purchase);
assert.equal(spends, 0, "payment waits for the original full-quality form");
readyUpgrade({ ready: true });
assert.equal((await purchase).success, true);
assert.equal(upgrade._campfireLevel, 2);
assert.equal(spends, 1, "duplicate upgrade requests cannot double-charge");
assert.equal(money, initialMoney - CAMPFIRE_TIERS[1].cost);
assert.deepEqual(saveReasons, ["campfire-upgrade"]);
console.log("CAMPFIRE_BUFFERED_INTERACTION_CONTRACT_OK");
