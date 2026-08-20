import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
  getThunderStrikeStage,
} from "../../values/thunderStrikeChain.js";
import {
  UAL_NATIVE_ACTION_TUNING,
  resolveUalActionContact,
} from "../../values/ualNativeActionTuning.js";
import { ThunderStrikeImpactFxSystem } from "../../systems/visual/ThunderStrikeImpactFxSystem.js";
import { ThunderStrikeTimingBarSystem } from "../../systems/visual/ThunderStrikeTimingBarSystem.js";
import { ThunderStrikeChainState } from "./ThunderStrikeChainState.js";

export class ThunderStrikeActionRuntime {
  constructor(scene, adapter = {}) {
    this.scene = scene;
    this.adapter = adapter;
    this.state = new ThunderStrikeChainState();
    this.timingBar = new ThunderStrikeTimingBarSystem(scene);
    this.impactFx = new ThunderStrikeImpactFxSystem(scene);
    this.animating = false;
    this.inputBufferedUntilMs = -Infinity;
    this.assetLoadPromise = null;
    this.holdUntilMs = 0;
    this.facingFlipX = null;
    this.destroyed = false;
  }

  get isAnimating() {
    return this.animating;
  }

  update(time, thunderPressed = false, onStrikeResult = null) {
    if (this.destroyed) return;
    const nowMs = Number.isFinite(time) ? time : 0;
    if (this.animating) {
      this._updateActive(nowMs, thunderPressed, onStrikeResult);
      const snapshot = this.animating ? this.state.getSnapshot(nowMs) : null;
      this.timingBar.update(snapshot, nowMs);
      return;
    }

    this.timingBar.update(null, nowMs);
    if (thunderPressed) {
      this.inputBufferedUntilMs = nowMs + (
        this.adapter.inputBufferMs
        ?? RETENTION_CONFIG.intentPreview.abilityInputBufferMs
      );
    }
    if (nowMs > this.inputBufferedUntilMs) {
      this.inputBufferedUntilMs = -Infinity;
      return;
    }
    if (!this._canStart(nowMs)) return;
    this._beginCharge(nowMs);
  }

  _updateActive(nowMs, thunderPressed, onStrikeResult) {
    const abilities = this._abilities();
    if (!abilities) {
      this._finish();
      return;
    }

    if (this.state.phase === THUNDER_STRIKE_CHAIN_PHASES.TIMING) {
      if (thunderPressed) {
        const presented = this.timingBar.getPresentedTimingSnapshot(
          this.state.challengeStageIndex,
        );
        if (!presented && this.timingBar.hasPresentation) return;
        const attempt = presented
          ? this.state.attemptContinuationAtProgress(presented.progress)
          : this.state.attemptContinuation(nowMs);
        if (!attempt.success) {
          this._breakChain(nowMs, attempt.snapshot);
          return;
        }
        const armed = abilities.armThunderStrikeFollowUp?.(
          attempt.stageIndex,
          attempt.snapshot.successfulContinuations,
        ) === true;
        if (!armed) {
          this._breakChain(nowMs, attempt.snapshot);
          return;
        }
        const stage = getThunderStrikeStage(attempt.stageIndex);
        this.timingBar.showFeedback(
          THUNDER_STRIKE_CHAIN_CONFIG.feedback.timingHitText,
          stage.visual.accentCss,
          nowMs,
          THUNDER_STRIKE_CHAIN_CONFIG.feedback.successLingerMs,
          attempt.snapshot,
        );
        this._startStrike(attempt.stageIndex, nowMs, onStrikeResult);
        return;
      }
      const timed = this.state.update(nowMs);
      if (timed.failed) this._breakChain(nowMs, timed.snapshot);
      return;
    }

    if (this.state.phase === THUNDER_STRIKE_CHAIN_PHASES.CHARGE) {
      if (abilities.updateThunderStrikeCharge(nowMs).complete) {
        this._startStrike(0, nowMs, onStrikeResult);
      }
      return;
    }

    if (
      this.state.phase === THUNDER_STRIKE_CHAIN_PHASES.STRIKE
      && this.holdUntilMs > 0
      && nowMs >= this.holdUntilMs
    ) {
      this.holdUntilMs = 0;
      this._completeSlam(nowMs);
    }
  }

  _beginCharge(nowMs) {
    const abilities = this._abilities();
    if (this._waitForAbilityAssets(abilities, nowMs)) return false;
    if (!abilities?.startThunderStrikeCharge?.(nowMs)) {
      this.inputBufferedUntilMs = -Infinity;
      const currentGp = Number(
        abilities?.getGemPowerExact?.()
          ?? abilities?.getGemPowerRaw?.()
          ?? abilities?.gemPower,
      );
      const requiredGp = Number(abilities?.getThunderStrikeCost?.());
      if (
        abilities?.isThunderStrikeUnlocked?.() === true
        && Number.isFinite(currentGp)
        && Number.isFinite(requiredGp)
        && currentGp < requiredGp
      ) {
        this.timingBar.showInsufficientGp(
          currentGp,
          requiredGp,
          nowMs,
          this.state.getSnapshot(nowMs),
        );
      }
      return false;
    }
    this.inputBufferedUntilMs = -Infinity;
    this.timingBar.clearFeedback();
    this.state.beginCharge(nowMs);
    this.animating = true;
    this.facingFlipX = this.scene.player?.flipX;
    this._setScenePhase(THUNDER_STRIKE_CHAIN_PHASES.CHARGE);
    this._setLocked(true);
    if (this.scene.player?.anims) this.scene.player.anims.timeScale = 1;
    this._playAnimation(this._profile().thunderStrikeChargeAnim);
    return true;
  }

  _waitForAbilityAssets(abilities, nowMs) {
    const controller = this.scene?.playerAbilityAssetController;
    if (
      abilities?.isThunderStrikeUnlocked?.() !== true
      || !controller
      || controller.isReady?.("thunderStrike") === true
    ) {
      return false;
    }
    this.inputBufferedUntilMs = Number.POSITIVE_INFINITY;
    if (!this.assetLoadPromise) {
      this.assetLoadPromise = Promise.resolve(controller.ensure?.(
        "thunderStrike",
        { interactive: true },
      ))
        .then((result) => {
          this.assetLoadPromise = null;
          if (this.destroyed) return;
          const ready = result?.ready === true
            || controller.isReady?.("thunderStrike") === true;
          const resumedAtMs = Number(this.scene?.time?.now) || nowMs;
          this.inputBufferedUntilMs = ready
            ? resumedAtMs + (
              this.adapter.inputBufferMs
              ?? RETENTION_CONFIG.intentPreview.abilityInputBufferMs
            )
            : -Infinity;
        })
        .catch(() => {
          this.assetLoadPromise = null;
          this.inputBufferedUntilMs = -Infinity;
        });
    }
    return true;
  }

  _startStrike(stageIndex, nowMs, onStrikeResult) {
    if (!this.state.markSlamStarted(stageIndex, nowMs)) {
      this._finish();
      return false;
    }
    const scene = this.scene;
    const profile = this._profile();
    const key = profile.thunderStrikeStrikeAnim || ASSET_KEYS.player.thunderStrikeStrikeAnim;
    const timeline = this._timeline();
    const contactSpec = resolveUalActionContact(profile, key, "thunderstrike");
    let contactResolved = false;
    const executeAtContact = () => {
      if (contactResolved) return true;
      contactResolved = true;
      const strike = this._abilities()?.executeThunderStrike?.(stageIndex);
      if (!strike?.success) {
        this._finish();
        return false;
      }
      const applied = onStrikeResult?.(strike, scene.time?.now ?? nowMs);
      if (applied === false) {
        this._finish();
        return false;
      }
      this.impactFx.play(strike, scene.player, stageIndex);
      return true;
    };

    this._setScenePhase(THUNDER_STRIKE_CHAIN_PHASES.STRIKE);
    this.holdUntilMs = 0;
    const hasAuthoredTimeline = Boolean(
      profile.isUalNative
      && timeline
      && contactSpec
      && (!scene.anims?.exists || scene.anims.exists(key)),
    );
    if (hasAuthoredTimeline) {
      scene.playerRigContact?.beginAction?.({
        animationKey: key,
        contactSpec,
      });
      timeline.begin({
        animationKey: key,
        contactFrame: contactSpec.textureFrame,
        contactSequenceIndex: contactSpec.sequenceIndex,
        onContact: executeAtContact,
        onComplete: () => this._completeSlam(scene.time?.now ?? nowMs),
      });
      this._playAnimation(key);
      return true;
    }

    if (!executeAtContact()) return false;
    this._playAnimation(key);
    this.holdUntilMs = nowMs + (
      this.adapter.holdMs
      ?? UAL_NATIVE_ACTION_TUNING.thunderStrike.holdMs
    );
    return true;
  }

  _completeSlam(nowMs) {
    if (!this.animating || this.state.phase !== THUNDER_STRIKE_CHAIN_PHASES.STRIKE) return;
    this.scene.playerRigContact?.endAction?.();
    const continuation = this.state.beginContinuation(nowMs);
    if (continuation.complete) {
      const finalStage = getThunderStrikeStage(this.state.currentStageIndex);
      this.timingBar.showFeedback(
        THUNDER_STRIKE_CHAIN_CONFIG.feedback.finalHitText,
        finalStage.visual.accentCss,
        nowMs,
        THUNDER_STRIKE_CHAIN_CONFIG.feedback.finalLingerMs,
        continuation.snapshot,
      );
      this._finish();
      return;
    }
    this._setScenePhase(THUNDER_STRIKE_CHAIN_PHASES.TIMING);
    this.timingBar.update(continuation.snapshot, nowMs);
  }

  _breakChain(nowMs, snapshot) {
    this.timingBar.showFeedback(
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.chainBrokenText,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.dangerColor,
      nowMs,
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.failureLingerMs,
      snapshot,
    );
    this.scene.hudSystem?.flashStatus?.(
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.chainBrokenText,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.dangerColor,
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.failureLingerMs,
    );
    this._finish();
  }

  cancel(nowMs = this.scene?.time?.now ?? 0) {
    if (!this.animating) return false;
    const snapshot = {
      ...this.state.getSnapshot(nowMs),
      phase: THUNDER_STRIKE_CHAIN_PHASES.FAILED,
    };
    this.timingBar.showFeedback(
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.cancelledText,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.mutedColor,
      nowMs,
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.cancelLingerMs,
      snapshot,
    );
    this._finish();
    return true;
  }

  _finish({ restoreVisuals = true } = {}) {
    if (!this.scene || !this.adapter) {
      this.animating = false;
      this.holdUntilMs = 0;
      this.facingFlipX = null;
      this.state?.reset?.();
      return;
    }
    this._timeline()?.cancel?.();
    this._abilities()?.cancelThunderStrikeChain?.();
    this.scene.playerRigContact?.endAction?.();
    this.animating = false;
    this.holdUntilMs = 0;
    this._setScenePhase(null);
    this._setLocked(false);
    if (this.scene.player?.anims) this.scene.player.anims.timeScale = 1;
    if (typeof this.facingFlipX === "boolean") this.scene.player?.setFlipX?.(this.facingFlipX);
    this.facingFlipX = null;
    this.scene.pickaxeTrailSystem?.stop?.();
    if (restoreVisuals && !this.scene._isShuttingDown && this.scene.player?.anims) {
      if (this.adapter.resetVisuals) this.adapter.resetVisuals();
      else this.scene.updatePlayerVisualState?.(true);
    }
    this.state.reset();
  }

  _profile() {
    return this.adapter.getProfile?.()
      || this.scene.playerAssetProfile
      || ASSET_KEYS.player;
  }

  _abilities() {
    return this.adapter.getAbilities?.()
      || this.scene.playerController?.abilities;
  }

  _timeline() {
    return this.adapter.getTimeline?.()
      || this.scene.ualActionContactTimeline;
  }

  _canStart(nowMs) {
    if (this.adapter.canStart) return this.adapter.canStart(nowMs) === true;
    return !this.scene.isDigAnimating && !this.scene._teleportInAnimating;
  }

  _setLocked(locked) {
    if (this.adapter.setLocked) {
      this.adapter.setLocked(locked);
      return;
    }
    this.scene.isDigAnimating = locked;
  }

  _setScenePhase(phase) {
    this.scene._thunderStrikeAnimating = phase !== null;
    this.scene._thunderStrikePhase = phase;
    this.scene._thunderStrikeFacingFlipX = this.facingFlipX;
  }

  _playAnimation(key) {
    if (!key || !this.scene.player) return;
    if (!this.scene.anims?.exists || this.scene.anims.exists(key)) {
      this.scene.player.play?.(key, true);
    }
    const profile = this._profile();
    const displaySize = profile.displaySizePx || this.scene.config?.playerDisplaySizePx;
    if (displaySize) this.scene.player.setDisplaySize?.(displaySize, displaySize);
    if (this.scene.player.anims) this.scene.player.anims.timeScale = 1;
    this.adapter.afterPlayAnimation?.(key);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.assetLoadPromise = null;
    this._finish({ restoreVisuals: false });
    this.timingBar?.destroy?.();
    this.impactFx?.destroy?.();
    this.scene = null;
    this.adapter = null;
  }
}
