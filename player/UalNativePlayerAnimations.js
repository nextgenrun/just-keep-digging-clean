import { PLAYER_MOTION_POLISH_CONFIG } from "../values/playerMotionPolish.js";

function createAnimation(scene, key, sheet, frames, frameRate, repeat) {
  if (!key || !sheet || !frames?.length || scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: frames.map((frame) => ({ key: sheet, frame })),
    frameRate,
    repeat,
  });
}

function createConfiguredAnimations(scene, animations) {
  animations?.forEach((animation) => {
    createAnimation(
      scene,
      animation.key,
      animation.sheet,
      animation.frames,
      animation.frameRate,
      animation.repeat ?? 0,
    );
  });
}

function applyTextureFilter(scene, profile) {
  const filterModes = globalThis.Phaser?.Textures?.FilterMode;
  const filterMode = filterModes?.[String(profile.textureFilter || "LINEAR").toUpperCase()];
  if (typeof filterMode !== "number") return;
  profile.requiredSheets.forEach((sheetKey) => {
    if (scene.textures.exists(sheetKey)) scene.textures.get(sheetKey).setFilter(filterMode);
  });
}

export function createUalNativePlayerAnimations(scene, profile) {
  applyTextureFilter(scene, profile);
  const idleFidgets = profile.idleFidgets || PLAYER_MOTION_POLISH_CONFIG.idle.fidgets;

  createAnimation(scene, profile.idleAnim, profile.idleSheet, profile.idleFrames, profile.idleAnimationFps, -1);
  createAnimation(scene, profile.walkStartAnim, profile.walkStartSheet, profile.walkStartFrames, profile.walkAnimationFps, 0);
  createAnimation(scene, profile.walkLoopAnim, profile.walkLoopSheet, profile.walkLoopFrames, profile.walkAnimationFps, -1);
  createAnimation(scene, profile.walkRunAnim, profile.walkRunSheet, profile.walkRunFrames, profile.walkRunAnimationFps, -1);
  createAnimation(scene, profile.walkStopAnim, profile.walkStopSheet, profile.walkStopFrames, profile.walkAnimationFps, 0);

  createAnimation(scene, profile.airborneAnim, profile.airborneSheet, profile.airborneFrames, profile.airborneAnimationFps, 0);
  createAnimation(scene, profile.fallingAnim, profile.fallingSheet, profile.fallingFrames, profile.fallingAnimationFps, -1);
  createAnimation(scene, profile.climbAnim, profile.climbSheet, profile.climbFrames, profile.climbAnimationFps || profile.flyClimbAnimationFps, -1);
  createAnimation(scene, profile.flyAnim, profile.flySheet, profile.flyFrames, profile.flyAnimationFps || profile.flyClimbAnimationFps, -1);
  createAnimation(scene, profile.flyClimbAnim, profile.flyClimbSheet, profile.flyClimbFrames, profile.flyClimbAnimationFps, -1);
  createAnimation(scene, profile.flightEnterAnim, profile.flightEnterSheet, profile.flightEnterFrames, profile.flightEnterAnimationFps || profile.airborneAnimationFps, 0);
  createAnimation(scene, profile.flightTravelEnterAnim, profile.flightTravelEnterSheet, profile.flightTravelEnterFrames, profile.flightTravelEnterAnimationFps || profile.flyClimbAnimationFps, 0);
  createAnimation(scene, profile.flightTravelLoopAnim, profile.flightTravelLoopSheet, profile.flightTravelLoopFrames, profile.flightTravelLoopAnimationFps || profile.flyClimbAnimationFps, -1);
  createAnimation(scene, profile.flightHoverAnim, profile.flightHoverSheet, profile.flightHoverFrames, profile.flightHoverAnimationFps || profile.flyClimbAnimationFps, -1);
  createAnimation(scene, profile.flightExitAnim, profile.flightExitSheet, profile.flightExitFrames, profile.flightExitAnimationFps || profile.airborneAnimationFps, 0);
  createAnimation(scene, profile.landingAnim, profile.landingSheet, profile.landingFrames, profile.airborneAnimationFps, 0);
  createAnimation(scene, profile.duckAnim, profile.duckSheet, profile.duckFrames, profile.duckAnimationFps, -1);

  createAnimation(scene, profile.digDownAnim, profile.digDownSheet, profile.digDownFrames, profile.digDownAnimationFps, 0);
  createConfiguredAnimations(scene, profile.digAnimationVariants);

  createAnimation(scene, profile.digUpLookAnim, profile.digUpLookSheet, profile.digUpLookFrames, profile.idleAnimationFps, -1);
  createAnimation(scene, profile.wallPushAnim, profile.wallPushSheet, profile.wallPushFrames, profile.wallPushAnimationFps, -1);
  createAnimation(scene, profile.leanAgainstWallAnim, profile.leanAgainstWallSheet, profile.leanAgainstWallFrames, profile.leanAgainstWallAnimationFps, -1);
  createAnimation(scene, profile.combatIdleRecoverAnim, profile.combatIdleRecoverSheet, profile.combatIdleRecoverFrames, profile.combatIdleRecoverAnimationFps, -1);
  createAnimation(scene, profile.combatIdleToNormalIdleAnim, profile.combatIdleToNormalIdleSheet, profile.combatIdleToNormalIdleFrames, profile.combatIdleToNormalIdleAnimationFps, 0);
  createConfiguredAnimations(scene, idleFidgets.map((fidget) => ({
    ...fidget,
    sheet: profile[fidget.profileSheetKey],
  })));

  createAnimation(scene, profile.quickslashAnim, profile.quickslashSheet, profile.quickslashFrames, profile.quickslashAnimationFps, 0);
  createAnimation(scene, profile.teleportInAnim, profile.teleportInSheet, profile.teleportInFrames, profile.teleportInAnimationFps, 0);
  createAnimation(scene, profile.thunderStrikeChargeAnim, profile.thunderStrikeChargeSheet, profile.thunderStrikeChargeFrames, profile.thunderStrikeChargeAnimationFps, 0);
  createAnimation(scene, profile.thunderStrikeStrikeAnim, profile.thunderStrikeStrikeSheet, profile.thunderStrikeStrikeFrames, profile.thunderStrikeStrikeAnimationFps, 0);
  createAnimation(scene, profile.attackDownAnim, profile.attackDownSheet, profile.attackDownFrames, profile.digDownAnimationFps, 0);
  createAnimation(scene, profile.earthquakeReactAnim, profile.earthquakeReactSheet, profile.earthquakeReactFrames, profile.earthquakeReactAnimationFps, 0);
  createAnimation(scene, profile.deathAnim, profile.deathSheet, profile.deathFrames, profile.deathAnimationFps, 0);
}
