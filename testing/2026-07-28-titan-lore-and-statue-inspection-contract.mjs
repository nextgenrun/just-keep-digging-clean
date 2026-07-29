import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  resolveTitanStatueLoreEnabled,
} from "../values/titanDiscoveries.js";
import {
  TITAN_LORE_ENTRIES,
  getTitanLoreEntry,
} from "../values/titanLore.js";
import { TitanSurfaceGallery } from "../systems/visual/TitanSurfaceGallery.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class FakeDisplayObject {
  constructor(x, y, key = "") {
    this.x = x;
    this.y = y;
    this.key = key;
    this.width = key.includes("surface-stance") ? 768 : 512;
    this.height = key.includes("surface-stance") ? 768 : 320;
    this.alpha = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.visible = true;
  }

  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setDepth(value) { this.depth = value; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setTint(value) { this.tint = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setY(value) { this.y = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setText(value) { this.text = value; return this; }
  destroy() { this.destroyed = true; }
}

function createScene() {
  const notifications = [];
  return {
    notifications,
    textures: { exists: () => true },
    add: {
      image: (x, y, key) => new FakeDisplayObject(x, y, key),
      text: (x, y, text) => Object.assign(
        new FakeDisplayObject(x, y, "text"),
        { text },
      ),
    },
    tweens: {
      add: () => ({ stop() {} }),
      killTweensOf() {},
    },
    uiNotifications: {
      info(message, options) {
        notifications.push({ message, options });
      },
    },
  };
}

const definitionIds = TITAN_DEFINITIONS.map(definition => definition.id);
const loreIds = Object.keys(TITAN_LORE_ENTRIES);
assert.deepEqual(loreIds, definitionIds, "lore order and Titan authority must match");
assert.equal(loreIds.length, 25);

const epithets = new Set();
const inscriptions = new Set();
const archiveEntries = new Set();
for (const definition of TITAN_DEFINITIONS) {
  const lore = getTitanLoreEntry(definition.id);
  assert.ok(lore, `${definition.id} must have a lore entry`);
  assert.ok(lore.epithet.length >= 8, `${definition.id} epithet`);
  assert.ok(lore.inscription.length >= 24, `${definition.id} inscription`);
  assert.ok(lore.archiveLore.length >= 100, `${definition.id} archive lore`);
  assert.doesNotMatch(
    `${lore.epithet} ${lore.inscription} ${lore.archiveLore}`,
    /todo|placeholder|lorem ipsum/i,
    `${definition.id} must contain production copy`,
  );
  epithets.add(lore.epithet);
  inscriptions.add(lore.inscription);
  archiveEntries.add(lore.archiveLore);
}
assert.equal(epithets.size, 25, "every Titan needs a unique epithet");
assert.equal(inscriptions.size, 25, "every plinth needs a unique inscription");
assert.equal(archiveEntries.size, 25, "every archive entry needs unique field lore");

assert.equal(resolveTitanStatueLoreEnabled(undefined, ""), true);
assert.equal(
  resolveTitanStatueLoreEnabled(undefined, "?titanStatueLore=0"),
  false,
);
assert.equal(
  resolveTitanStatueLoreEnabled(undefined, "?titanStatueLore=off"),
  false,
);
assert.equal(resolveTitanStatueLoreEnabled(undefined, "?titans=0"), false);

const previousPhaser = globalThis.Phaser;
globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown: key => key?.justDown === true,
    },
  },
};

try {
  const worldModel = { tileSize: 94, topAirRows: 65 };
  const scene = createScene();
  const gallery = new TitanSurfaceGallery(
    scene,
    worldModel,
    TITAN_DISCOVERY_CONFIG,
    "",
  );
  const first = TITAN_DEFINITIONS[0];
  const second = TITAN_DEFINITIONS[1];
  gallery.sync(new Set([first.id]), true);

  const firstPlayerTile = {
    tx: TITAN_DISCOVERY_CONFIG.surfaceGallery.startTileX,
    ty: worldModel.topAirRows - 1,
  };
  assert.equal(gallery.getInspectionDistance(firstPlayerTile), 0);
  assert.equal(gallery.getSnapshot().inspectable, 1);

  const secondPlayerTile = {
    tx: TITAN_DISCOVERY_CONFIG.surfaceGallery.startTileX
      + TITAN_DISCOVERY_CONFIG.surfaceGallery.spacingTiles,
    ty: worldModel.topAirRows - 1,
  };
  assert.equal(
    gallery.getInspectionDistance(secondPlayerTile),
    Number.POSITIVE_INFINITY,
    "a locked statue slot must never be inspectable",
  );
  assert.equal(
    gallery.inspection.records.has(second.id),
    false,
    "locked statues must not receive an interaction prompt",
  );

  const firstPrompt = gallery.inspection.records.get(first.id).prompt;
  const firstView = gallery.views.get(first.id);
  const galleryConfig = TITAN_DISCOVERY_CONFIG.surfaceGallery;
  assert.equal(
    firstPrompt.y,
    firstView.plinth.y
      - galleryConfig.plinthHeightTiles * worldModel.tileSize
      + galleryConfig.inspectionPromptOffsetTiles * worldModel.tileSize,
    "the prompt must sit on the visible plinth instead of above the 3x stance",
  );
  assert.deepEqual(firstPrompt.origin, { x: 0.5, y: 0 });
  assert.equal(
    gallery.updateInspection(
      firstPlayerTile,
      { interact: { justDown: false } },
      { allowInspect: true },
    ),
    false,
  );
  assert.equal(firstPrompt.visible, true);
  assert.match(firstPrompt.text, /\[E\] INSPECT MOSSBACK WANDERER/);

  assert.equal(
    gallery.updateInspection(
      firstPlayerTile,
      { interact: { justDown: true } },
      { allowInspect: true },
    ),
    true,
  );
  assert.equal(scene.notifications.length, 1);
  const lore = getTitanLoreEntry(first.id);
  assert.match(scene.notifications[0].message, /MOSSBACK WANDERER/);
  assert.ok(scene.notifications[0].message.includes(lore.epithet.toUpperCase()));
  assert.ok(scene.notifications[0].message.includes(lore.inscription));
  assert.match(scene.notifications[0].message, /ESC > TITANS: FULL ARCHIVE/);
  assert.equal(
    scene.notifications[0].options.title,
    TITAN_DISCOVERY_CONFIG.surfaceGallery.inspectionNotificationTitle,
  );
  assert.equal(gallery.getSnapshot().lastInspected, first.id);

  firstPrompt.setVisible(false);
  assert.equal(
    gallery.updateInspection(
      firstPlayerTile,
      { interact: { justDown: true } },
      { allowInspect: false },
    ),
    false,
  );
  assert.equal(firstPrompt.visible, false);
  assert.equal(scene.notifications.length, 1);
  gallery.destroy();

  const disabledScene = createScene();
  const disabledGallery = new TitanSurfaceGallery(
    disabledScene,
    worldModel,
    TITAN_DISCOVERY_CONFIG,
    "?titanStatueLore=0",
  );
  disabledGallery.sync(new Set([first.id]), true);
  assert.equal(disabledGallery.getSnapshot().inspectionEnabled, false);
  assert.equal(disabledGallery.getSnapshot().inspectable, 0);
  assert.equal(
    disabledGallery.getInspectionDistance(firstPlayerTile),
    Number.POSITIVE_INFINITY,
  );
  assert.equal(
    disabledGallery.updateInspection(
      firstPlayerTile,
      { interact: { justDown: true } },
      { allowInspect: true },
    ),
    false,
  );
  assert.equal(disabledScene.notifications.length, 0);
  disabledGallery.destroy();
} finally {
  if (previousPhaser === undefined) delete globalThis.Phaser;
  else globalThis.Phaser = previousPhaser;
}

const legacySource = fs.readFileSync(
  path.join(ROOT, "world/rendering/WorldRenderer.js"),
  "utf8",
);
const scenicSource = fs.readFileSync(
  path.join(ROOT, "world/rendering/scenic-world/WorldVisualRuntime.js"),
  "utf8",
);
const playUpdateSource = fs.readFileSync(
  path.join(ROOT, "world/playScene/PlaySceneUpdate.js"),
  "utf8",
);
const inspectionSource = fs.readFileSync(
  path.join(ROOT, "systems/visual/TitanSurfaceInspection.js"),
  "utf8",
);
const e2eSource = fs.readFileSync(
  path.join(ROOT, "testing/JkdE2EHarness.js"),
  "utf8",
);
for (const rendererSource of [legacySource, scenicSource]) {
  assert.match(rendererSource, /getTitanSurfaceInspectionDistance/);
  assert.match(rendererSource, /updateTitanSurfaceInspection/);
}
assert.match(playUpdateSource, /titanStatueDistance/);
assert.match(
  playUpdateSource,
  /Math\.min\(milestoneDistance, nearestNpcDistance, specialTileDistance\)/,
);
assert.match(playUpdateSource, /!titanConsumedInteraction/);
assert.match(e2eSource, /previewFirstUnlockedTitanStatue/);
assert.match(e2eSource, /event\.code === "KeyI"/);
assert.match(e2eSource, /TITAN_DISCOVERY_CONFIG\.surfaceGallery/);
assert.match(e2eSource, /Titan plinth inspection:/);
assert.doesNotMatch(
  inspectionSource,
  /add\.(graphics|circle|ellipse|rectangle)/,
  "statue lore must sit on approved raster art instead of substitute shapes",
);

console.log(
  "Titan lore and statue inspection contract: 25 unique archives, unlocked-only "
    + "world interaction, native notifications, renderer parity, and rollback passed",
);
