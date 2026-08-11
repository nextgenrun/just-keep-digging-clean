import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { TutorialTownExitBarrierSystem } from
  "../systems/onboarding/TutorialTownExitBarrierSystem.js";
import { FIRST_FIVE_MINUTES_CONFIG } from "../values/firstFiveMinutes.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const barrierConfig = FIRST_FIVE_MINUTES_CONFIG.townExitBarrier;
assert.deepEqual(barrierConfig, {
  tileX: 66,
  topSurfaceRowOffset: -3,
  heightTiles: 3,
});
assert.equal("flightReminders" in FIRST_FIVE_MINUTES_CONFIG, false);

let tutorialState = {
  choice: TOWN_TUTORIAL_CHOICES.YES,
  stage: TOWN_TUTORIAL_STAGES.MOVE,
};
const tiles = new Map();
const hp = new Map();
const dugTiles = new Map();
const rubbleTiles = new Map();
const dugTileSource = new Map();
const rendererUpdates = [];
for (const ty of [62, 63, 64]) {
  const key = `66,${ty}`;
  tiles.set(key, TILE_TYPES.AIR);
  dugTiles.set(key, { original: "dug" });
}
const scene = {
  config: { topAirRows: 65 },
  worldModel: {
    dugTiles,
    rubbleTiles,
    dugTileSource,
    inBounds: (tx, ty) => tx >= 0 && tx < 280 && ty >= 0 && ty < 5065,
    getTileType: (tx, ty) => tiles.get(`${tx},${ty}`) ?? TILE_TYPES.AIR,
    getTileHp: (tx, ty) => hp.get(`${tx},${ty}`) ?? 0,
    setTile(tx, ty, type, nextHp = 0) {
      tiles.set(`${tx},${ty}`, type);
      hp.set(`${tx},${ty}`, nextHp);
    },
  },
  worldRenderer: {
    applyTileUpdate: (tx, ty) => rendererUpdates.push({ tx, ty }),
  },
};
const barrier = new TutorialTownExitBarrierSystem(
  scene,
  { getTutorialState: () => tutorialState },
);

assert.equal(barrier.create(), true);
for (const ty of [62, 63, 64]) {
  assert.equal(tiles.get(`66,${ty}`), TILE_TYPES.BEDROCK);
}
assert.equal(rendererUpdates.length, 3);
for (const stage of [
  TOWN_TUTORIAL_STAGES.MOVE,
  TOWN_TUTORIAL_STAGES.DIG,
  TOWN_TUTORIAL_STAGES.FLIGHT,
  TOWN_TUTORIAL_STAGES.PORTAL,
]) {
  tutorialState = { ...tutorialState, stage };
  assert.equal(barrier.sync(), true);
}

tiles.set("66,63", TILE_TYPES.AIR);
assert.equal(barrier.sync(), true);
assert.equal(tiles.get("66,63"), TILE_TYPES.BEDROCK);
assert.equal(rendererUpdates.length, 4);

tutorialState = { ...tutorialState, stage: TOWN_TUTORIAL_STAGES.SELL };
assert.equal(barrier.sync(), false);
for (const ty of [62, 63, 64]) {
  assert.equal(tiles.get(`66,${ty}`), TILE_TYPES.AIR);
  assert.deepEqual(dugTiles.get(`66,${ty}`), { original: "dug" });
}
assert.equal(rendererUpdates.length, 7);
assert.equal(barrier.getHealthSnapshot().active, false);
barrier.destroy();

const bridgeSource = await readFile(
  new URL("../systems/onboarding/FirstFiveMinutesTutorialBridge.js", import.meta.url),
  "utf8",
);
const barrierSource = await readFile(
  new URL("../systems/onboarding/TutorialTownExitBarrierSystem.js", import.meta.url),
  "utf8",
);
const viewSource = await readFile(
  new URL("../systems/onboarding/TownSquareTutorialView.js", import.meta.url),
  "utf8",
);
assert.match(bridgeSource, /TutorialTownExitBarrierSystem/);
assert.match(bridgeSource, /townExitBarrier\.update\(\)/);
assert.doesNotMatch(bridgeSource, /TutorialFlightReminderSystem|claimTutorialUpgradeFunding/);
assert.doesNotMatch(
  barrierSource,
  /uiNotifications|essentialNotifications/,
);
assert.doesNotMatch(
  viewSource,
  /showTownExitTask|showFlightReminder|uiNotifications/,
);

console.log("Tutorial Town boundary contract passed without popups or reminders.");
