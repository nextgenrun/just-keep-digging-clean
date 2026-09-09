import { OBSERVATORY_AUTHORED_LAYERS_REVIEW as CONFIG } from "../../../values/observatoryAuthoredLayersReview.js";
import { OBSERVATORY_AUTHORED_EMISSIVE_FRAGMENT } from "./observatoryAuthoredEmissiveShader.js";

export class ObservatoryAuthoredEmissivePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.emissivePipelineKey, fragShader: OBSERVATORY_AUTHORED_EMISSIVE_FRAGMENT });
    this.phase = 0;
    this.strength = CONFIG.defaults.lightStrength;
    this.chronology = { timeOfDay: CONFIG.worldChronology.defaultHour / 24, weekPhase: 0 };
  }

  setLightState(phase, strength, chronology) {
    this.phase = phase;
    this.strength = strength;
    this.chronology = chronology;
    return this;
  }

  onPreRender() {
    const light = CONFIG.lightMotion;
    this.set1f("uPhase", this.phase);
    this.set1f("uWorldTime", this.chronology.timeOfDay);
    this.set1f("uWeekPhase", this.chronology.weekPhase);
    this.set1f("uStrength", this.strength);
    this.set1f("uBaseIntensity", light.baseIntensity);
    this.set1f("uMicroFlickerRange", light.microFlickerRange);
    this.set1f("uFlameFlickerRange", light.flameFlickerRange);
    this.set1f("uOffIntensity", light.offIntensity);
    this.set1f("uOccupancyThreshold", light.occupancyThreshold);
    this.set1f("uOccupancyFeather", light.occupancyFeather);
    this.set1f("uShadowThreshold", light.shadowThreshold);
    this.set1f("uShadowFeather", light.shadowFeather);
    this.set1f("uShadowDepth", light.shadowDepth);
    this.set1f("uSteadyClassEnd", light.steadyClassEnd);
    this.set1f("uOccupiedClassEnd", light.occupiedClassEnd);
    this.set1f("uShadowClassEnd", light.shadowClassEnd);
    this.set1f("uBloomGain", light.bloomGain);
  }
}
