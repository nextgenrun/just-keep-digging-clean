import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
import { blendRidgeSilhouettes } from "./landscapeRidgeJoin.js";
const wrap=(value,length)=>((value%length)+length)%length;
const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

// Keep opaque crowns/ridges intact through the blend; only the join borders taper them.
export function landscapeJoinWeights(x,stride,overlap,feather){
  if(x>=overlap&&x<stride)return null;
  const right=x>=stride,position=right?x-stride:x;
  return {right,t:ease(position/overlap),outgoing:ease((overlap-position)/feather),incoming:ease(position/feather)};
}

// Crossfades neighbouring painted sections once, preserving their silhouette coverage.
export class WorldVisualLandscapeSections{
  constructor(scene,owner,layer){
    this.scene=scene;this.owner=owner;this.layer=layer;this.keys=new Map();
    this.assets=layer.family==="forest"?[CONFIG.forestAsset]:CONFIG.ridges;
    this.offsets=layer.family==="forest"?CONFIG.forestOffsets:CONFIG.ridgeOffsets;
    this.sources=this.assets.map(asset=>{
      const key=layer.family==="forest"?asset.key:owner.featherTexture(asset.key,0,0);
      const source=scene.textures.get(key).getSourceImage(),scale=Math.min(1,layer.heightPx/source.height);
      return {source,width:source.width*scale,height:source.height*scale};
    });
    this.period=Math.max(this.assets.length,this.offsets.length);
    this.stride=Math.floor(Math.min(...this.sources.map(s=>s.width)))-layer.overlapPx;
    this.maxOffset=Math.max(...this.offsets);this.minOffset=Math.min(...this.offsets);
    this.height=Math.ceil(Math.max(...this.sources.map(s=>s.height))+this.maxOffset-this.minOffset);
    this.pad=CONFIG.landscapeJoin.paddingPx;
    this.blendColumns=Array.from({length:this.stride+this.pad*2},(_,x)=>landscapeJoinWeights(
      x-this.pad,this.stride,layer.overlapPx,CONFIG.landscapeJoin.coverageFeatherPx));
  }
  variant(column){
    const index=wrap(column+this.layer.variantOffset,this.assets.length);
    return {...this.sources[index],offset:this.layer.family==="forest"?this.offsets[wrap(column,this.offsets.length)]:this.offsets[index]};
  }
  texture(column){
    const phase=wrap(column,this.period);
    if(this.keys.has(phase))return this.keys.get(phase);
    const key=CONFIG.landscapeJoin.texturePrefix+this.layer.id+":"+phase;
    const width=this.stride+this.pad*2,height=this.height;
    const texture=this.scene.textures.createCanvas(key,width,height),ctx=texture.getContext();
    const draw=(item,x)=>{
      ctx.clearRect?.(0,0,width,height);
      ctx.drawImage(item.source,x,height-this.maxOffset+item.offset-item.height,item.width,item.height);
      return ctx.getImageData(0,0,width,height);
    };
    const previous=draw(this.variant(column-1),this.pad-this.stride);
    const current=draw(this.variant(column),this.pad);
    const next=draw(this.variant(column+1),this.pad+this.stride);
    const pixels=current.data;
    if(this.layer.family==="ridges"){
      blendRidgeSilhouettes(current,previous,next,this.blendColumns,CONFIG.landscapeJoin.ridgeSilhouetteAlpha);
    }else{
    // A transparent incoming silhouette must not erase an opaque outgoing tree or peak.
    for(let i=0;i<pixels.length;i+=4){
      const weights=this.blendColumns[(i/4)%width];
      if(!weights)continue;
      const other=weights.right?next.data:previous.data;
      const from=weights.right?pixels:other,to=weights.right?other:pixels;
      const fromAlpha=from[i+3]/255,toAlpha=to[i+3]/255;
      const a=fromAlpha*(1-weights.t),b=toAlpha*weights.t,sum=a+b;
      const alpha=Math.max(fromAlpha*weights.outgoing,toAlpha*weights.incoming);
      for(let c=0;c<3;c++)pixels[i+c]=sum>0?(from[i+c]*a+to[i+c]*b)/sum:0;
      pixels[i+3]=alpha*255;
    }
    }
    ctx.putImageData(current,0,0);texture.refresh();
    const frame=CONFIG.landscapeJoin.frameName;
    texture.add(frame,0,this.pad,0,this.stride,height);
    this.owner.ownedTextureKeys.add(key);this.keys.set(phase,{key,frame});
    return {key,frame};
  }
}
