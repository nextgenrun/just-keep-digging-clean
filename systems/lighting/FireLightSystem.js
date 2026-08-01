import {
  FIRE_ILLUMINATION_CONFIG,
  resolveFireIlluminationEnabled,
} from "../../values/fireIlluminationConfig.js";
import {
  FIRE_LIGHT_CONFIG,
  resolveEyeAdaptationEnabled,
  resolveFireLightEnabled,
  resolveFireRaysEnabled,
  resolveReducedFireFlicker,
} from "../../values/fireLightConfig.js";
import {
  FIRE_LIGHT_PRESENTATION_CONFIG,
  resolveFireLightPresentation,
} from "../../values/fireLightPresentation.js";
import { EyeAdaptationSystem } from "./EyeAdaptationSystem.js";
import { FireIlluminationRenderer } from "./FireIlluminationRenderer.js";
import { FireLightRayRenderer } from "./FireLightRayRenderer.js";
import { FireLightRenderer } from "./FireLightRenderer.js";
import { clampFireLight01 } from "./fireLightMath.js";
/**
 * Carried-fire presentation only.
 * Gameplay reveal/darkness remains owned by LightSystem; surface celestial
 * light and Star Block emitters remain separate systems.
 */
export class FireLightSystem {
  constructor(
    scene,
    config = FIRE_LIGHT_CONFIG,
    search = globalThis.location?.search || "",
    illuminationConfig = FIRE_ILLUMINATION_CONFIG,
    presentationConfig = FIRE_LIGHT_PRESENTATION_CONFIG
  ) {
    this.scene = scene;
    this.config = config;
    this.illuminationConfig = illuminationConfig;
    this.presentationConfig = presentationConfig;
    this.search = search;
    this.requested = resolveFireLightEnabled(search, config);
    this.presentation = resolveFireLightPresentation(search, presentationConfig);
    this.reducedFlicker = resolveReducedFireFlicker(search, null, config);
    this.raysRequested = resolveFireRaysEnabled(search, config);
    this.eyeAdaptationRequested = resolveEyeAdaptationEnabled(search, config);
    this.illuminationRequested = this.presentation.expandedIllumination
      && resolveFireIlluminationEnabled(
        search,
        this.requested,
        illuminationConfig
      );
    this.enabled = false;
    this.disabledReason = this.requested ? "assets-not-ready" : "legacy-query";
    this.renderer = null;
    this.illuminationRenderer = null;
    this.rayRenderer = null;
    this.eyeAdaptation = null;
    this._snapshot = this._createSnapshot();
    this._create();
  }

  _create() {
    if (!this.requested) return;
    const textureKeys = Object.values(this.config.assetKeys);
    if (!textureKeys.every(key => this.scene.textures?.exists?.(key))) {
      this.disabledReason = "missing-authored-assets";
      return;
    }
    this.renderer = new FireLightRenderer(this.scene, this.config);
    if (!this.renderer.available) {
      this.disabledReason = "renderer-unavailable";
      this.renderer.destroy();
      this.renderer = null;
      return;
    }
    this.illuminationRenderer = new FireIlluminationRenderer(
      this.scene,
      this.illuminationConfig,
      this.illuminationRequested
    );
    this.rayRenderer = new FireLightRayRenderer(
      this.scene,
      this.config,
      this.raysRequested
    );
    this.eyeAdaptation = new EyeAdaptationSystem(
      this.scene,
      this.config,
      this.eyeAdaptationRequested
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
    const expandedLightAvailable = (
      this.illuminationRequested
      && this.illuminationRenderer?.available === true
    );
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
      volumeAlphaScale: Number.isFinite(this.presentation.volumeAlphaScale)
        ? this.presentation.volumeAlphaScale
        : expandedLightAvailable
          ? this.illuminationConfig.integration.baseVolumeAlphaScale : 1,
      flameAlphaScale: this.presentation.flameAlphaScale,
      atmosphereAlphaScale: this.presentation.atmosphereAlphaScale,
    });
    const rendererSnapshot = this.renderer.getSnapshot();
    this.illuminationRenderer?.render({
      time,
      active,
      source,
      tileSize,
      radiusWorld,
      strength,
      fuelRatio,
      lighting,
      fireState: rendererSnapshot.state,
      reducedFlicker: this.reducedFlicker,
    });

    if (this.raysRequested) {
      this.rayRenderer.render({
        time,
        active,
        source,
        tileSize,
        strength,
        lighting,
        worldModel,
        reducedFlicker: this.reducedFlicker,
      });
    } else {
      this.rayRenderer.hide();
    }
    if (this.eyeAdaptationRequested) {
      this.eyeAdaptation.render({
        deltaMs,
        lighting,
        torch: { active, strength },
        reducedFlicker: this.reducedFlicker,
        effectScale: this.presentation.eyeAdaptationEffectScale,
      });
    } else {
      this.eyeAdaptation.hide();
    }

    this._snapshot = {
      ...this._createSnapshot(),
      active,
      source: source ? { ...source } : null,
      fuelRatio: clampFireLight01(fuelRatio),
      renderer: rendererSnapshot,
      illumination: this.illuminationRenderer?.getSnapshot?.() || null,
      rays: this.rayRenderer.getSnapshot(),
      eyeAdaptation: this.eyeAdaptation.getSnapshot(),
    };
    return this.getSnapshot();
  }

  hideWorldPresentation({ deltaMs = 0, lighting = null } = {}) {
    this.renderer?.hide();
    this.illuminationRenderer?.hide();
    this.rayRenderer?.hide();
    if (this.enabled && this.eyeAdaptationRequested && lighting) {
      this.eyeAdaptation?.render({
        deltaMs,
        lighting,
        torch: { active: false, strength: 0 },
        reducedFlicker: this.reducedFlicker,
        effectScale: this.presentation.eyeAdaptationEffectScale,
      });
    }
    this._snapshot = {
      ...this._createSnapshot(),
      active: false,
      renderer: this.renderer?.getSnapshot?.() || null,
      illumination: this.illuminationRenderer?.getSnapshot?.() || null,
      rays: this.rayRenderer?.getSnapshot?.() || null,
      eyeAdaptation: this.eyeAdaptation?.getSnapshot?.() || null,
    };
  }

  ownsTorchPresentation() {
    return this.enabled;
  }
  usesProceduralWorldGlow() {
    return this.enabled && this.presentation.proceduralWorldGlow === true;
  }

  getProceduralWorldGlowScale() {
    return this.usesProceduralWorldGlow()
      ? this.presentation.proceduralWorldGlowScale : 1;
  }

  getProceduralShaderMix() {
    if (!this.enabled) return 1;
    if (Number.isFinite(this.presentation.proceduralShaderMix)) {
      return this.presentation.proceduralShaderMix;
    }
    return this.illuminationRequested
      && this.illuminationRenderer?.available === true
      ? this.illuminationConfig.integration.proceduralShaderMix
      : this.config.shader.authoredPresentationProceduralMix;
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      source: this._snapshot.source ? { ...this._snapshot.source } : null,
      renderer: this._snapshot.renderer
        ? { ...this._snapshot.renderer }
        : null,
      illumination: this._snapshot.illumination
        ? {
          ...this._snapshot.illumination,
          frames: { ...this._snapshot.illumination.frames },
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
      requested: this.requested,
      enabled: this.enabled,
      disabledReason: this.disabledReason,
      active: false,
      presentationId: this.requested
        ? this.presentation.id
        : this.presentationConfig.legacyPresentationId,
      proceduralWorldGlow: !this.requested || this.usesProceduralWorldGlow(),
      proceduralWorldGlowScale: this.getProceduralWorldGlowScale(),
      authoredLayerTarget: this.presentation.authoredLayerTarget,
      reducedFlicker: this.reducedFlicker,
      raysRequested: this.raysRequested,
      eyeAdaptationRequested: this.eyeAdaptationRequested,
      illuminationRequested: this.illuminationRequested,
      authoredLightFrameCount: this.illuminationConfig
        .atlas.totalAuthoredLightFrameCount,
      proceduralShaderMix: this.getProceduralShaderMix(),
      source: null,
      fuelRatio: 0,
      renderer: null,
      illumination: null,
      rays: null,
      eyeAdaptation: null,
    };
  }

  resize() {
    this.eyeAdaptation?.resize();
  }

  destroy() {
    this.renderer?.destroy();
    this.illuminationRenderer?.destroy();
    this.rayRenderer?.destroy();
    this.eyeAdaptation?.destroy();
    this.renderer = null;
    this.illuminationRenderer = null;
    this.rayRenderer = null;
    this.eyeAdaptation = null;
    this.enabled = false;
  }
}
