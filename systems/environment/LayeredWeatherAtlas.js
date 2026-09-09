import { LAYERED_WEATHER_VISUALS as CONFIG } from "../../values/layeredWeatherVisuals.js";
import { resolveLayeredSkyReviewEnabled } from "../../values/worldVisualLayeredSkyReview.js";

// Derives the query-gated visual profile without mutating shared weather rules.
export function resolveLayeredWeatherConfig(base){
  if(!resolveLayeredSkyReviewEnabled())return base;
  const layers=Object.fromEntries(Object.entries(base.rain.layers).map(([name,layer])=>[name,{...layer,...CONFIG.rain.layers[name]}]));
  return {...base,surfaceAtmosphere:CONFIG.surfaceAtmosphere,cloudFront:CONFIG.cloudFront,rainMotion:CONFIG.rainMotion,
    rain:{...base.rain,impact:{...base.rain.impact,...CONFIG.rain.impact},layers},
    splashes:{...base.splashes,impactVfx:{...base.splashes.impactVfx,...CONFIG.splashes}},
    snow:{...base.snow,...CONFIG.snow}};
}

// Owns only frame definitions; keeps the generated RGBA source pixels intact.
export class LayeredWeatherAtlas {
  constructor(scene,base){
    this.scene=scene;this.names=[];this.visualAssets=base;
    const cfg=CONFIG.atlas;
    if(!base||!scene.textures.exists(cfg.key))return;
    const texture=scene.textures.get(cfg.key);
    const register=(rects,kind)=>rects.map((rect,index)=>{
      const name=cfg.framePrefix+kind+index;
      if(!texture.has(name)){texture.add(name,0,...rect);this.names.push(name);}
      return name;
    });
    const rain=register(cfg.rainRects,"rain"),impacts=register(cfg.impactRects,"impact");
    this.visualAssets={...base,rainTextureKey:cfg.key,
      groupTextureKeys:{rainSplashes:cfg.key,rainRipples:cfg.key},impactOriginY:cfg.impactOriginY,
      presentation:{...base.presentation,ripple:{...base.presentation.ripple,...CONFIG.ripplePresentation}},
      frames:{...base.frames,rainStreaks:rain,rainSplashes:impacts.slice(0,-1),rainRipples:impacts.slice(-1)}};
  }
  destroy(){
    if(!this.names.length)return;
    const texture=this.scene.textures.get(CONFIG.atlas.key);
    for(const name of this.names)texture.remove(name);
    this.names.length=0;
  }
}
