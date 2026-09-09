import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASSET_KEYS,
  getPickaxeHudPreloadAssets,
  getPickaxeIconPreloadAssets,
} from "../values/assetKeys.js";
import {
  PICKAXE_HUD_CONFIG,
  PICKAXE_HUD_THEMES,
} from "../values/pickaxeHudThemes.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { UI_ICON_ATLAS } from "../values/uiIcons.js";
import { PickaxeHudView } from "../systems/visual/PickaxeHudView.js";


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
    "HUD overlay must be a PNG",
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

function makeDisplayObject(initial = {}) {
  return {
    active: true,
    visible: true,
    alpha: 1,
    ...initial,
    setOrigin() { return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setScrollFactor() { return this; },
    setDepth(depth) {
      this.depth = depth;
      return this;
    },
    setVisible(visible) {
      this.visible = visible;
      return this;
    },
    setTexture(texture) {
      this.texture = texture;
      return this;
    },
    setText(text) {
      this.text = text;
      return this;
    },
    setColor(color) {
      this.color = color;
      return this;
    },
    setAlpha(alpha) {
      this.alpha = alpha;
      return this;
    },
    destroy() {
      this.active = false;
      this.visible = false;
    },
  };
}

assert.deepEqual(Object.keys(PICKAXE_HUD_THEMES), expectedIds);
assert.deepEqual(Object.keys(ASSET_KEYS.ui.pickaxeHud), expectedIds);
assert.equal(PICKAXE_HUD_CONFIG.rollbackQuery.name, "pickaxeHud");
assert.equal(PICKAXE_HUD_CONFIG.rollbackQuery.disabledValue, "0");
assert.deepEqual(
  [PICKAXE_HUD_CONFIG.overlay.x, PICKAXE_HUD_CONFIG.overlay.y,
    PICKAXE_HUD_CONFIG.overlay.size],
  [54, 60, 56],
);

const preloadAssets = getPickaxeHudPreloadAssets();
assert.equal(preloadAssets.length, expectedIds.length);
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, expectedIds.length);
assert.equal(new Set(preloadAssets.map(asset => asset.path)).size, expectedIds.length);

const manifestPath = path.join(
  root,
  "sprites",
  "UI",
  "pickaxe-hud-v1",
  "pickaxe-hud-manifest-v1.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.deepEqual(manifest.assets.map(asset => asset.upgradeId), expectedIds);
assert.deepEqual(manifest.overlaySize, [417, 93]);

const overlayHashes = new Set();
for (const [index, entry] of manifest.assets.entries()) {
  const id = expectedIds[index];
  const theme = PICKAXE_HUD_THEMES[id];
  assert.equal(UPGRADES[id].category, "pickaxes");
  assert.equal(theme.tier, index + 1);
  assert.equal(entry.label, theme.label);
  assert.equal(entry.accent, theme.accent);
  assert.ok(ASSET_KEYS.ui.pickaxeIcons[id]);

  const overlayPath = path.join(root, ...entry.overlay.split("/"));
  const buffer = await readFile(overlayPath);
  assert.deepEqual(
    pngInfo(buffer),
    { width: 417, height: 93, bitDepth: 8, colorType: 6 },
    `${id} overlay must remain exact 417x93 RGBA`,
  );
  assert.equal(sha256(buffer), entry.sha256);
  assert.ok(entry.coverage > 0.08 && entry.coverage < 0.42);
  overlayHashes.add(entry.sha256);
}
assert.equal(overlayHashes.size, expectedIds.length);

const iconAssets = getPickaxeIconPreloadAssets();
const textureKeys = new Set([
  UI_ICON_ATLAS.key,
  ...iconAssets.map(asset => asset.key),
]);
const createdImages = [];
const createdTexts = [];
let purchasePulseCount = 0;
const scene = {
  textures: {
    exists: key => textureKeys.has(key),
  },
  add: {
    image: (_x, _y, texture, frame) => {
      const image = makeDisplayObject({ scene, texture, frame, width: 256, height: 256 });
      createdImages.push(image);
      return image;
    },
    text: (_x, _y, text, style) => {
      const textObject = makeDisplayObject({ text, style });
      createdTexts.push(textObject);
      return textObject;
    },
  },
  tweens: {
    killTweensOf() {},
    add(config) {
      purchasePulseCount += 1;
      config.targets.forEach(target => target.setAlpha(config.alpha));
      return config;
    },
  },
};

const view = new PickaxeHudView(scene, 1);
assert.equal(view.getSnapshot().ready, true);
assert.equal(view.getSnapshot().overlayVisible, true);
assert.equal(view.getSnapshot().label, PICKAXE_HUD_CONFIG.fallbackLabel);
assert.equal(view.setPickaxe("bronzePickaxe"), true);
assert.equal(view.getSnapshot().label, "BRONZE I");
assert.equal(createdImages[0].texture, ASSET_KEYS.ui.pickaxeIcons.bronzePickaxe.key);
assert.equal(createdTexts[0].color, PICKAXE_HUD_THEMES.bronzePickaxe.accent);
assert.equal(view.setPickaxe("dragonPickaxe", { animate: true }), true);
assert.equal(view.getSnapshot().pickaxeId, "dragonPickaxe");
assert.equal(purchasePulseCount, 1);
assert.equal(view.setPickaxe("unknownPickaxe"), false);
assert.equal(view.getSnapshot().overlayVisible, true);
assert.equal(view.getSnapshot().label, PICKAXE_HUD_CONFIG.fallbackLabel);
view.destroy();
assert.equal(createdImages[0].active, false);
assert.equal(createdTexts[0].active, false);

const [bootSource, hudSource, approvedSource, shopSource] = await Promise.all([
  readFile(path.join(root, "ui", "scenes", "BootScene.js"), "utf8"),
  readFile(path.join(root, "systems", "visual", "HUDSystem.js"), "utf8"),
  readFile(path.join(root, "systems", "visual", "ApprovedHudSkin.js"), "utf8"),
  readFile(path.join(root, "ui", "overlays", "ShopOverlay.js"), "utf8"),
]);
assert.match(bootSource, /getPickaxeHudPreloadAssets\(\)/);
assert.match(bootSource, /getPickaxeIconPreloadAssets\(\)/);
assert.match(approvedSource, /new PickaxeHudView\(scene, this\.scale\)/);
assert.match(hudSource, /setCurrentPickaxe\(this\.scene\.upgradeSystem\?\.ownedPickaxe\)/);
assert.match(shopSource, /ASSET_KEYS\.ui\.pickaxeIcons\?\.\[upgradeId\]/);
assert.match(shopSource, /setCurrentPickaxe\?\.\(upgradeId,[\s\S]*animate: true/);

console.log(
  JSON.stringify({
    themes: expectedIds.length,
    uniqueOverlays: overlayHashes.size,
    runtimeSize: "256x256 icon -> 56x56 V2 badge",
    purchaseRefresh: true,
    persistedSync: "UpgradeSystem.ownedPickaxe",
    rollback: "?pickaxeHud=0",
  }),
);
