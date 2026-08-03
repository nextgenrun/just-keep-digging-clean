import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_CURRENCY_HUD_CONFIG,
  CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS,
  formatCelestialMoney,
  formatCelestialStars,
} from "../values/celestialCurrencyHud.js";

assert.equal(CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS.length, 1);
assert.equal(
  CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS[0].path,
  "sprites/UI/celestial-overhaul-v1/celestial-currency-hud-v1.png",
);
assert.ok(CELESTIAL_CURRENCY_HUD_CONFIG.layout.widthPx < 320);
assert.ok(CELESTIAL_CURRENCY_HUD_CONFIG.layout.heightPx < 64);
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
