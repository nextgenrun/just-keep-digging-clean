import {
  isWorldrootModuleGateEnabled,
  resolveWorldrootNativeModuleBounds,
} from "../../values/worldrootModuleArt.js?rev=20260830-alignment-v1";
import { WORLDROOT_WHITEBOX_CONFIG } from "../../values/worldrootWhitebox.js";

/** Query-gated native-density art fitted to Gate A. Owns no collision. */
export class WorldrootNativeModuleView {
  constructor(scene, config, geometry = WORLDROOT_WHITEBOX_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.geometry = geometry;
    this.enabled = isWorldrootModuleGateEnabled(
      globalThis.location?.search || "",
      config,
    );
    this.tileSize = scene?.config?.tileSize || config.sourceTileSizePx;
    this.reason = null;
    this.growthStage = -1;
    this.images = [];
  }

  create(snapshot = null) {
    if (!this.enabled || !this.scene?.add) return this;
    if (this.tileSize !== this.config.sourceTileSizePx) {
      this.enabled = false;
      this.reason = `Gate ${this.config.gateLabel} requires ${this.config.sourceTileSizePx}px tiles for scale-1 alignment.`;
      return this;
    }
    for (const module of this.config.modules) {
      if (!this.scene.textures?.exists?.(module.key)) {
        this.reason = `Missing Gate ${this.config.gateLabel} texture: ${module.key}`;
        this.destroy();
        this.enabled = false;
        return this;
      }
      const bounds = resolveWorldrootNativeModuleBounds(this.geometry, module, this.config);
      const image = this.scene.add.image(bounds.worldLeftPx, bounds.worldTopPx, module.key)
        .setOrigin(0, 0)
        .setScale(this.config.runtimeScale)
        .setDepth(this.config.presentation.depth);
      this.images.push({ module, bounds, image });
    }
    this.sync(snapshot?.growthStage ?? 0, true);
    return this;
  }

  sync(stage = 0, force = false) {
    if (!this.enabled) return false;
    const nextStage = Math.max(
      0,
      Math.min(this.config.maximumStage, Math.floor(Number(stage) || 0)),
    );
    if (!force && nextStage === this.growthStage) return false;
    this.growthStage = nextStage;
    for (const entry of this.images) {
      entry.image.setAlpha(
        entry.module.stage <= nextStage
          ? this.config.presentation.activeAlpha
          : this.config.presentation.dormantAlpha,
      );
    }
    return true;
  }

  getDebugSnapshot() {
    return {
      enabled: this.enabled,
      gateLabel: this.config.gateLabel,
      reviewStatus: this.config.reviewStatus,
      reason: this.reason,
      runtimeScale: this.config.runtimeScale,
      sourceTileSizePx: this.config.sourceTileSizePx,
      moduleCount: this.images.length,
      moduleIds: this.images.map(entry => entry.module.id),
      modules: this.images.map(entry => ({
        id: entry.module.id,
        active: entry.module.stage <= this.growthStage,
        x: entry.image.x,
        y: entry.image.y,
        scaleX: entry.image.scaleX,
        scaleY: entry.image.scaleY,
        displayWidth: entry.image.displayWidth,
        displayHeight: entry.image.displayHeight,
        bounds: entry.bounds,
      })),
    };
  }

  destroy() {
    this.images.forEach(entry => entry.image?.destroy());
    this.images = [];
  }
}
