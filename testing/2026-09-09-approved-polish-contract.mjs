import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startPlayerDeathCinematic } from '../world/playScene/PlayerDeathCinematic.js';
import { APPROVED_ASSET_POLISH } from '../values/approvedAssetPolish.js';
import { LootPickupFxSystem } from '../systems/visual/LootPickupFxSystem.js';
import { getRememberedResourcePickupVisual } from '../systems/visual/RewardPickupContinuityState.js';
import { RESOURCE_ICON_ART } from '../values/resourceIconArt.js';
import { TimedBuffFxSystem } from '../systems/visual/TimedBuffFxSystem.js';
import { ExcavatedEdgeArtView } from '../world/rendering/scenic-world/ExcavatedEdgeArtView.js';
import { EXCAVATED_EDGE_ART } from '../values/approvedPolishArt.js';

function imageNode() {
  const node = new EventEmitter();
  Object.assign(node,{active:true,visible:true,scaleX:1,scaleY:1,depth:5,anims:{timeScale:1}});
  for(const key of ['setTexture','setPosition','setDisplaySize','setOrigin','setAngle','setDepth','setBlendMode','setTint','setRotation','setFlipX','setScale']) node[key]=function(...args){this[key+'Args']=args;return this;};
  node.setVisible=function(v){this.visible=v;return this;};node.setAlpha=function(a){this.alpha=a;return this;};
  node.play=function(key){this.played=key;return this;};node.destroy=function(){this.active=false;};
  return node;
}
function deathFixture() {
  let now=0;const timers=[];const player=imageNode();const events=new EventEmitter();
  const scene={player,events,config:{playerDisplaySizePx:100},
    playerAssetProfile:{deathAnim:'collapse',deathSheet:'collapse-sheet',deathFrames:[0,1,2],deathAnimationFps:30},
    anims:{exists:()=>true,get:()=>({duration:100})},
    time:{delayedCall(delay,callback){const timer={at:now+delay,callback,removed:false,remove(){this.removed=true;}};timers.push(timer);return timer;}}};
  return {scene,player,advance(ms){now+=ms;for(const t of timers)if(!t.removed&&t.at<=now){t.removed=true;t.callback();}}};
}
{
  const f=deathFixture();let reveals=0;
  assert.equal(startPlayerDeathCinematic(f.scene,()=>reveals++),true);
  assert.equal(f.player.played,'collapse');assert.equal(reveals,0);
  f.player.emit('animationcomplete-collapse');
  f.advance(APPROVED_ASSET_POLISH.death.finalPoseHoldMs-1);assert.equal(reveals,0);
  f.advance(1);assert.equal(reveals,1);
  f.advance(5000);assert.equal(reveals,1);
  assert.equal(f.scene.events.listenerCount('shutdown'),0);
}
{
  const f=deathFixture();let reveals=0;startPlayerDeathCinematic(f.scene,()=>reveals++);
  f.scene.events.emit('shutdown');f.player.emit('animationcomplete-collapse');f.advance(5000);
  assert.equal(reveals,0,'shutdown must cancel delayed recap');
}
{
  const f=deathFixture();let reveals=0;startPlayerDeathCinematic(f.scene,()=>reveals++);
  f.advance(100+APPROVED_ASSET_POLISH.death.animationSafetyMs);
  assert.equal(reveals,0);f.advance(APPROVED_ASSET_POLISH.death.finalPoseHoldMs);
  assert.equal(reveals,1,'lost animation event cannot trap the player');
  assert.deepEqual(f.player.setTextureArgs,['collapse-sheet',2],'watchdog must land on the final collapse pose');
}
{
  const f=deathFixture();let tween;let reveals=0;
  f.player.y=100;f.scene.config.tileSize=100;
  const body={x:0,y:50,w:50,h:50};f.scene.playerController={physicsBody:body};
  f.scene.worldModel={isSolid:(x,y)=>y===3};
  f.scene.tweens={add(c){tween=c;return {stop(){}};}};
  startPlayerDeathCinematic(f.scene,()=>reveals++);
  assert.equal(tween.y,300);assert.equal(f.player.played,undefined);
  assert.deepEqual(body,{x:0,y:50,w:50,h:50},'visual fall must not change death coordinates');
  tween.onComplete();assert.equal(f.player.played,'collapse');assert.equal(reveals,0);
  f.player.emit('animationcomplete-collapse');f.advance(APPROVED_ASSET_POLISH.death.finalPoseHoldMs);
  assert.equal(reveals,1);
}
{
  const f=deathFixture();let oldReveals=0;let currentReveals=0;
  startPlayerDeathCinematic(f.scene,()=>oldReveals++);
  startPlayerDeathCinematic(f.scene,()=>currentReveals++);
  f.player.emit('animationcomplete-collapse');f.advance(APPROVED_ASSET_POLISH.death.finalPoseHoldMs);
  assert.equal(oldReveals,0,'a replaced cinematic must not reveal a newer recap');
  assert.equal(currentReveals,1);
}
{
  const scene={config:{},textures:{exists:()=>true},tweens:{add(c){c.onComplete?.();}}};
  const original={kind:'resource',resourceType:'stone',visualId:'world-stone',textureKey:'world-atlas',textureFrame:'stone-3'};
  const resolver={resolveResourcePickup:()=>original};
  const fx=new LootPickupFxSystem(scene,{getLootPickupTarget:()=>({x:100,y:100})},{createPlan:()=>({profileId:'test'})},resolver);
  let shown;
  fx.flightView={create({descriptor}){shown=descriptor;return {root:imageNode()};},animate({onArrival}){onArrival({x:100,y:100});return true;}};
  assert.equal(fx.showResourcePickup({worldX:10,worldY:20,resourceType:'stone'}),true);
  assert.equal(shown.textureKey,RESOURCE_ICON_ART.stone.key);assert.equal(shown.textureFrame,null);
  assert.equal(getRememberedResourcePickupVisual(scene,'stone').textureKey,'world-atlas');
  assert.equal(getRememberedResourcePickupVisual(scene,'stone').textureFrame,'stone-3');
}
{
  let damage=2;let free=true;
  const effects={getMiningSpeedMultiplier:()=>1,getDamageMultiplier:()=>damage,getFreeAbilitySnapshot:()=>({active:free})};
  const scene={gameState:'playing'};
  const fx=new TimedBuffFxSystem(scene,imageNode(),{physicsBody:{}},effects);
  assert.deepEqual(fx.channels.map(c=>c.isActive()),[false,true,true]);
  damage=1;free=false;assert.deepEqual(fx.channels.map(c=>c.isActive()),[false,false,false]);
  damage=2;scene.gameState='paused';assert.equal(fx.channels[1].isActive(),false);
  fx.destroy();assert.ok(fx.channels.every(c=>!c.isActive()));
}
{
  let writes=0;const scene={config:{tileSize:94,topAirRows:0},textures:{exists:()=>true},add:{image:()=>imageNode()}};
  const world={getTileType:(x,y)=> y%2===0?1:0,setTileType(){writes++;}};
  const view=new ExcavatedEdgeArtView(scene,world);
  view.sync({left:0,top:3,right:100,bottom:100},{terrainTint:0xabcdef});
  assert.ok(view.edges.length<=EXCAVATED_EDGE_ART.maxEdges);assert.ok(view.roots.length<=EXCAVATED_EDGE_ART.maxRoots);
  assert.equal(writes,0);const nodes=[...view.edges,...view.roots];view.destroy();assert.ok(nodes.every(n=>!n.active));
}
console.log('APPROVED_POLISH_OK: collapse ordering/cancellation/watchdog, floating-only icons, buff authority/expiry and bounded read-only terrain.');
