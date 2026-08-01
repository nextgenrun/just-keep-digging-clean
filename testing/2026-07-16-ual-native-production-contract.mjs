import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  hasPlayerProfileSheets,
  hasPlayerRigManifest,
  queuePlayerProfileSheets,
} from "../player/PlayerAssetLoader.js";
import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { PlayerMotionPolishSystem } from "../systems/visual/PlayerMotionPolishSystem.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import {
  PLAYER_ASSET_PROFILES,
  resolvePlayerDisplaySizePx,
} from "../values/playerAssetProfiles.js";
import { PLAYER_MOTION_POLISH_CONFIG } from "../values/playerMotionPolish.js";
import {
  DEFAULT_PLAYER_CHARACTER_ID,
  PLAYER_CHARACTER_IDS,
  normalizePlayerCharacterId,
} from "../values/playerCharacters.js";
import { ANIMATION_SANDBOX_HITBOX_CONFIG } from "../values/animationSandboxHitboxConfig.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  resolveUalActionContact,
  resolveUalActionTimeScale,
  resolveUalFlightTravel,
  resolveUalFlightTimeScale,
  UAL_NATIVE_ACTION_TUNING,
} from "../values/ualNativeActionTuning.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = PLAYER_ASSET_PROFILES.ualNative;
const runtimeRoot = resolve(root, "sprites/character/ual-native-player-v1/runtime");
const runtimeManifest = JSON.parse(readFileSync(resolve(runtimeRoot, "manifest.json"), "utf8"));
const runtimeActions = Object.values(runtimeManifest.actions);
const manifestFrameTotal = runtimeActions.reduce(
  (total, metadata) => total + metadata.frame_count,
  0,
);
const activeSourceClips = new Set(Object.values(profile.sourceClips));
const manifestSourceClips = new Set(runtimeActions.map((metadata) => metadata.source_clip));

assert.equal(DEFAULT_PLAYER_CHARACTER_ID, PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(normalizePlayerCharacterId("legacy"), PLAYER_CHARACTER_IDS.ualNative);
assert.equal(normalizePlayerCharacterId("unknown"), PLAYER_CHARACTER_IDS.survivalUal);
assert.equal(profile.isUalNative, true);
assert.equal(profile.weaponPolicy, "none");
assert.equal(profile.renderPipeline, "native-ual-game-rig-v2-zero-weapon");
assert.equal(profile.rigManifestKey, "ual-native-v1-rig-manifest");
assert.equal(profile.rigManifestFile, "manifest.json");
assert.equal(profile.rigMarkerSchemaVersion, 1);
assert.equal(profile.preserveNativeActionCadence, false);
assert.equal(profile.immediateDigImpactFeedback, false);
assert.equal(profile.frameWidth, 256);
assert.equal(profile.frameHeight, 256);
assert.equal(profile.targetVisibleHeightTiles, 0.8);
assert.equal(profile.referenceIdleVisibleWidthPx, 72);
assert.equal(profile.referenceIdleVisibleHeightPx, 177);
assert.equal(profile.displaySizePx, 109);
assert.equal(profile.playerBodyWidthPx, 31);
assert.equal(profile.playerBodyHeightPx, 75);
assert.equal(ANIMATION_SANDBOX_HITBOX_CONFIG.survivalMiner.width, 31);
assert.equal(ANIMATION_SANDBOX_HITBOX_CONFIG.survivalMiner.height, 75);
assert.equal(profile.sheetFiles.length, 19);
assert.equal(new Set(profile.requiredSheets).size, 19);
assert.equal(profile.sourceClips.walk, "Jog_Fwd_Loop");
assert.equal(profile.walkFrames.length, 28);
assert.equal(manifestFrameTotal, 987);
assert.deepEqual(profile.walkStartFrames, [3, 4, 5]);
assert.deepEqual(profile.walkStopFrames, [5, 4, 3]);
assert.deepEqual(profile.footstepFrameIndices[profile.walkLoopAnim], [13, 27]);
assert.deepEqual(profile.footstepFrameIndices[profile.walkRunAnim], [13, 27]);
assert.notEqual(profile.walkLoopAnim, profile.walkRunAnim);
const locomotionFrameCounts = new Map([
  [profile.walkStartAnim, profile.walkStartFrames.length],
  [profile.walkLoopAnim, profile.walkLoopFrames.length],
  [profile.walkRunAnim, profile.walkRunFrames.length],
  [profile.walkStopAnim, profile.walkStopFrames.length],
]);
for (const [animationKey, footstepFrames] of Object.entries(profile.footstepFrameIndices)) {
  const frameCount = locomotionFrameCounts.get(animationKey);
  assert.ok(frameCount > 0, `${animationKey} has a locomotion frame count`);
  for (const frameIndex of footstepFrames) {
    assert.ok(frameIndex >= 1 && frameIndex <= frameCount,
      `${animationKey} footstep ${frameIndex} is within 1..${frameCount}`);
  }
}
assert.equal(profile.rejectedSourceClips.digDown, "Farm_Harvest");
assert.equal(profile.rejectedSourceClips.thunderStrike, "Spell_Simple_Shoot");
assert.equal(profile.rejectedSourceClips.fly, "Swim_Fwd_Loop");
assert.equal(profile.rejectedSourceClips.flyHover, "Swim_Idle_Loop");
assert.equal(profile.rejectedSourceClips.ninjaHover, "NinjaJump_Idle_Loop");
assert.equal(profile.rejectedSourceClips.sideFinisher, "Authored_Grounded_Side_Kick_v1");
assert.equal(profile.rejectedSourceClips.digUpActive, "Sword_Regular_C");
assert.equal(profile.rejectedSourceClips.sideMining, "TreeChopping_Loop");
assert.equal(profile.digDownSheet, profile.groundStrikeSheet);
assert.equal(profile.digDownSheet, profile.attackDownSheet);
assert.equal(profile.digSidewaysSheet, profile.punchJabSheet);
assert.equal(profile.digUpSheet, profile.uppercutSheet);
assert.equal(profile.attackDownSheet, profile.groundStrikeSheet);
assert.equal(profile.digDownSourceFacesRight, true);
assert.equal(profile.requiredSheets.includes("ual-native-v1-dig-down-source-sheet"), false);
assert.equal(profile.requiredSheets.includes("ual-native-v1-dig-up-source-sheet"), false);
assert.equal(profile.requiredSheets.includes("ual-native-v1-thunder-strike-sheet"), false);
assert.equal(profile.requiredSheets.includes("ual-native-v1-fly-hover-sheet"), false);
assert.deepEqual(activeSourceClips, new Set([
  "Idle_Loop", "Idle_Talking_Loop", "Jog_Fwd_Loop", "Jump_Start", "Jump_Loop",
  "Crouch_Idle_Loop", "Shield_Dash", "ClimbUp_1m", "Punch_Jab",
  "Punch_Cross", "Melee_Hook", "Melee_Hook_Rec", "OverhandThrow",
  "Jump_Land", "Push_Loop", "Roll", "Spell_Simple_Idle_Loop",
  "Hit_Chest", "Death01",
]));
for (const rejectedSwim of ["Swim_Fwd_Loop", "Swim_Idle_Loop"]) {
  assert.equal(activeSourceClips.has(rejectedSwim), false, `${rejectedSwim} is active in the v4 profile`);
  assert.equal(manifestSourceClips.has(rejectedSwim), false, `${rejectedSwim} is active in the manifest`);
}

const loadedFrames = new Map();
const loadedManifests = new Map();
const queuedSheets = [];
const queuedManifests = [];
const loaderScene = {
  cache: {
    json: {
      exists: (key) => loadedManifests.has(key),
      get: (key) => loadedManifests.get(key),
    },
  },
  textures: {
    exists: (key) => loadedFrames.has(key),
    remove: (key) => loadedFrames.delete(key),
    getFrame: (key, frame) => loadedFrames.get(key)?.has(Number(frame)) ? { key, frame } : null,
  },
  load: {
    spritesheet: (key, url, config) => queuedSheets.push({ key, url, config }),
    json: (key, url) => queuedManifests.push({ key, url }),
  },
};

assert.equal(queuePlayerProfileSheets(loaderScene, profile), true);
assert.equal(queuedSheets.length, 19);
assert.deepEqual(queuedManifests, [{
  key: profile.rigManifestKey,
  url: `${profile.basePath}/${profile.rigManifestFile}?v=${profile.version}`,
}]);
assert.equal(hasPlayerRigManifest(loaderScene, profile), false);
for (const sheet of queuedSheets) {
  assert.equal(sheet.config.frameWidth, 256);
  assert.equal(sheet.config.frameHeight, 256);
  const sheetProfile = profile.sheetFiles.find(([property]) => profile[property] === sheet.key);
  assert.ok(sheetProfile, `queued unknown profile sheet: ${sheet.key}`);
  assert.equal(sheet.config.endFrame, Math.max(...profile[sheetProfile[2]]));
  assert.match(sheet.url, /ual-native-player-v1\/runtime/);
  loadedFrames.set(sheet.key, new Set(range(sheet.config.endFrame + 1)));
}
loadedManifests.set(profile.rigManifestKey, runtimeManifest);
assert.equal(hasPlayerProfileSheets(loaderScene, profile), true);
assert.equal(hasPlayerRigManifest(loaderScene, profile), true);
assert.equal(queuePlayerProfileSheets(loaderScene, profile), false);

const animationSpecs = new Map();
globalThis.Phaser = { Textures: { FilterMode: { LINEAR: 1 } } };
const animationScene = {
  textures: {
    exists: (key) => loadedFrames.has(key),
    get: () => ({ setFilter: () => {} }),
  },
  anims: {
    exists: (key) => animationSpecs.has(key),
    create: (spec) => animationSpecs.set(spec.key, spec),
  },
};
createUalNativePlayerAnimations(animationScene, profile);

const requiredAnimationKeys = [
  profile.idleAnim,
  profile.walkStartAnim,
  profile.walkLoopAnim,
  profile.walkRunAnim,
  profile.walkStopAnim,
  profile.airborneAnim,
  profile.fallingAnim,
  profile.climbAnim,
  profile.flyAnim,
  profile.flyClimbAnim,
  profile.flightEnterAnim,
  profile.flightTravelEnterAnim,
  profile.flightTravelLoopAnim,
  profile.flightHoverAnim,
  profile.flightExitAnim,
  profile.landingAnim,
  profile.duckAnim,
  profile.digUpLookAnim,
  profile.wallPushAnim,
  profile.leanAgainstWallAnim,
  profile.combatIdleRecoverAnim,
  profile.combatIdleToNormalIdleAnim,
  profile.quickslashAnim,
  profile.teleportInAnim,
  profile.thunderStrikeChargeAnim,
  profile.thunderStrikeStrikeAnim,
  profile.attackDownAnim,
  profile.earthquakeReactAnim,
  profile.deathAnim,
  ...PLAYER_MOTION_POLISH_CONFIG.idle.fidgets.map((fidget) => fidget.key),
  ...profile.digAnims,
];
for (const key of requiredAnimationKeys) {
  assert.ok(animationSpecs.has(key), `missing UAL production animation: ${key}`);
  assert.ok(animationSpecs.get(key).frames.length > 1, `single-frame UAL animation: ${key}`);
  const fidget = PLAYER_MOTION_POLISH_CONFIG.idle.fidgets.find((entry) => entry.key === key);
  const expectedFps = key === profile.thunderStrikeStrikeAnim
    ? 42
    : key === profile.landingAnim
      ? 40
      : fidget?.frameRate ?? 30;
  assert.equal(animationSpecs.get(key).frameRate, expectedFps, `unexpected authored cadence: ${key}`);
}
for (const [animationKey, animation] of animationSpecs) {
  for (const frame of animation.frames) {
    assert.ok(
      loadedFrames.get(frame.key)?.has(frame.frame),
      `${animationKey} references unloaded ${frame.key} frame ${frame.frame}`,
    );
  }
}
for (const variant of profile.digAnimationVariants) {
  assert.ok(
    variant.sheet === profile.punchJabSheet
      || variant.sheet === profile.punchCrossSheet
      || variant.sheet === profile.uppercutSheet,
    `dig variant is not an approved zero-weapon source action: ${variant.key}`,
  );
}
assert.deepEqual(profile.digUpFrames, profile.uppercutPlaybackFrames);
assert.equal(profile.digUpFrames.length, 24);
assert.equal(profile.uppercutFrames.length, 15);
assert.equal(profile.digUpFrames.at(-1), 0);
assert.deepEqual(profile.digDownFrames, range(37).map((frame) => frame + 4));
assert.deepEqual(profile.digSidewaysFrames, range(15).map((frame) => frame + 3));
assert.deepEqual(profile.quickslashFrames, range(15).map((frame) => frame + 3));
assert.equal(profile.digSidewaysAnim, profile.quickslashAnim);
assert.deepEqual(profile.rejectedAnimationKeys, ["ual-native-v1-dig-side-jab-anim"]);
assert.deepEqual(profile.thunderStrikeChargeFrames, range(30));
assert.deepEqual(profile.thunderStrikeStrikeFrames, range(34).map((frame) => frame + 7));
assert.equal(profile.flySourceFrames.length, 14);
assert.equal(profile.flyClimbFrames.length, 14);
assert.equal(profile.flightHoverFrames.length, 14);
assert.deepEqual(profile.flightHoverFrames, profile.flyClimbFrames);
assert.equal(profile.landingFrames.length, 14);
assert.equal(profile.landingFrames.at(-1), 38);
assert.deepEqual(profile.landingSourceFrames, range(39));
assert.equal(profile.groundStrikeSourceFrames.length, 41);
assert.equal(profile.meleeHookFrames.length, 33);
assert.equal(profile.meleeKickFrames.length, 26);
assert.equal(profile.thunderChargeSourceFrames.length, 63);

for (const animationKey of [profile.digUpAnim, profile.digUpSidewaysAnim]) {
  const contact = resolveUalActionContact(profile, animationKey);
  assert.ok(contact.sequenceIndex >= 0 && contact.sequenceIndex < profile.digUpFrames.length);
  assert.equal(contact.sequenceIndex, 6);
}
const downContact = resolveUalActionContact(profile, profile.digDownAnim);
assert.ok(downContact.sequenceIndex >= 0 && downContact.sequenceIndex < profile.digDownFrames.length);
assert.deepEqual(
  resolveUalActionContact(profile, profile.quickslashAnim, "quickslash"),
  UAL_NATIVE_ACTION_TUNING.contact.quickslash,
);
assert.deepEqual(
  resolveUalActionContact(profile, profile.thunderStrikeStrikeAnim, "thunderstrike"),
  UAL_NATIVE_ACTION_TUNING.contact.thunderStrike,
);
assert.equal(resolveUalActionTimeScale({ frameCount: 27, frameRate: 30, effectiveCooldownMs: 750 }), 1.2);
assert.ok(resolveUalActionTimeScale({
  frameCount: 15,
  frameRate: 30,
  effectiveCooldownMs: 187.5,
  kind: "quickslash",
}) > 2);
assert.equal(resolveUalFlightTimeScale(252, false), 1);
assert.equal(resolveUalFlightTimeScale(252, true), 1.2);
assert.equal(resolveUalFlightTimeScale(0, false), UAL_NATIVE_ACTION_TUNING.flight.minTimeScale);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 71, verticalSpeedPxPerSec: 0 }), false);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 72, verticalSpeedPxPerSec: 0 }), true);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 100, verticalSpeedPxPerSec: 160 }), false);
assert.equal(resolveUalFlightTravel({
  horizontalSpeedPxPerSec: 39,
  verticalSpeedPxPerSec: 0,
  wasTraveling: true,
}), true);
assert.equal(UAL_NATIVE_ACTION_TUNING.cadence.normal.recoveryCancelDelayMs, 100);
assert.ok(UAL_NATIVE_ACTION_TUNING.flight.bankResponsePerSecond > 0);
for (const fidget of PLAYER_MOTION_POLISH_CONFIG.idle.fidgets) {
  const animation = animationSpecs.get(fidget.key);
  assert.ok(animation, `missing idle fidget: ${fidget.key}`);
  assert.equal(animation.repeat, 0, `idle fidget must be one-shot: ${fidget.key}`);
  assert.equal(animation.frameRate, 18, `idle fidget lost polished cadence: ${fidget.key}`);
  assert.equal(animation.frames[0].key, profile.idleTalkSheet);
  assert.deepEqual(animation.frames.map((frame) => frame.frame), fidget.frames);
}
assert.equal(profile.combatIdleRecoverFrames.length, 24);
assert.equal(profile.combatIdleToNormalIdleFrames.length, 24);

const motionPolish = new PlayerMotionPolishSystem(profile);
const idleContext = {
  motionState: "idle",
  grounded: true,
  verticalAim: { up: false, down: false },
  wallBlocked: false,
  facingFlipX: false,
  idleFidgetAllowed: true,
  actionLocked: false,
};
motionPolish.reset(1000);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 1000 }), null);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 7999 }), null);
const firstFidget = motionPolish.resolveOverride({ ...idleContext, now: 8000 });
assert.equal(firstFidget.animationKey, PLAYER_MOTION_POLISH_CONFIG.idle.fidgets[0].key);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 8016 }).animationKey, firstFidget.animationKey);
assert.equal(motionPolish.onAnimationComplete(firstFidget.animationKey, 8800), true);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 8801 }), null);

motionPolish.reset(0);
const wallContext = {
  ...idleContext,
  motionState: "walk-right",
  idleFidgetAllowed: false,
  wallBlocked: true,
  wallFlipX: false,
};
assert.equal(motionPolish.resolveOverride({ ...wallContext, now: 0 }), null);
assert.equal(motionPolish.resolveOverride({ ...wallContext, now: 139 }), null);
assert.equal(motionPolish.resolveOverride({ ...wallContext, now: 140 }).animationKey, profile.wallPushAnim);
assert.equal(motionPolish.resolveOverride({ ...wallContext, wallBlocked: false, now: 200 }).animationKey, profile.wallPushAnim);
assert.equal(motionPolish.resolveOverride({ ...wallContext, wallBlocked: false, now: 221 }), null);

motionPolish.reset(0);
assert.equal(motionPolish.queueImpactReaction(0), true);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 0 }).animationKey, profile.earthquakeReactAnim);
assert.equal(motionPolish.onAnimationComplete(profile.earthquakeReactAnim, 400), true);
assert.equal(motionPolish.queueImpactReaction(500), false);
assert.equal(motionPolish.queueImpactReaction(800), true);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 800, actionLocked: true }), null);
assert.equal(motionPolish.resolveOverride({ ...idleContext, now: 900 }).animationKey, profile.earthquakeReactAnim);

const recoveryPrototype = {};
setupGameplayMethods(recoveryPrototype);
let recoveryCancelled = 0;
let recoveryRigEnded = 0;
const recoveryScene = {
  playerAssetProfile: profile,
  isDigAnimating: true,
  _ualActionContactAtMs: 200,
  time: { now: 750 },
  playerController: { abilities: {} },
  digSystem: {
    lastMineTime: 0,
    getEffectiveCooldownMs: () => 750,
    isMineCooldownReady: (nowMs) => nowMs >= 750,
  },
  ualActionContactTimeline: {
    contactFired: true,
    cancel() { recoveryCancelled += 1; },
  },
  playerRigContact: {
    endAction() { recoveryRigEnded += 1; },
  },
  player: { anims: { timeScale: 2 } },
};
Object.setPrototypeOf(recoveryScene, recoveryPrototype);
assert.equal(recoveryPrototype.canReplaceUalDigRecovery.call(recoveryScene, 299), false);
assert.equal(recoveryPrototype.canReplaceUalDigRecovery.call(recoveryScene, 749), false);
assert.equal(recoveryPrototype.canReplaceUalDigRecovery.call(recoveryScene, 750), true);
assert.equal(recoveryPrototype.cancelUalDigRecovery.call(recoveryScene, 750), true);
assert.equal(recoveryCancelled, 1);
assert.equal(recoveryRigEnded, 1);
assert.equal(recoveryScene.isDigAnimating, false);
assert.equal(recoveryScene.player.anims.timeScale, 1);

const { CaveGameplayController } = await import("../world/playScene/CaveGameplayController.js");
const caveFlips = [];
const caveController = new CaveGameplayController({
  playerAssetProfile: profile,
  config: { playerDisplaySizePx: profile.displaySizePx },
  anims: {
    exists: () => true,
    get: () => ({ frames: range(27), frameRate: 30 }),
  },
  player: {
    anims: {
      currentAnim: null,
      currentFrame: null,
      timeScale: 1,
    },
    setFlipX(value) { caveFlips.push(value); return this; },
    play() { return this; },
    setDisplaySize() { return this; },
  },
}, null, null);
let caveFacingRight = true;
caveController.playerController = { isFacingRight: () => caveFacingRight };
caveController._playMiningAnimation("mine", "LEFT", 0);
caveController._playMiningAnimation("mine", "RIGHT", 0);
caveController._playMiningAnimation("quickslash", "LEFT", 0);
caveController._playMiningAnimation("quickslash", "RIGHT", 0);
caveController._playMiningAnimation("mine", "DOWN", 0);
caveFacingRight = false;
caveController._playMiningAnimation("mine", "DOWN", 0);
assert.deepEqual(caveFlips, [true, false, true, false, false, true]);

assert.equal(runtimeManifest.pipeline, "native-ual-game-rig-v2-zero-weapon");
assert.equal(runtimeManifest.game_rig_version, 2);
assert.equal(runtimeManifest.weapon_policy, "none");
assert.equal(runtimeManifest.frame_width, 256);
assert.equal(runtimeManifest.frame_height, 256);
assert.equal(runtimeManifest.display_size_px, 109);
assert.equal(runtimeManifest.target_visible_height_tiles, 0.8);
assert.equal(runtimeManifest.source_crop_mode, "fixed-scale-per-frame-baseline");
assert.equal(runtimeManifest.source_window, 448);
assert.equal(runtimeManifest.source_baseline, 430);
assert.equal(runtimeManifest.source_facing, "right");
assert.equal(runtimeManifest.left_facing, "flipX");
assert.deepEqual(runtimeManifest.visual_origin, [0.5, 247 / 256]);
assert.deepEqual(runtimeManifest.player_body, { width_px: 31, height_px: 75 });
assert.equal(runtimeManifest.actions["dig-up-source"], undefined);
assert.equal(runtimeManifest.actions["dig-down-source"], undefined);
assert.equal(runtimeManifest.actions["thunder-strike"], undefined);
assert.equal(runtimeManifest.actions["ground-strike"].source_clip, "OverhandThrow");
assert.equal(runtimeManifest.actions.walk.source_clip, "Jog_Fwd_Loop");
assert.equal(runtimeManifest.actions.walk.frame_count, 28);
assert.equal(runtimeManifest.actions.walk.alpha_bounds.length, 28);
assert.equal(Object.keys(runtimeManifest.actions.walk.rig_markers.frames).length, 28);
assert.equal(runtimeManifest.actions.run.frame_count, 28);
assert.equal(Object.keys(runtimeManifest.actions.run.rig_markers.frames).length, 28);
assert.equal(runtimeManifest.actions["ground-strike"].game_retarget, null);
assert.equal(runtimeManifest.actions["melee-hook"].source_clip, "Melee_Hook + Melee_Hook_Rec");
assert.equal(runtimeManifest.actions["melee-hook"].frame_count, 33);
assert.equal(runtimeManifest.actions["melee-kick"].source_clip, "Authored_Grounded_Side_Kick_v1");
assert.deepEqual(runtimeManifest.actions["melee-kick"].source_clips, ["Punch_Cross"]);
assert.equal(runtimeManifest.actions["melee-kick"].frame_count, 26);
assert.equal(runtimeManifest.actions["melee-kick"].motion_origin, "authored-pose");
assert.equal(runtimeManifest.actions["melee-kick"].authored_pose.contact_frame, 10);
assert.equal(runtimeManifest.actions["melee-kick"].authored_pose.root_travel, "none");
assert.equal(Object.keys(runtimeManifest.actions["melee-kick"].rig_markers.frames).length, 26);
assert.equal(runtimeManifest.actions["dig-up"].source_clip, "Sword_Regular_C");
assert.equal(runtimeManifest.actions["dig-up"].frame_count, 17);
assert.equal(runtimeManifest.actions["pickaxe-mining"].source_clip, "TreeChopping_Loop");
assert.equal(runtimeManifest.actions["pickaxe-mining"].frame_count, 29);
assert.equal(Object.keys(runtimeManifest.actions["pickaxe-mining"].rig_markers.frames).length, 29);
assert.equal(runtimeManifest.actions["punch-uppercut"].source_clip, "Melee_Hook");
assert.equal(runtimeManifest.actions["punch-uppercut"].frame_count, 15);
assert.equal(Object.keys(runtimeManifest.actions["punch-uppercut"].rig_markers.frames).length, 15);
assert.equal(runtimeManifest.actions.fly.source_clip, "Shield_Dash");
assert.equal(runtimeManifest.actions.fly.frame_count, 14);
assert.equal(runtimeManifest.actions.landing.source_clip, "Jump_Land");
assert.equal(runtimeManifest.actions.landing.frame_count, 39);
assert.equal(runtimeManifest.actions["fly-hover"], undefined);
assert.equal(runtimeManifest.actions["punch-jab"].game_retarget, null);
const idleAlphaHeight = runtimeManifest.actions.idle.alpha_union[3]
  - runtimeManifest.actions.idle.alpha_union[1];
const idleVisibleHeightTiles = profile.displaySizePx * idleAlphaHeight
  / profile.frameHeight / GAME_CONFIG.tileSize;
assert.ok(
  Math.abs(idleVisibleHeightTiles - profile.targetVisibleHeightTiles) < 0.005,
  `idle visible height is ${idleVisibleHeightTiles.toFixed(4)} tiles`,
);
const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const alphaHeight = (box) => box[3] - box[1];
const runDisplaySize = resolvePlayerDisplaySizePx(profile, profile.displaySizePx, profile.walkRunAnim);
const sideAttackDisplaySizes = [...new Set(profile.digSidewaysHitAnims)].map((animationKey) => (
  resolvePlayerDisplaySizePx(profile, profile.displaySizePx, animationKey)
));
const runVisibleHeight = runDisplaySize * median(runtimeManifest.actions.run.alpha_bounds.map(alphaHeight))
  / profile.frameHeight;
const idleVisibleHeight = profile.displaySizePx
  * median(runtimeManifest.actions.idle.alpha_bounds.map(alphaHeight))
  / profile.frameHeight;
assert.equal(runDisplaySize, 123);
assert.deepEqual(sideAttackDisplaySizes, [109, 109]);
assert.ok(
  Math.abs(runVisibleHeight - idleVisibleHeight) < 1,
  `run/idle presentation mismatch is ${Math.abs(runVisibleHeight - idleVisibleHeight).toFixed(2)}px`,
);
assert.equal(Object.keys(runtimeManifest.actions).length, 23);
assert.ok(Number.isSafeInteger(manifestFrameTotal) && manifestFrameTotal > 0);
for (const [action, metadata] of Object.entries(runtimeManifest.actions)) {
  assert.equal(metadata.fps, 30, `${action} lost native cadence`);
  assert.equal(metadata.weapon, null, `${action} contains a weapon layer`);
  assert.ok(metadata.frame_count > 1, `${action} is a single frame`);
  assert.ok(metadata.columns <= 16, `${action} exceeds sheet column budget`);
  assert.ok(metadata.columns * metadata.frame_width <= 4096, `${action} exceeds 4096px width`);
  assert.ok(metadata.rows * metadata.frame_height <= 4096, `${action} exceeds 4096px height`);
  assert.equal(metadata.source_crop_mode, "fixed-scale-per-frame-baseline");
  assert.equal(metadata.source_window, 448, `${action} changed physical scale`);
  assert.equal(metadata.source_crops.length, metadata.frame_count, `${action} crop/frame mismatch`);
  assert.equal(metadata.alpha_bounds.length, metadata.frame_count, `${action} alpha/frame mismatch`);
  assert.ok(metadata.alpha_union[0] > 0 && metadata.alpha_union[1] > 0, `${action} clips top/left`);
  assert.ok(
    metadata.alpha_union[2] <= metadata.frame_width
      && metadata.alpha_union[3] <= metadata.frame_height,
    `${action} alpha bounds exceed the packed frame`,
  );
  const sheetPath = resolve(runtimeRoot, metadata.file);
  assert.ok(existsSync(sheetPath), `missing runtime sheet: ${metadata.file}`);
  assert.ok(statSync(sheetPath).size > 1024, `empty runtime sheet: ${metadata.file}`);
}

const worldLoadSource = readFileSync(resolve(root, "ui/scenes/WorldLoadScene.js"), "utf8");
const bootSource = readFileSync(resolve(root, "ui/scenes/BootScene.js"), "utf8");
const playSetupSource = readFileSync(resolve(root, "world/playScene/PlaySceneSetup.js"), "utf8");
const playGameplaySource = readFileSync(resolve(root, "world/playScene/PlaySceneGameplay.js"), "utf8");
const playUpdateSource = readFileSync(resolve(root, "world/playScene/PlaySceneUpdate.js"), "utf8");
const thunderRuntimeSource = readFileSync(
  resolve(root, "world/playScene/ThunderStrikeActionRuntime.js"),
  "utf8",
);
const playerControllerSource = readFileSync(resolve(root, "player/PlayerController.js"), "utf8");
const caveGameplaySource = readFileSync(resolve(root, "world/playScene/CaveGameplayController.js"), "utf8");
const caveActionSource = readFileSync(resolve(root, "world/playScene/CaveActionAnimationRuntime.js"), "utf8");
const caveLocomotionSource = readFileSync(
  resolve(root, "world/playScene/CaveLocomotionAnimationRuntime.js"),
  "utf8",
);
const motionSystemSource = readFileSync(resolve(root, "systems/visual/PlayerKinematicMotionSystem.js"), "utf8");
const rendererSource = readFileSync(resolve(root, "ai-tools/2026-07-16-render-ual-native-player.py"), "utf8");
const packerSource = readFileSync(resolve(root, "ai-tools/2026-07-16-pack-ual-native-player.py"), "utf8");
const retargetSource = readFileSync(resolve(root, "pipelines/blender/ualGameRigRetarget.py"), "utf8");
assert.match(worldLoadSource, /isUalNative[\s\S]{0,100}queuePlayerProfileSheets/);
assert.doesNotMatch(bootSource, /^\s*this\.preloadPlayerSprites\(\);/m);
assert.match(bootSource, /legacyPlayerAvailable/);
assert.match(playSetupSource, /createUalNativePlayerAnimations\(scene, profile\)/);
assert.match(playSetupSource, /await _ensureUalNativePlayer\(this, this\.playerAssetProfile\)/);
assert.match(playSetupSource, /playerBodyWidthPx: profile\.playerBodyWidthPx/);
assert.match(playSetupSource, /new UalActionContactTimeline\(this\.player\)/);
assert.match(playSetupSource, /new PlayerKinematicMotionSystem/);
assert.match(playSetupSource, /new UalNativeLocomotionTransitionSelector/);
assert.match(playSetupSource, /new PlayerRigContactSystem/);
assert.match(playGameplaySource, /nativePunchInProgress[\s\S]{0,220}return/);
assert.match(playGameplaySource, /ualActionContactTimeline\.begin\([\s\S]{0,260}onContact/);
assert.match(playGameplaySource, /resolveUalActionTimeScale/);
assert.match(playGameplaySource, /canReplaceUalDigRecovery/);
assert.match(playGameplaySource, /cancelUalDigRecovery/);
assert.match(playGameplaySource, /resolveUalFlightBankAlpha/);
assert.match(playGameplaySource, /resolveUalFlightTimeScale/);
assert.match(playGameplaySource, /ualLocomotionTransitionSelector\.resolve/);
assert.match(playGameplaySource, /getResolvedVelocityX/);
assert.match(playGameplaySource, /getResolvedVelocityY/);
assert.match(playGameplaySource, /UalMiningComboSelector/);
assert.doesNotMatch(playGameplaySource, /isOpenFlightSpace/);
assert.match(playGameplaySource, /getVerticalAim/);
assert.match(playGameplaySource, /verticalAim\.down/);
assert.match(playGameplaySource, /playerMotionPolish[\s\S]{0,160}resolveOverride/);
assert.match(playGameplaySource, /wallBlocked[\s\S]{0,220}profile\.idleAnim/);
assert.match(playGameplaySource, /resolveLocomotionTimeScale/);
assert.match(playUpdateSource, /playerKinematicMotion\?\.samplePhysics\(delta\)/);
assert.match(playUpdateSource, /playerRigContact\?\.update\(delta\)/);
assert.match(playUpdateSource, /playerRigContact\?\.validateContact/);
assert.match(playUpdateSource, /onContact:[\s\S]{0,700}digSystem\.tryMine/);
assert.doesNotMatch(playUpdateSource, /if \(rigContact[^\n]*!rigContact\.valid\) return/);
assert.match(playUpdateSource, /const contactDirection = committedDirection[\s\S]{0,80}\|\| resolveLiveContactDirection/);
assert.match(playUpdateSource, /thunderStrikeActionRuntime\?\.update/);
assert.match(thunderRuntimeSource, /startThunderStrikeCharge/);
assert.match(thunderRuntimeSource, /updateThunderStrikeCharge\(nowMs\)/);
assert.match(thunderRuntimeSource, /onContact: executeAtContact/);
assert.doesNotMatch(playUpdateSource, /_thunderStrikeHoldUntil = time \+ 350/);
assert.match(playerControllerSource, /playPlayerImpactReaction/);
assert.match(caveGameplaySource, /new PlayerKinematicMotionSystem/);
assert.match(caveGameplaySource, /new PlayerRigContactSystem/);
assert.match(caveGameplaySource, /playerKinematicMotion\?\.samplePhysics\(delta\)/);
assert.doesNotMatch(caveGameplaySource, /if \(rigContact[^\n]*!rigContact\.valid\) return/);
assert.match(caveGameplaySource, /const contactDirection = targetDirection[\s\S]{0,80}\|\| resolvePlayerTargetDirection/);
assert.match(caveActionSource, /UalNativeLocomotionTransitionSelector/);
assert.match(caveActionSource, /UalMiningComboSelector/);
assert.match(caveActionSource, /canReplaceMiningRecovery/);
assert.match(caveLocomotionSource, /resolveLocomotionTimeScale/);
assert.match(caveLocomotionSource, /getTravelSpeedPxPerSec/);
assert.match(caveLocomotionSource, /getResolvedVelocityX/);
assert.match(caveLocomotionSource, /getResolvedVelocityY/);
assert.match(caveLocomotionSource, /resolveUalFlightBankAlpha/);
assert.match(motionSystemSource, /body\.x - this\._lastX/);
assert.match(motionSystemSource, /strideTilesPerCycle \* tileSize/);
assert.match(rendererSource, /SOURCE_FPS,\s*FRAME_SIZE\s*=\s*24\.0,\s*512/);
assert.match(rendererSource, /Melee_Hook/);
assert.match(rendererSource, /Melee_Hook_Rec/);
assert.match(rendererSource, /TreeChopping_Loop/);
assert.match(rendererSource, /authored_kick_spec/);
assert.match(rendererSource, /ualNativeAuthoredKick\.json/);
assert.match(rendererSource, /Sword_Regular_C/);
assert.match(rendererSource, /Shield_Dash/);
assert.match(rendererSource, /Jump_Land/);
assert.match(rendererSource, /OverhandThrow/);
assert.doesNotMatch(
  rendererSource,
  /Farm_Harvest|Spell_Simple_Shoot|NinjaJump_Idle_Loop|Swim_Fwd_Loop|Swim_Idle_Loop/,
);
assert.match(rendererSource, /game_retarget/);
assert.match(retargetSource, /IK/);
assert.match(packerSource, /--merge-existing/);
assert.match(packerSource, /--remove-actions/);
assert.match(packerSource, /game_rig_version/);
assert.match(packerSource, /transform_rig_markers/);
assert.match(packerSource, /authored_pose/);

console.log(JSON.stringify({
  result: "UAL_NATIVE_PRODUCTION_CONTRACT_OK",
  queuedSheets: queuedSheets.length,
  createdAnimations: animationSpecs.size,
  digAnimations: profile.digAnims.length,
  nativeActions: Object.keys(runtimeManifest.actions).length,
  nativeFrames: manifestFrameTotal,
  collider: `${profile.playerBodyWidthPx}x${profile.playerBodyHeightPx}`,
  displaySize: profile.displaySizePx,
}, null, 2));

function range(length) {
  return Array.from({ length }, (_, index) => index);
}
