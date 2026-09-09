import { sampleLayeredCloudShape } from "./layeredCloudShape.js";
import { createLayeredMotionPipeline } from "./WorldVisualLayeredMotionPipeline.js";
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";

// Streams only the newly generated true-alpha cloud atlas, with continuous wind.
export class WorldVisualLayeredCloudField {
  constructor(scene) {
    this.scene=scene;this.active=new Map();this.pool=[];this.motion=createLayeredMotionPipeline(scene,"cloud");
    this.traveledSeconds=0;this.windDistance=0;this.wind=CONFIG.wind.base;this.windDirection=1;
    this.atlases=new Map();
    for(const [name,asset] of [["wisps",CONFIG.cloudAtlas],["cumulus",CONFIG.cumulusAtlas],["banks",CONFIG.cloudBankAtlas]]){
      const texture=scene.textures.get(asset.key),source=texture.getSourceImage(),grid=asset.grid;
      const rects=asset.frames||Array.from({length:grid.rows*grid.columns},(_,i)=>[
        i%grid.columns*Math.floor(source.width/grid.columns),Math.floor(i/grid.columns)*Math.floor(source.height/grid.rows),
        Math.floor(source.width/grid.columns),Math.floor(source.height/grid.rows)]);
      const width=Math.max(...rects.map(rect=>rect[2])),height=Math.max(...rects.map(rect=>rect[3])),frames=[];
      rects.forEach((rect,index)=>{
        const id="regenerated-"+name+":"+index;
        if(!texture.has(id))texture.add(id,0,...rect);
        frames.push(id);
      });
      this.atlases.set(name,{key:asset.key,width,height,frames,rects});
    }
  }

  update(deltaSeconds,lighting,visible){
    const environment=lighting.environment;
    const wind=environment?.wind ?? lighting.wind ?? 0;
    // Calm retarget noise must not reverse an entire bank of clouds.
    if(Math.abs(wind)>CONFIG.wind.directionThreshold)this.windDirection=Math.sign(wind);
    const targetWind=this.windDirection*(CONFIG.wind.base+Math.abs(wind)/CONFIG.wind.referenceSpeed
      +(environment?.gust||0)*CONFIG.wind.gustGain);
    this.wind+=(targetWind-this.wind)*(1-Math.exp(-deltaSeconds*CONFIG.wind.response));
    this.traveledSeconds+=deltaSeconds;
    this.windDistance+=deltaSeconds*this.wind;
    if(this.motion)Object.assign(this.motion.pipeline,{motionSeconds:this.traveledSeconds,windDistance:this.windDistance,gust:environment?.gust||0,thickness:environment?.cloudThickness||1});
    const camera=this.scene.cameras.main,view=camera.worldView;
    const desired=new Set(),jitter=CONFIG.cloudJitter;
    if(visible)for(const layer of CONFIG.cloudLayers){
      const left=view.x-camera.scrollX*(1-layer.parallaxX);
      const scrollY=layer.parallaxY;
      const ceiling=CONFIG.cloudCeiling;
      const baseBottom=(this.scene.config.topAirRows*this.scene.config.tileSize-ceiling.surfaceCameraClearancePx)*scrollY+layer.bandBottomPx;
      const top=view.y-camera.scrollY*(1-scrollY);
      const atlas=this.atlases.get(layer.atlas||"wisps");
      const maxWidth=atlas.width*layer.scale,maxHeight=atlas.height*layer.scale*(layer.heightScale??1);
      const drift=this.windDistance*layer.speed,margin=CONFIG.streamPaddingPx;
      const colMin=Math.floor((left-maxWidth-margin-drift-jitter.x)/layer.strideX);
      const colMax=Math.ceil((left+view.width+margin-drift+jitter.x)/layer.strideX);
      const rowMin=Math.floor((top-margin-baseBottom-jitter.y)/ceiling.rowSpacingPx);
      const rowMax=Math.min(0,Math.ceil((top+view.height+margin+maxHeight-baseBottom+jitter.y)/ceiling.rowSpacingPx));
      for(let row=rowMin;row<=rowMax;row++)for(let col=colMin;col<=colMax;col++){
        if(desired.size>=CONFIG.maxCloudSprites)break;
        const seed=Math.abs(Math.imul(col,jitter.columnSeed)^Math.imul(row,jitter.rowSeed)^layer.seed);
        const shape=sampleLayeredCloudShape(layer,seed,this.traveledSeconds,environment?.cover||0);
        const frameIndex=seed%atlas.frames.length;
        const width=atlas.rects[frameIndex][2]*shape.scaleX,height=atlas.rects[frameIndex][3]*shape.scaleY;
        const x=col*layer.strideX+drift+(seed%jitter.steps/jitter.steps-.5)*jitter.x+(maxWidth-width)/2;
        const phase=(seed>>>jitter.shift)%jitter.steps/jitter.steps-.5;
        const y=baseBottom+row*ceiling.rowSpacingPx+phase*jitter.y-height;
        if(x+width<left-margin||x>left+view.width+margin||y+height<top-margin||y>top+view.height+margin)continue;
        const id=layer.id+":"+row+":"+col;
        desired.add(id);
        let image=this.active.get(id);
        if(!image){
          image=this.pool.pop()||this.scene.add.image(x,y,atlas.key).setOrigin(0);
          image.setTexture(atlas.key,atlas.frames[frameIndex])
            .setScale(layer.scale).setDepth(layer.depth).setScrollFactor(layer.parallaxX,scrollY).setVisible(true);
          if(this.motion)image.setPipeline(this.motion.key,{phase:seed%jitter.steps,cumulus:layer.atlas==="cumulus"||layer.atlas==="banks"});
          image.name="regenerated-cloud:"+id;this.active.set(id,image);
        }
        const evolution=CONFIG.cloudEvolution;
        const bank=.5+.5*Math.sin(this.traveledSeconds/evolution.periodSeconds*Math.PI*2+seed%jitter.steps/jitter.steps*Math.PI*2);
        const localDensity=1+evolution.variation*(bank*2-1);
        if(this.motion)image.pipelineData.thickness=(environment?.cloudThickness||1)*localDensity;
        const mass=(layer.atlas==="cumulus"||layer.atlas==="banks")?Math.min(1,evolution.minimumBank+(environment?.cover||0)*evolution.coverGain)*localDensity:1;
        const opacity=environment ? environment.cloudOpacity : 1;
        image.setScale(shape.scaleX,shape.scaleY).setPosition(x,y).setAlpha(Math.min(CONFIG.environment.maxCloudAlpha,layer.alpha*opacity*mass*(layer.weatherOnly?(environment?.cover||0)**2:1)))
          .setTint(environment?.cloudTint ?? lighting.farTint);
      }
    }
    for(const [id,image]of this.active){
      if(desired.has(id))continue;
      image.setVisible(false);this.pool.push(image);this.active.delete(id);
    }
    while(this.active.size+this.pool.length>CONFIG.maxCloudSprites)this.pool.pop()?.destroy();
  }

  destroy(){
    for(const image of [...this.active.values(),...this.pool])image.destroy();
    this.active.clear();this.pool.length=0;
    for(const atlas of this.atlases.values()){
      const texture=this.scene.textures.get(atlas.key);
      for(const id of atlas.frames)texture.remove(id);
    }
    this.atlases.clear();
    if(this.motion?.owned)this.scene.game.renderer.pipelines.remove(this.motion.key);
  }
}
