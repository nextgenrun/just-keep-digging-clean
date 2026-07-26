import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { AncientRelicBeaconSystem } from "../systems/visual/AncientRelicBeaconSystem.js";
import {
  ANCIENT_RELIC_CONFIG,
  resolveAncientRelicGuidanceEnabled,
} from "../values/ancientRelics.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/model/WorldModel.js";

globalThis.Phaser = { BlendModes: { ADD: "ADD" } };

function buildWorld() {
  const originalLog = console.log;
  try {
    console.log = () => {};
    return new WorldModel(GAME_CONFIG);
  } finally {
    console.log = originalLog;
  }
}

function displayObject(x, y, key = "") {
  return {
    x,
    y,
    key,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    visible: true,
    destroyed: false,
    setOrigin(xValue, yValue = xValue) {
      this.originX = xValue;
      this.originY = yValue;
      return this;
    },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setDepth(value) { this.depth = value; return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setAlpha(value) { this.alpha = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setText(value) { this.text = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

const world = buildWorld();
const caches = world.getAncientRelicCachePositions({ includeHeavenblocks: false });
assert.ok(
  caches.length >= HEAVENBLOCKS_ACCESS_CONFIG.requiredRelics,
  "three guaranteed world relic caches must exist before the Sky Altar can be requested",
);
assert.equal(
  caches.some(({ tx, ty }) => world.getHeavenblockRegionAt(tx, ty)),
  false,
  "underground guidance must not target the Heavenblock bonus caches",
);

let playerTile = { tx: caches[0].tx, ty: caches[0].ty - 2 };
const objects = [];
const scene = {
  textures: {
    exists: (key) => key === ASSET_KEYS.ui.heavenblocks.ancientRelicToken,
  },
  add: {
    image(x, y, key) {
      const object = displayObject(x, y, key);
      objects.push(object);
      return object;
    },
    text(x, y) {
      const object = displayObject(x, y);
      objects.push(object);
      return object;
    },
  },
  tweens: {
    add: (config) => config,
    killTweensOf() {},
  },
  time: { now: 0 },
  playerController: {
    getPlayerTile: () => playerTile,
  },
};
const relicState = { count: 0 };
const beacon = new AncientRelicBeaconSystem(
  scene,
  world,
  { getCount: () => relicState.count },
  { isSkyGateActivated: () => false },
);
beacon.create();
beacon.update(playerTile, 1000);
assert.equal(beacon.getHealthSnapshot().ready, true);
assert.equal(beacon.worldMarker.visible, true);
assert.equal(beacon.worldGlow.visible, true);
assert.ok(
  ANCIENT_RELIC_CONFIG.guidance.worldMarkerDepth > 900,
  "the close locator must render above the hard-black darkness compositor",
);
assert.match(beacon.hudText.text, /RELIC SIGNAL/);
assert.equal(beacon.altarTokens.length, HEAVENBLOCKS_ACCESS_CONFIG.requiredRelics);
assert.match(beacon.altarLabel.text, /0\/3 RELICS/);

const firstTarget = beacon.getHealthSnapshot().target;
world.setTile(firstTarget.tx, firstTarget.ty, TILE_TYPES.AIR, 0);
playerTile = { tx: firstTarget.tx, ty: firstTarget.ty };
beacon.update(playerTile, 2000);
const secondTarget = beacon.getHealthSnapshot().target;
assert.notDeepEqual(
  { tx: secondTarget.tx, ty: secondTarget.ty },
  { tx: firstTarget.tx, ty: firstTarget.ty },
  "the locator must advance after a relic cache is mined",
);

relicState.count = 3;
beacon.update(playerTile, 3000);
assert.match(beacon.hudText.text, /SKY ALTAR READY/);
assert.equal(beacon.altarTokens.every((token) => token.alpha === 1), true);

assert.equal(
  resolveAncientRelicGuidanceEnabled(
    ANCIENT_RELIC_CONFIG.guidance,
    "?relicGuidance=0",
  ),
  false,
);

const setupSource = readFileSync(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
assert.match(setupSource, /new AncientRelicBeaconSystem/);
assert.match(setupSource, /ancientRelicBeaconSystem\?\.destroy/);
const updateSource = readFileSync(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
assert.match(updateSource, /ancientRelicBeaconSystem\?\.update/);
const canarySource = readFileSync(
  new URL("../systems/health/runtimeCanaryChecks.js", import.meta.url),
  "utf8",
);
assert.match(canarySource, /relicGuidanceHealth\?\.ready !== true/);
const harnessSource = readFileSync(
  new URL("../testing/JkdE2EHarness.js", import.meta.url),
  "utf8",
);
assert.match(harnessSource, /Ancient Relic mine/);
assert.match(harnessSource, /mineAncientRelic/);

beacon.destroy();
assert.equal(objects.every((object) => object.destroyed), true);

console.log(
  "Ancient Relic guidance contract passed: guaranteed targets, native world/HUD beacon, altar sockets, retargeting, rollback flag, scene lifecycle, and canary wiring.",
);
