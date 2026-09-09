import { LEVEL_ONE_AMBIENT_EVENTS as C } from "../../../values/levelOneAmbientEvents.js";
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as SKY } from "../../../values/worldVisualLayeredSkyReview.js";
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};

// One rare visual event at a time: gliding flocks, windblown leaves or dusk fireflies.
export class WorldVisualLevelOneAmbientEvents {
  constructor(scene){
    this.scene=scene;this.event=null;this.actors=[];this.frames=[];this.eventsStarted=0;
    this.randomState=C.seed;this.nextAt=this.range(C.warmupSeconds);
    this.reducedMotion=globalThis.matchMedia?.(C.reducedMotionQuery)?.matches===true;
    const value=new URLSearchParams(globalThis.location?.search||"").get(C.queryParam)?.toLowerCase();
    this.enabled=C.enabled&&!C.disabledValues.includes(value)&&!this.reducedMotion
      &&scene.gameplayCapabilities?.isLevelEnabled?.(2)!==true;
    if(this.enabled)this.registerBirdFrames();
  }
  random(){this.randomState=(Math.imul(this.randomState,C.randomMultiplier)+C.randomIncrement)>>>0;return this.randomState/C.randomDivisor;}
  range([min,max]){return min+(max-min)*this.random();}
  registerBirdFrames(){
    if(!this.scene.textures.exists(C.birdAsset.key))return;
    const texture=this.scene.textures.get(C.birdAsset.key),source=texture.getSourceImage();
    const w=Math.floor(source.width/C.atlas.columns),h=Math.floor(source.height/C.atlas.rows);
    for(let i=0;i<C.atlas.columns*C.atlas.rows;i++){
      const name=C.atlas.framePrefix+i;
      if(!texture.has(name)){texture.add(name,0,i%C.atlas.columns*w,Math.floor(i/C.atlas.columns)*h,w,h);this.frames.push(name);}
    }
  }
  bounds(kind){
    const cfg=C[kind],camera=this.scene.cameras.main,view=camera.worldView;
    const surface=this.scene.config.topAirRows*this.scene.config.tileSize;
    const minY=Math.max(view.y+view.height*C.viewInsetFraction,surface-cfg.altitudePx[1]);
    const maxY=Math.min(view.bottom-view.height*C.viewInsetFraction,surface-cfg.altitudePx[0]);
    return {left:view.x-camera.scrollX*(1-cfg.parallaxX),width:view.width,minY,maxY};
  }
  update(motion,environment,visible){
    if(!this.enabled)return;
    const time=motion.traveledSeconds,view=this.scene.cameras.main.worldView;
    const forest=view.x+view.width/2>C.forestStartTile*this.scene.config.tileSize;
    if(!visible){this.clear();this.nextAt=Math.max(this.nextAt,time+C.warmupSeconds[0]);return;}
    if(this.event){
      const e=this.event;
      if(Math.abs(view.x-e.viewX)>view.width*C.teleportViewFraction||Math.abs(view.y-e.viewY)>view.height*C.teleportViewFraction){
        this.clear();this.nextAt=time+C.warmupSeconds[0];return;
      }
      if(time-e.start>=e.duration){this.clear();this.nextAt=time+this.range(C.quietSeconds);return;}
      this.render(time,environment);return;
    }
    if(time<this.nextAt)return;
    this.nextAt=time+C.retrySeconds;
    if(environment.rain>C.maxRain||environment.storm>C.maxStorm)return;
    const birdBounds=this.bounds("birds"),canBird=environment.night<C.birdNightLimit
      &&birdBounds.maxY>birdBounds.minY&&this.frames.length>0;
    const kind=canBird&&(!forest||this.random()<C.birdChance)?"birds"
      :forest?(environment.night>C.glimmerNightMinimum?"glimmers":"leaves"):null;
    if(!kind)return;
    const bounds=kind==="birds"?birdBounds:this.bounds(kind);
    if(bounds.maxY<=bounds.minY)return;
    this.start(kind,time,bounds,environment);this.render(time,environment);
  }
  start(kind,time,bounds,environment){
    const cfg=C[kind],view=this.scene.cameras.main.worldView;
    const count=Math.min(C.maxSprites,Math.floor(this.range([cfg.count[0],cfg.count[1]+1])));
    const direction=Math.abs(environment.wind)>SKY.wind.directionThreshold?Math.sign(environment.wind):(this.random()<.5?-1:1);
    const speed=this.range(cfg.speedPx),y=this.range([bounds.minY,bounds.maxY]);
    const x=kind==="birds"?(direction>0?bounds.left-C.viewMarginPx:bounds.left+bounds.width+C.viewMarginPx)
      :bounds.left+bounds.width*(C.viewInsetFraction+this.random()*(1-2*C.viewInsetFraction));
    const duration=kind==="birds"?(bounds.width+2*C.viewMarginPx+count*cfg.formationGapPx)/speed+cfg.fadeSeconds
      :cfg.durationSeconds+count*cfg.delaySeconds;
    this.event={kind,start:time,duration,direction,speed,x,y,viewX:view.x,viewY:view.y};this.eventsStarted++;
    for(let i=0;i<count;i++){
      const key=kind==="birds"?C.birdAsset.key:SKY.detailAssets[kind==="glimmers"?1:0].key;
      const image=this.scene.add.image(x,y,key).setScrollFactor(cfg.parallaxX,1).setDepth(cfg.depth).setAlpha(0).setTint(cfg.tint);
      image.name="level-one-ambient:"+kind+":"+i;
      if(kind==="birds")image.setFlipX(direction<0);
      this.actors.push({image,index:i,width:this.range(cfg.widthPx),phase:this.random()*Math.PI*2,
        glide:kind==="birds"?this.range(cfg.glideSeconds):0,wingFps:kind==="birds"?this.range(cfg.wingFps):0});
    }
  }
  render(time,environment){
    const e=this.event,cfg=C[e.kind],age=time-e.start;
    const weather=(1-smooth(environment.rain/C.maxRain))*(1-smooth(environment.storm/C.maxStorm));
    for(const actor of this.actors){
      const {image,index,width,phase}=actor;
      if(e.kind==="birds"){
        const cycle=(age+index*cfg.phaseOffset)%(cfg.flapSeconds+actor.glide);
        const frame=cycle<cfg.flapSeconds?cfg.frameSequence[Math.floor(cycle*actor.wingFps)%cfg.frameSequence.length]:cfg.glideFrame;
        image.setFrame(C.atlas.framePrefix+frame).setOrigin(...C.atlas.bodyOrigins[frame]);
        const size=width/C.atlas.artWidthFraction;
        image.setDisplaySize(size,size).setPosition(e.x+e.direction*(age*e.speed-index*cfg.formationGapPx),
          e.y+index*cfg.formationRisePx+Math.sin(age*cfg.swaySpeed+phase)*cfg.swayPx)
          .setRotation(Math.sin(age*cfg.swaySpeed+phase)*cfg.bankRadians);
        image.setAlpha(cfg.alpha*weather*(1-smooth(environment.night/C.birdNightLimit))
          *smooth(age/cfg.fadeSeconds)*smooth((e.duration-age)/cfg.fadeSeconds));
      }else{
        const elapsed=age-index*cfg.delaySeconds,progress=clamp(elapsed/cfg.durationSeconds),angle=elapsed*cfg.curlSpeed+phase;
        const envelope=smooth(progress/C.fadeFraction)*smooth((1-progress)/C.fadeFraction);
        const glimmer=e.kind==="glimmers",flutter=glimmer?1:C.leafFlutterBase+Math.sin(elapsed*cfg.flutterSpeed+phase)*C.leafFlutterGain;
        const presence=glimmer?environment.night*(C.glimmerBreathBase+Math.sin(angle)*C.glimmerBreathGain):1-environment.night;
        image.setDisplaySize(width*flutter,width).setPosition(e.x+e.direction*elapsed*e.speed+index*cfg.spreadPx+Math.sin(angle)*cfg.curlPx,
          e.y-Math.sin(progress*Math.PI)*cfg.liftPx+progress*progress*cfg.fallPx+Math.cos(angle)*cfg.curlPx)
          .setRotation(glimmer?0:angle).setAlpha(envelope*cfg.alpha*weather*presence);
      }
    }
  }
  clear(){for(const actor of this.actors)actor.image.destroy();this.actors.length=0;this.event=null;}
  snapshot(){return {enabled:this.enabled,reducedMotion:this.reducedMotion,kind:this.event?.kind||null,
    active:this.actors.length,visible:this.actors.filter(a=>a.image.alpha>SKY.floatingDetails.visibleAlpha).length,
    eventsStarted:this.eventsStarted,nextAt:this.nextAt};}
  destroy(){
    this.clear();
    if(this.frames.length){const texture=this.scene.textures.get(C.birdAsset.key);for(const frame of this.frames)texture.remove(frame);}
    this.frames.length=0;
  }
}
