import { ARC_CORE_CONFIG } from "../../values/arcCoreConfig.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { ARC_CORE_VISUAL_PACK } from "../../values/arcCoreVisualAssets.js";
import {
  ARC_CORE_VISUAL_CONFIG,
  resolveArcCoreVisualsEnabled,
} from "../../values/arcCoreVisualConfig.js";
import {
  beginArcCloudTransition,
  isArcCloudTransitionComplete,
  resolveArcCloudTransitionVisuals,
} from "./arcCoreCloudTransition.js";
import {
  createArcCoreVisualLayers,
  drawArcCoreVisualArtwork,
  drawArcCoreVisualCloudTransition,
  hideArcCoreVisualLayers,
} from "./arcCoreVisualRenderer.js";

const AIM_DIRECTIONS = Object.freeze({
  LEFT: Object.freeze({ x: -1, y: 0 }),
  RIGHT: Object.freeze({ x: 1, y: 0 }),
  UP: Object.freeze({ x: 0, y: -1 }),
  DOWN: Object.freeze({ x: 0, y: 1 }),
});

function directionFor(aimDirection) {
  return AIM_DIRECTIONS[aimDirection] || AIM_DIRECTIONS.RIGHT;
}

export class ArcCoreVisualSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.enabled = resolveArcCoreVisualsEnabled(options.search);
    this.layers = null;
    this.legacySprite = null;
    this.modeId = ARC_CORE_VISUAL_CONFIG.small.id;
    this.unlocked = false;
    this.anchorBottom = { x: 0, y: 0 };
    this.direction = AIM_DIRECTIONS.RIGHT;
    this.digAction = null;
    this.transition = null;
  }

  create() {
    this.legacySprite = this.scene.add
      .image(0, 0, ASSET_KEYS.vehicles.arcCore.legacy)
      .setOrigin(0.5, 1)
      .setDepth(ARC_CORE_CONFIG.visual.legacyDepth)
      .setVisible(!this.enabled);
    if (this.enabled) this.layers = createArcCoreVisualLayers(this.scene);
    return this;
  }

  setProfile(isOmega, unlocked) {
    this.modeId = isOmega
      ? ARC_CORE_VISUAL_CONFIG.omega.id
      : ARC_CORE_VISUAL_CONFIG.small.id;
    this.unlocked = Boolean(unlocked);
    return this;
  }

  setAnchor(x, bottomY) {
    this.anchorBottom.x = x;
    this.anchorBottom.y = bottomY;
    return this;
  }

  setDirection(aimDirection) {
    this.direction = directionFor(aimDirection);
    return this;
  }

  getProfile() {
    return this.layers?.meta?.modes?.[this.modeId] || null;
  }

  getDisplaySizePx() {
    const profile = this.getProfile();
    if (profile) return profile.bodyDisplaySizePx;
    const gameplayProfile = this.modeId === ARC_CORE_VISUAL_CONFIG.omega.id
      ? ARC_CORE_CONFIG.omega
      : ARC_CORE_CONFIG;
    return this.scene.config.tileSize * gameplayProfile.displaySizeTiles;
  }

  getCenter() {
    return {
      x: this.anchorBottom.x,
      y: this.anchorBottom.y - this.getDisplaySizePx() * 0.5,
    };
  }

  isTransitioning() {
    return Boolean(this.transition);
  }

  getHealthSnapshot() {
    const manifest = this.scene.cache?.json?.get?.(
      ASSET_KEYS.vehicles.arcCore.pack,
    );
    const meta = manifest?.[ARC_CORE_VISUAL_PACK.metaSection];
    const files = manifest?.[ARC_CORE_VISUAL_PACK.assetSection]?.files || [];
    const missingTextures = files
      .filter(file => !this.scene.textures?.exists?.(file.key))
      .map(file => file.key);
    const anchor = meta?.anchorPx;
    const fixedCenter = Array.isArray(anchor)
      && anchor.length === 2
      && anchor.every(value => value === meta.canvasSizePx / 2);
    const legacyReady = this.scene.textures?.exists?.(
      ASSET_KEYS.vehicles.arcCore.legacy,
    ) === true;
    return {
      enabled: this.enabled,
      ready: this.enabled
        ? Boolean(this.layers) && missingTextures.length === 0
        : Boolean(this.legacySprite) && legacyReady,
      packageId: meta?.packageId || null,
      pipeline: meta?.pipeline || null,
      fixedCenter,
      productionRoleCount: files.length,
      missingTextures,
      activeMode: this.modeId,
      transitioning: this.isTransitioning(),
    };
  }

  beginTransition(kind, timeMs) {
    if (!this.enabled || this.transition) return false;
    const transition = beginArcCloudTransition(kind, this.modeId, timeMs);
    if (!transition) return false;
    transition.anchor = this.getCenter();
    transition.direction = this.direction;
    this.transition = transition;
    this.digAction = null;
    return true;
  }

  startDig(targets, aimDirection, timeMs) {
    if (!this.enabled || !this.unlocked || this.transition) return false;
    const mode = this.modeId === ARC_CORE_VISUAL_CONFIG.omega.id
      ? ARC_CORE_VISUAL_CONFIG.omega
      : ARC_CORE_VISUAL_CONFIG.small;
    this.direction = directionFor(aimDirection);
    this.digAction = {
      modeId: this.modeId,
      targets: Array.isArray(targets) ? targets : [],
      direction: this.direction,
      startedAtMs: timeMs,
      durationMs: mode.digDurationSeconds * 1000,
    };
    return true;
  }

  update(timeMs) {
    if (!this.enabled) {
      this.updateLegacy();
      return { transitionActive: false, playerAlpha: this.unlocked ? 0 : 1 };
    }
    this.legacySprite?.setVisible(false);
    if (!this.layers) {
      return { transitionActive: false, playerAlpha: 1 };
    }
    if (this.transition) return this.updateTransition(timeMs);
    const center = this.getCenter();
    const action = this.digAction;
    const progress = action
      ? Math.min(1, (timeMs - action.startedAtMs) / action.durationMs)
      : 0;
    if (action && progress >= 1) this.digAction = null;
    const visual = ARC_CORE_CONFIG.visual;
    drawArcCoreVisualArtwork(this.layers, {
      mode: this.modeId,
      cx: center.x,
      cy: center.y,
      timeMs,
      progress,
      active: Boolean(action),
      direction: action?.direction || this.direction,
      targets: action?.targets || [],
      tileSize: this.scene.config.tileSize,
      alpha: this.unlocked
        ? visual.unlockedBodyAlpha
        : visual.lockedBodyAlpha,
      tint: this.unlocked ? visual.unlockedTint : visual.lockedTint,
      energyAlphaMultiplier: this.unlocked
        ? visual.unlockedEnergyAlpha
        : visual.lockedEnergyAlpha,
    });
    return { transitionActive: false, playerAlpha: 1 };
  }

  updateLegacy() {
    if (!this.legacySprite) return;
    const profile = this.modeId === ARC_CORE_VISUAL_CONFIG.omega.id
      ? ARC_CORE_CONFIG.omega
      : ARC_CORE_CONFIG;
    const displaySize = this.scene.config.tileSize * profile.displaySizeTiles;
    this.legacySprite
      .setPosition(this.anchorBottom.x, this.anchorBottom.y)
      .setDisplaySize(displaySize, displaySize)
      .setTint(
        this.unlocked
          ? ARC_CORE_CONFIG.visual.unlockedTint
          : ARC_CORE_CONFIG.visual.lockedTint,
      )
      .setVisible(true);
  }

  updateTransition(timeMs) {
    const transition = this.transition;
    const visuals = resolveArcCloudTransitionVisuals(transition, timeMs);
    drawArcCoreVisualArtwork(this.layers, {
      mode: transition.arcMode,
      cx: transition.anchor.x,
      cy: transition.anchor.y,
      timeMs,
      progress: 0,
      active: false,
      direction: transition.direction,
      targets: [],
      tileSize: this.scene.config.tileSize,
      alpha: visuals.arcAlpha,
      scaleMultiplier: visuals.arcScale,
    });
    drawArcCoreVisualCloudTransition(this.layers, {
      mode: transition.arcMode,
      kind: transition.kind,
      cx: transition.anchor.x,
      cy: transition.anchor.y,
      timeMs,
      progress: visuals.progress,
      cloudEnvelope: visuals.cloudEnvelope,
      direction: transition.direction,
    });
    if (isArcCloudTransitionComplete(transition, timeMs)) {
      this.transition = null;
    }
    return {
      transitionActive: Boolean(this.transition),
      playerAlpha: visuals.playerAlpha,
    };
  }

  destroy() {
    hideArcCoreVisualLayers(this.layers);
    if (this.layers) {
      for (const value of Object.values(this.layers)) value?.destroy?.();
    }
    this.legacySprite?.destroy();
    this.layers = null;
    this.legacySprite = null;
    this.digAction = null;
    this.transition = null;
  }
}
