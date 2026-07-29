/** Keeps compact-cave locomotion playback aligned with the shared UAL selector. */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  UAL_NATIVE_ACTION_TUNING,
  resolveUalFlightBankAlpha,
  resolveUalFlightTimeScale,
} from "../../values/ualNativeActionTuning.js";

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
  const groundMoving = walking && Math.abs(body?.vx || 0) > 0;
  const grounded = controller.playerController.isGrounded();
  let flightTravel = false;
  let key;
  let selection = null;
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
  const visualOverride = recoveryOverride || wallOverride;
  if (visualOverride) {
    key = visualOverride.animationKey;
    selection = visualOverride;
    scene.player.setFlipX(visualOverride.flipX);
  } else if (profile.isUalNative && runtime.locomotion) {
    const resolvedVelocityY = scene.playerKinematicMotion?.getResolvedVelocityY?.() ?? body?.vy ?? 0;
    const bodyVelocityY = body?.vy || 0;
    selection = runtime.locomotion.resolve({
      grounded,
      flying: poweredFlight || motion === "climb",
      horizontalVelocity: scene.playerKinematicMotion?.getResolvedVelocityX?.() ?? body?.vx ?? 0,
      verticalVelocity: Math.abs(bodyVelocityY) > Math.abs(resolvedVelocityY)
        ? bodyVelocityY
        : resolvedVelocityY,
      currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
      isPlaying: scene.player.anims.isPlaying === true,
      currentFrameIndex: scene.player.anims.currentFrame?.index ?? 0,
      currentTextureFrame: Number(scene.player.anims.currentFrame?.textureFrame),
      facingFlipX: !controller.playerController.isFacingRight(),
      groundMovementActive: groundMoving,
    });
    key = selection.animationKey;
    flightTravel = selection.phase === "flight-travel-enter"
      || selection.phase === "flight-travel-loop";
    runtime.flightTravel = flightTravel;
    scene.player.setFlipX(selection.facingFlipX);
  } else {
    const flying = poweredFlight || motion === "climb" || motion === "airborne";
    key = flying ? (profile.flyAnim || profile.climbAnim) : walking
      ? (profile.walkLoopAnim || profile.walkAnim) : profile.idleAnim;
    scene.player.setFlipX(!controller.playerController.isFacingRight());
  }
  if (profile.isUalNative && !key) {
    key = walking ? (profile.walkLoopAnim || profile.walkAnim) : profile.idleAnim;
  }
  const shouldRestart = selection?.restart === true;
  if (key && scene.anims.exists(key)
    && (scene.player.anims.currentAnim?.key !== key || shouldRestart)) {
    const startFrame = Number.isFinite(selection?.startFrame) ? selection.startFrame : 0;
    scene.player.play(key, !shouldRestart, startFrame);
    controller._applyPlayerDisplaySize();
  }
  const kinematicScale = profile.isUalNative && (profile.walkAnims || []).includes(key)
    ? scene.playerKinematicMotion?.resolveLocomotionTimeScale?.(
      key,
      scene.anims.get(key),
      Math.abs(body?.vx || 0),
    )
    : null;
  const travelSpeed = scene.playerKinematicMotion?.getTravelSpeedPxPerSec?.();
  scene.player.anims.timeScale = Number.isFinite(selection?.timeScale)
    ? selection.timeScale
    : profile.isUalNative && (poweredFlight || motion === "climb")
      ? resolveUalFlightTimeScale(
        Number.isFinite(travelSpeed) ? travelSpeed : Math.hypot(body?.vx || 0, body?.vy || 0),
        flightTravel,
      )
      : (Number.isFinite(kinematicScale) ? kinematicScale : 1);
  if (!profile.isUalNative) return;
  const velocityX = scene.playerKinematicMotion?.getResolvedVelocityX?.() ?? body?.vx ?? 0;
  const flightActive = poweredFlight || motion === "climb";
  const flight = UAL_NATIVE_ACTION_TUNING.flight;
  const velocitySign = Math.sign(velocityX) || (selection?.facingFlipX ? -1 : 1);
  const hoverRatio = Math.min(1, Math.abs(velocityX) / flight.referenceSpeedPxPerSec);
  const targetAngle = flightActive
    ? velocitySign * (flightTravel
      ? flight.travelBankDegrees
      : flight.hoverBankDegrees * hoverRatio)
    : 0;
  const currentAngle = Number(scene.player.angle) || 0;
  const bankAlpha = resolveUalFlightBankAlpha(deltaMs);
  scene.player.setAngle?.(currentAngle + (targetAngle - currentAngle) * bankAlpha);
}
