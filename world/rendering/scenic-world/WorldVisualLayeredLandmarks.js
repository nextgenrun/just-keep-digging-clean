import { LEVEL_TWO_SCENIC_MOTION as CONFIG } from "../../../values/levelTwoScenicMotion.js";
import { WORLD_DEPTH_CONFIG } from "../../../values/worldDepthConfig.js";
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as SKY } from "../../../values/worldVisualLayeredSkyReview.js";
import { createWaterfallPipeline } from "./WorldVisualWaterfallPipeline.js";

// Fixed cliffs with flowing channels and continuously born, rising, dissipating spray.
export class WorldVisualLayeredLandmarks{
  constructor(scene,owner){
    this.scene=scene;this.owner=owner;this.items=[];this.pipelines=[];
    for(const asset of CONFIG.assets)this.pipelines.push(createWaterfallPipeline(scene,asset.id));
    for(const placement of CONFIG.placements){
      if(placement.tileX<WORLD_DEPTH_CONFIG.levelTwoLeftTile||placement.tileX>WORLD_DEPTH_CONFIG.levelTwoRightTile)continue;
      const asset=CONFIG.assets.find(asset=>asset.id===placement.asset);
      const source=scene.textures.get(asset.key).getSourceImage(),scale=Math.min(1,placement.heightPx/source.height);
      const width=source.width*scale,height=source.height*scale;
      const x=placement.tileX*scene.config.tileSize*CONFIG.parallaxX+CONFIG.referenceWidthPx*(1-CONFIG.parallaxX)/2-width/2;
      const y=scene.config.topAirRows*scene.config.tileSize+placement.bottomOffsetPx-height;
      const key=owner.featherTexture(asset.key,CONFIG.edgeFeatherPx/scale,0,true);
      const image=scene.add.image(x,y,key).setOrigin(0).setScale(scale).setScrollFactor(CONFIG.parallaxX,1).setDepth(CONFIG.depth);
      image.name="regenerated-landmark:"+placement.id;
      const pipeline=this.pipelines[CONFIG.assets.indexOf(asset)];
      if(pipeline)image.setPipeline(pipeline.key);
      const channels=CONFIG.water.channels[asset.id].filter(box=>box[1]>box[0]),spray=[];
      for(const [channel,box]of channels.entries())for(let puff=0;puff<CONFIG.spray.puffsPerChannel;puff++){
        const sx=x+width*(box[0]+box[1])/2,sy=y+height*box[3];
        const index=channel*CONFIG.spray.puffsPerChannel+puff;
        const sprite=scene.add.image(sx,sy,SKY.cloudAtlas.key,owner.clouds.frames[index%owner.clouds.frames.length])
          .setScale(CONFIG.spray.scaleStart).setScrollFactor(CONFIG.parallaxX,1).setDepth(CONFIG.spray.depth);
        sprite.name="regenerated-waterfall-spray:"+placement.id+":"+index;
        if(owner.clouds.motion)sprite.setPipeline(owner.clouds.motion.key,{phase:index});
        spray.push({sprite,x:sx,y:sy,index,phase:puff/CONFIG.spray.puffsPerChannel,
          lifetime:CONFIG.spray.lifetimes[(index+CONFIG.placements.indexOf(placement))%CONFIG.spray.lifetimes.length]});
      }
      this.items.push({id:placement.id,image,spray,channels:channels.length,x,y,width,height,tileX:placement.tileX});
    }
  }
  update(camera,environment,seconds,visible){
    for(const value of this.pipelines)if(value)value.pipeline.flowSeconds=seconds;
    const view=camera.worldView,left=view.x-camera.scrollX*(1-CONFIG.parallaxX),cfg=CONFIG.spray;
    const wind=this.owner.clouds.wind;
    for(const item of this.items){
      const shown=visible&&item.x+item.width>left&&item.x<left+view.width&&item.y+item.height>view.y&&item.y<view.bottom;
      item.image.setVisible(shown).setTint(environment.terrainTint);
      for(const spray of item.spray){
        const progress=seconds/spray.lifetime+spray.phase,cycle=Math.floor(progress);
        const life=progress-cycle,age=life*spray.lifetime;
        if(spray.cycle!==cycle){spray.cycle=cycle;spray.birthWind=this.owner.clouds.windDistance-age*wind;}
        const windTravel=this.owner.clouds.windDistance-spray.birthWind;
        const envelope=Math.sin(Math.PI*life)**2;
        const curl=Math.sin(age*cfg.curlSpeed+spray.index)*cfg.curlPx*life;
        const spread=(spray.phase-.5)*cfg.spreadPx;
        spray.sprite.setVisible(shown).setTint(environment.cloudTint)
          .setPosition(spray.x+spread+windTravel*cfg.driftPxPerSecond+curl,spray.y-age*cfg.liftPxPerSecond)
          .setScale(cfg.scaleStart+(cfg.scaleEnd-cfg.scaleStart)*life)
          .setAlpha(cfg.alpha*envelope*(1+environment.rain*cfg.rainGain));
      }
    }
  }
  snapshot(){return this.items.map(item=>({id:item.id,tileX:item.tileX,visible:item.image.visible,flowing:!!item.image.pipeline?.flowSeconds,
    scale:item.image.scaleX,waterfalls:item.channels,sprayPuffs:item.spray.length}));}
  destroy(){
    for(const item of this.items){item.image.destroy();for(const spray of item.spray)spray.sprite.destroy();}
    for(const value of this.pipelines)if(value?.owned)this.scene.game.renderer.pipelines.remove(value.key);
    this.items.length=0;
  }
}

