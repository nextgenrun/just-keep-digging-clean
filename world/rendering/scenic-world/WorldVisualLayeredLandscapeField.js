import { createLayeredMotionPipeline } from "./WorldVisualLayeredMotionPipeline.js";
import { WorldVisualLandscapeSections } from "./WorldVisualLandscapeSections.js";
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
import { multiplyWorldVisualSkyTints } from "../../../values/worldVisualSkyCohesion.js";

// Streams continuous painted mountain and forest sections with rooted wind motion.
export class WorldVisualLayeredLandscapeField{
  constructor(scene,owner){
    this.scene=scene;this.owner=owner;this.cards=new Map();this.sections=new Map();
    this.motion=createLayeredMotionPipeline(scene,"foliage");
  }
  update(camera,lighting,visible){
    if(this.motion)Object.assign(this.motion.pipeline,{motionSeconds:this.owner.clouds?.traveledSeconds||0,
      windDistance:this.owner.clouds?.windDistance||0,gust:lighting.environment?.gust||0});
    const view=camera.worldView,surface=this.scene.config.topAirRows*this.scene.config.tileSize,desired=new Set();
    if(visible)for(const layer of CONFIG.landscapeLayers){
      const base=surface+layer.bottomOffsetPx;
      const offsets=layer.family==="forest"?CONFIG.forestOffsets:CONFIG.ridgeOffsets;
      if(view.y>base+Math.max(...offsets)||view.bottom<base+Math.min(...offsets)-layer.heightPx)continue;
      let sections=this.sections.get(layer.id);
      if(!sections){sections=new WorldVisualLandscapeSections(this.scene,this.owner,layer);this.sections.set(layer.id,sections);}
      const left=view.x-camera.scrollX*(1-layer.parallaxX),margin=CONFIG.streamPaddingPx;
      for(let col=Math.floor((left-margin)/sections.stride);col<=Math.floor((left+view.width+margin)/sections.stride);col++){
        const id=layer.id+":"+col;desired.add(id);
        let image=this.cards.get(id);
        if(!image){
          const {key,frame}=sections.texture(col);
          image=this.scene.add.image(col*sections.stride,base+sections.maxOffset,key,frame).setOrigin(0,1)
            .setScrollFactor(layer.parallaxX,1).setDepth(layer.depth).setAlpha(layer.alpha);
          if(this.motion&&layer.family==="forest")image.setPipeline(this.motion.key);
          image.name="regenerated-landscape:"+id;this.cards.set(id,image);
        }
        image.setTint(multiplyWorldVisualSkyTints(layer.tint,lighting.environment?.terrainTint??lighting.farTint));
      }
    }
    for(const [id,image]of this.cards){if(!desired.has(id)){image.destroy();this.cards.delete(id);}}
  }
  destroy(){
    for(const image of this.cards.values())image.destroy();this.cards.clear();this.sections.clear();
    if(this.motion?.owned)this.scene.game.renderer.pipelines.remove(this.motion.key);
  }
}
