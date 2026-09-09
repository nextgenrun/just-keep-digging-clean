import { LEVEL_TWO_SCENIC_MOTION as CONFIG } from "../../../values/levelTwoScenicMotion.js";

// Continuous falling detail inside bright water channels; rock pixels remain unchanged.
export function createWaterfallPipeline(scene,assetId){
  const manager=scene.game?.renderer?.pipelines;
  if(!manager||!globalThis.Phaser?.Renderer?.WebGL)return null;
  const c=CONFIG.water,key=c.pipelinePrefix+assetId,existing=manager.get(key);
  if(existing)return {key,pipeline:existing,owned:false};
  const n=value=>Number(value).toFixed(5);
  const boxes=c.channels[assetId].filter(box=>box[1]>box[0]);
  const fragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform float uFlowTime;
varying vec2 outTexCoord;
varying vec4 outTint;
float flowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float flowNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(flowHash(i),flowHash(i+vec2(1.0,0.0)),f.x),mix(flowHash(i+vec2(0.0,1.0)),flowHash(i+1.0),f.x),f.y);
}
vec3 fallingSample(vec4 box,float travel,float offset,float ripple){
  float phase=fract(travel-uFlowTime*${n(c.flowRate)}+offset);
  vec2 uv=vec2(outTexCoord.x+ripple,mix(box.z,box.w,phase));
  float weight=sin(phase*3.14159265);weight*=weight;
  return vec3(texture2D(uMainSampler,uv).g*weight,weight,0.0);
}
vec4 waterFlow(vec4 base,vec4 box){
  vec2 uv=outTexCoord;
  if(uv.x<box.x||uv.x>box.y||uv.y<box.z||uv.y>box.w)return base;
  float edge=smoothstep(box.x,box.x+${n(c.edgeFeather)},uv.x)*(1.0-smoothstep(box.y-${n(c.edgeFeather)},box.y,uv.x));
  edge*=smoothstep(box.z,box.z+${n(c.edgeFeather)},uv.y)*(1.0-smoothstep(box.w-${n(c.edgeFeather)},box.w,uv.y));
  float mask=edge*smoothstep(${n(c.brightnessLow)},${n(c.brightnessHigh)},base.g)*base.a;
  float y=(uv.y-box.z)/(box.w-box.z);
  float travel=pow(y,${n(c.accelerationPower)});
  float ripple=sin(uv.y*${n(c.rippleFrequency)}-uFlowTime*${n(c.rippleSpeed)})*${n(c.ripplePx)};
  // Three overlapping phases fade out their wrap points, so flow never snaps or reverses.
  vec3 samples=fallingSample(box,travel,0.0,ripple)+fallingSample(box,travel,1.0/3.0,-ripple)+fallingSample(box,travel,2.0/3.0,ripple*.5);
  float detail=samples.x/max(.001,samples.y);
  float falling=travel*${n(c.streakFrequency)}-uFlowTime*${n(c.streakSpeed)};
  float breakup=flowNoise(vec2(uv.x*${n(c.crossFrequency)}*.57+19.0,travel*${n(c.breakupFrequency)}-uFlowTime*${n(c.breakupSpeed)}));
  float streak=flowNoise(vec2(uv.x*${n(c.crossFrequency)},falling))-.5;
  float gain=${n(c.sourceFloor)}+detail*${n(c.sourceGain)}+streak*${n(c.highlightStrength)};
  vec3 water=base.rgb*gain+base.rgb*(breakup-.5)*${n(c.foamStrength)};
  return vec4(mix(base.rgb,water,mask*${n(c.flowMix)}),base.a);
}
void main(){
  vec4 color=texture2D(uMainSampler,outTexCoord);
  ${boxes.map(box=>"color=waterFlow(color,vec4("+box.map(n).join(",")+"));").join("\n")}
  gl_FragColor=color*vec4(outTint.bgr*outTint.a,outTint.a);
}`;
  class WaterfallPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline{
    constructor(game){super({game,fragShader:fragment});this.flowSeconds=0;}
    onPreRender(){this.set1f("uFlowTime",this.flowSeconds);}
  }
  return {key,pipeline:manager.add(key,new WaterfallPipeline(scene.game)),owned:true};
}

