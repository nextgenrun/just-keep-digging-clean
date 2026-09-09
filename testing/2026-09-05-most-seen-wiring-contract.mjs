import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { TargetTileHudView } from "../systems/visual/TargetTileHudView.js";
import { MerchantPromptView, clampMerchantPlate } from "../systems/visual/MerchantPromptView.js";
import { NPCManager } from "../world/playScene/NPCManager.js";
import { USER_SETTINGS } from "../systems/UserSettings.js";
import { GAMEPLAY_PRESENTATION, resolveScenicFocusAlpha } from "../values/gameplayPresentation.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
class SceneEvents extends EventEmitter {
  bindings = new Map();
  on(event, callback, context) {
    const bound = context ? callback.bind(context) : callback;
    this.bindings.set(callback, bound);
    return super.on(event, bound);
  }
  off(event, callback) {
    return super.off(event, this.bindings.get(callback) || callback);
  }
}

function display(x=0,y=0,text="",style={}) {
 return {
  x,y,text,style,visible:true,children:[],width:0,scaleX:1,scaleY:1,
  setScrollFactor(){return this;},setDepth(){return this;},setOrigin(){return this;},
  setRotation(){return this;},setDisplaySize(w,h){this.width=w;this.height=h;return this;},
  setPosition(x,y){this.x=x;this.y=y;return this;},
  setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;},
  setVisible(v){this.visible=v;return this;},
  setText(v){this.text=v;this.width=v.length*(style.fontSize||12)*.6;return this;},
  add(children){this.children.push(...children);return this;},destroy(){this.destroyed=true;},
 };
}
const identity = {transformPoint:(x,y)=>({x,y}),applyInverse:(x,y)=>({x,y})};
function scene() {
 const camera=Object.assign(new SceneEvents(),{x:0,y:0,width:1280,height:720,scrollX:0,scrollY:0,zoomX:1,zoomY:1,rotation:0,matrix:identity});
 return {
  gameState:"playing",events:new SceneEvents(),
  scale:Object.assign(new SceneEvents(),{width:1280,height:720}),cameras:{main:camera},
  add:{container:(x,y)=>display(x,y),image:(x,y)=>display(x,y),text:(x,y,t,s)=>display(x,y,t,s)},
  worldModel:{inBounds:()=>true,isDiggable:()=>true,getHp:()=>30,getType:()=>1,getTileMaxHp:()=>30},
 };
}
const s=scene();
const hp=new TargetTileHudView(s);
hp.setTarget({tx:4,ty:5},true);
s.events.emit("postupdate");
assert.equal(hp.hp.text,"HP 30/30");
assert.equal(hp.title.text,"DIRT");
assert.equal(hp.root.visible,true);
let gpCenterY = 83.5;
s.hudSystem = { getGemPowerValueBounds: () => ({
  centerY: gpCenterY * Math.min(s.scale.width / 1280, s.scale.height / 720),
}) };
s.events.emit("postupdate");
assert.equal(hp.root.y + hp.config.hpY * hp.root.scaleY, gpCenterY,
  "tile HP shares the actual GP text row, including fractional font bounds");
gpCenterY = 112;
s.events.emit("postupdate");
assert.equal(hp.root.y + hp.config.hpY * hp.root.scaleY, gpCenterY,
  "rebuilt or repositioned GP labels cannot leave HP on the old row");
s.worldModel.getHp=()=>17;
s.events.emit("postupdate");
assert.equal(hp.hp.text,"HP 17/30","damage appears on the same completed game update");
s.worldModel.getHp=()=>0;
s.events.emit("postupdate");
assert.equal(hp.root.visible,false,"destroyed targets cannot leave stale HP");
s.worldModel.getHp=()=>80000;
s.worldModel.getType=()=>35;
s.worldModel.getTileMaxHp=()=>120000;
hp.setTarget({tx:5,ty:5},true);
s.events.emit("postupdate");
assert.equal(hp.title.text,"ANCIENT RELIC CACHE");
assert.equal(hp.hp.text,"HP 80000/120000");
for(const text of [hp.title,hp.hp]) assert.ok(text.width*text.scaleX<=GAMEPLAY_PRESENTATION.target.textWidth);
s.worldModel.isDiggable=()=>false;
s.events.emit("postupdate");
assert.equal(hp.root.visible,false,"unbreakable cells do not claim to have mineable HP");
s.worldModel.isDiggable=()=>true;
s.shopOverlay={isVisible:true};
s.events.emit("postupdate");
assert.equal(hp.root.visible,false);
s.shopOverlay.isVisible=false;s.gameState="paused";
s.events.emit("postupdate");
assert.equal(hp.root.visible,false);
s.gameState="playing";s.hasEscapeClosableUi=()=>true;
s.events.emit("postupdate");assert.equal(hp.root.visible,false,"shared overlays suppress target HP");
s.hasEscapeClosableUi=()=>false;hp.setTarget(null,false);
s.events.emit("postupdate");assert.equal(hp.root.visible,false);
s.scale.width=800;s.scale.height=450;s.scale.emit("resize");
assert.equal(hp.root.x,354*.625);
assert.equal(hp.root.y + hp.config.hpY * hp.root.scaleY, gpCenterY * .625,
  "resize preserves the shared value row");
hp.destroy();assert.equal(s.events.listenerCount("postupdate"),0);assert.equal(s.scale.listenerCount("resize"),0);

for(const [width,height] of [[1280,720],[1920,1080],[800,450],[2560,1080]]) {
 const k=Math.min(width/1280,height/720),size={width:208*k,height:48*k},margin=12*k;
 for(const [x,y] of [[-1000,-1000],[width+1000,height+1000],[width/2,height/2]]) {
  const p=clampMerchantPlate({x,y},{x:0,y:0,width,height},size,margin);
  assert.ok(p.x-size.width/2>=margin-.001 && p.x+size.width/2<=width-margin+.001);
  assert.ok(p.y-size.height/2>=margin-.001 && p.y+size.height/2<=height-margin+.001);
 }
}
const shopScene=scene();
const prompt=new MerchantPromptView(shopScene,"boboMerchant","Bobo's Shop",5,15);
prompt.update(true);
assert.equal(prompt.root.visible,true);
assert.equal(prompt.title.text,"BOBO'S SHOP");
assert.ok(prompt.detail.text.includes("Browse abilities"));
assert.equal(prompt.root.x,116);
assert.equal(prompt.root.y,36);
const oldKeyLabel=USER_SETTINGS.getKeyLabel;
USER_SETTINGS.getKeyLabel=()=>"Enter";
prompt.update(true,"A long merchant event description must remain inside its plate");
assert.ok(prompt.detail.text.startsWith("Enter"));
assert.ok(prompt.detail.width*prompt.detail.scaleX<=178);
USER_SETTINGS.getKeyLabel=oldKeyLabel;
shopScene.shopOverlay={isVisible:true};shopScene.events.emit("prerender");
assert.equal(prompt.root.visible,false);
prompt.destroy();assert.equal(shopScene.events.listenerCount("prerender"),0);

const manager=Object.create(NPCManager.prototype);
manager.scene={};manager._availableMerchantIds=null;
manager._interactPrompts=["a","b"].map((merchantId,index)=>({
 npc:{merchantId,tx:10+index*2,ty:5},view:{update(value){this.visible=value;}},
}));
manager.updateInteractPrompts({tx:11,ty:5});
assert.deepEqual(manager._interactPrompts.map(p=>p.view.visible),[true,false],"nearest tie matches the E interaction order");
manager.updateInteractPrompts({tx:11,ty:5},0);
assert.ok(manager._interactPrompts.every(p=>!p.view.visible),"closer world interactions suppress merchant prompts");
manager._availableMerchantIds=new Set(["b"]);
manager.updateInteractPrompts({tx:11,ty:5});
assert.deepEqual(manager._interactPrompts.map(p=>p.view.visible),[false,true]);
manager.updateInteractPrompts(null);
assert.ok(manager._interactPrompts.every(p=>!p.view.visible));
const goal=RETENTION_CONFIG.hud,buffs=APPROVED_HUD_SKIN.layout.buffs;
assert.ok(goal.top+goal.height<buffs.y,"objective and buff artwork have separate lanes");
assert.ok(resolveScenicFocusAlpha("world-visual-underground-foreground-test",.9)===.9*.58);
assert.equal(resolveScenicFocusAlpha("tile-resource-gold",1),1,"resources retain their visibility");
assert.equal(resolveScenicFocusAlpha("world-visual-underground-foreground-test",.9),.9*.58,"refresh starts from authored alpha");
console.log("PASS gameplay presentation: HP damage/destruction/retarget, modal hiding, text fit, viewport bounds, merchant priority, rebind, cleanup, scenic focus");
