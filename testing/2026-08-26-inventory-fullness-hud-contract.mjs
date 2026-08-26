import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { HUD_QUICK_CONTROLS } from "../values/hudQuickControls.js";
import { HudQuickControls } from "../systems/visual/HudQuickControls.js";
import {
  getInventoryCargoUnits,
  resolveInventoryFullnessState,
} from "../systems/visual/inventoryFullnessState.js";

const fullness = HUD_QUICK_CONTROLS.inventory.fullness;
const assetRoot = new URL("../sprites/UI/inventory-fullness-v3/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest-v3.json", assetRoot), "utf8"),
);

assert.equal(fullness.visualCapacityUnits, 100);
assert.equal(fullness.stateCount, 10);
assert.equal(fullness.assetNames.length, 10);
assert.equal(manifest.stateCount, 10);
assert.equal(manifest.schema, "understar-inventory-fullness/v3");
assert.equal(manifest.decodedBytes, 10 * 256 * 256 * 4);
assert.equal(manifest.assets.length, 10);
assert.deepEqual(manifest.invariantRegion, [0, 0, 256, 78]);
assert.deepEqual(manifest.cargoChangeRegion, [44, 78, 212, 148]);
assert.deepEqual(manifest.cavityBounds, [47, 79, 209, 151]);
assert.equal(manifest.baseReferenceSha256, manifest.assets[0].sha256);

for (const [index, assetName] of fullness.assetNames.entries()) {
  const stateNumber = index + 1;
  const manifestAsset = manifest.assets[index];
  assert.equal(manifestAsset.state, stateNumber);
  assert.ok(ASSET_KEYS.ui.approvedHud[assetName]);
  assert.equal(
    APPROVED_HUD_SKIN.paths[assetName],
    `sprites/UI/inventory-fullness-v3/inventory-fullness-${String(stateNumber).padStart(2, "0")}.png`,
  );
  assert.equal(manifestAsset.width, 256);
  assert.equal(manifestAsset.height, 256);
  assert.equal(manifestAsset.transparentCorners, true);
  assert.equal(manifestAsset.lockedBagPixels, true);
  assert.equal(manifestAsset.embeddedInsideCavity, true);
  assert.equal(Boolean(manifestAsset.changeBounds), stateNumber > 1);
  assert.equal(
    Boolean(manifestAsset.overlaySourceSha256),
    stateNumber > 1,
  );

  const png = await readFile(new URL(manifestAsset.path, assetRoot));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 256);
  assert.equal(png.readUInt32BE(20), 256);
  assert.equal(png[25], 6, `${manifestAsset.path} must be RGBA`);
  assert.equal(createHash("sha256").update(png).digest("hex"), manifestAsset.sha256);
}

const thresholdCases = [
  [{}, 1],
  [{ dirt: 1 }, 2],
  [{ dirt: 12 }, 3],
  [{ dirt: 23 }, 4],
  [{ dirt: 34 }, 5],
  [{ dirt: 45 }, 6],
  [{ dirt: 56 }, 7],
  [{ dirt: 67 }, 8],
  [{ dirt: 78 }, 9],
  [{ dirt: 89 }, 10],
  [{ dirt: 100 }, 10],
  [{ dirt: 999_999 }, 10],
];

for (const [resources, expectedStateNumber] of thresholdCases) {
  assert.equal(
    resolveInventoryFullnessState(resources).stateNumber,
    expectedStateNumber,
  );
}

assert.equal(getInventoryCargoUnits({ dirt: 7.9, stone: 3, invalid: "no" }), 10);
assert.equal(getInventoryCargoUnits({ dirt: -5, stone: Number.NaN }), 0);
assert.equal(resolveInventoryFullnessState({ dirt: 56 }).fullnessPercent, 56);
assert.equal(resolveInventoryFullnessState({ dirt: 0 }).stateNumber, 1);

const fullnessTextureKeys = fullness.assetNames.map(
  (assetName) => ASSET_KEYS.ui.approvedHud[assetName],
);
const quickControls = Object.create(HudQuickControls.prototype);
quickControls.scene = {
  textures: {
    exists: (textureKey) => fullnessTextureKeys.includes(textureKey),
  },
};
quickControls.config = HUD_QUICK_CONTROLS;
quickControls.inventoryFullnessTextureKeys = fullnessTextureKeys;
quickControls.inventoryFullnessState = null;
quickControls.inventoryIcon = {
  texture: { key: fullnessTextureKeys[0] },
  setTexture(textureKey) {
    this.texture.key = textureKey;
    return this;
  },
};

assert.equal(quickControls.setInventoryResources({ dirt: 56 }), true);
assert.equal(quickControls.inventoryIcon.texture.key, fullnessTextureKeys[6]);
assert.equal(quickControls.inventoryFullnessState.stateNumber, 7);
assert.equal(quickControls.setInventoryResources({ dirt: 56 }), false);
assert.equal(quickControls.setInventoryResources({}), true);
assert.equal(quickControls.inventoryIcon.texture.key, fullnessTextureKeys[0]);
assert.equal(quickControls.inventoryFullnessState.stateNumber, 1);

const quickControlsSource = await readFile(
  new URL("../systems/visual/HudQuickControls.js", import.meta.url),
  "utf8",
);
const hudSource = await readFile(
  new URL("../systems/visual/HUDSystem.js", import.meta.url),
  "utf8",
);
assert.match(quickControlsSource, /setInventoryResources\(resources = \{\}\)/);
assert.match(quickControlsSource, /inventoryIcon\?\.setTexture\(textureKey\)/);
assert.match(hudSource, /quickControls\?\.setInventoryResources\?\./);
assert.match(hudSource, /digSystem\?\.getResourceTotals\?\./);

console.log("INVENTORY_FULLNESS_HUD_CONTRACT_OK");
