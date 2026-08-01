import { FIRE_LIGHT_CONFIG } from "../../values/fireLightConfig.js";
import {
  OLD_SCHOOL_LAMP_LIGHT_CONFIG,
  resolveOldSchoolLampLightReviewEnabled,
  resolveOldSchoolLampRaysEnabled,
} from "../../values/oldSchoolLampLightConfig.js";
import { EyeAdaptationSystem } from "./EyeAdaptationSystem.js";
import { OldSchoolLampLightRenderer } from "./OldSchoolLampLightRenderer.js";
import { OldSchoolLampRayRenderer } from "./OldSchoolLampRayRenderer.js";
import { clampFireLight01 } from "./fireLightMath.js";

/**
 * Review-only shielded miner-lamp presentation.
 * Gameplay visibility stays owned by LightSystem.
 */
export class OldSchoolLampLightSystem {
  constructor(
    scene,
    config = OLD_SCHOOL_LAMP_LIGHT_CONFIG,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.config = Object.freeze({
      ...config,
      socket: FIRE_LIGHT_CONFIG.socket,
    });
    this.search = search;
    this.requested = resolveOldSchoolLampLightReviewEnabled(search, config);
    this.reducedFlicker = this._resolveReducedMotion(search);
    this.raysRequested = resolveOldSchoolLampRaysEnabled(search, config);
    this.enabled = false;
    this.disabledReason = this.requested
      ? "assets-not-ready"
      : "review-query-not-selected";
    this.renderer = null;
    this.rayRenderer = null;
    this.eyeAdaptation = null;
    this._snapshot = this._createSnapshot();
    this._create();
  }

  _resolveReducedMotion(search) {
    try {
      const query = new URLSearchParams(search || "");
      if (query.get("fireFlicker") === "reduced") return true;
      return globalThis.matchMedia
        ? globalThis.matchMedia(this.config.flicker.reducedMotionMediaQuery).matches
        : false;
    } catch {
      return false;
    }
  }

  _create() {
    if (!this.requested) return;
    if (!Object.values(this.config.assetKeys).every(
      key => this.scene.textures?.exists?.(key)
    )) {
      this.disabledReason = "missing-authored-assets";
      return;
    }
    this.renderer = new OldSchoolLampLightRenderer(this.scene, this.config);
    if (!this.renderer.available) {
      this.disabledReason = "renderer-unavailable";
      this.renderer.destroy();
      this.renderer = null;
      return;
    }
    this.rayRenderer = new OldSchoolLampRayRenderer(
      this.scene,
      this.config,
      this.raysRequested
    );
    this.eyeAdaptation = new EyeAdaptationSystem(
      this.scene,
      this.config,
      this.config.eyeAdaptation.enabled !== false
    );
    this.enabled = true;
    this.disabledReason = null;
    this._snapshot = this._createSnapshot();
  }

  renderFrame({
    time,
    deltaMs,
    torchActive,
    source,
    tileSize,
    radiusWorld,
    glowStrength,
    fuelRatio,
    lighting,
    worldModel,
  }) {
    if (!this.enabled) return this.getSnapshot();
    const strength = clampFireLight01(glowStrength);
    const active = Boolean(torchActive && source);
    this.renderer.render({
      time,
      active,
      source,
      tileSize,
      radiusWorld,
      strength,
      fuelRatio,
      lighting,
      reducedFlicker: this.reducedFlicker,
    });
    const raySource = source
      ? {
        ...source,
        y: source.y + this.config.rays.sourceVerticalOffsetTiles * tileSize,
      }
      : null;
    if (this.raysRequested) {
      this.rayRenderer.render({
        time,
        active,
        source: raySource,
        tileSize,
        strength,
        lighting,
        worldModel,
      });
    } else {
      this.rayRenderer.hide();
    }
    this.eyeAdaptation.render({
      deltaMs,
      lighting,
      torch: { active, strength },
      reducedFlicker: this.reducedFlicker,
    });
    this._snapshot = {
      ...this._createSnapshot(),
      active,
      source: source ? { ...source } : null,
      fuelRatio: clampFireLight01(fuelRatio),
      renderer: this.renderer.getSnapshot(),
      rays: this.rayRenderer.getSnapshot(),
      eyeAdaptation: this.eyeAdaptation.getSnapshot(),
    };
    return this.getSnapshot();
  }

  hideWorldPresentation({ deltaMs = 0, lighting = null } = {}) {
    this.renderer?.hide();
    this.rayRenderer?.hide();
    if (this.enabled && lighting) {
      this.eyeAdaptation?.render({
        deltaMs,
        lighting,
        torch: { active: false, strength: 0 },
        reducedFlicker: this.reducedFlicker,
      });
    }
    this._snapshot = {
      ...this._createSnapshot(),
      active: false,
      renderer: this.renderer?.getSnapshot?.() || null,
      rays: this.rayRenderer?.getSnapshot?.() || null,
      eyeAdaptation: this.eyeAdaptation?.getSnapshot?.() || null,
    };
  }

  ownsTorchPresentation() {
    return this.enabled;
  }

  getProceduralShaderMix() {
    return this.enabled
      ? this.config.shader.authoredPresentationProceduralMix
      : 1;
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      source: this._snapshot.source ? { ...this._snapshot.source } : null,
      renderer: this._snapshot.renderer
        ? {
          ...this._snapshot.renderer,
          frames: { ...this._snapshot.renderer.frames },
        }
        : null,
      rays: this._snapshot.rays
        ? {
          ...this._snapshot.rays,
          lengthsWorld: [...this._snapshot.rays.lengthsWorld],
        }
        : null,
      eyeAdaptation: this._snapshot.eyeAdaptation
        ? { ...this._snapshot.eyeAdaptation }
        : null,
    };
  }

  _createSnapshot() {
    return {
      id: this.config.id,
      style: "old-school-lamp",
      reviewOnly: true,
      requested: this.requested,
      enabled: this.enabled,
      disabledReason: this.disabledReason,
      active: false,
      reducedFlicker: this.reducedFlicker,
      raysRequested: this.raysRequested,
      authoredComponentCount: this.config.atlas.authoredComponentCount,
      authoredLightFrameCount: this.config.atlas.authoredLightFrameCount,
      proceduralShaderMix: this.getProceduralShaderMix(),
      source: null,
      fuelRatio: 0,
      renderer: null,
      rays: null,
      eyeAdaptation: null,
    };
  }

  resize() {
    this.eyeAdaptation?.resize();
  }

  destroy() {
    this.renderer?.destroy();
    this.rayRenderer?.destroy();
    this.eyeAdaptation?.destroy();
    this.renderer = null;
    this.rayRenderer = null;
    this.eyeAdaptation = null;
    this.enabled = false;
  }
}
