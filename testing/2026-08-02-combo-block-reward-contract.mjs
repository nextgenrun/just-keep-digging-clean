import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { SPECIAL_BLOCKS_CONFIG } from "../values/specialBlocks.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const notifications = [];
const scene = {
  time: { now: 1250 },
  uiNotifications: {
    success: (message, options) => notifications.push({ message, options }),
  },
};
const comboSystem = new ComboSystem();
const digSystem = new DigSystem(
  { topAirRows: 0 },
  { scene },
  { tileSize: 94, topAirRows: 0 },
  null,
  null,
  null,
  comboSystem,
  null,
);

const reward = digSystem._handleSpecialBlockEffects(
  { destroyed: true, typeBeforeDamage: TILE_TYPES.COMBO_BLOCK },
  { tx: 4, ty: 8 },
);

assert.equal(reward.specialBlockEffect, "comboBoost");
assert.equal(reward.specialBlockDestroyed, true);
assert.equal(reward.comboAdded, SPECIAL_BLOCKS_CONFIG.effects.comboBlock.value);
assert.equal(reward.comboTotal, SPECIAL_BLOCKS_CONFIG.effects.comboBlock.value);
assert.equal(comboSystem.getComboCount(), SPECIAL_BLOCKS_CONFIG.effects.comboBlock.value);
assert.equal(comboSystem.lastComboTime, scene.time.now);
assert.equal(notifications.length, 0);

const source = readFileSync(
  path.join(root, "systems/mining/DigSystem.js"),
  "utf8",
);
assert.doesNotMatch(source, /essentialNotifications|feedback\.notificationKey/);

console.log("Combo Block reward contract passed without a forced popup.");

