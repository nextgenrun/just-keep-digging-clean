import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { PICKAXE_HUD_CONFIG, PICKAXE_HUD_THEMES } from "../values/pickaxeHudThemes.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const root = resolve(import.meta.dirname, "..");
const frame = APPROVED_HUD_SKIN.layout.playerCore;
const gp = APPROVED_HUD_SKIN.layout.gemPower;
const torch = APPROVED_HUD_SKIN.layout.torchIntensity;
const badge = PICKAXE_HUD_CONFIG.overlay;
const label = PICKAXE_HUD_CONFIG.label;
const layers = APPROVED_HUD_SKIN.layout.layers;

function inside(x, y, width = 0, height = 0) {
  return x >= frame.x
    && y >= frame.y
    && x + width <= frame.x + frame.width
    && y + height <= frame.y + frame.height;
}

assert.deepEqual(frame, { x: 12, y: 14, width: 336, height: 82 });
assert.ok(inside(gp.x, gp.y, gp.width, gp.height), "GP bar must stay inside its shell");
assert.ok(
  inside(torch.hitX, torch.hitY, torch.hitWidth, torch.hitHeight),
  "complete torch hit target must stay inside its module",
);
assert.ok(
  inside(badge.x - badge.size / 2, badge.y - badge.size / 2, badge.size, badge.size),
  "pickaxe badge must never be cut off",
);
assert.ok(inside(label.x, label.y), "pickaxe tier label must stay inside its shell");
assert.ok(APPROVED_HUD_SKIN.layout.buffs.y > frame.y + frame.height);
assert.ok(layers.shellOffset < layers.artOffset);
assert.ok(layers.artOffset < layers.contentOffset);
assert.ok(layers.contentOffset < layers.interactionOffset);

assert.equal(
  APPROVED_HUD_SKIN.paths.playerCoreShell,
  "sprites/UI/hud-approved-v2/player-core-shell-v2.png",
);
assert.equal(ASSET_KEYS.ui.approvedHud.playerCoreShell, "ui-hud-approved-player-core-shell-v2");
const png = readFileSync(resolve(root, APPROVED_HUD_SKIN.paths.playerCoreShell));
assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(png.readUInt32BE(16), 456);
assert.equal(png.readUInt32BE(20), 112);
assert.equal(png[25], 6, "V2 shell must remain RGBA");

const [skinSource, badgeSource, shopSource] = [
  "systems/visual/ApprovedHudSkin.js",
  "systems/visual/PickaxeHudView.js",
  "ui/overlays/ShopOverlay.js",
].map(path => readFileSync(resolve(root, path), "utf8"));
assert.match(skinSource, /ASSET_KEYS\.ui\.approvedHud\.playerCoreShell/);
assert.doesNotMatch(skinSource, /playerFrame\?\.setTexture/);
assert.match(badgeSource, /ASSET_KEYS\.ui\.pickaxeIcons/);
assert.match(badgeSource, /PICKAXE_HUD_CONFIG\.fallbackLabel/);
assert.match(shopSource, /ASSET_KEYS\.ui\.pickaxeIcons\?\.\[upgradeId\]/);

const expectedLevels = { mithrilPickaxe: 6, adamantPickaxe: 7, runePickaxe: 9, dragonPickaxe: 11 };
for (const [id, theme] of Object.entries(PICKAXE_HUD_THEMES)) {
  assert.equal(theme.tier, UPGRADES[id].metalTier);
  assert.ok(ASSET_KEYS.ui.pickaxeIcons[id]);
  if (expectedLevels[id]) assert.equal(UPGRADES[id].requiresLevel, expectedLevels[id]);
}

console.log("player HUD V2 contract passed: opaque shell, contained badge/GP/torch, authored icons, and level-gated upgrade wiring");
