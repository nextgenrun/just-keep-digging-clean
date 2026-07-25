import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  queuePlayerProfileSheets,
} from "../player/PlayerAssetLoader.js";
import { PlayerRigContactSystem } from "../systems/visual/PlayerRigContactSystem.js";
import {
  projectRigMarkerToWorld,
} from "../systems/visual/playerRigContactGeometry.js";
import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";
import { PLAYER_RIG_CONTACT_CONFIG } from "../values/playerRigContact.js";
import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = PLAYER_ASSET_PROFILES.ualNative;
const manifest = JSON.parse(readFileSync(
  resolve(root, "sprites/character/ual-native-player-v1/runtime/manifest.json"),
  "utf8",
));
const tileSize = 94;
const markerNames = ["hand_l", "hand_r", "foot_l", "foot_r", "pelvis", "head"];

assert.equal(manifest.game_rig_version, 2);
assert.equal(manifest.rig_marker_schema.version, PLAYER_RIG_CONTACT_CONFIG.manifest.schemaVersion);
assert.equal(manifest.rig_marker_schema.space, PLAYER_RIG_CONTACT_CONFIG.manifest.markerSpace);
assert.deepEqual(manifest.rig_marker_schema.required_markers, markerNames);
for (const [action, frame] of [
  ["punch-jab", 7],
  ["punch-cross", 9],
  ["melee-hook", 8],
  ["melee-kick", 10],
  ["ground-strike", 10],
  ["ground-strike", 18],
]) {
  const markers = manifest.actions[action].rig_markers.frames[String(frame)];
  assert.ok(markers, `missing ${action} frame ${frame} markers`);
  assert.deepEqual(Object.keys(markers), markerNames);
  for (const name of markerNames) {
    assert.equal(markers[name].length, 2);
    assert.ok(markers[name].every(Number.isFinite));
  }
}

const scale = profile.displaySizePx / profile.frameWidth;
const rightMarker = projectRigMarkerToWorld({
  marker: [212, 111],
  spriteX: 47,
  spriteY: 94,
  scaleX: scale,
  scaleY: scale,
  frameWidth: profile.frameWidth,
  frameHeight: profile.frameHeight,
  originX: profile.visualOriginX,
  originY: profile.visualOriginY,
  flipX: false,
});
const leftMarker = projectRigMarkerToWorld({
  marker: [212, 111],
  spriteX: 47,
  spriteY: 94,
  scaleX: scale,
  scaleY: scale,
  frameWidth: profile.frameWidth,
  frameHeight: profile.frameHeight,
  originX: profile.visualOriginX,
  originY: profile.visualOriginY,
  flipX: true,
});
assert.ok(rightMarker.x > 47);
assert.ok(leftMarker.x < 47);
assert.ok(Math.abs((rightMarker.x - 47) + (leftMarker.x - 47)) < 0.0001);

function createRigHarness() {
  const data = new Map();
  const body = { x: 31.5, y: 19, w: 31, h: 75 };
  const player = {
    x: 47,
    y: 94,
    scaleX: scale,
    scaleY: scale,
    originX: profile.visualOriginX,
    originY: profile.visualOriginY,
    flipX: false,
    setData(key, value) { data.set(key, value); return this; },
    getData(key) { return data.get(key); },
  };
  const controller = {
    physicsBody: body,
    _syncSpriteWithPhysics() {
      const offset = player.getData(PLAYER_RIG_CONTACT_CONFIG.visualOffsetDataKey);
      player.x = body.x + body.w * 0.5 + (offset?.x || 0);
      player.y = body.y + body.h + (offset?.y || 0);
    },
  };
  const scene = { config: { tileSize } };
  const system = new PlayerRigContactSystem(scene, player, controller, profile, manifest);
  assert.equal(system.create(), true);
  return { body, controller, player, system };
}

function runContact({ contactSpec, targetTile, direction, flipX = false }) {
  const harness = createRigHarness();
  harness.player.flipX = flipX;
  const bodyBefore = { ...harness.body };
  assert.equal(harness.system.beginAction({
    animationKey: `test-${contactSpec.sourceAction}`,
    contactSpec,
    targetTile,
    direction,
  }), true);
  for (let index = 0; index < 10; index += 1) harness.system.update(16.67);
  const result = harness.system.validateContact({ targetTile, direction });
  assert.equal(result.valid, true, result.reason);
  assert.deepEqual(harness.body, bodyBefore, "rig alignment changed the movement body");
  const offset = harness.player.getData(PLAYER_RIG_CONTACT_CONFIG.visualOffsetDataKey) || { x: 0, y: 0 };
  assert.ok(Math.abs(offset.x) <= tileSize * PLAYER_RIG_CONTACT_CONFIG.alignment.maxOffsetXTiles + 0.001);
  assert.ok(Math.abs(offset.y) <= tileSize * PLAYER_RIG_CONTACT_CONFIG.alignment.maxOffsetYTiles + 0.001);
  harness.system.endAction();
  for (let index = 0; index < 24; index += 1) harness.system.update(16.67);
  assert.equal(harness.player.getData(PLAYER_RIG_CONTACT_CONFIG.visualOffsetDataKey), null);
  return result;
}

assert.match(runContact({
  contactSpec: UAL_NATIVE_ACTION_TUNING.contact.punchJab,
  targetTile: { tx: 1, ty: 0 },
  direction: { x: 1, y: 0 },
}).markerName, /^hand_/);
assert.match(runContact({
  contactSpec: UAL_NATIVE_ACTION_TUNING.contact.digUp,
  targetTile: { tx: 0, ty: -1 },
  direction: { x: 0, y: -1 },
}).markerName, /^hand_/);
assert.match(runContact({
  contactSpec: UAL_NATIVE_ACTION_TUNING.contact.digDown,
  targetTile: { tx: 0, ty: 1 },
  direction: { x: 0, y: 1 },
}).markerName, /^hand_/);
assert.match(runContact({
  contactSpec: UAL_NATIVE_ACTION_TUNING.contact.digDown,
  targetTile: { tx: 1, ty: 1 },
  direction: { x: 1, y: 1 },
}).markerName, /^hand_/);
assert.match(runContact({
  contactSpec: UAL_NATIVE_ACTION_TUNING.contact.digUpSide,
  targetTile: { tx: 1, ty: -1 },
  direction: { x: 1, y: -1 },
}).markerName, /^hand_/);

const missHarness = createRigHarness();
missHarness.body.x -= tileSize * 2;
missHarness.controller._syncSpriteWithPhysics();
const missBodyBefore = { ...missHarness.body };
assert.equal(missHarness.system.beginAction({
  animationKey: "test-deliberate-contact-miss",
  contactSpec: UAL_NATIVE_ACTION_TUNING.contact.punchJab,
  targetTile: { tx: 1, ty: 0 },
  direction: { x: 1, y: 0 },
}), true);
for (let index = 0; index < 10; index += 1) missHarness.system.update(16.67);
const missedContact = missHarness.system.validateContact({
  targetTile: { tx: 1, ty: 0 },
  direction: { x: 1, y: 0 },
});
assert.equal(missedContact.valid, false, "a capped visual offset reached a distant tile face");
assert.equal(missedContact.reason, "marker-missed-tile-face");
assert.deepEqual(missHarness.body, missBodyBefore, "miss handling changed the movement body");
missHarness.system.endAction();

let manifestCached = false;
const queuedManifests = [];
const loaderScene = {
  textures: {
    exists: () => true,
    getFrame: () => ({}),
    remove: () => {},
  },
  cache: {
    json: {
      exists: () => manifestCached,
      get: () => manifestCached ? manifest : null,
    },
  },
  load: {
    spritesheet: () => assert.fail("loaded an already complete sheet"),
    json: (key, url) => queuedManifests.push({ key, url }),
  },
};
assert.equal(queuePlayerProfileSheets(loaderScene, profile), true);
assert.equal(queuedManifests.length, 1);
assert.equal(queuedManifests[0].key, profile.rigManifestKey);
assert.match(queuedManifests[0].url, /runtime\/manifest\.json/);
manifestCached = true;
assert.equal(queuePlayerProfileSheets(loaderScene, profile), false);

const mainSetup = readFileSync(resolve(root, "world/playScene/PlaySceneSetup.js"), "utf8");
const mainUpdate = readFileSync(resolve(root, "world/playScene/PlaySceneUpdate.js"), "utf8");
const caveGameplay = readFileSync(resolve(root, "world/playScene/CaveGameplayController.js"), "utf8");
const caveActions = readFileSync(resolve(root, "world/playScene/CaveActionAnimationRuntime.js"), "utf8");
assert.match(mainSetup, /new PlayerRigContactSystem/);
assert.match(mainUpdate, /playerRigContact\?\.update\(delta\)/);
assert.match(mainUpdate, /playerRigContact\?\.validateContact/);
assert.match(caveGameplay, /new PlayerRigContactSystem/);
assert.match(caveGameplay, /playerRigContact\?\.update\(delta\)/);
assert.match(caveGameplay, /playerRigContact\?\.validateContact/);
assert.match(caveActions, /playerRigContact\?\.beginAction/);

const markerPipeline = readFileSync(resolve(root, "pipelines/blender/ualRigMarkers.py"), "utf8");
const renderer = readFileSync(resolve(root, "ai-tools/2026-07-16-render-ual-native-player.py"), "utf8");
const packer = readFileSync(resolve(root, "ai-tools/2026-07-16-pack-ual-native-player.py"), "utf8");
assert.match(markerPipeline, /world_to_camera_view/);
for (const name of markerNames) assert.match(markerPipeline, new RegExp(`"${name}"`));
assert.match(renderer, /project_native_rig_markers/);
assert.match(packer, /transform_rig_markers/);
assert.match(packer, /packed-frame-px/);

console.log(JSON.stringify({
  result: "PLAYER_RIG_CONTACT_CONTRACT_OK",
  markerActions: 5,
  validatedDirections: 5,
  rejectedMisses: 1,
  movementBody: `${profile.playerBodyWidthPx}x${profile.playerBodyHeightPx}`,
  manifestQueued: queuedManifests.length,
}, null, 2));
