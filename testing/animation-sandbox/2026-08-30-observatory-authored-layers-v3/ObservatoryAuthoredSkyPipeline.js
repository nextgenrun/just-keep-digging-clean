import { OBSERVATORY_AUTHORED_LAYERS_REVIEW as CONFIG } from "../../../values/observatoryAuthoredLayersReview.js";
import { OBSERVATORY_AUTHORED_SKY_FRAGMENT } from "./observatoryAuthoredSkyShader.js";

export class ObservatoryAuthoredSkyPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.skyPipelineKey, fragShader: OBSERVATORY_AUTHORED_SKY_FRAGMENT });
    this.phase = 0;
    this.strength = CONFIG.defaults.starStrength;
  }

  setSkyState(phase, strength) {
    this.phase = phase;
    this.strength = strength;
    return this;
  }

  onPreRender() {
    this.set1f("uPhase", this.phase);
    this.set1f("uStrength", this.strength);
    this.set1f("uBaseIntensity", CONFIG.skyMotion.baseIntensity);
    this.set1f("uSteadyLevel", CONFIG.skyMotion.steadyLevel);
    this.set1f("uSteadyDepth", CONFIG.skyMotion.steadyDepth);
    this.set1f("uTwinkleDepth", CONFIG.skyMotion.twinkleDepth);
    this.set1f("uMicroRange", CONFIG.skyMotion.microRange);
    this.set1f("uDeepClassThreshold", CONFIG.skyMotion.deepClassThreshold);
    this.set1f("uSparkleClassThreshold", CONFIG.skyMotion.sparkleClassThreshold);
    this.set1f("uExtinguishLow", CONFIG.skyMotion.extinguishLow);
    this.set1f("uExtinguishHigh", CONFIG.skyMotion.extinguishHigh);
    this.set1f("uTwinkleGain", CONFIG.skyMotion.twinkleGain);
    this.set1f("uSparkleGain", CONFIG.skyMotion.sparkleGain);
  }
}
