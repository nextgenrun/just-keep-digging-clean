import { FULL_WORLD_MATERIAL_CONFIG } from "../../values/fullWorldMaterialConfig.js";
import { FULL_WORLD_MATERIAL_FRAGMENT } from "./fullWorldMaterialShader.js";

export class FullWorldMaterialPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: FULL_WORLD_MATERIAL_CONFIG.pipelineKey,
      fragShader: FULL_WORLD_MATERIAL_FRAGMENT,
    });
    this.materialProfile = FULL_WORLD_MATERIAL_CONFIG.profiles.surface;
  }

  setMaterialProfile(profile) {
    this.materialProfile = profile || FULL_WORLD_MATERIAL_CONFIG.profiles.surface;
    return this;
  }

  onPreRender() {
    const config = FULL_WORLD_MATERIAL_CONFIG;
    const profile = this.materialProfile;
    this.set2f("uResolution", this.renderer.width, this.renderer.height);
    this.set1f("uSharpness", profile.sharpness);
    this.set1f("uReliefStrength", profile.reliefStrength);
    this.set1f("uReliefRadiusPx", profile.reliefRadiusPx);
    this.set1f("uVibrance", profile.vibrance);
    this.set1f("uShadowLift", profile.shadowLift);
    this.set1f("uHighlightCompression", config.tone.highlightCompression);
    this.set1f("uGradientGain", config.relief.gradientGain);
    this.set1f("uReliefCeiling", config.relief.ceiling);
    this.set1f("uDetailCeiling", config.tone.detailCeiling);
    this.set2f("uLightDirection", config.relief.directionX, config.relief.directionY);
  }
}
