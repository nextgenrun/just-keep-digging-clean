/** Owns cave-only character action timing, authored UAL contacts, and flight animation selection. */
import { UalActionContactTimeline } from "../../player/UalActionContactTimeline.js";
import { UalMiningComboSelector } from "../../player/UalMiningComboSelector.js";
import { UalNativeLocomotionTransitionSelector } from "../../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { ThunderStrikeActionRuntime } from "./ThunderStrikeActionRuntime.js";
import {
  UAL_NATIVE_ACTION_TUNING, resolveUalActionContact, resolveUalActionTimeScale,
  resolveUalFlightBankAlpha, resolveUalFlightTimeScale,
} from "../../values/ualNativeActionTuning.js";

export class CaveActionAnimationRuntime {
  constructor(controller) {
    this.controller = controller;
    this.timeline = null;
    this.thunderStrikeRuntime = new ThunderStrikeActionRuntime(controller.scene, {
      getAbilities: () => this.controller.playerController?.abilities,
      getProfile: () => this.controller.scene.playerAssetProfile || ASSET_KEYS.player,
      getTimeline: () => this.timeline,
      canStart: (nowMs) => !this.timeline?.isActive
        && !(this.controller._actionUntilMs > nowMs),
      setLocked: (locked) => {
        this.controller._actionUntilMs = locked ? Infinity : 0;
      },
      afterPlayAnimation: (key) => this.controller._applyPlayerDisplaySize(key),
      resetVisuals: () => this.controller._applyPlayerDisplaySize(),
      holdMs: CAVE_SCENE_CONFIG.feedback.thunderStrikeHoldMs,
    });
    this.miningCombo = new UalMiningComboSelector();
    this.flightTravel = false;
    this.locomotion = null;
    this._activeMiningActionKind = null;
    this._contactAtMs = -Infinity;
  }
  create() {
    const { scene } = this.controller;
    if (scene.playerAssetProfile?.isUalNative && !this.timeline) {
      this.timeline = new UalActionContactTimeline(scene.player);
      this.locomotion = new UalNativeLocomotionTransitionSelector(scene.playerAssetProfile);
      this.locomotion.reset({
        grounded: this.controller.playerController?.isGrounded?.() !== false,
        flying: this.controller.playerController?.abilities?.isFlying?.() === true,
        facingFlipX: !this.controller.playerController?.isFacingRight?.(),
      });
    }
  }
  destroy() {
    this.thunderStrikeRuntime.destroy();
    this.timeline?.destroy();
    this.timeline = null;
    this.miningCombo.reset();
    this.flightTravel = false;
    this._activeMiningActionKind = null;
    this._contactAtMs = -Infinity;
    this.locomotion?.reset();
    this.locomotion = null;
  }
  get isUalActionLocked() {
    return this.thunderStrikeRuntime.isAnimating
      || (
        this.controller.scene.playerAssetProfile?.isUalNative
        && this.timeline?.isActive
      );
  }
  canReplaceMiningRecovery(nowMs, abilities = null) {
    if (!this._activeMiningActionKind || this.timeline?.contactFired !== true) return false;
    const delayMs = UAL_NATIVE_ACTION_TUNING.cadence.normal.recoveryCancelDelayMs;
    if (!Number.isFinite(this._contactAtMs) || nowMs - this._contactAtMs < delayMs) return false;
    const { digSystem } = this.controller;
    if (typeof digSystem?.isMineCooldownReady === "function") {
      return digSystem.isMineCooldownReady(nowMs, abilities);
    }
    const lastMineTime = Number.isFinite(digSystem?.lastMineTime)
      ? digSystem.lastMineTime
      : -Infinity;
    return nowMs - lastMineTime >= (digSystem?.getEffectiveCooldownMs?.(abilities) || 0);
  }
  playMiningAnimation(
    action,
    aim,
    time,
    abilities = null,
    onContact = null,
    targetTile = null,
    direction = null,
  ) {
    const { scene } = this.controller;
    const profile = scene.playerAssetProfile || ASSET_KEYS.player;
    if (
      profile.isUalNative
      && this.timeline?.isActive
      && !this._cancelMiningRecovery(time, abilities)
    ) return false;
    let key;
    let sourceFacesRight;
    if (action === "quickslash") {
      key = profile.quickslashAnim;
      sourceFacesRight = profile.quickslashSourceFacesRight
        ?? ASSET_KEYS.player.quickslashSourceFacesRight;
      scene.player.setFlipX(sourceFacesRight ? aim.includes("LEFT") : aim.includes("RIGHT"));
    } else if (profile.isUalNative) {
      const upSide = aim === "UP-LEFT" || aim === "UP-RIGHT";
      const downSide = aim === "DOWN-LEFT" || aim === "DOWN-RIGHT";
      const up = aim === "UP";
      const down = aim === "DOWN";
      const select = (family, animationKeys, fallback) => this.miningCombo.select({
        family,
        direction: aim,
        animationKeys,
        fallback,
        targetTile,
        nowMs: time,
      });
      if (upSide) {
        key = select("up-side", profile.digUpSidewaysHitAnims, profile.digUpSidewaysAnim);
        sourceFacesRight = profile.digUpSidewaysSourceFacesRight !== false;
      } else if (downSide) {
        key = select("down-side", profile.digDownSidewaysHitAnims, profile.digDownAnim);
        sourceFacesRight = profile.digDownSourceFacesRight === true;
      } else if (up) {
        key = select("up", profile.digUpHitAnims, profile.digUpAnim);
        sourceFacesRight = profile.digUpSourceFacesRight === true;
      } else if (down) {
        key = select("down", profile.digDownHitAnims, profile.digDownAnim);
        sourceFacesRight = profile.digDownSourceFacesRight === true;
      } else {
        key = select("side", profile.digSidewaysHitAnims, profile.digSidewaysAnim);
        sourceFacesRight = profile.digSidewaysSourceFacesRight === true;
      }
      if (aim.includes("LEFT")) scene.player.setFlipX(sourceFacesRight);
      if (aim.includes("RIGHT")) scene.player.setFlipX(!sourceFacesRight);
      if (down && !downSide) {
        scene.player.setFlipX(!this.controller.playerController.isFacingRight());
      }
      if (up && !upSide) {
        scene.player.setFlipX(!this.controller.playerController.isFacingRight());
      }
    } else {
      const up = aim.includes("UP");
      const down = aim.includes("DOWN");
      key = up ? profile.digUpAnim : down ? profile.digDownAnim : profile.digSidewaysAnim;
      sourceFacesRight = up ? profile.digUpSourceFacesRight === true
        : down ? profile.digDownSourceFacesRight === true : profile.digSidewaysSourceFacesRight === true;
      if (aim.includes("LEFT")) scene.player.setFlipX(sourceFacesRight);
      if (aim.includes("RIGHT")) scene.player.setFlipX(!sourceFacesRight);
    }

    if (profile.isUalNative) {
      const kind = action === "quickslash" ? "quickslash" : "normal";
      return this._playUalAction(key, kind, abilities, onContact, { targetTile, direction });
    }
    this.controller._playAnim(key, time, CAVE_SCENE_CONFIG.feedback.actionHoldMs);
    return true;
  }
  updateThunderStrike(time, thunderPressed = false) {
    this.thunderStrikeRuntime.update(time, thunderPressed, (strike, contactTime) => {
      this.controller._applyThunderStrikeResult(strike, contactTime);
      return true;
    });
  }

  updateLocomotionVisual(time, deltaMs) {
    const controller = this.controller;
    if (this.thunderStrikeRuntime.isAnimating || this.timeline?.isActive || time < controller._actionUntilMs) return;
    const { scene } = controller;
    const profile = scene.playerAssetProfile || ASSET_KEYS.player;
    const motion = controller.playerController.getMotionState();
    const poweredFlight = controller.playerController.abilities.isFlying();
    const walking = motion === "walk-left" || motion === "walk-right";
    const body = controller.playerController.physicsBody;
    let flightTravel = false;
    let key;
    let selection = null;
    if (profile.isUalNative && this.locomotion) {
      const resolvedVerticalVelocity = scene.playerKinematicMotion?.getResolvedVelocityY?.() ?? body?.vy ?? 0;
      const bodyVerticalVelocity = body?.vy || 0;
      selection = this.locomotion.resolve({
        grounded: controller.playerController.isGrounded(),
        flying: poweredFlight || motion === "climb",
        horizontalVelocity: scene.playerKinematicMotion?.getResolvedVelocityX?.()
          ?? body?.vx
          ?? 0,
        verticalVelocity: Math.abs(bodyVerticalVelocity) > Math.abs(resolvedVerticalVelocity)
          ? bodyVerticalVelocity
          : resolvedVerticalVelocity,
        currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
        isPlaying: scene.player.anims.isPlaying === true,
        currentFrameIndex: scene.player.anims.currentFrame?.index ?? 0,
        facingFlipX: !controller.playerController.isFacingRight(),
        groundMovementActive: walking && Math.abs(body?.vx || 0) > 0,
      });
      key = selection.animationKey;
      flightTravel = selection.phase === "flight-travel-enter"
        || selection.phase === "flight-travel-loop";
      this.flightTravel = flightTravel;
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
    if (key && scene.anims.exists(key) && scene.player.anims.currentAnim?.key !== key) {
      scene.player.play(key, true);
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
    if (profile.isUalNative) {
      const velocityX = scene.playerKinematicMotion?.getResolvedVelocityX?.()
        ?? body?.vx
        ?? 0;
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
  }

  _playUalAction(key, kind, abilities, onContact, rigContext = null) {
    const controller = this.controller;
    const { scene } = controller;
    const profile = scene.playerAssetProfile;
    const animation = key ? scene.anims.get(key) : null;
    const contact = resolveUalActionContact(profile, key, kind);
    if (!animation || !contact || !this.timeline) return false;
    const timeScale = resolveUalActionTimeScale({
      frameCount: animation.frames?.length || 1,
      frameRate: animation.frameRate || 30,
      effectiveCooldownMs: controller.digSystem.getEffectiveCooldownMs(abilities),
      kind,
    });
    this._activeMiningActionKind = kind;
    this._contactAtMs = -Infinity;
    controller._actionUntilMs = Infinity;
    scene.playerRigContact?.beginAction({
      animationKey: key,
      contactSpec: contact,
      targetTile: rigContext?.targetTile,
      direction: rigContext?.direction,
    });
    this.timeline.begin({
      animationKey: key,
      contactFrame: contact.textureFrame,
      contactSequenceIndex: contact.sequenceIndex,
      onContact: (event) => {
        this._contactAtMs = scene.time?.now ?? 0;
        onContact?.(event);
      },
      onComplete: () => {
        controller._actionUntilMs = 0;
        this._activeMiningActionKind = null;
        this._contactAtMs = -Infinity;
        scene.player.anims.timeScale = 1;
        scene.playerRigContact?.endAction();
      },
    });
    scene.player.play(key, true);
    scene.player.setAngle?.(0);
    scene.player.anims.timeScale = timeScale;
    controller._applyPlayerDisplaySize();
    return true;
  }
  _cancelMiningRecovery(nowMs, abilities) {
    if (!this.canReplaceMiningRecovery(nowMs, abilities)) return false;
    this.timeline?.cancel();
    this.controller._actionUntilMs = 0;
    this._activeMiningActionKind = null;
    this._contactAtMs = -Infinity;
    this.controller.scene.player.anims.timeScale = 1;
    this.controller.scene.playerRigContact?.endAction();
    return true;
  }
}
