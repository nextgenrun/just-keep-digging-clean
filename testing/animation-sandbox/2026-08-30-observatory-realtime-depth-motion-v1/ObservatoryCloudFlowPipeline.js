import { OBSERVATORY_LAYERED_ATMOSPHERE_REVIEW as CONFIG } from "../../../values/observatoryLayeredAtmosphereReview.js";
import { OBSERVATORY_CLOUD_FLOW_FRAGMENT } from "./observatoryCloudFlowShader.js";

export class ObservatoryCloudFlowPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.cloudPipelineKey, fragShader: OBSERVATORY_CLOUD_FLOW_FRAGMENT });
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
    this.set1f("uAmplitude", profile.amplitudeUv);
    this.set1f("uFrequencyX", profile.frequencyX);
    this.set1f("uFrequencyY", profile.frequencyY);
    this.set1f("uVerticalRatio", profile.verticalRatio);
    this.set1f("uCycles", profile.cycles);
    this.set1f("uPhaseOffset", profile.phaseOffset);
  }
}
