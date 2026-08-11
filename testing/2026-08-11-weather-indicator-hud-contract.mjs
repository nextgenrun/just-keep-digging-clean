import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CELESTIAL_CURRENCY_HUD_CONFIG } from "../values/celestialCurrencyHud.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { HUD_QUICK_CONTROLS } from "../values/hudQuickControls.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { RANDOM_WORLD_EVENT_CONFIG } from "../values/randomWorldEvents.js";
import { getRandomEventRibbonGeometry } from
  "../systems/visual/RandomEventWorldView.js";

const root = resolve(import.meta.dirname, "..");
const weatherIds = ["clear", "drizzle", "rain", "storm", "snow"];

function readPngHeader(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return Object.freeze({
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  });
}

const panelPath = resolve(root, APPROVED_HUD_SKIN.paths.worldState);
assert.equal(existsSync(panelPath), true);
assert.deepEqual(readPngHeader(panelPath), {
  width: 768,
  height: 209,
  colorType: 6,
});

for (const kind of weatherIds) {
  const name = `weather${kind[0].toUpperCase()}${kind.slice(1)}`;
  const path = APPROVED_HUD_SKIN.paths[name];
  const key = ASSET_KEYS.ui.approvedHud[name];
  assert.equal(typeof key, "string");
  assert.equal(existsSync(resolve(root, path)), true);
  assert.deepEqual(readPngHeader(resolve(root, path)), {
    width: 192,
    height: 192,
    colorType: 6,
  });
}

const layout = APPROVED_HUD_SKIN.layout;
assert.equal(layout.worldState.y, layout.playerCore.y);
assert.equal(layout.worldState.y, layout.audio.y);
assert.equal(layout.combo.y, layout.playerCore.y);
assert.equal(layout.worldState.width, layout.playerCore.width);

const worldLeft = APPROVED_HUD_SKIN.referenceViewport.width
  - layout.worldState.right
  - layout.worldState.width;
const worldRight = worldLeft + layout.worldState.width;
const audioLeft = APPROVED_HUD_SKIN.referenceViewport.width
  - layout.audio.right
  - layout.audio.width;
assert.equal(audioLeft - worldRight, 16);
assert.ok(layout.worldState.iconX + layout.worldState.iconSize / 2 < layout.worldState.timeX);
assert.ok(layout.weatherBar.xInset >= layout.worldState.timeX);
assert.ok(layout.weatherBar.xInset + layout.weatherBar.width < layout.worldState.width);

const eventRibbon = getRandomEventRibbonGeometry(1280, 720);
const playerRight = layout.playerCore.x + layout.playerCore.width;
assert.equal(eventRibbon.left - playerRight, RANDOM_WORLD_EVENT_CONFIG.visuals.ribbonSafeGap);
assert.equal(worldLeft - eventRibbon.right, RANDOM_WORLD_EVENT_CONFIG.visuals.ribbonSafeGap);
assert.equal(eventRibbon.width, eventRibbon.right - eventRibbon.left);
assert.equal(eventRibbon.x - eventRibbon.width / 2, eventRibbon.left);
assert.equal(eventRibbon.x + eventRibbon.width / 2, eventRibbon.right);

assert.equal(layout.xp.bottom, CELESTIAL_CURRENCY_HUD_CONFIG.layout.bottomPx);
assert.equal(layout.xp.bottom, HUD_QUICK_CONTROLS.inventory.bottom);
assert.equal(RETENTION_CONFIG.hud.x, CELESTIAL_CURRENCY_HUD_CONFIG.layout.leftPx);

const hardcore = HARDCORE_MODE_CONFIG.ui.statusHud;
assert.equal(hardcore.x - hardcore.width / 2, layout.playerCore.x);
assert.equal(hardcore.x + hardcore.width / 2, layout.playerCore.x + layout.playerCore.width);

const approvedSource = readFileSync(resolve(root, "systems/visual/ApprovedHudSkin.js"), "utf8");
const hudSource = readFileSync(resolve(root, "systems/visual/HUDSystem.js"), "utf8");
assert.match(approvedSource, /const WEATHER_TEXTURE_KEYS/);
assert.match(approvedSource, /setWeatherKind\(kind\)/);
assert.match(approvedSource, /setWeatherVisible\(visible\)/);
assert.match(hudSource, /this\.approvedSkin\?\.setWeatherKind\(snap\.kind\)/);
assert.match(hudSource, /const LEGACY_WEATHER_ICONS/);
assert.doesNotMatch(hudSource, /phaseIcon/);

console.log("weather indicator HUD contract: ok");
