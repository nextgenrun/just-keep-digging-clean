import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {renderInventoryStarAtlas} from "../../ui/overlays/UIInventoryStarAtlas.js";
import {animateBakedStar} from "../../ui/overlays/UIBakedStarMotion.js";
import {installUiStarIdleMotionFrames} from "../../ui/overlays/UIStarIdleMotion.js";
import {BAKED_CELESTIAL_ASSETS,BAKED_STAR_ATLASES} from "../../values/bakedCelestialUi.js";
import {STAR_IDENTITY_LIBRARY_CONFIG as config} from "../../values/starIdentityLibrary.js";
import {WORLD_VISUAL_SEMANTIC_ASSETS} from "../../values/worldVisualSemanticAssets.js";
globalThis.Phaser={BlendModes:{ADD:1,SCREEN:7}};
const textures=new Map(),objects=[];
for(const asset of [...config.atlases,...config.lightAtlases,config.inventory.foundation,
  config.inventory.emptyFoundation,...Object.values(BAKED_CELESTIAL_ASSETS)])textures.set(asset.key,new Map());
const scene={events:new EventEmitter().setMaxListeners(0),time:{now:0},game:{canvas:{width:2560}},scale:{width:1280},
  textures:{exists:key=>textures.has(key),get:key=>({
    has:frame=>textures.get(key).has(frame),
    add:(frame,source,x,y,width,height)=>textures.get(key).set(frame,{width,height}),
  })},add:{}};
function object(kind,x,y,key,frame) {
  const entry=new EventEmitter(),data=new Map(),dimensions=textures.get(key)?.get(frame)||{width:320,height:320};
  Object.assign(entry,{kind,x,y,width:dimensions.width,height:dimensions.height,key,frame,
    active:true,scaleX:1,scaleY:1,alpha:1,angle:0});
  entry.setData=(name,value)=>{data.set(name,value);return entry;};
  entry.getData=name=>data.get(name);
  entry.setTint=(...tint)=>{entry.tint=tint;return entry;};
  entry.setScale=(x,y=x)=>{entry.scaleX=x;entry.scaleY=y;return entry;};
  entry.setDisplaySize=(w,h)=>entry.setScale(w/entry.width,h/entry.height);
  entry.setAlpha=value=>{entry.alpha=value;return entry;};
  for(const method of ["setInteractive","setDepth","setScrollFactor","setOrigin","setBlendMode",
    "lineStyle","strokeCircle","setLineSpacing"])entry[method]=()=>entry;
  entry.destroy=()=>{entry.emit("destroy");entry.active=false;};
  objects.push(entry);return entry;
}
scene.add.image=(x,y,key,frame)=>object("image",x,y,key,frame);
scene.add.text=(x,y,text,style)=>{
  const entry=object("text",x,y);entry.width=Math.max(1,text.length*(parseFloat(style.fontSize)||12)/2);
  entry.height=parseFloat(style.fontSize)||12;return entry;
};
scene.add.zone=(x,y)=>object("zone",x,y);
scene.add.graphics=()=>object("graphics",0,0);
const shell={content:{parentContainer:{depth:3221},add(){}}};
const counts=config.identities.map(identity=>identity.rarityIndex===0?1:0);
const render=(selected=0)=>renderInventoryStarAtlas(scene,shell,
  {left:-450,top:-220,width:900,height:440},0,selected,counts,()=>{},()=>{});
let state=render();
assert.equal(state.identityIndex,0);assert.equal(state.pageCount,5);
const moving=objects.filter(x=>x.getData("bakedStarMotion"));
assert.equal(moving.length,13,"Only twelve medallions and the original baked portrait animate");
assert.equal(objects.filter(x=>x.getData("bakedStarIdentity")!==undefined).length,12);
assert.equal(moving.filter(x=>x.key===BAKED_STAR_ATLASES[0].key).length,12);
const geometry=entry=>[entry.x,entry.y,entry.scaleX,entry.scaleY,entry.angle,entry.alpha];
const before=moving.map(geometry),tints=moving.map(x=>x.tint.join(","));
scene.events.emit("update",1700);
assert.deepEqual(moving.map(geometry),before,"Motion must not move, rotate, pulse or stretch art");
assert.ok(moving.every((x,i)=>x.tint.join(",")!==tints[i]),"Every identity has subtle lighting motion");
assert.ok(moving.every(x=>Math.abs(x.scaleX-x.scaleY)<1e-10&&x.scaleX*2<=1.00001),"Native pixel cap and uniform scaling");
assert.equal(scene.events.listenerCount("update"),13);
objects.forEach(x=>x.destroy());objects.length=0;
assert.equal(scene.events.listenerCount("update"),0,"Closing/rebuilding a page must release animation listeners");
const last=config.identities.filter(x=>x.rarityIndex===0).at(-1);
state=render(last.index);assert.equal(state.pageIndex,4);assert.equal(state.visibleIdentityCount,12);
objects.forEach(x=>x.destroy());objects.length=0;
globalThis.location={search:"?starIdle=0"};
state=render();assert.equal(scene.events.listenerCount("update"),0,"Existing motion rollback flag is respected");
assert.equal(installUiStarIdleMotionFrames(scene,WORLD_VISUAL_SEMANTIC_ASSETS,"?starIdle=0"),null);
objects.forEach(x=>x.destroy());objects.length=0;
globalThis.location={search:""};
globalThis.matchMedia=()=>({matches:true});
animateBakedStar(scene,object("image",0,0),0);
assert.equal(scene.events.listenerCount("update"),0,"Reduced motion stays still");
delete globalThis.matchMedia;delete globalThis.location;
console.log("PASS baked Star UI: pagination, native resolution, fixed geometry, subtle glint, cleanup and reduced motion.");
