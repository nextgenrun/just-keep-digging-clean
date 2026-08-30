import assert from "node:assert/strict";
import {
  CELESTIAL_OVERHAUL_SAVE_CONFIG,
  createCelestialOverhaulSaveData,
  sanitizeCelestialOverhaulData,
} from "../values/celestialOverhaulSave.js";

const empty = sanitizeCelestialOverhaulData(null);
assert.equal(empty.version, 1);
assert.equal(empty.talents.stars, 0);
assert.equal(empty.actionbar.order.length, 6);
assert.equal(empty.actionbar.version, 2);
assert.equal(empty.legacyRarityMigrationVersion, 0);

const migrated = sanitizeCelestialOverhaulData({
  progression: {
    stars: 82,
    unlockedEngines: ["hollow-sun"],
  },
  loadout: ["comet-engine", "quickslash", "bad-entry"],
  migrations: { legacyRarityCounts: 99 },
});
assert.equal(migrated.talents.stars, 82);
assert.deepEqual(migrated.talents.purchasedNodeIds, ["hollow-sun-root"]);
assert.equal(migrated.actionbar.order[0], "comet-engine");
assert.equal(migrated.actionbar.order[1], "quickslash");
assert.equal(migrated.actionbar.order.length, 6);
assert.equal(migrated.actionbar.order.at(-1), "campfire");
assert.equal(
  migrated.legacyRarityMigrationVersion,
  CELESTIAL_OVERHAUL_SAVE_CONFIG.legacyRarityMigrationVersion,
);

const created = createCelestialOverhaulSaveData({
  talents: migrated.talents,
  actionbarOrder: migrated.actionbar.order,
  legacyRarityMigrationVersion: 1,
});
assert.deepEqual(created, migrated);

console.log("Celestial overhaul save contract passed.");
