import assert from "node:assert/strict";

import { NPCManager } from "../world/playScene/NPCManager.js";

globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown: key => key?.pressed === true,
    },
  },
};

function createHarness({ operational = true, opens = true } = {}) {
  const calls = { opened: [], settled: [], voiced: [] };
  const manager = Object.create(NPCManager.prototype);
  manager.npcDefs = [
    { merchantId: "moneyMonster", tx: 10, ty: 5 },
    { merchantId: "boboMerchant", tx: 12, ty: 5 },
  ];
  manager._availableMerchantIds = null;
  manager.activitySystem = {
    settleMerchant: merchantId => calls.settled.push(merchantId),
  };
  manager.scene = {
    playerController: { state: { getPlayerTile: () => ({ tx: 12, ty: 5 }) } },
    interactKey: { pressed: true },
    shopOverlay: {
      isOperational: () => operational,
      show: merchantId => {
        calls.opened.push(merchantId);
        return opens;
      },
    },
    soundSystem: {
      playNPCVoiceLine: merchantId => calls.voiced.push(merchantId),
    },
  };
  return { manager, calls };
}

const success = createHarness();
assert.equal(success.manager.checkNPCInteraction(), true);
assert.deepEqual(success.calls, {
  opened: ["boboMerchant"],
  settled: ["boboMerchant"],
  voiced: ["boboMerchant"],
});

const unavailable = createHarness();
unavailable.manager._availableMerchantIds = new Set(["moneyMonster"]);
unavailable.manager.scene.playerController.state.getPlayerTile = () => ({ tx: 10, ty: 5 });
assert.equal(unavailable.manager.checkNPCInteraction(), true);
assert.deepEqual(unavailable.calls.opened, ["moneyMonster"]);

const unhealthy = createHarness({ operational: false });
assert.equal(unhealthy.manager.checkNPCInteraction(), false);
assert.deepEqual(unhealthy.calls, { opened: [], settled: [], voiced: [] });

const rejected = createHarness({ opens: false });
assert.equal(rejected.manager.checkNPCInteraction(), false);
assert.deepEqual(rejected.calls.opened, ["boboMerchant"]);
assert.deepEqual(rejected.calls.settled, []);
assert.deepEqual(rejected.calls.voiced, []);

const noInput = createHarness();
noInput.manager.scene.interactKey.pressed = false;
assert.equal(noInput.manager.checkNPCInteraction(), false);
assert.deepEqual(noInput.calls.opened, []);

console.log("NPC_SHOP_INTERACTION_CONTRACT_OK");
