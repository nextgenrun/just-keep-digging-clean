import assert from "node:assert/strict";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";

const store = new DugTilesSaveStore({ localStorageKey: "celestial-v14-contract" });
const world = {
  seed: 7,
  width: 120,
  depth: 240,
  topAirRows: 65,
  layoutId: "contract",
  layoutRevision: 1,
};
const celestial = {
  talents: {
    stars: 68,
    purchasedNodeIds: ["wayward-star-root"],
  },
  actionbar: {
    order: ["comet-engine", "quickslash", "thunderStrike", "wayward-star", "hollow-sun"],
  },
  legacyRarityMigrationVersion: 1,
};
const payload = store.createPayload(
  world,
  [],
  {},
  null,
  null,
  null,
  null,
  null,
  [],
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  celestial,
);
assert.equal(payload.version, 15);
assert.equal(payload.revisionMetadata.revision, 1);
assert.equal(payload.celestialOverhaulData.talents.stars, 68);
assert.deepEqual(
  payload.celestialOverhaulData.talents.purchasedNodeIds,
  ["wayward-star-root"],
);
assert.equal(payload.celestialOverhaulData.actionbar.order[0], "comet-engine");
assert.equal(payload.celestialOverhaulData.legacyRarityMigrationVersion, 1);

const roundTrip = store.normalizePayload(payload);
assert.deepEqual(roundTrip.celestialOverhaulData, payload.celestialOverhaulData);
const legacy = store.normalizePayload({ ...payload, version: 13, celestialOverhaulData: undefined });
assert.equal(legacy.version, 13);
assert.equal(legacy.celestialOverhaulData.talents.stars, 0);
assert.equal(legacy.celestialOverhaulData.legacyRarityMigrationVersion, 0);

console.log("Celestial v15 save contract and v13 compatibility passed.");
