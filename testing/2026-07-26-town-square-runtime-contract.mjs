import assert from "node:assert/strict";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { ARC_CORE_CONFIG } from "../values/arcCoreConfig.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import { NPCManager } from "../world/playScene/NPCManager.js";
import {
  resolveSurfacePackBeautyGeometry,
} from "../world/rendering/scenic-world/WorldVisualSurfacePackView.js";

const scene = {
  config: {
    spawnTileX: 28,
    tileSize: 94,
    topAirRows: 65,
  },
};
const manager = new NPCManager(scene, ASSET_KEYS);
const definitions = manager.getNPCDefs();
const magmaMerchant = definitions.find(definition => (
  definition.merchantId === "magmaMoneyMonster"
));
const surfaceMerchants = definitions.filter(definition => (
  definition.merchantId !== "magmaMoneyMonster"
));

assert.equal(TOWN_SQUARE_CONFIG.layoutId, "town-square-option-a-v1");
assert.deepEqual(
  surfaceMerchants.map(definition => definition.merchantId),
  TOWN_SQUARE_CONFIG.surfaceMerchantOrder,
  "surface merchant order must follow the Town Square SSOT",
);
assert.equal(
  new Set(surfaceMerchants.map(definition => definition.tx)).size,
  surfaceMerchants.length,
  "every surface merchant needs a unique square position",
);
for (const definition of surfaceMerchants) {
  const slot = TOWN_SQUARE_CONFIG.merchantSlots[definition.merchantId];
  assert.equal(definition.tx, slot.tileX, `${definition.merchantId} x`);
  assert.equal(
    definition.ty,
    scene.config.topAirRows + TOWN_SQUARE_CONFIG.merchantSurfaceTileOffset,
    `${definition.merchantId} surface row`,
  );
  assert.equal(definition.assetKey, ASSET_KEYS.npcs.merchantSprites[definition.merchantId]);
  assert.equal(definition.videoKey, ASSET_KEYS.npcs.merchantIdleVideos[definition.merchantId]);
  assert.deepEqual(
    definition.activityKeys,
    ASSET_KEYS.npcs.merchantActivities[definition.merchantId],
  );
}

const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
const beautyGeometry = resolveSurfacePackBeautyGeometry(
  pack,
  scene.config.tileSize,
  UAL_NATIVE_PLAYER_ASSET_PROFILE,
);
const rightmostMerchant = Math.max(...surfaceMerchants.map(definition => definition.tx));
assert.ok(
  rightmostMerchant < beautyGeometry.widthTiles - pack.transition.fadeTiles,
  "every surface merchant must stand inside the opaque approved Town Square",
);
assert.ok(
  Math.max(...surfaceMerchants.map(definition => definition.tx)) < scene.config.spawnTileX,
  "surface merchants must use absolute Town Square slots rather than old spawn-relative offsets",
);

assert.deepEqual(
  { tx: magmaMerchant.tx, ty: magmaMerchant.ty },
  {
    tx: ARC_CORE_CONFIG.merchant.tileX,
    ty: ARC_CORE_CONFIG.merchant.tileY,
  },
  "the Level 2 Arc Core merchant must remain untouched",
);
assert.deepEqual(
  magmaMerchant.activityKeys,
  ASSET_KEYS.npcs.merchantActivities.magmaMoneyMonster,
  "the Level 2 merchant receives presentation poses without moving its shop",
);

assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters, 1.75);
assert.equal(pack.beauty.scaleReference.targetDoorHeightMeters, 2.1);
assert.ok(
  beautyGeometry.targetDoorHeightWorldPx > scene.config.tileSize * 0.95,
  "a realistic 2.10 m door should read as nearly one full world tile",
);

console.log("Town Square runtime contract passed");
