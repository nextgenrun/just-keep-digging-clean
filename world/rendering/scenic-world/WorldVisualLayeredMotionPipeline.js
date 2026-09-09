import { LAYERED_ATMOSPHERE_MOTION as CONFIG } from "../../../values/layeredAtmosphereMotion.js";

// Deforms existing cloud/foliage art within its own frame, without atlas bleeding.
export function createLayeredMotionPipeline(scene,kind){
  const manager=scene.game?.renderer?.pipelines;
  if(!manager||!globalThis.Phaser?.Renderer?.WebGL)return null;
  const key=CONFIG.pipelinePrefix+kind,existing=manager.get(key);
  if(existing)return {key,pipeline:existing,owned:false};
  const c=CONFIG.cloud,f=CONFIG.foliage,n=value=>Number(value).toFixed(5);
  const fragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec4 uFrame;
uniform vec4 uMotion;
uniform vec2 uSize;
uniform vec2 uCloud;
varying vec2 outTexCoord;
varying vec4 outTint;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+1.0),f.x),f.y);
}
float field(vec2 p){return (noise(p)+noise(p*${n(c.detailScale)}+7.0)*${n(c.detailWeight)})/(1.0+${n(c.detailWeight)});}
void main(){
  vec2 uv=(outTexCoord-uFrame.xy)/(uFrame.zw-uFrame.xy);
  float opacity=1.0;
  ${kind==="cloud"?`
  vec2 p=uv*vec2(${n(c.fieldX)},${n(c.fieldY)})+uMotion.w;
  p-=vec2(uMotion.y*${n(c.advection)},uMotion.x*${n(c.rollSpeed)});
  float billow=field(p),roll=field(p+vec2(8.7,2.4));
  float strength=(1.0+uMotion.z*${n(c.gustGain)})*mix(1.0,${n(c.cumulusWarp)},uCloud.y);
  uv+=vec2(billow-.5,roll-.5)*vec2(${n(c.warpX)},${n(c.warpY)})*strength;
  opacity=${n(c.opacityLow)}+billow*${n(c.opacityGain)};
  `:`
  float roots=1.0-smoothstep(${n(f.rootStart)},${n(f.rootEnd)},uv.y);
  float worldX=uMotion.w+uv.x*uSize.x;
  float bend=sin(worldX*${n(f.waveLength)}-uMotion.y*${n(f.waveSpeed)})
    +sin(worldX*${n(f.flutterLength)}-uMotion.y*${n(f.flutterSpeed)})*${n(f.flutterGain)};
  uv.x+=bend*roots*roots*(${n(f.swayPx)}+uMotion.z*${n(f.gustGain)})/uSize.x;
  `}
  ${kind==="cloud"?`
  vec2 edge=min(uv,1.0-uv);
  float inside=smoothstep(0.0,${n(c.edgeFade)},edge.x)*smoothstep(0.0,${n(c.edgeFade)},edge.y);
  vec2 sampleUv=mix(uFrame.xy,uFrame.zw,clamp(uv,vec2(${n(c.frameInset)}),vec2(1.0-${n(c.frameInset)})));
  vec4 color=texture2D(uMainSampler,sampleUv);
  color.rgb=mix(color.rgb,vec3(dot(color.rgb,vec3(.2126,.7152,.0722))),mix(${n(c.desaturate)},${n(c.cumulusDesaturate)},uCloud.y));
  // Optical thickness fills cloudy cores smoothly without changing the streamed grid.
  float denseAlpha=1.0-pow(max(0.0,1.0-color.a),uCloud.x*opacity);
  color.rgb*=denseAlpha/max(color.a,.0001);color.a=denseAlpha;
  gl_FragColor=color*vec4(outTint.bgr*outTint.a,outTint.a)*inside;
  `:`
  // Guard bands contain real neighbouring pixels for crowns crossing a section boundary.
  vec2 sampleUv=clamp(mix(uFrame.xy,uFrame.zw,uv),vec2(0.0),vec2(1.0));
  gl_FragColor=texture2D(uMainSampler,sampleUv)*vec4(outTint.bgr*outTint.a,outTint.a);
  `}
}`;
  class LayerMotionPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline{
    constructor(game){super({game,fragShader:fragment});this.motionSeconds=0;this.windDistance=0;this.gust=0;this.thickness=1;}
    onBind(image){
      if(!image?.frame)return;
      // Flush before changing per-sprite uniforms, including the selected atlas frame.
      this.flush();
      const frame=image.frame;
      this.set4f("uFrame",frame.u0,frame.v0,frame.u1,frame.v1);
      this.set4f("uMotion",this.motionSeconds,this.windDistance,this.gust,kind==="cloud"?(image.pipelineData?.phase||0):image.x);
      this.set2f("uSize",image.displayWidth,image.displayHeight);
      if(kind==="cloud")this.set2f("uCloud",image.pipelineData?.thickness??this.thickness,image.pipelineData?.cumulus?1:0);
    }
  }
  return {key,pipeline:manager.add(key,new LayerMotionPipeline(scene.game)),owned:true};
}
