import { SHADOW_MINER_CONFIG } from "../../values/shadowMiner.js";
import { ShadowMinerResidueTrail } from "./ShadowMinerResidueTrail.js";
import { ShadowMinerPhantomDigView } from "./ShadowMinerPhantomDigView.js";
import {
  clampShadowMinerAlpha,
  mixShadowMinerColor,
  resolveShadowMinerEchoPresentation,
  resolveShadowMinerRecoilTint,
} from "./shadowMinerViewPresentation.js";

export class ShadowMinerView {
  constructor(scene, config = SHADOW_MINER_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.primary = null;
    this.echo = null;
    this.anchor = null;
    this.currentPose = null;
    this.visualIntensity = 1;
    this.vanishing = false;
    this.fleeing = false;
    this.observing = false;
    this.echoFading = false;
    this.arrivalStartedAtMs = 0;
    this.observeStartedAtMs = 0;
    this.recoilStartedAtMs = 0;
    this.fleeRepellent = null;
    this.lightPressure = 0;
    this.lightSource = null;
    this.lightExposureProgress = 0;
    this.activeTweens = new Set();
    this.reducedMotion = globalThis.matchMedia?.(
      config.visual.reducedMotionMediaQuery,
    )?.matches === true;
    this.residueTrail = new ShadowMinerResidueTrail(scene, config);
    this.phantomDig = new ShadowMinerPhantomDigView(scene, config);
  }

  spawn({ pose, visualIntensity = 1, time = this.scene?.time?.now || 0 }) {
    this.hide();
    if (!pose?.textureKey || !this.scene?.textures?.exists?.(pose.textureKey)) {
      return false;
    }
    this.visualIntensity = Math.max(0, Number(visualIntensity) || 0);
    this.arrivalStartedAtMs = time;
    this.anchor = { x: pose.x, y: pose.y };
    this.primary = this.scene.add.sprite(
      pose.x,
      pose.y,
      pose.textureKey,
      pose.frameName,
    );
    this.echo = this.scene.add.sprite(
      pose.x,
      pose.y,
      pose.textureKey,
      pose.frameName,
    );
    this.primary.setTintFill(this.config.visual.tint);
    this.echo.setTintFill(this.config.visual.echoTint);
    this.echo.setBlendMode("ADD");
    this.primary.setDepth(this.config.visual.depth);
    this.echo.setDepth(this.config.visual.echoDepth);
    this.primary.setAlpha(0);
    this.echo.setAlpha(0);
    this.applyPose(pose);
    this._syncEcho(0, time);
    this.echo.setAlpha(0);

    const targetScaleX = this.primary.scaleX;
    const targetScaleY = this.primary.scaleY;
    const spawnScale = this.reducedMotion
      ? 1
      : this.config.visual.spawnScaleMultiplier;
    this.primary.setScale(targetScaleX * spawnScale, targetScaleY * spawnScale);
    const tellLeadMs = this.reducedMotion
      ? 0
      : this.config.timing.arrivalTellLeadMs;
    this._tween({
      targets: this.primary,
      alpha: this._targetAlpha(this.config.visual.alpha),
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      delay: tellLeadMs,
      duration: this.reducedMotion
        ? 0
        : this.config.timing.spawnMs - tellLeadMs,
      ease: "Sine.Out",
    });
    this.echoFading = true;
    this._tween({
      targets: this.echo,
      alpha: this._targetAlpha(this.config.visual.arrivalEchoAlpha),
      duration: tellLeadMs,
      ease: "Sine.Out",
      onComplete: () => {
        this._tween({
          targets: this.echo,
          alpha: this._targetAlpha(this.config.visual.echoAlpha),
          duration: this.reducedMotion
            ? 0
            : this.config.timing.spawnMs - tellLeadMs,
          ease: "Sine.InOut",
          onComplete: () => {
            this.echoFading = false;
          },
        });
      },
    });
    return true;
  }

  applyPose(pose) {
    if (!this.primary || !pose?.textureKey) return false;
    if (!this.scene?.textures?.exists?.(pose.textureKey)) return false;
    this.currentPose = { ...pose };
    this.anchor.x = pose.x;
    this.anchor.y = pose.y;
    this.primary.setPosition(pose.x, pose.y);
    this.echo?.setPosition?.(
      pose.x + this.config.visual.echoOffsetXPx,
      pose.y + this.config.visual.echoOffsetYPx,
    );
    this.primary.setTexture(pose.textureKey, pose.frameName);
    this.primary.setOrigin(pose.originX, pose.originY);
    this.primary.setDisplaySize(
      pose.displayWidth * this.config.visual.scaleMultiplier,
      pose.displayHeight * this.config.visual.scaleMultiplier,
    );
    this.primary.setFlipX(pose.flipX === true);
    if (!this.fleeing) {
      this.phantomDig.applyPose(pose, this.scene?.time?.now || 0);
    }
    this._syncEcho(0, this.scene?.time?.now || 0);
    return true;
  }

  facePlayer(playerWorldX) {
    if (!this.primary || !Number.isFinite(playerWorldX)) return;
    this.primary.setFlipX(playerWorldX < this.anchor.x);
    this.echo?.setFlipX?.(this.primary.flipX);
  }

  beginObserve(time, playerWorldX) {
    this.observing = true;
    this.observeStartedAtMs = time;
    this.facePlayer(playerWorldX);
  }

  applyAnchoredActionPose(pose) {
    if (!this.anchor || !pose) return false;
    return this.applyPose({
      ...pose,
      x: this.anchor.x,
      y: this.anchor.y,
      tileX: this.currentPose?.tileX ?? pose.tileX,
      tileY: this.currentPose?.tileY ?? pose.tileY,
    });
  }

  setLightExposure({ pressure = 0, source = null, progress = 0 } = {}) {
    this.lightPressure = clampShadowMinerAlpha(pressure);
    this.lightExposureProgress = clampShadowMinerAlpha(progress);
    this.lightSource = this.lightPressure > 0 ? source : null;
  }

  beginFlee({ time, repellent, playerWorldX }) {
    this.observing = false;
    this.fleeing = true;
    this.fleeRepellent = repellent;
    this.recoilStartedAtMs = time;
    this.phantomDig.cancelAction({ breakBlock: true });
    this.faceAwayFromPlayer(playerWorldX);
  }

  applyFleePose(pose, time, playerWorldX) {
    const previousX = this.anchor?.x;
    if (this.applyPose(pose) === false) return false;
    const deltaX = Number.isFinite(previousX) ? pose.x - previousX : 0;
    if (Math.abs(deltaX) >= this.config.visual.fleeFacingMinimumDeltaPx) {
      this.primary.setFlipX(deltaX < 0);
      this.echo?.setFlipX?.(this.primary.flipX);
    } else {
      this.faceAwayFromPlayer(playerWorldX);
    }
    this.residueTrail.stamp(this.primary, time, this.fleeRepellent);
    return true;
  }

  faceAwayFromPlayer(playerWorldX) {
    if (!this.primary || !Number.isFinite(playerWorldX)) return;
    this.primary.setFlipX(playerWorldX >= this.anchor.x);
    this.echo?.setFlipX?.(this.primary.flipX);
  }

  setFleeing(fleeing) {
    this.fleeing = fleeing === true;
    if (!this.fleeing) this.fleeRepellent = null;
  }

  update(time) {
    this.phantomDig.update(time);
    if (!this.primary || !this.echo || !this.anchor) return;
    const phase = (time / this.config.visual.hoverCycleMs) * Math.PI * 2;
    const hover = this.reducedMotion
      ? 0
      : Math.sin(phase) * this.config.visual.hoverAmplitudePx
        * (this.observing ? this.config.visual.observeHoverMultiplier : 1);
    const lightPhase = (time / this.config.visual.lightExposureJitterCycleMs)
      * Math.PI * 2;
    const lightJitter = this.reducedMotion
      ? 0
      : Math.sin(lightPhase) * this.config.visual.lightExposureJitterPx
        * this.lightPressure;
    this.primary.setPosition(this.anchor.x + lightJitter, this.anchor.y + hover);
    this.echo.setPosition(
      this.anchor.x + lightJitter + this.config.visual.echoOffsetXPx,
      this.anchor.y + hover + this.config.visual.echoOffsetYPx,
    );
    const recoilElapsedMs = time - this.recoilStartedAtMs;
    const recoiling = this.fleeing
      && recoilElapsedMs >= 0
      && recoilElapsedMs < this.config.timing.lightRecoilMs;
    const responseSource = this.fleeRepellent || this.lightSource;
    const responseTint = resolveShadowMinerRecoilTint(this.config, responseSource);
    this.primary.setTintFill(recoiling
      ? responseTint
      : mixShadowMinerColor(
        this.config.visual.tint,
        responseTint,
        this.lightPressure * this.config.visual.lightExposureTintBlend,
      ));
    this._syncEcho(phase, time);
  }

  vanish() {
    if (!this.primary || !this.echo) return;
    this.vanishing = true;
    this.observing = false;
    this.echoFading = true;
    this.phantomDig.cancelAction({ breakBlock: true });
    const vanishScale = this.config.visual.vanishScaleMultiplier;
    this._tween({
      targets: this.primary,
      alpha: 0,
      scaleX: this.primary.scaleX * vanishScale,
      scaleY: this.primary.scaleY * vanishScale,
      duration: this.reducedMotion ? 0 : this.config.timing.vanishMs,
      ease: "Sine.In",
    });
    this._tween({
      targets: this.echo,
      alpha: 0,
      duration: this.reducedMotion ? 0 : this.config.timing.vanishMs,
      ease: "Sine.In",
    });
  }

  hide({ preserveResidue = false } = {}) {
    for (const tween of this.activeTweens) {
      tween.stop?.();
      tween.remove?.();
    }
    this.activeTweens.clear();
    this.primary?.destroy?.();
    this.echo?.destroy?.();
    this.primary = null;
    this.echo = null;
    this.anchor = null;
    this.currentPose = null;
    this.visualIntensity = 1;
    this.vanishing = false;
    this.fleeing = false;
    this.observing = false;
    this.echoFading = false;
    this.arrivalStartedAtMs = 0;
    this.observeStartedAtMs = 0;
    this.recoilStartedAtMs = 0;
    this.fleeRepellent = null;
    this.lightPressure = 0;
    this.lightSource = null;
    this.lightExposureProgress = 0;
    this.phantomDig.clear();
    if (!preserveResidue) this.residueTrail.clear();
  }

  getSnapshot() {
    return Object.freeze({
      visible: Boolean(this.primary?.visible && this.primary?.active !== false),
      textureKey: this.primary?.texture?.key || null,
      frameName: this.primary?.frame?.name ?? null,
      animationKey: this.currentPose?.animationKey || null,
      displayWidth: this.primary?.displayWidth || 0,
      displayHeight: this.primary?.displayHeight || 0,
      alpha: this.primary?.alpha || 0,
      renderMode: this.config.visual.renderMode,
      visualIntensity: this.visualIntensity,
      fleeing: this.fleeing,
      observing: this.observing,
      flipX: this.primary?.flipX === true,
      recoilActive: this.fleeing
        && (this.scene?.time?.now || 0) - this.recoilStartedAtMs >= 0
        && (this.scene?.time?.now || 0) - this.recoilStartedAtMs
          < this.config.timing.lightRecoilMs,
      lightReacting: this.lightPressure > 0,
      lightPressure: this.lightPressure,
      lightSource: this.lightSource,
      lightExposureProgress: this.lightExposureProgress,
      residue: this.residueTrail.getSnapshot(),
      phantomDig: this.phantomDig.getSnapshot(),
      worldX: this.primary?.x || 0,
      worldY: this.primary?.y || 0,
    });
  }

  destroy() {
    this.hide();
    this.residueTrail.destroy();
    this.phantomDig.destroy();
    this.scene = null;
  }

  _targetAlpha(baseAlpha) {
    return clampShadowMinerAlpha(baseAlpha * this.visualIntensity);
  }

  _syncEcho(phase, time) {
    if (!this.primary || !this.echo) return;
    const frameName = this.primary.frame?.name;
    this.echo.setTexture(this.primary.texture.key, frameName);
    this.echo.setOrigin(this.primary.originX, this.primary.originY);
    this.echo.setFlipX(this.primary.flipX);
    const echoPresentation = resolveShadowMinerEchoPresentation({
      config: this.config,
      time,
      arrivalStartedAtMs: this.arrivalStartedAtMs,
      observeStartedAtMs: this.observeStartedAtMs,
      recoilStartedAtMs: this.recoilStartedAtMs,
      observing: this.observing,
      fleeing: this.fleeing,
      lightPressure: this.lightPressure,
    });
    this.echo.setScale(
      this.primary.scaleX * echoPresentation.scale,
      this.primary.scaleY * echoPresentation.scale,
    );
    const pulse = this.reducedMotion
      ? 0
      : Math.sin(phase) * this.config.visual.echoPulseAlpha;
    if (!this.vanishing && !this.echoFading) {
      this.echo.setAlpha(this._targetAlpha(echoPresentation.alpha + pulse));
    }
  }

  _tween(config) {
    if (!this.scene?.tweens?.add || config.duration <= 0) {
      const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
      for (const target of targets) {
        for (const [key, value] of Object.entries(config)) {
          if (!["targets", "delay", "duration", "ease", "onComplete"].includes(key)) {
            target[key] = value;
          }
        }
      }
      config.onComplete?.();
      return null;
    }
    let tween = null;
    const onComplete = config.onComplete;
    tween = this.scene.tweens.add({
      ...config,
      onComplete: (...args) => {
        this.activeTweens.delete(tween);
        onComplete?.(...args);
      },
    });
    this.activeTweens.add(tween);
    return tween;
  }
}
