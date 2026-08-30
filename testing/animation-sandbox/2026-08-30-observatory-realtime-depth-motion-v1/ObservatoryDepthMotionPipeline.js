import { OBSERVATORY_REALTIME_DEPTH_MOTION_REVIEW as CONFIG } from "../../../values/observatoryRealtimeDepthMotionReview.js";
import { OBSERVATORY_DEPTH_MOTION_FRAGMENT } from "./observatoryDepthMotionShader.js";

export class ObservatoryDepthMotionPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: CONFIG.pipelineKey, fragShader: OBSERVATORY_DEPTH_MOTION_FRAGMENT });
    this.phase = 0;
    this.motionStrength = CONFIG.defaults.motionStrength;
    this.depthStrength = CONFIG.defaults.depthStrength;
    this.viewMode = CONFIG.viewModes[CONFIG.defaults.view];
    this.viewX = 0;
    this.viewY = 0;
    this.depthTexture = null;
    this.domainTexture = null;
  }

  setReviewState(state) {
    this.phase = state.phase;
    this.motionStrength = state.motionStrength;
    this.depthStrength = state.depthStrength;
    this.viewMode = state.viewMode;
    this.viewX = state.viewX;
    this.viewY = state.viewY;
    return this;
  }

  resolveTextures() {
    this.depthTexture ||= this.game.textures.getFrame(CONFIG.depth.key)?.glTexture || null;
    this.domainTexture ||= this.game.textures.getFrame(CONFIG.domains.key)?.glTexture || null;
    return Boolean(this.depthTexture && this.domainTexture);
  }

  applyUniforms() {
    const motion = CONFIG.motion;
    this.set1i("uDepthSampler", 1);
    this.set1i("uDomainSampler", 2);
    this.set1f("uPhase", this.phase);
    this.set1f("uMotionStrength", this.motionStrength);
    this.set1f("uDepthStrength", this.depthStrength);
    this.set1f("uUpperAmplitude", motion.upperAmplitudeUv);
    this.set1f("uLowerAmplitude", motion.lowerAmplitudeUv);
    this.set1f("uDepthAmplitude", motion.depthAmplitudeUv);
    this.set1f("uRigidSuppression", motion.rigidSuppression);
    this.set1f("uReliefStrength", motion.reliefStrength);
    this.set1f("uViewMode", this.viewMode);
    this.set2f("uView", this.viewX, this.viewY);
  }

  onDraw(renderTarget) {
    if (!this.resolveTextures()) {
      this.bindAndDraw(renderTarget);
      return;
    }
    this.bind();
    this.applyUniforms();
    this.bindTexture(this.depthTexture, 1);
    this.bindTexture(this.domainTexture, 2);
    this.bindAndDraw(renderTarget);
  }
}
