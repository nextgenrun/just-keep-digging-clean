/** Proves the restored UAL directional combo, contacts, flight selector, and runtime assets. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { UalMiningComboSelector } from "../player/UalMiningComboSelector.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  resolveUalActionContact,
  resolveUalActionTimeScale,
  resolveUalFlightTravel,
  UAL_NATIVE_ACTION_TUNING,
} from "../values/ualNativeActionTuning.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE as profile } from "../values/ualNativePlayerAssetProfile.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(root, "sprites/character/ual-native-player-v1/runtime");
const manifest = JSON.parse(readFileSync(resolve(runtimeRoot, "manifest.json"), "utf8"));
const sideKeys = profile.digSidewaysHitAnims;
const selector = new UalMiningComboSelector();

assert.equal(sideKeys.length, 4);
assert.deepEqual(sideKeys, [
  "ual-native-v1-punch-jab-anim",
  "ual-native-v1-dig-side-cross-anim",
  "ual-native-v1-punch-jab-anim",
  "ual-native-v1-dig-side-cross-anim",
]);

const selectSide = (nowMs, direction = "RIGHT", tx = 1) => selector.select({
  family: "side",
  direction,
  animationKeys: sideKeys,
  fallback: profile.digSidewaysAnim,
  targetTile: { tx, ty: 0 },
  nowMs,
});

assert.equal(selectSide(0, "RIGHT", 1), sideKeys[0]);
assert.equal(selectSide(300, "RIGHT", 2), sideKeys[1], "adjacent block reset the combo");
assert.equal(selectSide(600, "RIGHT", 3), sideKeys[2]);
assert.equal(selectSide(900, "RIGHT", 4), sideKeys[3]);
assert.equal(selectSide(1200, "RIGHT", 5), sideKeys[0]);
assert.equal(selectSide(1300, "LEFT", -1), sideKeys[0], "direction change did not reset");
assert.equal(selectSide(2301, "LEFT", -2), sideKeys[0], "combo timeout did not reset");
selector.reset();
assert.equal(selector.state, null);

const comboCooldownMs = 750;
const variantFor = (animationKey) => profile.digAnimationVariants.find(
  (entry) => entry.key === animationKey,
);
const animationSpecFor = (animationKey) => animationKey === profile.quickslashAnim
  ? {
      key: profile.quickslashAnim,
      sheet: profile.quickslashSheet,
      frames: profile.quickslashFrames,
      frameRate: profile.quickslashAnimationFps,
    }
  : variantFor(animationKey);
const contactOffsetMs = (animationKey) => {
  const variant = animationSpecFor(animationKey);
  const contact = resolveUalActionContact(profile, animationKey);
  const timeScale = resolveUalActionTimeScale({
    frameCount: variant.frames.length,
    frameRate: variant.frameRate,
    effectiveCooldownMs: comboCooldownMs,
  });
  return (contact.sequenceIndex / variant.frameRate) * 1000 / timeScale;
};
for (const animationKey of new Set(sideKeys)) {
  const offsetMs = contactOffsetMs(animationKey);
  assert.ok(offsetMs > 0 && offsetMs < comboCooldownMs,
    `${animationKey} contact left the mining cadence window`);
}

const appliedHits = [];
const cadenceWorld = {
  inBounds: () => true,
  isSolid: () => true,
  isDiggable: () => true,
  getTileType: () => TILE_TYPES.DIRT,
  damageTile: (tx, ty, damage) => {
    appliedHits.push({ tx, ty, damage });
    return {
      success: true,
      destroyed: false,
      wasRubble: false,
      typeBeforeDamage: TILE_TYPES.DIRT,
      hp: 100,
    };
  },
};
const cadenceDigSystem = new DigSystem(
  cadenceWorld,
  { applyTileUpdate() {} },
  { mineCooldownMs: comboCooldownMs, tileSize: 128, topAirRows: 0, seed: 1 },
);
sideKeys.forEach((animationKey, index) => {
  const actionStartedAtMs = index * comboCooldownMs;
  const contactTimeMs = actionStartedAtMs + contactOffsetMs(animationKey);
  const result = cadenceDigSystem.tryMine(
    { tx: index + 1, ty: 0 },
    contactTimeMs,
    "RIGHT",
    null,
    { actionStartedAtMs },
  );
  assert.equal(result.success, true, `combo beat ${index + 1} missed at contact`);
  const duplicate = cadenceDigSystem.tryMine(
    { tx: index + 1, ty: 0 },
    contactTimeMs,
    "RIGHT",
    null,
    { actionStartedAtMs },
  );
  assert.equal(duplicate.reason, "cooldown", `combo beat ${index + 1} applied twice`);
});
assert.equal(appliedHits.length, 4, "the four-beat punch combo did not apply exactly four hits");

const expectedSideSheets = new Map([
  [sideKeys[0], profile.punchJabSheet],
  [sideKeys[1], profile.punchCrossSheet],
]);
for (const animationKey of sideKeys) {
  const variant = animationSpecFor(animationKey);
  const actionContact = resolveUalActionContact(profile, animationKey);
  assert.equal(variant.sheet, expectedSideSheets.get(animationKey));
  assert.ok(actionContact.sequenceIndex >= 0 && actionContact.sequenceIndex < variant.frames.length);
}
for (const animationKey of [profile.digUpAnim, profile.digUpSidewaysAnim]) {
  const variant = variantFor(animationKey);
  const actionContact = resolveUalActionContact(profile, animationKey);
  assert.equal(variant.sheet, profile.uppercutSheet);
  assert.ok(actionContact.sequenceIndex >= 0 && actionContact.sequenceIndex < variant.frames.length);
  assert.equal(actionContact.sequenceIndex, 6);
}
const downContact = resolveUalActionContact(profile, profile.digDownAnim);
assert.equal(profile.digDownSheet, profile.groundStrikeSheet);
assert.equal(profile.digDownSheet, profile.attackDownSheet);
assert.ok(downContact.sequenceIndex >= 0 && downContact.sequenceIndex < profile.digDownFrames.length);
assert.deepEqual(
  resolveUalActionContact(profile, profile.thunderStrikeStrikeAnim, "thunderstrike"),
  UAL_NATIVE_ACTION_TUNING.contact.thunderStrike,
);

assert.deepEqual(profile.digUpFrames, profile.uppercutPlaybackFrames);
assert.equal(profile.digUpFrames.length, 24);
assert.deepEqual(profile.uppercutFrames, Array.from({ length: 15 }, (_, index) => index));
assert.deepEqual(profile.digDownFrames, Array.from({ length: 37 }, (_, index) => index + 4));
assert.deepEqual(profile.thunderStrikeStrikeFrames, Array.from({ length: 34 }, (_, index) => index + 7));
assert.equal(profile.thunderStrikeStrikeAnimationFps, 42);
assert.deepEqual(profile.digSidewaysFrames, profile.quickslashFrames);
assert.equal(profile.digSidewaysFrames.length, 15);

assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 71, verticalSpeedPxPerSec: 0 }), false);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 72, verticalSpeedPxPerSec: 0 }), true);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 39, verticalSpeedPxPerSec: 0, wasTraveling: true }), true);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 37, verticalSpeedPxPerSec: 0, wasTraveling: true }), false);
assert.equal(resolveUalFlightTravel({ horizontalSpeedPxPerSec: 100, verticalSpeedPxPerSec: 160 }), false);

assert.equal(manifest.actions["dig-up-source"], undefined);
assert.equal(manifest.actions["dig-down-source"], undefined);
assert.equal(manifest.actions["thunder-strike"], undefined);
assert.equal(manifest.actions["ground-strike"].source_clip, "OverhandThrow");
assert.equal(manifest.actions["ground-strike"].frame_count, 41);
assert.equal(manifest.actions["melee-hook"].source_clip, "Melee_Hook + Melee_Hook_Rec");
assert.equal(manifest.actions["melee-hook"].frame_count, 33);
assert.equal(manifest.actions["melee-kick"].source_clip, "Authored_Grounded_Side_Kick_v1");
assert.equal(manifest.actions["melee-kick"].frame_count, 26);
assert.equal(manifest.actions["melee-kick"].authored_pose.contact_frame, 10);
assert.equal(manifest.actions["melee-kick"].motion_origin, "authored-pose");
assert.equal(manifest.actions["dig-up"].source_clip, "Sword_Regular_C");
assert.equal(manifest.actions["dig-up"].frame_count, 17);
assert.equal(manifest.actions["pickaxe-mining"].source_clip, "TreeChopping_Loop");
assert.equal(manifest.actions["pickaxe-mining"].frame_count, 29);
assert.equal(manifest.actions["punch-uppercut"].source_clip, "Melee_Hook");
assert.equal(manifest.actions["punch-uppercut"].frame_count, 15);
assert.equal(manifest.actions.fly.source_clip, "Shield_Dash");
assert.equal(manifest.actions.fly.frame_count, 14);
assert.equal(manifest.actions.landing.source_clip, "Jump_Land");
assert.equal(manifest.actions.landing.frame_count, 39);
assert.equal(manifest.actions["fly-hover"], undefined);
assert.equal(Object.keys(manifest.actions).length, 23);
assert.equal(profile.rejectedSourceClips.fly, "Swim_Fwd_Loop");
assert.equal(profile.rejectedSourceClips.flyHover, "Swim_Idle_Loop");
assert.equal(profile.rejectedSourceClips.sideFinisher, "Authored_Grounded_Side_Kick_v1");
assert.equal(profile.rejectedSourceClips.digUpActive, "Sword_Regular_C");
assert.equal(profile.rejectedSourceClips.sideMining, "TreeChopping_Loop");
assert.deepEqual(profile.rejectedAnimationKeys, ["ual-native-v1-dig-side-jab-anim"]);
assert.equal(Object.values(profile.sourceClips).includes("TreeChopping_Loop"), false);
assert.equal(profile.digSidewaysHitAnims.some((key) => key.includes("kick")), false);
assert.equal(profile.digAnimationVariants.some((entry) => entry.sheet === profile.meleeKickSheet), false);
assert.equal(profile.digAnimationVariants.some((entry) => entry.sheet === profile.digUpSheet), true);
assert.equal(profile.digDownSourceFacesRight, true);
for (const rejectedSwim of ["Swim_Fwd_Loop", "Swim_Idle_Loop"]) {
  assert.equal(Object.values(profile.sourceClips).includes(rejectedSwim), false);
  assert.equal(
    Object.values(manifest.actions).some((metadata) => metadata.source_clip === rejectedSwim),
    false,
  );
}
for (const action of [
  "ground-strike", "melee-hook", "melee-kick", "dig-up", "pickaxe-mining",
  "punch-uppercut", "fly", "landing",
]) {
  assert.equal(
    Object.keys(manifest.actions[action].rig_markers.frames).length,
    manifest.actions[action].frame_count,
    `${action} lacks per-frame rig markers`,
  );
}
for (const [, file] of profile.sheetFiles) {
  assert.equal(existsSync(resolve(runtimeRoot, file)), true, `missing ${file}`);
}

const mainGameplay = readFileSync(resolve(root, "world/playScene/PlaySceneGameplay.js"), "utf8");
const mainUpdate = readFileSync(resolve(root, "world/playScene/PlaySceneUpdate.js"), "utf8");
const caveActions = readFileSync(resolve(root, "world/playScene/CaveActionAnimationRuntime.js"), "utf8");
const caveGameplay = readFileSync(resolve(root, "world/playScene/CaveGameplayController.js"), "utf8");
for (const source of [mainGameplay, caveActions]) {
  assert.match(source, /UalMiningComboSelector/);
  assert.match(source, /getResolvedVelocityX/);
  assert.match(source, /getResolvedVelocityY/);
  assert.doesNotMatch(source, /isOpenFlightSpace/);
}
assert.match(mainGameplay, /ualLocomotionTransitionSelector\.resolve/);
assert.match(caveActions, /UalNativeLocomotionTransitionSelector/);
for (const source of [mainUpdate, caveGameplay]) {
  assert.match(source, /actionStartedAtMs: time/);
}
assert.match(
  mainUpdate,
  /const contactDirection = committedDirection[\s\S]{0,100}\|\| resolveLiveContactDirection/,
  "main-world normal mining no longer preserves the committed action direction",
);
assert.match(
  mainGameplay,
  /aim === "DOWN"[\s\S]{0,320}profile\.isUalNative[\s\S]{0,120}flipX = postActionFacingFlipX/,
  "main-world UAL DOWN action no longer preserves the current facing",
);
assert.match(
  caveActions,
  /if \(down && !downSide\)[\s\S]{0,160}setFlipX\(!this\.controller\.playerController\.isFacingRight\(\)\)/,
  "compact-cave UAL DOWN action no longer preserves the current facing",
);
assert.match(
  mainGameplay,
  /aim === "UP"[\s\S]{0,260}flipX = postActionFacingFlipX/,
  "main-world straight-UP action no longer preserves facing",
);
assert.match(
  caveActions,
  /if \(up && !upSide\)[\s\S]{0,140}setFlipX\(!this\.controller\.playerController\.isFacingRight\(\)\)/,
  "compact-cave straight-UP action no longer preserves facing",
);

console.log(JSON.stringify({
  result: "UAL_DIRECTIONAL_COMBO_CONTRACT_OK",
  sideCombo: sideKeys,
  upContactFrame: UAL_NATIVE_ACTION_TUNING.contact.digUp.textureFrame,
  groundContactFrame: UAL_NATIVE_ACTION_TUNING.contact.digDown.textureFrame,
  thunderContactFrame: UAL_NATIVE_ACTION_TUNING.contact.thunderStrike.textureFrame,
  runtimeActions: Object.keys(manifest.actions).length,
}, null, 2));
