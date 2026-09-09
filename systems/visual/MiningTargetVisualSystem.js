import {
  MINING_TARGET_FEEDBACK_CONFIG,
  resolveMiningTargetVisualsEnabled,
} from "../../values/miningTargetFeedback.js";

import { TargetTileHudView } from "./TargetTileHudView.js";

export class MiningTargetVisualSystem {
  constructor(scene, config = MINING_TARGET_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.authoredVisualEnabled = resolveMiningTargetVisualsEnabled();
    this.root = null;
    this.image = null;
    this.glowImage = null;
    this.displaySize = 0;
    this.interactionMode = "hidden";
    this.lastTargetKey = "";
    this.targetChangedAtMs = 0;
    this._diagnostics = null;

    this._create();
    this.targetHud = new TargetTileHudView(scene);
    this._publishDiagnostics();
  }

  _create() {
    this.root = this.scene.add.container(0, 0);
    const canCreateAuthoredImage = this.authoredVisualEnabled
      && typeof this.scene.add?.image === "function";

    if (canCreateAuthoredImage) {
      const tileSize = this.scene.config.tileSize;
      this.displaySize = tileSize * this.config.visual.displayTiles;
      this.glowImage = this.scene.add
        .image(0, 0, this.config.asset.key)
        .setOrigin(0.5)
        .setDisplaySize(this.displaySize, this.displaySize);
      this.image = this.scene.add
        .image(0, 0, this.config.asset.key)
        .setOrigin(0.5)
        .setDisplaySize(this.displaySize, this.displaySize);
      this.root.add([this.glowImage, this.image]);
    } else {
      this.authoredVisualEnabled = false;
      const fallback = this.scene.add
        .rectangle(0, 0, this.scene.config.tileSize, this.scene.config.tileSize)
        .setStrokeStyle(
          this.config.visual.fallbackStrokeWidthPx,
          this.config.visual.fallbackStrokeColor,
          this.config.visual.fallbackStrokeAlpha,
        )
        .setFillStyle(
          this.config.visual.fallbackFillColor,
          this.config.visual.fallbackFillAlpha,
        );
      this.root.add(fallback);
    }

    this.root
      .setDepth(this.config.visual.depth)
      .setVisible(false);
  }

  update(
    targetTile,
    shouldShow,
    feedbackState = null,
    timeMs = this.scene.time?.now || 0,
  ) {
    if (!this.root) return;
    this.targetHud.setTarget(targetTile, shouldShow);
    if (!shouldShow || !targetTile) {
      this.lastTargetKey = "";
      this.interactionMode = "hidden";
      this.root.setVisible(false);
      return;
    }

    const targetKey = `${targetTile.tx},${targetTile.ty}`;
    if (targetKey !== this.lastTargetKey) {
      this.lastTargetKey = targetKey;
      this.targetChangedAtMs = timeMs;
      const position = this.scene.worldModel.tileToWorld(targetTile.tx, targetTile.ty);
      this.root.setPosition(position.x, position.y);
    }

    if (this.authoredVisualEnabled) {
      this._updateAuthoredMotion(timeMs, feedbackState);
    }
    this.root.setVisible(true);
  }

  _updateAuthoredMotion(timeMs, feedbackState) {
    const visual = this.config.visual;
    const isActive = feedbackState?.source === "mouse"
      && (feedbackState.mouseHeld === true || feedbackState.mouseRequested === true);
    const pulsePeriodMs = isActive
      ? visual.activePulsePeriodMs
      : visual.pulsePeriodMs;
    const pulseAngle = (timeMs % pulsePeriodMs) / pulsePeriodMs * Math.PI * 2;
    const pulse = Math.sin(pulseAngle);
    const acquireProgress = Math.min(
      1,
      Math.max(0, (timeMs - this.targetChangedAtMs) / visual.acquireDurationMs),
    );
    const acquireScale = visual.acquireStartScale
      + (1 - visual.acquireStartScale) * acquireProgress;

    const scaleBase = isActive ? visual.activeScale : 1;
    const scalePulse = isActive ? visual.activeScalePulse : visual.scalePulse;
    const alphaBase = isActive ? visual.activeAlphaBase : visual.alphaBase;
    const alphaPulse = isActive ? visual.activeAlphaPulse : visual.alphaPulse;
    const glowScaleBase = isActive
      ? visual.activeGlowScaleBase
      : visual.glowScaleBase;
    const glowScalePulse = isActive
      ? visual.activeGlowScalePulse
      : visual.glowScalePulse;
    const glowAlphaBase = isActive
      ? visual.activeGlowAlphaBase
      : visual.glowAlphaBase;
    const glowAlphaPulse = isActive
      ? visual.activeGlowAlphaPulse
      : visual.glowAlphaPulse;

    const motionScale = acquireScale * scaleBase * (1 + pulse * scalePulse);
    const glowScale = glowScaleBase + pulse * glowScalePulse;
    this.root.setScale(motionScale);
    this.image?.setAlpha(alphaBase + pulse * alphaPulse);
    this.glowImage
      ?.setDisplaySize(this.displaySize * glowScale, this.displaySize * glowScale)
      .setAlpha(glowAlphaBase + pulse * glowAlphaPulse);
    this.interactionMode = isActive ? "held" : "hover";
  }

  setVisible(visible) {
    this.root?.setVisible(Boolean(visible));
    if (!visible) this.targetHud.setTarget(null, false);
  }

  snapshot() {
    return Object.freeze({
      authoredVisualEnabled: this.authoredVisualEnabled,
      visible: this.root?.visible === true,
      targetKey: this.lastTargetKey,
      textureKey: this.image?.texture?.key || null,
      interactionMode: this.interactionMode,
    });
  }

  _publishDiagnostics() {
    if (!globalThis.window) return;
    const key = this.config.diagnostics.globalKey;
    this._diagnostics = Object.freeze({
      snapshot: () => this.snapshot(),
    });
    globalThis.window[key] = this._diagnostics;
  }

  destroy() {
    const key = this.config.diagnostics.globalKey;
    if (globalThis.window?.[key] === this._diagnostics) {
      delete globalThis.window[key];
    }
    this.targetHud?.destroy();
    this.root?.destroy(true);
    this.root = null;
    this.image = null;
    this.glowImage = null;
    this.displaySize = 0;
    this.interactionMode = "hidden";
    this.scene = null;
    this._diagnostics = null;
  }
}
