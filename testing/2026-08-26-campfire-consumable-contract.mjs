import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { createDugTilesSavePayload } from "../world/model/DugTilesSaveCodec.js";
import {
  CAMPFIRE_CONSUMABLE_CONFIG,
  sanitizeCampfireData,
} from "../values/campfireConfig.js";
import {
  CELESTIAL_ACTION_BAR_CONFIG,
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
} from "../values/celestialActionBar.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  activateCelestialActionBarEntry,
  getCelestialActionBarAbilityState,
} from "../world/playScene/CelestialActionBarRuntime.js";

const defaultSave = sanitizeCampfireData(null);
assert.deepEqual(defaultSave, {
  version: CAMPFIRE_CONSUMABLE_CONFIG.version,
  level: 1,
  charges: 1,
  refillCapacity: 1,
  selectedBuffType: "warmth",
});
assert.deepEqual(sanitizeCampfireData({
  level: 99,
  charges: -4,
  selectedBuffType: "unknown",
}), {
  version: CAMPFIRE_CONSUMABLE_CONFIG.version,
  level: 10,
  charges: 0,
  refillCapacity: 1,
  selectedBuffType: "warmth",
});

const saves = [];
const statuses = [];
let actionBarSyncs = 0;
let confirmations = 0;
const scene = {
  game: { loop: { delta: 16 } },
  soundSystem: { playUiConfirm: () => { confirmations += 1; } },
  hudSystem: { flashStatus: (...args) => statuses.push(args) },
  queueDugTilesSave: reason => saves.push(reason),
  celestialActionBarSystem: { sync: () => { actionBarSyncs += 1; } },
};
const campfire = new CampfireSystem(
  scene,
  { tileSize: 94 },
  {},
  {},
  1,
  { level: 3, charges: 1, selectedBuffType: "focus" },
);
assert.equal(campfire.getEmberCharges(), 1);
assert.equal(campfire.getSelectedBuff().type, "warmth", "retired Focus saves migrate to Warmth");
assert.equal(campfire.getActionBarState().quantity, 1);
assert.match(campfire.getActionBarState().description, /Warmth.*90s/);

const consumed = campfire.consumeSelectedBuff("contract");
assert.equal(consumed.ok, true);
assert.equal(consumed.source, "contract");
assert.equal(campfire.getEmberCharges(), 0);
assert.equal(campfire.getMiningSpeedBonus(), 0.10);
assert.equal(campfire.getActionBarState().available, false);
assert.match(campfire.getActionBarState().unavailableReason, /at least 1 use/);
assert.match(campfire.getActionBarState().unavailableReason, /Find Ember Ore underground/);
assert.equal(confirmations, 1);
assert.deepEqual(saves, [CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.consumed]);

const blocked = campfire.consumeSelectedBuff();
assert.equal(blocked.ok, false);
assert.equal(blocked.reason, "no-ember-charges");
assert.equal(confirmations, 1);

const collected = campfire.collectEmberCharge();
assert.equal(collected.ok, true);
assert.equal(collected.gained, CAMPFIRE_CONSUMABLE_CONFIG.chargesPerEmberOre);
assert.equal(collected.refillUpgraded, true);
assert.equal(campfire.getEmberCharges(), 1);
assert.equal(campfire.getEmberRefillCapacity(), 2);
assert.match(campfire.getActionBarState().description, /at least 2 uses/);
assert.match(campfire.getActionBarState().description, /found the Campfire refill upgrade/i);
assert.deepEqual(saves, [
  CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.consumed,
  CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.collected,
]);
assert.equal(actionBarSyncs, 2);
assert.equal(statuses.length, 2);

const refilled = campfire.restoreEmberCharges();
assert.equal(refilled.ok, true);
assert.equal(refilled.gained, 1);
assert.equal(refilled.charges, 2);
assert.equal(campfire.restoreEmberCharges().reason, "already-refilled");
assert.deepEqual(saves, [
  CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.consumed,
  CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.collected,
  CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.refilled,
]);
assert.equal(actionBarSyncs, 3);
assert.equal(statuses.length, 3);

const restored = new CampfireSystem(scene, { tileSize: 94 }, {}, {}, 1, campfire.getSaveData());
assert.equal(restored.getEmberCharges(), 2);
assert.equal(restored.getEmberRefillCapacity(), 2);
assert.equal(restored.getSelectedBuff().type, "warmth");
assert.equal(new CampfireSystem(scene, { tileSize: 94 }, {}, {}, 1, { level: 4 })
  .getEmberCharges(), 1, "legacy campfire saves receive the one-use starting migration");
const savePayload = createDugTilesSavePayload({
  worldIdentity: { seed: 1, width: 280, depth: 5065, topAirRows: 9 },
  campfireData: { level: 3, charges: 7, selectedBuffType: "focus" },
});
assert.deepEqual(savePayload.campfireData, {
  version: CAMPFIRE_CONSUMABLE_CONFIG.version,
  level: 3,
  charges: 7,
  refillCapacity: 2,
  selectedBuffType: "warmth",
});

const townSaves = [];
const townCampfire = new CampfireSystem(
  { queueDugTilesSave: reason => townSaves.push(reason) },
  { tileSize: 94, topAirRows: 65 },
  {},
  {},
  1,
  { charges: 0, refillCapacity: 2 },
);
townCampfire.update({ tx: 4, ty: 70 }, null, 16);
assert.equal(townCampfire.getEmberCharges(), 0);
townCampfire.update({ tx: 4, ty: 64 }, null, 16);
assert.equal(townCampfire.getEmberCharges(), 2, "the first town arrival restores the saved refill amount");
townCampfire.consumeSelectedBuff("contract");
townCampfire.consumeSelectedBuff("contract");
townCampfire.update({ tx: 4, ty: 64 }, null, 16);
assert.equal(townCampfire.getEmberCharges(), 0, "remaining in town cannot repeatedly refill");
townCampfire.update({ tx: 4, ty: 70 }, null, 16);
townCampfire.update({ tx: 4, ty: 64 }, null, 16);
assert.equal(townCampfire.getEmberCharges(), 2, "returning to town restores two upgraded uses");
assert.deepEqual(
  townSaves.filter(reason => reason === CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.refilled),
  [
    CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.refilled,
    CAMPFIRE_CONSUMABLE_CONFIG.saveReasons.refilled,
  ],
);
const campfireSource = readFileSync(
  new URL("../systems/environment/CampfireSystem.js", import.meta.url),
  "utf8",
);
assert.match(
  campfireSource,
  /_openBuffSelection\(options = \{\}\)[\s\S]{0,180}restoreEmberCharges\(CAMPFIRE_CONSUMABLE_CONFIG\.refill\.sources\.interaction\)/,
  "opening the real Campfire interaction must apply the refill before rendering its menu",
);

let minedEmbers = 0;
const digSystem = Object.create(DigSystem.prototype);
digSystem.campfireSystem = {
  collectEmberCharge() {
    minedEmbers += 1;
    return { ok: true };
  },
};
assert.equal(digSystem._collectCampfireEmberCharge(TILE_TYPES.DIRT), null);
assert.equal(digSystem._collectCampfireEmberCharge(TILE_TYPES.EMBER_ORE).ok, true);
assert.equal(minedEmbers, 1);
const digSource = readFileSync(new URL("../systems/mining/DigSystem.js", import.meta.url), "utf8");
assert.equal(
  [...digSource.matchAll(/this\._collectCampfireEmberCharge\(/g)].length,
  3,
  "normal mining, Heavy Punch, and ability destruction must all award Ember Charges",
);

const runtimeScene = {
  campfireSystem: {
    getActionBarState: () => ({ unlocked: true, available: true, quantity: 4 }),
    consumeSelectedBuff: source => ({ ok: true, source }),
  },
  playerController: {},
  upgradeSystem: {},
};
assert.equal(
  getCelestialActionBarAbilityState(runtimeScene, CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE)
    .quantity,
  4,
);
assert.deepEqual(
  activateCelestialActionBarEntry(runtimeScene, CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE),
  { ok: true, source: "actionbar" },
);
assert.equal(CELESTIAL_ACTION_BAR_CONFIG.slotCount, 6);
assert.equal(
  CELESTIAL_ACTION_BAR_CONFIG.entries.at(-1).id,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE,
);

console.log("PASS campfire consumable: town/Campfire refill, Ember refill upgrade, saved charges, slot-six hover state");
