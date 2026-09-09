import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../values/worldVisualLayeredSkyReview.js";
import { clamp01 } from "../../values/mathUtils.js";
const mix = (a,b,t) => [16,8,0].reduce((color,shift)=>color | (Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t)<<shift),0);

// Presentation for the authoritative DayNightCycle bodies, behind clouds and terrain.
export class LayeredCelestialView {
  constructor(scene,clock) {
    this.scene=scene;this.clock=clock;this.keys=[];
    const cfg=CONFIG.celestial,source=scene.textures.get(CONFIG.celestialAtlas.key).getSourceImage();
    const size=Math.floor(source.width/2);
    for(const [column,body] of ["sun","moon"].entries()){
      const key=cfg.texturePrefix+body;
      const texture=scene.textures.createCanvas(key,size,source.height),ctx=texture.getContext();
      ctx.drawImage(source,column*size,0,size,source.height,0,0,size,source.height);
      // The generated aureole reaches the cell edge; soften it in an owned texture.
      // Keep the full authored disc and leave a genuinely transparent guard all around.
      const radius=Math.min(size,source.height);
      const halo=ctx.createRadialGradient(size/2,source.height/2,radius*cfg.haloCore,
        size/2,source.height/2,radius*cfg.haloEdge);
      halo.addColorStop(0,"rgba(255,255,255,1)");halo.addColorStop(1,"rgba(255,255,255,0)");
      ctx.globalCompositeOperation="destination-in";ctx.fillStyle=halo;ctx.fillRect(0,0,size,source.height);
      ctx.globalCompositeOperation="source-over";texture.refresh();this.keys.push(key);
      this[body]=scene.add.image(-size,-size,key).setScrollFactor(1).setDepth(cfg.depth)
        .setDisplaySize(body==="sun"?cfg.sunSizePx:cfg.moonSizePx,body==="sun"?cfg.sunSizePx:cfg.moonSizePx);
      this[body].name="layered-celestial:"+body;
    }
  }
  update(weather) {
    const cfg=CONFIG.celestial,sun=this.clock.getSunState();
    const horizon=1-clamp01(sun.elevation);
    this.sun.setTint(mix(cfg.sunDayTint,cfg.sunHorizonTint,horizon*horizon));
    this.moon.setTint(cfg.moonTint).setAlpha(this.moon.alpha*(1-clamp01(weather.cloudCoverAmount)*cfg.moonCoverExtinction));
  }
  snapshot() {
    return Object.fromEntries(["sun","moon"].map(body=>[body,{x:this[body].x,y:this[body].y,
      alpha:this[body].alpha,width:this[body].displayWidth,depth:this[body].depth,
      scrollFactor:this[body].scrollFactorX,texture:this[body].texture.key}]));
  }
  destroy() {
    this.sun.destroy();this.moon.destroy();
    for(const key of this.keys)this.scene.textures.remove(key);
    this.keys.length=0;
  }
}
