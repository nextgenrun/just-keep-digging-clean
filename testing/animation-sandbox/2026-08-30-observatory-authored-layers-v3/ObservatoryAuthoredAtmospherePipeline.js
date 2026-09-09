import { OBSERVATORY_AUTHORED_LAYERS_REVIEW as CONFIG } from "../../../values/observatoryAuthoredLayersReview.js";
import { OBSERVATORY_AUTHORED_ATMOSPHERE_FRAGMENT } from "./observatoryAuthoredAtmosphereShader.js";

export class ObservatoryAuthoredAtmospherePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.atmospherePipelineKey, fragShader: OBSERVATORY_AUTHORED_ATMOSPHERE_FRAGMENT });
    this.phase = 0;
    this.strength = CONFIG.defaults.motionStrength;
    this.profile = CONFIG.cloudLayers[0];
  }

  setLayerState(phase, strength, profile) {
    this.phase = phase;
    this.strength = strength;
    this.profile = profile;
    return this;
  }

  onPreRender() {
    const profile = this.profile;
    this.set1f("uPhase", this.phase);
    this.set1f("uStrength", this.strength);
    this.set1f("uRegionCols", profile.regionCols);
    this.set1f("uRegionRows", profile.regionRows);
    this.set1f("uDriftAmplitude", profile.driftUv);
    this.set1f("uAmplitude", profile.amplitudeUv);
    this.set1f("uOrbitRatio", profile.orbitRatio);
    this.set1f("uSpatialX", profile.spatialX);
    this.set1f("uSpatialY", profile.spatialY);
    this.set1f("uLuminanceRange", profile.luminanceRange);
    this.set1f("uCycles", profile.cycles);
    this.set1f("uPhaseOffset", profile.phaseOffset);
    this.set1f("uOpacity", profile.opacity);
  }
}
