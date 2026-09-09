import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  ASSET_KEYS,
  getPickaxeIconPreloadAssets,
} from "../values/assetKeys.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { createUiIcon, resolveUpgradeUiIcon, setUiIcon } from "../ui/UiIconAtlas.js";
import { UI_ICON_ATLAS, UI_ICON_FRAMES } from "../values/uiIcons.js";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedIds = [
  "bronzePickaxe",
  "ironPickaxe",
  "steelPickaxe",
  "mithrilPickaxe",
  "adamantPickaxe",
  "runePickaxe",
  "dragonPickaxe",
];

function pngInfo(buffer) {
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    "asset must be a PNG",
  );
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

assert.deepEqual(Object.keys(ASSET_KEYS.ui.pickaxeIcons), expectedIds);
const preloadAssets = getPickaxeIconPreloadAssets();
assert.equal(preloadAssets.length, expectedIds.length);
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, expectedIds.length);
assert.equal(new Set(preloadAssets.map(asset => asset.path)).size, expectedIds.length);

const resolvedKeys = expectedIds.map((id) => {
  const upgrade = UPGRADES[id];
  assert.equal(upgrade.category, "pickaxes", `${id} must remain a pickaxe upgrade`);
  const resolved = resolveUpgradeUiIcon(upgrade);
  assert.equal(resolved, ASSET_KEYS.ui.pickaxeIcons[id].key);
  return resolved;
});
assert.equal(new Set(resolvedKeys).size, expectedIds.length);

const manifestPath = path.join(
  root,
  "sprites",
  "UI",
  "pickaxe-icons-v1",
  "pickaxe-icon-manifest-v1.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.deepEqual(manifest.assets.map(asset => asset.upgradeId), expectedIds);

for (const entry of manifest.assets) {
  const runtimePath = path.join(root, ...entry.runtime.split("/"));
  const buffer = await readFile(runtimePath);
  assert.deepEqual(
    pngInfo(buffer),
    { width: 256, height: 256, bitDepth: 8, colorType: 6 },
    `${entry.upgradeId} must remain a 256 px RGBA PNG`,
  );
  assert.equal(sha256(buffer), entry.runtimeSha256);
  assert.ok(entry.runtimeCoverage > 0.12 && entry.runtimeCoverage < 0.58);
  assert.ok(entry.runtimeBounds.every(Number.isInteger));
}

const [bootSource, shopSource] = await Promise.all([
  readFile(path.join(root, "ui", "scenes", "BootScene.js"), "utf8"),
  readFile(path.join(root, "ui", "overlays", "ShopOverlay.js"), "utf8"),
]);
assert.match(bootSource, /getPickaxeIconPreloadAssets\(\)/);
assert.ok(
  (shopSource.match(/resolveUpgradeUiIcon\(/g) || []).length >= 2,
  "shop list and detail panel must both resolve the tier-specific icon",
);
const textures = new Set([UI_ICON_ATLAS.key]);
const iconScene = {
  textures: { exists: key => textures.has(key) },
  add: {
    image(x, y, key, frame) {
      return {
        scene: iconScene, active: true, x, y, key, frame,
        setDisplaySize() { return this; },
        setOrigin() { return this; },
        setTexture(nextKey, nextFrame) {
          this.key = nextKey;
          this.frame = nextFrame;
          return this;
        },
      };
    },
  },
};
for (const key of resolvedKeys) {
  const icon = createUiIcon(iconScene, key);
  assert.equal(icon.key, UI_ICON_ATLAS.key, "unloaded pickaxes use the shared atlas");
  assert.equal(icon.frame, UI_ICON_FRAMES.pickaxe, "unloaded pickaxes keep their identity");
  textures.add(key);
  assert.equal(createUiIcon(iconScene, key).key, key, "loaded art uses its direct texture");
  setUiIcon(icon, key);
  assert.equal(icon.key, key, "an existing icon adopts loaded art");
  textures.delete(key);
  setUiIcon(icon, key);
  assert.equal(icon.key, UI_ICON_ATLAS.key);
  assert.equal(icon.frame, UI_ICON_FRAMES.pickaxe, "released art falls back safely");
}
assert.equal(createUiIcon(iconScene, "unknown-icon").frame, UI_ICON_FRAMES.info);
textures.clear();
assert.equal(createUiIcon(iconScene, resolvedKeys[0]), null, "missing art creates no invalid image");

console.log(
  JSON.stringify({
    pickaxeIcons: expectedIds.length,
    uniqueTextureKeys: new Set(resolvedKeys).size,
    runtimeSize: "256x256 RGBA",
    shopConsumers: 2,
    fallback: "pickaxe",
  }),
);
