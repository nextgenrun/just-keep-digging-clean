import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
import { lerp } from "../../../values/mathUtils.js";

// Stable cloud sizes and slow local growth, independent of camera or sprite recycling.
export function sampleLayeredCloudShape(layer,seed,seconds,cover){
  const cfg=CONFIG.cloudEvolution,steps=CONFIG.cloudJitter.steps;
  const random=salt=>((Math.imul(seed^salt,cfg.seedMultiplier)>>>0)%steps)/steps;
  const range=layer.sizeRange||cfg.defaultSizeRange;
  const growth=1-cfg.growthAmount*(.5+.5*Math.sin(seconds/cfg.growthPeriodSeconds*Math.PI*2+random(cfg.growthSeed)*Math.PI*2));
  const scale=layer.scale*lerp(range[0],range[1],random(cfg.sizeSeed))*growth*(cfg.clearSize+cover*cfg.coverSizeGain);
  return {scaleX:Math.min(1,scale),scaleY:Math.min(1,scale*(layer.heightScale??1)*lerp(cfg.heightRange[0],cfg.heightRange[1],random(cfg.heightSeed)))};
}
