import { clamp01, lerp } from "../../values/mathUtils.js";

// Weather-owned passing fronts: continuous cloud cover, shared with all light consumers.
export class WeatherCloudFront {
  constructor(config){this.config=config;this.seconds=0;this.amount=0;}
  update(deltaMs){this.seconds+=Math.max(0,deltaMs)/1000;}
  sample(kind,forecast={}){
    const cfg=this.config;
    const broad=.5-.5*Math.cos((this.seconds/cfg.periodSeconds+cfg.phase)*Math.PI*2);
    const detail=.5-.5*Math.cos(this.seconds/cfg.detailPeriodSeconds*Math.PI*2);
    this.amount=lerp(broad,detail,cfg.detailWeight);
    const range=cfg.ranges[kind]||cfg.ranges.clear;
    let cover=lerp(range[0],range[1],this.amount);
    const approaching=cfg.ranges[forecast.forecastKind];
    if(approaching&&forecast.forecastProgress>0){
      const progress=clamp01(forecast.forecastProgress);
      cover=lerp(cover,Math.max(cover,approaching[0]),progress*progress*cfg.forecastBuild);
    }
    return cover;
  }
  apply(target,kind,forecast){
    const cover=this.sample(kind,forecast);
    const extra=Math.max(0,cover-target.cloudCoverAmount);
    return {...target,cloudCoverAmount:cover,
      sunTransmittance:target.sunTransmittance*(1-extra*this.config.sunExtinction),
      sunExposure:target.sunExposure*(1-extra*this.config.exposureExtinction)};
  }
  snapshot(){return {seconds:this.seconds,amount:this.amount};}
}
