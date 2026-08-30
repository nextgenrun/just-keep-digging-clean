import { OBSERVATORY_LAYERED_ATMOSPHERE_REVIEW as CONFIG } from "../../../values/observatoryLayeredAtmosphereReview.js";
import { OBSERVATORY_EMISSIVE_FRAGMENT } from "./observatoryEmissiveShader.js";

export class ObservatoryEmissivePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.lightPipelineKey, fragShader: OBSERVATORY_EMISSIVE_FRAGMENT });
    this.phase = 0;
    this.strength = CONFIG.defaults.lightStrength;
    this.lightIdTexture = null;
  }

  setLightState(phase, strength) {
    this.phase = phase;
    this.strength = strength;
    return this;
  }

  resolveLightIds() {
    this.lightIdTexture ||= this.game.textures.getFrame(CONFIG.lightIds.key)?.glTexture || null;
    return Boolean(this.lightIdTexture);
  }

  onDraw(renderTarget) {
    if (!this.resolveLightIds()) {
      this.bindAndDraw(renderTarget);
      return;
    }
    const light = CONFIG.lightMotion;
    this.bind();
    this.set1i("uLightIdSampler", 1);
    this.set1f("uPhase", this.phase);
    this.set1f("uStrength", this.strength);
    this.set1f("uBaseIntensity", light.baseIntensity);
    this.set1f("uPulseRange", light.pulseRange);
    this.set1f("uFlutterRange", light.flutterRange);
    this.set1f("uBloomGain", light.bloomGain);
    this.bindTexture(this.lightIdTexture, 1);
    this.bindAndDraw(renderTarget);
  }
}
