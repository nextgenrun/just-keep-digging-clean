import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
import { WORLD_DEPTH_CONFIG } from "../../../values/worldDepthConfig.js";
import { mixLayeredColor } from "./WorldVisualLayeredEnvironment.js";
const clamp = t => Math.max(0,Math.min(1,t));
const smooth = t => {t=clamp(t);return t*t*(3-2*t);};

// Sparse canopy seeds and dusk glimmers: world anchored, always moving, and bounded.
export class WorldVisualLayeredFloatingDetails {
  constructor(scene){this.scene=scene;this.active=new Map();this.pool=[];}
  update(motion,environment,visible){
    const cfg=CONFIG.floatingDetails,scene=this.scene,camera=scene.cameras.main,view=camera.worldView;
    const surface=scene.config.topAirRows*scene.config.tileSize,time=motion.traveledSeconds;
    const left=view.x-camera.scrollX*(1-cfg.parallaxX),margin=CONFIG.streamPaddingPx;
    const drift=motion.windDistance*cfg.windSpeed,desired=new Set();
    const weatherAlpha=(1-environment.rain*cfg.rainSuppression)*(1-environment.storm*cfg.stormSuppression);
    if(visible&&view.bottom>surface-cfg.bandHeightPx&&view.y<surface){
      const first=Math.floor((left-drift-margin)/cfg.columnSpacingPx);
      const last=Math.ceil((left+view.width-drift+margin)/cfg.columnSpacingPx);
      for(let column=first;column<=last;column++)for(let kind=0;kind<2;kind++){
        if(desired.size>=cfg.maxSprites)break;
        const seed=Math.abs(Math.imul(column,CONFIG.cloudJitter.columnSeed)^Math.imul(kind+1,cfg.seed));
        const random=(seed%cfg.seedSteps)/cfg.seedSteps;
        const phase=(time/cfg.lifetimeSeconds+random)%1;
        const angle=time*cfg.curlSpeed+random*Math.PI*2;
        const x=column*cfg.columnSpacingPx+drift+Math.sin(angle)*cfg.curlWidthPx;
        const y=surface-cfg.groundClearancePx-cfg.bandHeightPx*(kind?phase:1-phase)+Math.cos(angle)*cfg.curlHeightPx;
        const west=cfg.startTile*scene.config.tileSize*cfg.parallaxX;
        const east=(WORLD_DEPTH_CONFIG.levelTwoLeftTile+1)*scene.config.tileSize*cfg.parallaxX;
        const edge=smooth((x-west)/cfg.boundaryFadePx)*smooth((east-x)/cfg.boundaryFadePx);
        if(!edge||x<left-margin||x>left+view.width+margin)continue;
        const id=kind+":"+column;desired.add(id);
        let image=this.active.get(id);
        if(!image){
          image=this.pool.pop()||scene.add.image(x,y,CONFIG.detailAssets[kind].key);
          image.setTexture(CONFIG.detailAssets[kind].key).setDepth(cfg.depth)
            .setScrollFactor(cfg.parallaxX,1).setVisible(true);
          image.name="layered-floating:"+id;this.active.set(id,image);
        }
        const width=cfg.minWidthPx+(cfg.maxWidthPx-cfg.minWidthPx)*random;
        const flutter=kind?1:cfg.flutterBase+Math.sin(time*cfg.flutterSpeed+random*Math.PI*2)*cfg.flutterGain;
        image.setDisplaySize(width*flutter,width).setPosition(x,y).setRotation(kind?0:angle);
        const envelope=smooth(phase/cfg.fadeFraction)*smooth((1-phase)/cfg.fadeFraction);
        const presence=kind?environment.night:1-environment.night*cfg.nightLeafDim;
        image.setAlpha(envelope*edge*weatherAlpha*presence*(kind?cfg.glimmerAlpha:cfg.leafAlpha))
          .setTint(kind?cfg.glimmerTint:mixLayeredColor(cfg.clearTint,cfg.nightTint,environment.night));
      }
    }
    for(const [id,image] of this.active){if(!desired.has(id)){image.setVisible(false);this.pool.push(image);this.active.delete(id);}}
    while(this.active.size+this.pool.length>cfg.maxSprites)this.pool.pop()?.destroy();
  }
  snapshot(){return {active:this.active.size,visible:[...this.active.values()].filter(i=>i.alpha>CONFIG.floatingDetails.visibleAlpha).length,pooled:this.pool.length};}
  destroy(){for(const image of [...this.active.values(),...this.pool])image.destroy();this.active.clear();this.pool.length=0;}
}
