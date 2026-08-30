import assert from "node:assert/strict";

import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { ContextualMechanicTutorialSystem } from
  "../systems/onboarding/ContextualMechanicTutorialSystem.js";
import {
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
} from "../values/celestialActionBar.js";
import {
  CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG,
  CONTEXTUAL_MECHANIC_TUTORIAL_IDS,
} from "../values/contextualMechanicTutorials.js";
import { TOWN_TUTORIAL_STAGES } from "../values/retentionConfig.js";

const seen = new Set();
const retention = {
  getTutorialState: () => ({ stage: TOWN_TUTORIAL_STAGES.COMPLETE }),
  hasSeenMechanicTutorial: id => seen.has(id),
  recordMechanicTutorialSeen(id) {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  },
  getSeenMechanicTutorials: () => [...seen],
};

let savesQueued = 0;
const scene = {
  nextPromiseHudSystem: {
    getHealthSnapshot: () => ({ visible: false, promise: "", detail: "" }),
  },
  queueDugTilesSave: () => { savesQueued += 1; },
};
const tutorial = new ContextualMechanicTutorialSystem(scene, retention, {
  config: Object.freeze({
    ...CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG,
    visibleDwellMs: 500,
    maximumFrameMs: 250,
  }),
});
scene.contextualMechanicTutorialSystem = tutorial;

const statuses = [];
const pulsedEntries = [];
let actionBarSyncs = 0;
scene.hudSystem = { flashStatus: message => statuses.push(message) };
scene.celestialActionBarSystem = {
  sync: entryId => {
    actionBarSyncs += 1;
    if (entryId) pulsedEntries.push(entryId);
  },
};

const campfire = new CampfireSystem(
  scene,
  { tileSize: 94 },
  {},
  {},
  1,
  { charges: 1, refillCapacity: 1 },
);
const discovery = campfire.collectEmberCharge();
assert.equal(discovery.ok, true);
assert.equal(discovery.refillUpgraded, true);
assert.match(statuses[0], /EMBER FUELS THE CAMPFIRE/);
assert.match(statuses[0], /TOWN REFILL 2/);
assert.equal(actionBarSyncs, 1);
assert.deepEqual(pulsedEntries, [CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE]);
assert.match(campfire.getActionBarState().description, /Mine Ember Ore underground/);

const prompt = tutorial.update();
assert.equal(prompt.badgeValue, "EMBER");
assert.match(prompt.promise, /FUELS CAMPFIRE BLESSINGS/);
assert.match(prompt.detail, /RETURN TO TOWN/);
assert.match(prompt.detail, /INTERACT TO CHOOSE/);
assert.match(prompt.detail, /CAMPFIRE SLOT IGNITES/);

scene.nextPromiseHudSystem.getHealthSnapshot = () => ({
  visible: true,
  ...tutorial.getNextPromiseOverride(),
});
tutorial.update(250);
tutorial.update(250);
assert.equal(
  seen.has(CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EMBER_CAMPFIRE),
  true,
  "the discovery lesson persists only after its approved HUD card was visible",
);
assert.equal(tutorial.notifyEmberDiscovery(), false, "the saved lesson cannot replay");
assert.equal(savesQueued, 2, "collection and lesson acknowledgement each queue one save");

console.log("PASS campfire Ember discovery: clear copy, approved guide, saved one-shot, and action-slot pulse");
