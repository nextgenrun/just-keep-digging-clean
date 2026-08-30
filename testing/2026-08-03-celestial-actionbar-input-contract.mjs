import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CELESTIAL_ACTION_BAR_CONFIG } from "../values/celestialActionBar.js";

const source = await readFile(
  new URL("../systems/visual/CelestialActionBarInputBridge.js", import.meta.url),
  "utf8",
);
assert.equal(CELESTIAL_ACTION_BAR_CONFIG.slotCount, 6);
assert.match(source, /"ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"/);
assert.match(source, /activateSlot\?\.\(index \+ 1, "keyboard"\)/);
assert.match(source, /JustDown/);
assert.match(source, /isEnabled/);

console.log("Celestial actionbar input contract passed.");
