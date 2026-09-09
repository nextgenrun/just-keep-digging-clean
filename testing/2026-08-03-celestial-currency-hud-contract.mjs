import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_CURRENCY_HUD_CONFIG,
  CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS,
  formatCelestialMoney,
  formatCelestialStars,
} from "../values/celestialCurrencyHud.js";
import { UI_ICON_FRAMES } from "../values/uiIcons.js";

assert.equal(CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS.length, 2);
assert.equal(
  CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS[0].path,
  "sprites/UI/baked-copy-v1/currency-integrated-v2.png",
);
assert.equal(
  CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS[1].path,
  "sprites/UI/starlight-talent-tree-v4/star-heart-ui-v2.png",
);
assert.equal(CELESTIAL_CURRENCY_HUD_CONFIG.assets.moneyIcon.frame, UI_ICON_FRAMES.sell);
assert.equal(CELESTIAL_CURRENCY_HUD_CONFIG.assets.foundation.bakedIcons, true);
assert.equal(
  CELESTIAL_CURRENCY_HUD_CONFIG.assets.starsIcon.key,
  CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS[1].key,
);
assert.ok(CELESTIAL_CURRENCY_HUD_CONFIG.layout.widthPx < 320);
assert.ok(CELESTIAL_CURRENCY_HUD_CONFIG.layout.heightPx < 64);
assert.deepEqual(
  [
    CELESTIAL_CURRENCY_HUD_CONFIG.layout.moneyIconXFraction,
    CELESTIAL_CURRENCY_HUD_CONFIG.layout.moneyValueXFraction,
    CELESTIAL_CURRENCY_HUD_CONFIG.layout.starsValueXFraction,
    CELESTIAL_CURRENCY_HUD_CONFIG.layout.starsIconXFraction,
  ],
  [0.103, 0.319, 0.678, 0.875],
);
assert.equal(formatCelestialMoney(-4), "0");
assert.equal(formatCelestialMoney(12450), "12,450");
assert.equal(formatCelestialMoney(12.5), "12.50");
assert.equal(formatCelestialStars(68.9), "68");

const source = await readFile(
  new URL("../systems/visual/CelestialCurrencyHudSystem.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(source, /\.add\.(graphics|rectangle|circle)\(/i);
assert.match(source, /getMoney/);
assert.match(source, /getStars/);
assert.match(source, /setScrollFactor\(0\)/);
assert.match(source, /pulseStars/);

console.log("Celestial currency HUD contract passed.");
