import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ContextualMechanicTutorialSystem } from
  "../systems/onboarding/ContextualMechanicTutorialSystem.js";
import { RetentionProgressSystem } from
  "../systems/progression/RetentionProgressSystem.js";
import { sanitizeRetentionProgressData } from
  "../systems/progression/retentionProgressState.js";
import {
  CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG,
  CONTEXTUAL_MECHANIC_TUTORIAL_IDS,
} from "../values/contextualMechanicTutorials.js";
import { GRAVEBORER_WURM_PHASES } from "../values/graveborerWurm.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from
  "../values/uiNotificationCarousel.js";

const IDS = CONTEXTUAL_MECHANIC_TUTORIAL_IDS;
const TEST_CONFIG = Object.freeze({
  ...CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG,
  visibleDwellMs: 500,
  maximumFrameMs: 250,
});

function createRetention({ stage = TOWN_TUTORIAL_STAGES.COMPLETE, seen = [] } = {}) {
  const retention = new RetentionProgressSystem();
  retention.loadSaveData({
    tutorialChoice: TOWN_TUTORIAL_CHOICES.YES,
    tutorialStage: stage,
    mechanicTutorialsSeen: seen,
  });
  return retention;
}

function createScene(overrides = {}) {
  let savesQueued = 0;
  const scene = {
    gameState: "playing",
    nextPromiseHudSystem: {
      getHealthSnapshot: () => ({ visible: false, promise: "", detail: "" }),
    },
    systemIntroductionSystem: { lastSnapshot: { caveRun: false } },
    lightSystem: {
      getShaderSnapshot: () => ({ depth: 0, darknessAlpha: 0 }),
    },
    earthquakeSystem: {
      getStatus: () => ({ state: "idle", playerAware: false }),
    },
    _hardcoreRuntime: {
      system: { getSnapshot: () => ({ armed: false }) },
    },
    graveborerWurmRuntime: null,
    queueDugTilesSave: () => { savesQueued += 1; },
    ...overrides,
  };
  scene.getSavesQueued = () => savesQueued;
  return scene;
}

function presentActivePromise(scene, tutorial) {
  scene.nextPromiseHudSystem.getHealthSnapshot = () => ({
    visible: true,
    ...tutorial.getNextPromiseOverride(),
  });
}

function finishActivePrompt(scene, tutorial) {
  presentActivePromise(scene, tutorial);
  tutorial.update(250);
  tutorial.update(250);
}

assert.deepEqual(
  sanitizeRetentionProgressData({
    mechanicTutorialsSeen: [IDS.DARKNESS, IDS.DARKNESS, "invalid"],
  }).mechanicTutorialsSeen,
  [IDS.DARKNESS],
  "save sanitizer keeps only unique, supported tutorial acknowledgements",
);
assert.deepEqual(
  sanitizeRetentionProgressData(null).mechanicTutorialsSeen,
  [],
  "older saves safely default to no contextual lessons seen",
);

const activeOpeningRetention = createRetention({ stage: TOWN_TUTORIAL_STAGES.DIG });
const activeOpeningScene = createScene({
  systemIntroductionSystem: { lastSnapshot: { caveRun: true } },
  lightSystem: { getShaderSnapshot: () => ({ depth: 140, darknessAlpha: 1 }) },
});
const activeOpening = new ContextualMechanicTutorialSystem(
  activeOpeningScene,
  activeOpeningRetention,
  { config: TEST_CONFIG },
);
assert.equal(activeOpening.update(), null, "the opening seven-step route is never interrupted");

const darknessRetention = createRetention();
const darknessScene = createScene({
  systemIntroductionSystem: { lastSnapshot: { caveRun: true } },
  lightSystem: { getShaderSnapshot: () => ({ depth: 140, darknessAlpha: 1 }) },
});
const darkness = new ContextualMechanicTutorialSystem(
  darknessScene,
  darknessRetention,
  { config: TEST_CONFIG },
);
assert.equal(darkness.update().badgeValue, "DARKNESS");
assert.match(darkness.getNextPromiseOverride().promise, /TURN YOUR TORCH ON OR OFF/);
darkness.update(500);
assert.equal(
  darknessRetention.hasSeenMechanicTutorial(IDS.DARKNESS),
  false,
  "hidden time does not acknowledge a lesson",
);
finishActivePrompt(darknessScene, darkness);
assert.equal(darknessRetention.hasSeenMechanicTutorial(IDS.DARKNESS), true);
assert.equal(darknessScene.getSavesQueued(), 1);

const reloadedDarknessRetention = createRetention({
  seen: darknessRetention.getSaveData().mechanicTutorialsSeen,
});
const reloadedDarkness = new ContextualMechanicTutorialSystem(
  darknessScene,
  reloadedDarknessRetention,
  { config: TEST_CONFIG },
);
assert.equal(reloadedDarkness.update(), null, "completed lessons stay complete after reload");

const hardcoreRetention = createRetention({ seen: [IDS.DARKNESS] });
const hardcoreScene = createScene({
  _hardcoreRuntime: {
    system: { getSnapshot: () => ({ armed: true }) },
  },
});
const hardcore = new ContextualMechanicTutorialSystem(
  hardcoreScene,
  hardcoreRetention,
  { config: TEST_CONFIG },
);
assert.equal(hardcore.update().badgeValue, "HARDCORE");
assert.match(hardcore.getNextPromiseOverride().detail, /1 GP STAYS RESERVED/);

const earthquakeScene = createScene({
  earthquakeSystem: {
    getStatus: () => ({ state: "warning", playerAware: true }),
  },
  _hardcoreRuntime: {
    system: { getSnapshot: () => ({ armed: true }) },
  },
});
const earthquake = new ContextualMechanicTutorialSystem(
  earthquakeScene,
  createRetention({ seen: [IDS.DARKNESS] }),
  { config: TEST_CONFIG },
);
assert.equal(earthquake.update().badgeValue, "QUAKE");
assert.match(earthquake.getNextPromiseOverride().detail, /DIG THROUGH THE RUBBLE AFTERWARD/);

const wurmScene = createScene({
  earthquakeSystem: {
    getStatus: () => ({ state: "warning", playerAware: true }),
  },
  graveborerWurmRuntime: {
    lastGate: { productionActive: true },
    system: {
      getSnapshot: () => ({ phase: GRAVEBORER_WURM_PHASES.warning }),
    },
  },
});
const wurm = new ContextualMechanicTutorialSystem(
  wurmScene,
  createRetention(),
  { config: TEST_CONFIG },
);
assert.equal(wurm.update().badgeValue, "WURM", "Wurm danger wins simultaneous hazard priority");
assert.match(wurm.getNextPromiseOverride().promise, /MINING NOISE/);
assert.match(wurm.getNextPromiseOverride().detail, /BREACH LINE/);

const devOnlyWurmScene = createScene({
  graveborerWurmRuntime: {
    lastGate: { productionActive: false, devOverride: true },
    system: {
      getSnapshot: () => ({ phase: GRAVEBORER_WURM_PHASES.warning }),
    },
  },
});
const devOnlyWurm = new ContextualMechanicTutorialSystem(
  devOnlyWurmScene,
  createRetention(),
  { config: TEST_CONFIG },
);
assert.equal(devOnlyWurm.update(), null, "developer summons do not consume production teaching state");

const [setupSource, updateSource, lifecycleSource, nextPromiseSource, tutorialSource] =
  await Promise.all([
    readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneLifecycle.js", import.meta.url), "utf8"),
    readFile(new URL("../systems/visual/NextPromiseHudSystem.js", import.meta.url), "utf8"),
    readFile(new URL("../systems/onboarding/ContextualMechanicTutorialSystem.js", import.meta.url), "utf8"),
  ]);
assert.match(setupSource, /new ContextualMechanicTutorialSystem/);
assert.match(updateSource, /contextualMechanicTutorialSystem\?\.update/);
assert.match(lifecycleSource, /"contextualMechanicTutorialSystem"/);
assert.match(
  nextPromiseSource,
  /tutorialPromise \|\| mechanicPromise \|\| eventPromise \|\| systemPromise/,
);
assert.doesNotMatch(tutorialSource, /uiNotifications|showGameDialog|showOverlay/);
assert.equal(
  UI_NOTIFICATION_CAROUSEL_CONFIG.enabled,
  false,
  "contextual lessons must not reopen the rejected notification channel",
);

console.log("contextual mechanic tutorial contract: triggers, copy, dwell, persistence, and wiring passed");
