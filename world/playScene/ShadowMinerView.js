import { SHADOW_MINER_CONFIG } from "../../values/shadowMiner.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

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
    this.echoFading = false;
    this.activeTweens = new Set();
    this.reducedMotion = globalThis.matchMedia?.(
      config.visual.reducedMotionMediaQuery,
    )?.matches === true;
  }

  spawn({ pose, visualIntensity = 1 }) {
    this.hide();
    if (!pose?.textureKey || !this.scene?.textures?.exists?.(pose.textureKey)) {
      return false;
    }
    this.visualIntensity = Math.max(0, Number(visualIntensity) || 0);
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
    this._syncEcho(0);
    this.echo.setAlpha(0);

    const targetScaleX = this.primary.scaleX;
    const targetScaleY = this.primary.scaleY;
    const spawnScale = this.reducedMotion
      ? 1
      : this.config.visual.spawnScaleMultiplier;
    this.primary.setScale(targetScaleX * spawnScale, targetScaleY * spawnScale);
    this._tween({
      targets: this.primary,
      alpha: this._targetAlpha(this.config.visual.alpha),
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: this.reducedMotion ? 0 : this.config.timing.spawnMs,
      ease: "Sine.Out",
    });
    this.echoFading = true;
    this._tween({
      targets: this.echo,
      alpha: this._targetAlpha(this.config.visual.echoAlpha),
      duration: this.reducedMotion ? 0 : this.config.timing.spawnMs,
      ease: "Sine.Out",
      onComplete: () => {
        this.echoFading = false;
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
    this._syncEcho(0);
    return true;
  }

  facePlayer(playerWorldX) {
    if (!this.primary || !Number.isFinite(playerWorldX)) return;
    this.primary.setFlipX(playerWorldX < this.anchor.x);
    this.echo?.setFlipX?.(this.primary.flipX);
  }

  setFleeing(fleeing) {
    this.fleeing = fleeing === true;
  }

  update(time) {
    if (!this.primary || !this.echo || !this.anchor) return;
    const phase = (time / this.config.visual.hoverCycleMs) * Math.PI * 2;
    const hover = this.reducedMotion
      ? 0
      : Math.sin(phase) * this.config.visual.hoverAmplitudePx;
    this.primary.setPosition(this.anchor.x, this.anchor.y + hover);
    this.echo.setPosition(
      this.anchor.x + this.config.visual.echoOffsetXPx,
      this.anchor.y + hover + this.config.visual.echoOffsetYPx,
    );
    this._syncEcho(phase);
  }

  vanish() {
    if (!this.primary || !this.echo) return;
    this.vanishing = true;
    this.echoFading = true;
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

  hide() {
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
    this.echoFading = false;
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
      worldX: this.primary?.x || 0,
      worldY: this.primary?.y || 0,
    });
  }

  destroy() {
    this.hide();
    this.scene = null;
  }

  _targetAlpha(baseAlpha) {
    return clamp01(baseAlpha * this.visualIntensity);
  }

  _syncEcho(phase) {
    if (!this.primary || !this.echo) return;
    const frameName = this.primary.frame?.name;
    this.echo.setTexture(this.primary.texture.key, frameName);
    this.echo.setOrigin(this.primary.originX, this.primary.originY);
    this.echo.setFlipX(this.primary.flipX);
    this.echo.setScale(
      this.primary.scaleX * this.config.visual.echoScale,
      this.primary.scaleY * this.config.visual.echoScale,
    );
    const pulse = this.reducedMotion
      ? 0
      : Math.sin(phase) * this.config.visual.echoPulseAlpha;
    if (!this.vanishing && !this.echoFading) {
      this.echo.setAlpha(this._targetAlpha(this.config.visual.echoAlpha + pulse));
    }
  }

  _tween(config) {
    if (!this.scene?.tweens?.add || config.duration <= 0) {
      const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
      for (const target of targets) {
        for (const [key, value] of Object.entries(config)) {
          if (!["targets", "duration", "ease", "onComplete"].includes(key)) {
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
