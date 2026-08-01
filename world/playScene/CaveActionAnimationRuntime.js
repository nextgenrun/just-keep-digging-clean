/** Owns cave-only character action timing, authored UAL contacts, and flight animation selection. */
import { UalActionContactTimeline } from "../../player/UalActionContactTimeline.js";
import { UalMiningComboSelector } from "../../player/UalMiningComboSelector.js";
import { resolveMovingDiagonalDigAnimation } from "../../player/UalMovingDiagonalDigSelector.js";
import { resolveMovingSideDigAnimation } from "../../player/UalMovingSideDigSelector.js";
import { UalActionRecoverySelector } from "../../systems/visual/UalActionRecoverySelector.js";
import { UalNativeLocomotionTransitionSelector } from "../../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { UalWallBraceSelector } from "../../systems/visual/UalWallBraceSelector.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { PLAYER_MOTION_POLISH_CONFIG } from "../../values/playerMotionPolish.js";
import {
  normalizeHorizontalDirection,
  resolveAuthoredHorizontalFlipX,
} from "../../player/playerDirectionalTargets.js";
import { updateCaveLocomotionVisual } from "./CaveLocomotionAnimationRuntime.js";
import { ThunderStrikeActionRuntime } from "./ThunderStrikeActionRuntime.js";
import {
  UAL_NATIVE_ACTION_TUNING, resolveUalActionContact, resolveUalActionTimeScale,
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
    this._resumeJogFrame = null;
    this.actionRecovery = null;
    this.wallBrace = null;
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
      this.actionRecovery = new UalActionRecoverySelector(scene.playerAssetProfile);
      this.wallBrace = new UalWallBraceSelector(
        scene.playerAssetProfile,
        PLAYER_MOTION_POLISH_CONFIG,
      );
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
    this._resumeJogFrame = null;
    this.actionRecovery?.reset();
    this.actionRecovery = null;
    this.wallBrace?.reset();
    this.wallBrace = null;
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
      const aimDirectionX = aim.includes("LEFT") ? -1 : aim.includes("RIGHT") ? 1 : 0;
      const directionX = normalizeHorizontalDirection(
        abilities?.getQuickslashDirection?.() ?? direction?.x ?? aimDirectionX,
        this.controller.playerController.isFacingRight(),
      );
      scene.player.setFlipX(resolveAuthoredHorizontalFlipX(directionX, sourceFacesRight));
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
      const movingSideDig = resolveMovingSideDigAnimation({
        profile,
        animationKey: key,
        aim,
        actionKind: kind,
        grounded: this.controller.playerController?.isGrounded?.() === true,
        motionState: this.controller.playerController?.getMotionState?.(),
        horizontalVelocity: this.controller.playerController?.physicsBody?.vx
          ?? scene.player?.body?.velocity?.x
          ?? 0,
        currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
        currentFrameIndex: scene.player.anims.currentFrame?.index ?? 0,
        currentTextureFrame: Number(scene.player.anims.currentFrame?.textureFrame),
      });
      key = movingSideDig.animationKey;
      const movingDiagonalDig = resolveMovingDiagonalDigAnimation({
        profile,
        animationKey: key,
        aim,
        actionKind: kind,
        grounded: this.controller.playerController?.isGrounded?.() === true,
        motionState: this.controller.playerController?.getMotionState?.(),
        horizontalVelocity: this.controller.playerController?.physicsBody?.vx
          ?? scene.player?.body?.velocity?.x
          ?? 0,
        currentAnimationKey: scene.player.anims.currentAnim?.key ?? null,
        currentFrameIndex: scene.player.anims.currentFrame?.index ?? 0,
        currentTextureFrame: Number(scene.player.anims.currentFrame?.textureFrame),
      });
      key = movingDiagonalDig.animationKey;
      return this._playUalAction(key, kind, abilities, onContact, {
        targetTile,
        direction,
        resumeJogFrame: movingDiagonalDig.resumeJogFrame ?? movingSideDig.resumeJogFrame,
        movingSideDigActive: movingSideDig.movingSideDigActive,
        standOffDirectionX: movingSideDig.targetDirectionX,
      });
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
  cancelThunderStrike(time) {
    return this.thunderStrikeRuntime.cancel(time);
  }
  updateLocomotionVisual(time, deltaMs) {
    updateCaveLocomotionVisual(this, time, deltaMs);
  }

  _playUalAction(key, kind, abilities, onContact, rigContext = null) {
    const controller = this.controller;
    const { scene } = controller;
    const profile = scene.playerAssetProfile;
    const animation = key ? scene.anims.get(key) : null;
    const contact = resolveUalActionContact(profile, key, kind);
    if (!animation || !contact || !this.timeline) return false;
    this.actionRecovery?.reset();
    const timeScale = resolveUalActionTimeScale({
      frameCount: animation.frames?.length || 1,
      frameRate: animation.frameRate || 30,
      effectiveCooldownMs: controller.digSystem.getEffectiveCooldownMs(abilities),
      kind,
    });
    this._activeMiningActionKind = kind;
    this._contactAtMs = -Infinity;
    this._resumeJogFrame = Number.isFinite(rigContext?.resumeJogFrame)
      ? rigContext.resumeJogFrame
      : null;
    controller._actionUntilMs = Infinity;
    scene.player.play(key, true);
    controller._applyPlayerDisplaySize();
    scene.player.setAngle?.(0);
    scene.player.anims.timeScale = timeScale;
    controller.playerController?._syncSpriteWithPhysics?.();
    scene.playerRigContact?.beginAction({
      animationKey: key,
      contactSpec: contact,
      targetTile: rigContext?.targetTile,
      direction: rigContext?.direction,
    });
    if (rigContext?.movingSideDigActive === true) {
      controller.playerController?.beginMovingSideDigStandOff?.({
        targetTile: rigContext.targetTile,
        directionX: rigContext.standOffDirectionX,
      });
    }
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
        const resumeJogFrame = this._resumeJogFrame;
        this._resumeJogFrame = null;
        const motion = controller.playerController?.getMotionState?.();
        const moving = motion === "walk-left" || motion === "walk-right";
        if (Number.isFinite(resumeJogFrame) && moving) {
          this.locomotion?.requestRunResume(resumeJogFrame);
        } else {
          this.actionRecovery?.begin(key, scene.player.flipX === true);
        }
      },
    });
    return true;
  }
  _cancelMiningRecovery(nowMs, abilities) {
    if (!this.canReplaceMiningRecovery(nowMs, abilities)) return false;
    this.timeline?.cancel();
    this.controller._actionUntilMs = 0;
    this._activeMiningActionKind = null;
    this._contactAtMs = -Infinity;
    this._resumeJogFrame = null;
    this.actionRecovery?.reset();
    this.controller.scene.player.anims.timeScale = 1;
    this.controller.scene.playerRigContact?.endAction();
    return true;
  }
}
