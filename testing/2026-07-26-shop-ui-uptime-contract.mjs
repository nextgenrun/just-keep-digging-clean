import assert from "node:assert/strict";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import { SHOP_MERCHANT_PROFILES } from "../values/uiLayout.js";
import { MilestoneBoardSystem } from "../systems/visual/MilestoneBoardSystem.js";
import { NPCManager } from "../world/playScene/NPCManager.js";

const originalPhaser = globalThis.Phaser;
globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown(key) {
        const wasJustDown = key.justDown === true;
        key.justDown = false;
        return wasJustDown;
      },
    },
  },
};

try {
  const boboTile = {
    tx: TOWN_SQUARE_CONFIG.merchantSlots.boboMerchant.tileX,
    ty: 65 + TOWN_SQUARE_CONFIG.merchantSurfaceTileOffset,
  };
  const interactKey = { justDown: true };
  const openedShops = [];
  const scene = {
    config: {
      spawnTileX: 28,
      tileSize: 94,
      topAirRows: 65,
    },
    interactKey,
    playerController: {
      state: {
        getPlayerTile: () => ({ ...boboTile }),
      },
    },
    shopOverlay: {
      show: merchantId => openedShops.push(merchantId),
    },
    soundSystem: {
      playNPCVoiceLine() {},
    },
  };
  const manager = new NPCManager(scene, ASSET_KEYS);
  const milestone = Object.create(MilestoneBoardSystem.prototype);
  milestone.config = scene.config;
  milestone._isBoardOpen = false;
  milestone._ePrompt = { setVisible() {} };
  milestone._openBoardView = () => {
    milestone._isBoardOpen = true;
  };
  milestone._closeBoardView = () => {
    milestone._isBoardOpen = false;
  };

  const milestoneDistance = milestone.getInteractionDistance(boboTile);
  const nearestNpcDistance = manager.getNearestInteractionDistance(boboTile);
  assert.ok(
    nearestNpcDistance < milestoneDistance,
    "Bobo must win the overlapping Town Square interaction",
  );
  const milestoneConsumed = milestone.update(
    boboTile,
    { interact: interactKey },
    { allowOpen: milestoneDistance < nearestNpcDistance },
  );
  assert.equal(milestoneConsumed, false);
  assert.equal(
    interactKey.justDown,
    true,
    "a blocked Milestone Pillar must not consume Bobo's E press",
  );
  assert.equal(manager.checkNPCInteraction(), true);
  assert.deepEqual(openedShops, ["boboMerchant"]);

  manager.npcSprites.set("boboMerchant", {});
  manager._interactPrompts.push({
    npc: { merchantId: "boboMerchant" },
    text: {},
  });
  assert.deepEqual(manager.getInteractionHealthSnapshot(), {
    ready: true,
    boboDefined: true,
    promptReady: true,
    visualReady: true,
    shopReady: true,
    interactKeyReady: true,
  });
  assert.equal(SHOP_MERCHANT_PROFILES.boboMerchant.title, "BOBO'S COUNTER");

  const pillarKey = { justDown: true };
  const pillarTile = {
    tx: TOWN_SQUARE_CONFIG.milestonePillar.tileX,
    ty: boboTile.ty,
  };
  assert.equal(
    milestone.update(pillarTile, { interact: pillarKey }, { allowOpen: true }),
    true,
  );
  assert.equal(milestone._isBoardOpen, true);
  assert.equal(pillarKey.justDown, false);

  console.log("Shop UI uptime contract passed");
} finally {
  globalThis.Phaser = originalPhaser;
}
