/** Keeps compact-cave locomotion playback aligned with the shared UAL selector. */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  resolveUalFlightBankAlpha,
  resolveUalFlightPoseAngle,
  resolveUalFlightTimeScale,
} from "../../values/ualNativeActionTuning.js";
import { resolveUalCrouchTransitionAnimation } from
  "../../systems/visual/ualCrouchTransitionSelection.js";

export function updateCaveLocomotionVisual(runtime, time, deltaMs) {
  const controller = runtime.controller;
  if (runtime.thunderStrikeRuntime.isAnimating
    || runtime.timeline?.isActive
    || time < controller._actionUntilMs) return;
  const { scene } = controller;
  const profile = scene.playerAssetProfile || ASSET_KEYS.player;
  const motion = controller.playerController.getMotionState();
  const poweredFlight = controller.playerController.abilities.isFlying();
  const walking = motion === "walk-left" || motion === "walk-right";
  const body = controller.playerController.physicsBody;
  const grounded = controller.playerController.isGrounded();
  const forcedCrouchVisual = controller.playerController.requiresCrouchVisual?.() === true;
  let flightTravel = false;
  let key;
  let selection = null;
  const ledgeVisual = controller.playerController.getLedgeVisualState?.() || null;
  const ledgeOverride = ledgeVisual && profile.ledgeAssistEnabled
    ? {
      animationKey: ledgeVisual.phase === "climb"
        ? profile.ledgeClimbAnim
        : profile.ledgeHangAnim,
      flipX: ledgeVisual.direction < 0
        ? profile.ledgeSourceFacesRight === true
        : profile.ledgeSourceFacesRight !== true,
    }
    : null;
  const recoveryOverride = runtime.actionRecovery?.resolve({
    moving: walking || !grounded,
    currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
    isPlaying: scene.player.anims.isPlaying === true,
  }) || null;
  const wallBlocked = walking && grounded && Math.abs(body?.vx || 0) < 1;
  const wallOverride = recoveryOverride ? null : runtime.wallBrace?.resolve({
    now: time,
    blocked: wallBlocked,
    movingAway: walking && !wallBlocked,
    flipX: motion === "walk-left",
    currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
    isPlaying: scene.player.anims.isPlaying === true,
  }) || null;
  const wallRunResumeFrame = runtime.wallBrace?.consumeRunResumeFrame?.();
  if (Number.isFinite(wallRunResumeFrame)) {
    runtime.locomotion?.requestRunResume(wallRunResumeFrame);
  }
  const visualOverride = ledgeOverride || recoveryOverride || wallOverride;
  if (visualOverride) {
    key = visualOverride.animationKey;
    selection = visualOverride;
    scene.player.setFlipX(visualOverride.flipX);
  } else if (forcedCrouchVisual && profile.duckAnim) {
    key = profile.duckAnim;
    scene.player.setFlipX(!controller.playerController.isFacingRight());
  } else if (profile.isUalNative && runtime.locomotion) {
    const resolvedVelocityY = scene.playerKinematicMotion?.getResolvedVelocityY?.() ?? body?.vy ?? 0;
    const bodyVelocityY = body?.vy || 0;
    selection = runtime.locomotion.resolve({
      grounded,
      flying: poweredFlight,
      horizontalVelocity: scene.playerKinematicMotion?.getResolvedVelocityX?.() ?? body?.vx ?? 0,
      verticalVelocity: Math.abs(bodyVelocityY) > Math.abs(resolvedVelocityY)
        ? bodyVelocityY
        : resolvedVelocityY,
      currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
      isPlaying: scene.player.anims.isPlaying === true,
      currentFrameIndex: scene.player.anims.currentFrame?.index ?? 0,
      currentTextureFrame: Number(scene.player.anims.currentFrame?.textureFrame),
      facingFlipX: !controller.playerController.isFacingRight(),
    });
    key = selection.animationKey;
    flightTravel = selection.phase === "flight-travel-enter"
      || selection.phase === "flight-travel-loop";
    runtime.flightTravel = flightTravel;
    scene.player.setFlipX(selection.facingFlipX);
  } else {
    const flying = poweredFlight || motion === "airborne";
    key = flying ? (profile.flyAnim || profile.idleAnim) : walking
      ? (profile.walkLoopAnim || profile.walkAnim) : profile.idleAnim;
    scene.player.setFlipX(!controller.playerController.isFacingRight());
  }
  if (profile.isUalNative && !key) {
    key = walking ? (profile.walkLoopAnim || profile.walkAnim) : profile.idleAnim;
  }
  if (!ledgeVisual) {
    const crouchTransitionKey = resolveUalCrouchTransitionAnimation({
      wantsCrouch: forcedCrouchVisual,
      currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
      isPlaying: scene.player.anims.isPlaying === true,
      crouchIdleAnimationKey: profile.duckAnim,
      crouchEnterAnimationKey: profile.crouchEnterAnim,
      crouchExitAnimationKey: profile.crouchExitAnim,
    });
    if (crouchTransitionKey && crouchTransitionKey !== key) {
      key = crouchTransitionKey;
      selection = null;
      flightTravel = false;
      runtime.flightTravel = false;
    }
  }
  const selectionOwnsKey = selection?.animationKey === key;
  const shouldRestart = selectionOwnsKey
    && selection.restart === true;
  if (key && scene.anims.exists(key)
    && (scene.player.anims.currentAnim?.key !== key || shouldRestart)) {
    const startFrame = selectionOwnsKey && Number.isFinite(selection?.startFrame)
      ? selection.startFrame
      : 0;
    controller._applyPlayerDisplaySize(key);
    scene.player.play(key, !shouldRestart, startFrame);
    controller.playerController?._syncSpriteWithPhysics?.();
  }
  const kinematicScale = profile.isUalNative && (profile.walkAnims || []).includes(key)
    ? scene.playerKinematicMotion?.resolveLocomotionTimeScale?.(
      key,
      scene.anims.get(key),
      Math.abs(body?.vx || 0),
    )
    : null;
  const travelSpeed = scene.playerKinematicMotion?.getTravelSpeedPxPerSec?.();
  scene.player.anims.timeScale = ledgeVisual
    ? 1
    : selectionOwnsKey && Number.isFinite(selection?.timeScale)
    ? selection.timeScale
    : profile.isUalNative && poweredFlight
      ? resolveUalFlightTimeScale(
        Number.isFinite(travelSpeed) ? travelSpeed : Math.hypot(body?.vx || 0, body?.vy || 0),
        flightTravel,
      )
      : (Number.isFinite(kinematicScale) ? kinematicScale : 1);
  if (!profile.isUalNative) return;
  if (ledgeVisual) {
    scene.player.setAngle?.(0);
    return;
  }
  const velocityX = scene.playerKinematicMotion?.getResolvedVelocityX?.() ?? body?.vx ?? 0;
  const flightActive = poweredFlight;
  const velocityY = body?.vy || scene.playerKinematicMotion?.getResolvedVelocityY?.() || 0;
  const flightMotion = controller.playerController?.flightMotion?.getSnapshot?.();
  const targetAngle = flightActive
    ? resolveUalFlightPoseAngle({
      horizontalVelocityPxPerSec: velocityX,
      verticalVelocityPxPerSec: velocityY,
      verticalAccelerationPxPerSecondSquared: flightMotion?.accelerationY,
      facingFlipX: selection?.facingFlipX === true,
    })
    : 0;
  const currentAngle = Number(scene.player.angle) || 0;
  const bankAlpha = resolveUalFlightBankAlpha(deltaMs);
  scene.player.setAngle?.(currentAngle + (targetAngle - currentAngle) * bankAlpha);
}
