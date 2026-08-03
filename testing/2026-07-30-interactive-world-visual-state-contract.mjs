import assert from "node:assert/strict";
import { AnimatedCacheVisualSystem } from
  "../systems/visual/AnimatedCacheVisualSystem.js";
import { MemoryReliquaryWorldSystem } from
  "../systems/visual/MemoryReliquaryWorldSystem.js";
import { MemoryReliquaryDiscoverySystem } from
  "../systems/progression/MemoryReliquaryDiscoverySystem.js";
import {
  INTERACTIVE_WORLD_STATES,
  getInteractiveWorldStateFrameName,
} from "../values/interactiveWorldStates.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/WorldModel.js";

function displayObject() {
  return {
    frames: [],
    visible: true,
    setOrigin() { return this; },
    setDepth() { return this; },
    setDisplaySize() { return this; },
    setAlpha() { return this; },
    setPosition() { return this; },
    setText(value) { this.text = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setFrame(value) { this.frames.push(value); this.frame = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

const cacheImages = [];
const cacheWorld = {
  tileSize: 94,
  widthTiles: 40,
  depthTiles: 180,
  getTileType: (tileX, tileY) => (
    tileX === 10 && tileY === 80 ? TILE_TYPES.CHEST : TILE_TYPES.AIR
  ),
};
const openedChestKeys = new Set();
const cacheScene = {
  specialTileSystem: { openedChestKeys },
  cameras: {
    main: { worldView: { x: 600, y: 6800, width: 760, height: 760 } },
  },
  add: {
    image: () => {
      const image = displayObject();
      cacheImages.push(image);
      return image;
    },
  },
};
const cacheBank = {
  ensure: () => true,
  release: () => true,
};
const cacheSystem = new AnimatedCacheVisualSystem(
  cacheScene,
  cacheWorld,
  cacheBank,
);
const cachePlayerTile = { tx: 10, ty: 79 };
cacheSystem.update(0, cachePlayerTile);
assert.equal(cacheImages.length, 1);
assert.equal(
  cacheImages[0].frame,
  getInteractiveWorldStateFrameName(
    INTERACTIVE_WORLD_STATES.states.proximityReady.index,
  ),
);

openedChestKeys.add("10,80");
cacheWorld.getTileType = () => TILE_TYPES.AIR;
cacheSystem.update(16, cachePlayerTile);
assert.equal(
  cacheImages[0].frame,
  getInteractiveWorldStateFrameName(
    INTERACTIVE_WORLD_STATES.states.activation[0].index,
  ),
);
cacheSystem.update(5000, cachePlayerTile);
assert.equal(
  cacheImages[0].frame,
  getInteractiveWorldStateFrameName(
    INTERACTIVE_WORLD_STATES.states.spent.index,
  ),
);
assert.equal(cacheSystem.getSnapshot().visibleCaches, 1);

const disabledCacheSystem = new AnimatedCacheVisualSystem(
  cacheScene,
  cacheWorld,
  cacheBank,
  INTERACTIVE_WORLD_STATES,
  "?animatedCaches=0",
);
disabledCacheSystem.update(0, cachePlayerTile);
assert.equal(disabledCacheSystem.getSnapshot().visibleCaches, 0);

const quietLog = console.log;
console.log = () => {};
const realWorld = new WorldModel();
console.log = quietLog;
const journal = [];
let saveRequests = 0;
const retention = {
  getJournalSnapshot: () => ({ discoveries: { journal: [...journal] } }),
  discoverJournal: key => {
    if (journal.includes(key)) return false;
    journal.push(key);
    return true;
  },
};
const discovery = new MemoryReliquaryDiscoverySystem(
  retention,
  () => { saveRequests += 1; },
);
const loreDialogs = [];
const reliquaryImages = [];
const reliquaryScene = {
  time: { now: 200 },
  add: {
    image: () => {
      const image = displayObject();
      reliquaryImages.push(image);
      return image;
    },
    text: () => displayObject(),
  },
  showGameDialog(title, body) {
    loreDialogs.push({ title, body });
  },
};
const reliquaryBank = {
  ensure: () => true,
  release: () => true,
};
const reliquarySystem = new MemoryReliquaryWorldSystem(
  reliquaryScene,
  realWorld,
  reliquaryBank,
  discovery,
  () => "Press E",
);
assert.equal(reliquarySystem.create(), true);
const firstReliquary = INTERACTIVE_WORLD_STATES
  .memoryReliquaries
  .definitions[0];
const reliquaryPlayerTile = {
  tx: firstReliquary.tileX,
  ty: firstReliquary.floorTileY - 1,
};
reliquarySystem.update(200, reliquaryPlayerTile);
assert.equal(reliquaryImages.length, 1);
assert.equal(
  reliquarySystem.getInteractionDistance(reliquaryPlayerTile),
  0,
);
reliquarySystem.setInteractionAllowed(true);
const openResult = reliquarySystem.handleInteract();
assert.equal(openResult.success, true);
assert.equal(openResult.newlyDiscovered, true);
assert.equal(saveRequests, 1);
assert.equal(loreDialogs.length, 1);
assert.match(loreDialogs[0].body, /Recorded in Journey findings/);
assert.equal("reward" in openResult, false);
assert.equal("money" in openResult, false);

reliquarySystem.update(220, reliquaryPlayerTile);
assert.equal(
  reliquaryImages[0].frame,
  getInteractiveWorldStateFrameName(
    INTERACTIVE_WORLD_STATES.states.activation[0].index,
  ),
);
reliquarySystem.setInteractionAllowed(true);
const rereadResult = reliquarySystem.handleInteract();
assert.equal(rereadResult.type, "memory-reliquary-read");
assert.equal(saveRequests, 1);

console.log(JSON.stringify({
  pass: true,
  cacheTransition: "proximity -> activation -> spent",
  reliquaryTransition: "dormant -> activation -> persistent journal",
  rewardCalls: 0,
}));
