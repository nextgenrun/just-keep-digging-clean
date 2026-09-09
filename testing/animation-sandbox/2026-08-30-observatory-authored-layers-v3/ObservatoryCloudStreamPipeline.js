import { OBSERVATORY_AUTHORED_LAYERS_REVIEW as CONFIG } from "../../../values/observatoryAuthoredLayersReview.js";
import { OBSERVATORY_CLOUD_STREAM_FRAGMENT } from "./observatoryCloudStreamShader.js";

export class ObservatoryCloudStreamPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.cloudStreamPipelineKey, fragShader: OBSERVATORY_CLOUD_STREAM_FRAGMENT });
    this.state = null;
    this.weather = { cloudFlow: 1, cloudOpacity: 1 };
  }

  setSegmentState(phase, strength, state, weather) {
    this.phase = phase;
    this.strength = strength;
    this.state = state;
    this.weather = weather;
    return this;
  }

  onPreRender() {
    if (!this.state) return;
    this.set1f("uPhase", this.phase);
    this.set1f("uStrength", this.strength * this.weather.cloudFlow);
    this.set1f("uTravelX", this.state.travelUvX);
    this.set1f("uTravelY", this.state.travelUvY);
    this.set1f("uCycles", this.state.cycles);
    this.set1f("uPhaseOffset", this.state.phaseOffset);
    this.set1f("uOpacity", this.state.opacity * this.weather.cloudOpacity);
    this.set1f("uResetFeather", this.state.resetFeather);
  }
}
