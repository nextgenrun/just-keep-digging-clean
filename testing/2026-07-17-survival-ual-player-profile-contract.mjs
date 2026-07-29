import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { queuePlayerProfileSheets } from "../player/PlayerAssetLoader.js";
import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { PlayerMotionPolishSystem } from "../systems/visual/PlayerMotionPolishSystem.js";
import {
  PLAYER_ASSET_PROFILES,
  resolvePlayerDisplaySizePx,
  resolvePlayerVisualOrigin,
} from "../values/playerAssetProfiles.js";
import {
  DEFAULT_PLAYER_CHARACTER_ID,
  PLAYER_CHARACTER_IDS,
  normalizePlayerCharacterId,
  resolvePersistedPlayerCharacterId,
  resolvePlayerCharacterIdFromSearch,
} from "../values/playerCharacters.js";
import { PLAYER_MOTION_POLISH_CONFIG } from "../values/playerMotionPolish.js";
import { SURVIVAL_BLENDER_V2_RUNTIME } from "../values/survivalBlenderV2Runtime.js";
import { resolveUalActionContact } from "../values/ualNativeActionTuning.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ual = PLAYER_ASSET_PROFILES.ualNative;
const survival = PLAYER_ASSET_PROFILES.survivalUal;
const prefix = "survival-ual-player-v1";
const blender = SURVIVAL_BLENDER_V2_RUNTIME;
const runtimePath = resolve(root, survival.basePath);
const blenderRuntimePath = resolve(root, blender.basePath);
const runtimeManifest = JSON.parse(readFileSync(resolve(runtimePath, "manifest.json"), "utf8"));
const blenderManifest = JSON.parse(readFileSync(resolve(blenderRuntimePath, "manifest.json"), "utf8"));
const piskelManifest = JSON.parse(readFileSync(
  resolve(root, "sprites/character/piskel/character-animation-manifest.json"),
  "utf8",
));
const polishedDigUp = piskelManifest.animations.find(({ id }) => id === "survival-blender-v2-dig-up");
const polishedDigUpReport = JSON.parse(readFileSync(resolve(root, polishedDigUp.metadataPath), "utf8"));
const proneV3Config = JSON.parse(readFileSync(
  resolve(root, "values/supermanFlightProneV3Runtime.json"),
  "utf8",
));
const proneV3Promotion = JSON.parse(readFileSync(
  resolve(root, proneV3Config.output.buildRoot, proneV3Config.output.promotionManifest),
  "utf8",
));
const expectedRuntimeActions = [
  "airborne", "climb", "crouch", "death", "falling", "fly",
  "ground-strike", "hit-react", "idle", "idle-talk", "landing",
  "moving-side-dig-cross", "moving-side-dig-jab",
  "punch-cross", "punch-jab", "punch-uppercut",
  "run", "teleport", "thunder-charge", "walk", "wall-push",
];

assert.equal(normalizePlayerCharacterId("survivalUal"), PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(DEFAULT_PLAYER_CHARACTER_ID, PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(resolvePersistedPlayerCharacterId("ualNative"), PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(resolvePersistedPlayerCharacterId("legacy"), PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(resolvePersistedPlayerCharacterId("robot"), PLAYER_CHARACTER_IDS.robot);
assert.equal(resolvePlayerCharacterIdFromSearch("?character=survivalUal"), PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(resolvePlayerCharacterIdFromSearch("?character=ualNative"), PLAYER_CHARACTER_IDS.ualNative);
assert.equal(resolvePlayerCharacterIdFromSearch("?character=unknown"), null);
assert.equal(resolvePlayerCharacterIdFromSearch(""), null);

assert.equal(survival.characterId, PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(survival.isUalNative, true);
assert.equal(survival.basePath, "sprites/character/survival-ual-player-v1/runtime");
assert.equal(
  survival.renderPipeline,
  "survival-blender-v2-piskel-central-animation-polish-v1-superman-prone-v3-flight-ual-jog-v1",
);
assert.equal(survival.visualSkin, blender.visualId);
assert.equal(survival.weaponPolicy, "none");
assert.equal(survival.sourceClips.pickaxeMining, undefined);
assert.equal(survival.rejectedSourceClips.sideMining, "TreeChopping_Loop");
assert.match(survival.sourceClips.uppercut, /Piskel body-anchor polish/);
assert.equal(survival.playerBodyWidthPx, ual.playerBodyWidthPx);
assert.equal(survival.playerBodyHeightPx, ual.playerBodyHeightPx);
assert.equal(survival.displaySizePx, ual.displaySizePx);
assert.equal(survival.targetVisibleHeightTiles, ual.targetVisibleHeightTiles);
assert.equal(survival.sourceClips.idle, "Blender MINER_idle");
assert.equal(survival.sourceClips.walk, "Blender MINER_walk");
assert.equal(survival.sourceClips.run, "UAL Jog_Fwd_Loop");
assert.match(survival.sourceClips.fly, /DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3/);
assert.match(survival.sourceClips.flyHover, /DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3/);
assert.equal(survival.continuousFlightLoop, true);
assert.equal(survival.idleAnimationFps, 12);
assert.equal(survival.digUpLookAnimationFps, 30);
assert.equal(survival.landingAnimationFps, 40);
assert.equal(survival.landingFrames.length, 14);
assert.deepEqual(survival.footstepFrameIndices[survival.walkRunAnim], [13, 27]);
assert.equal(survival.digSidewaysAnim, survival.quickslashAnim);
assert.deepEqual(survival.digSidewaysFrames, survival.quickslashFrames);
assert.deepEqual(survival.digSidewaysHitAnims, [
  `${prefix}-punch-jab-anim`,
  `${prefix}-dig-side-cross-anim`,
  `${prefix}-punch-jab-anim`,
  `${prefix}-dig-side-cross-anim`,
]);
assert.deepEqual(survival.rejectedAnimationKeys, [`${prefix}-dig-side-jab-anim`]);
assert.deepEqual(survival.walkFrames, blender.frames.walk);
assert.deepEqual(survival.walkRunFrames, ual.walkRunFrames);
assert.equal(survival.digUpSheet, blender.sheets.digUp.key);
assert.equal(survival.digUpSidewaysSheet, blender.sheets.digUp.key);
assert.equal(survival.uppercutSheet, blender.sheets.digUp.key);
assert.deepEqual(survival.digUpFrames, blender.frames.digUp);
assert.deepEqual(survival.digUpSidewaysFrames, blender.frames.digUp);
assert.equal(survival.digUpAnimationFps, blender.sheets.digUp.frameRate);
assert.deepEqual(survival.flySourceFrames, blender.frames.fly);
assert.deepEqual(survival.flightTravelLoopFrames, blender.frames.fly);
assert.equal(
  survival.sheetFiles.length,
  ual.sheetFiles.length + 3 + survival.animationPolishSheetFiles.length,
);
assert.equal(new Set(survival.requiredSheets).size, survival.requiredSheets.length);
assert.equal(
  survival.requiredSheets.length,
  ual.requiredSheets.length + 3 + survival.animationPolishRequiredSheets.length,
);
assert.ok(survival.requiredSheets.some((key) => key.startsWith("survival-blender-v2-")));
assert.ok(survival.requiredSheets.some((key) => key.startsWith(prefix)));
assert.equal(survival.rigManifestKey, `${prefix}-rig-manifest`);
assert.equal(runtimeManifest.pipeline, "survival-body-ual-motion-unreal-ik-v1");
assert.ok(expectedRuntimeActions.every((action) => runtimeManifest.actions[action]), "profile runtime action is missing");
assert.equal(
  expectedRuntimeActions.reduce((total, action) => total + runtimeManifest.actions[action].frame_count, 0),
  926,
);
assert.ok(runtimeManifest.visual_skin?.retargeter?.includes("RTG_UAL_To_SurvivalCharacter_v1"));
assert.ok(survival.sheetFiles.every(([, fileName, , sourceBasePath]) => existsSync(resolve(
  root,
  sourceBasePath || survival.basePath,
  fileName,
))));
assert.ok(existsSync(blenderRuntimePath));
assert.equal(
  blender.sheets.fly.fileName,
  "survival-character-blender-v2-superman-flight-prone-v3-sheet.png",
);
assert.equal(blenderManifest.clips.fly.file, blender.sheets.fly.fileName);
assert.equal(blenderManifest.clips.fly.columns, 12);
assert.equal(blenderManifest.clips.fly.frames, 36);
assert.equal(blenderManifest.clips.fly.fps, 16);
assert.equal(polishedDigUp.autoAlign, true);
assert.equal(polishedDigUp.centeringPolicy.anchorMode, "alpha-lower-body");
assert.equal(polishedDigUp.centeringPolicy.targetAnchorX, 128);
assert.equal(polishedDigUp.centeringPolicy.bottomY, 248);
assert.equal(polishedDigUpReport.polish.uniformScale, 1);
assert.ok(polishedDigUpReport.polish.after.maxAnchorDriftPx <= 1);
assert.equal(polishedDigUpReport.polish.after.maxBottomDriftPx, 0);
assert.equal(proneV3Config.productionChanged, true);
assert.equal(proneV3Promotion.productionChanged, true);
assert.equal(proneV3Promotion.source.action, "DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3");
assert.equal(proneV3Promotion.runtime.file, blender.sheets.fly.fileName);
assert.equal(proneV3Promotion.runtime.sourceFacesRight, true);
const proneV3Sheet = readFileSync(resolve(blenderRuntimePath, blender.sheets.fly.fileName));
assert.equal(proneV3Sheet.readUInt32BE(16), 12 * 256);
assert.equal(proneV3Sheet.readUInt32BE(20), 3 * 256);
assert.equal(
  createHash("sha256").update(proneV3Sheet).digest("hex"),
  proneV3Promotion.runtime.sha256,
);
Object.values(runtimeManifest.actions).forEach((action) => {
  assert.equal(Object.keys(action.rig_markers.frames).length, action.frame_count);
  assert.deepEqual(
    [...action.rig_markers.marker_names].sort(),
    ["foot_l", "foot_r", "hand_l", "hand_r", "head", "pelvis"],
  );
});

const ualKeys = new Set([
  ...ual.requiredSheets,
  ...ual.digAnims,
  ...ual.walkAnims,
  ...ual.locomotionTransitionAnims,
  ...PLAYER_MOTION_POLISH_CONFIG.idle.fidgets.map((fidget) => fidget.key),
]);
const survivalKeys = [
  ...survival.requiredSheets,
  ...survival.digAnims,
  ...survival.walkAnims,
  ...survival.locomotionTransitionAnims,
  ...survival.idleFidgets.map((fidget) => fidget.key),
];
assert.ok(survivalKeys.every((key) => (
  key.startsWith(prefix) || key.startsWith("survival-blender-v2-")
)));
assert.ok(survivalKeys.every((key) => !ualKeys.has(key)));
assert.ok(survivalKeys.some((key) => key.startsWith("survival-blender-v2-")));
assert.equal(resolvePlayerDisplaySizePx(survival, survival.displaySizePx, survival.walkRunAnim), 123);
assert.equal(
  resolvePlayerDisplaySizePx(survival, survival.displaySizePx, survival.digUpHitAnims[0]),
  blender.sheets.digUp.displaySizePx,
);
assert.deepEqual(
  resolvePlayerVisualOrigin(survival, survival.digUpHitAnims[0], survival.digUpSheet),
  { x: blender.sheets.digUp.originX, y: blender.sheets.digUp.originY },
);
assert.deepEqual(
  resolveUalActionContact(survival, survival.digSidewaysHitAnims[0]),
  resolveUalActionContact(ual, ual.digSidewaysHitAnims[0]),
);
assert.deepEqual(
  resolveUalActionContact(survival, survival.digSidewaysHitAnims[1]),
  resolveUalActionContact(ual, ual.digSidewaysHitAnims[1]),
);
assert.deepEqual(
  resolveUalActionContact(survival, survival.digDownAnim),
  resolveUalActionContact(ual, ual.digDownAnim),
);
assert.equal(
  resolveUalActionContact(survival, survival.digUpHitAnims[0]).sequenceIndex,
  blender.sheets.digUp.contactSequenceIndex,
);
assert.equal(
  resolveUalActionContact(survival, survival.digUpHitAnims[0]).textureFrame,
  blender.sheets.digUp.contactFrame,
);
assert.equal(
  resolveUalActionContact(survival, survival.digUpHitAnims[0]).sourceAction,
  blender.sheets.digUp.sourceAction,
);

const queuedSheets = [];
const queuedJson = [];
const loaderScene = {
  textures: { exists: () => false, remove() {} },
  cache: { json: { exists: () => false } },
  load: {
    spritesheet(key, url, options) { queuedSheets.push({ key, url, options }); },
    json(key, url) { queuedJson.push({ key, url }); },
  },
};
assert.equal(queuePlayerProfileSheets(loaderScene, survival), true);
assert.equal(queuedSheets.length, survival.sheetFiles.length);
const blenderQueued = queuedSheets.filter(({ key }) => key.startsWith("survival-blender-v2-"));
assert.equal(blenderQueued.length, 5);
assert.ok(blenderQueued.every(({ url }) => url.startsWith(`${blender.basePath}/`)));
assert.equal(
  blenderQueued.find(({ key }) => key === blender.sheets.fly.key)?.options.endFrame,
  blender.frames.fly.at(-1),
);
assert.equal(
  blenderQueued.find(({ key }) => key === blender.sheets.digUp.key)?.options.endFrame,
  blender.frames.digUp.at(-1),
);
assert.ok(queuedSheets.some(({ key, url }) => (
  key === survival.punchJabSheet && url.startsWith(`${survival.basePath}/${prefix}-punch-jab-sheet.webp`)
)));
assert.deepEqual(queuedJson, [{
  key: survival.rigManifestKey,
  url: `${survival.basePath}/manifest.json?v=${survival.version}`,
}]);

const createdAnimations = new Map();
createUalNativePlayerAnimations({
  anims: {
    exists: (key) => createdAnimations.has(key),
    create: (config) => createdAnimations.set(config.key, config),
  },
  textures: { exists: () => false },
}, survival);
assert.equal(survival.combatIdleRecoverAnim, survival.idleAnim);
assert.equal(survival.combatIdleToNormalIdleAnim, survival.idleAnim);
assert.equal(createdAnimations.has(`${prefix}-combat-recover-anim`), false);
assert.equal(createdAnimations.has(`${prefix}-combat-return-anim`), false);
assert.ok(survival.idleFidgets.every((fidget) => createdAnimations.has(fidget.key)));
assert.ok(PLAYER_MOTION_POLISH_CONFIG.idle.fidgets.every((fidget) => !createdAnimations.has(fidget.key)));
assert.equal(createdAnimations.has(`${prefix}-dig-side-jab-anim`), false);
assert.equal(createdAnimations.get(survival.quickslashAnim)?.frames.length, 15);
assert.equal(createdAnimations.get(survival.idleAnim)?.frameRate, 12);
assert.equal(createdAnimations.get(survival.digUpLookAnim)?.frameRate, 30);
assert.equal(createdAnimations.get(survival.landingAnim)?.frameRate, 40);
assert.equal(createdAnimations.get(survival.landingAnim)?.frames.length, 14);
assert.equal(createdAnimations.get(survival.digUpHitAnims[0])?.frames.length, 24);
assert.equal(createdAnimations.get(survival.movingSideDigAnimationMap[survival.digSidewaysHitAnims[0]])?.frames.length, 22);
assert.equal(createdAnimations.get(survival.movingSideDigAnimationMap[survival.digSidewaysHitAnims[1]])?.frames.length, 22);
assert.equal(
  createdAnimations.get(survival.digUpHitAnims[0])?.frameRate,
  blender.sheets.digUp.frameRate,
);
assert.ok(createdAnimations.get(survival.digUpHitAnims[0])?.frames.every(
  ({ key }) => key === blender.sheets.digUp.key,
));
for (const key of [
  survival.flyAnim,
  survival.flyClimbAnim,
  survival.flightEnterAnim,
  survival.flightTravelEnterAnim,
  survival.flightTravelLoopAnim,
  survival.flightHoverAnim,
  survival.flightExitAnim,
]) {
  assert.equal(createdAnimations.get(key)?.frameRate, 16, `${key} lost authored Superman cadence`);
  assert.equal(createdAnimations.get(key)?.frames.length, 36, `${key} restarted a sliced flight phase`);
}

const motionPolish = new PlayerMotionPolishSystem(survival);
assert.ok(survival.idleFidgets.every((fidget) => motionPolish.oneShotAnimationKeys.includes(fidget.key)));
assert.ok(PLAYER_MOTION_POLISH_CONFIG.idle.fidgets.every(
  (fidget) => !motionPolish.oneShotAnimationKeys.includes(fidget.key),
));
assert.deepEqual(survival.idleFidgets, blender.idleFidgets);
assert.ok(survival.idleFidgets.every((fidget) => fidget.frameRate === 18));
assert.deepEqual(
  survival.idleFidgets.find(({ key }) => key.includes("breath"))?.frames,
  Array.from({ length: 40 }, (_, index) => index + 8),
);

const worldLoadSource = readFileSync(resolve(root, "ui/scenes/WorldLoadScene.js"), "utf8");
const startMenuSource = readFileSync(resolve(root, "ui/scenes/StartMenuScene.js"), "utf8");
assert.match(worldLoadSource, /resolvePlayerCharacterIdFromSearch/);
assert.match(worldLoadSource, /queryCharacterId \?\? data\.playerCharacterId/);
assert.match(startMenuSource, /resolvePersistedPlayerCharacterId/);
assert.match(startMenuSource, /queryCharacterId \?\? savedCharacterId \?\? DEFAULT_PLAYER_CHARACTER_ID/);

console.log("Survival-over-UAL alternate player profile contract OK", {
  queuedSheets: queuedSheets.length,
  createdAnimations: createdAnimations.size,
  collider: `${survival.playerBodyWidthPx}x${survival.playerBodyHeightPx}`,
  displaySizePx: survival.displaySizePx,
});
