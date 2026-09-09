import assert from 'node:assert/strict';
import { MERCHANT_MOTION_CONFIG as C, MERCHANT_MOTION_CAST } from '../values/merchantMotion.js';
import { MERCHANT_MOTION_RIGS } from '../values/merchantMotionRigs.js';
import { NPC_ACTIVITY_CONFIG, resolveNpcGroundContact } from '../values/npcActivityConfig.js';
import { ASSET_KEYS } from '../values/assetKeys.js';
import { MerchantMotionPlayback } from '../systems/visual/MerchantMotionPlayback.js';
import { MerchantMotionSystem } from '../systems/visual/MerchantMotionSystem.js';
import { NPCActivitySystem } from '../systems/visual/NPCActivitySystem.js';
import { NPCManager } from '../world/playScene/NPCManager.js';
import { samplePose, weightsAt, transformPoint } from '../systems/visual/merchantMotionMath.js';

assert.deepEqual(MERCHANT_MOTION_CAST.map(c=>c.id).sort(), Object.keys(NPC_ACTIVITY_CONFIG.merchants).sort());
for (const cast of MERCHANT_MOTION_CAST) {
  const rig=MERCHANT_MOTION_RIGS[cast.id];
  const foot=NPC_ACTIVITY_CONFIG.merchants[cast.id].footBottomYAtReferencePx / NPC_ACTIVITY_CONFIG.render.referenceCanvasSizePx * C.referenceSize;
  for (const t of [0, 0.5, 1.4, 2.5, 3.5, 4.5, 5.8, C.actionDuration]) {
    const pose=samplePose(cast,rig,2,t);
    for (const x of [0, C.referenceSize/4, C.referenceSize/2, C.referenceSize]) {
      const p=weightsAt(rig,x,foot,foot).reduce((sum,[id,w])=>{
        const q=transformPoint(pose.matrices[id],x,foot);
        return [sum[0]+q[0]*w,sum[1]+q[1]*w];
      },[0,0]);
      assert.ok(Math.hypot(p[0]-x,p[1]-foot)<0.00001,cast.id+' foot drift');
    }
    assert.deepEqual(samplePose(cast,rig,2,t,0).packed,samplePose(cast,rig,2,-1).packed,'Released gesture must return to the current idle pose');
  }
}
const motion=new MerchantMotionPlayback();
motion.startGesture();
motion.advance(50);
assert.equal(motion.actionElapsedMs,50);
motion.advance(0);
assert.equal(motion.actionElapsedMs,50,'Paused frames must not advance animation');
motion.settle();
assert.equal(motion.strength,1,'Opening a shop must not snap the pose');
motion.advance(16);
assert.ok(motion.strength<1 && motion.strength>0.99,'Gesture release starts smoothly');
for(let i=0;i<40;i++)motion.advance(50);
assert.equal(motion.actionTime,-1);
motion.startGesture();
for(let i=0;i<Math.ceil(motion.durationMs/50);i++)motion.advance(50);
assert.equal(motion.actionTime,-1,'The full gesture reaches its authored rest');

class Visual {
  constructor(){this.x=0;this.y=0;this.visible=true;this.active=true;this.alpha=1;this.flipX=false;}
  setPosition(x,y){this.x=x;this.y=y;return this;}
  setRotation(v){this.rotation=v;return this;}
  setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;}
  setFlipX(v){this.flipX=v;return this;}
  setAlpha(v){this.alpha=v;return this;}
  setVisible(v){this.visible=v;return this;}
}
const scene={time:{now:0},textures:{exists:()=>false},add:{image:()=>{throw new Error('New motion must not allocate still-pose overlays');}},gameplayCapabilities:{isEnabled:()=>true}};
const actors=new NPCActivitySystem(scene,ASSET_KEYS);
for(const [i,cast]of MERCHANT_MOTION_CAST.entries()){
 const visual=new Visual();
 const contact=resolveNpcGroundContact(cast.id,99.2);
 const actor=actors.registerNPC({merchantId:cast.id,tx:i*10,ty:0},visual,{x:i*940,y:100+contact.anchorOffsetPx,displaySize:99.2,groundSurfaceY:100,groundContact:contact,motion:new MerchantMotionPlayback()});
 assert.ok(actor,'A rig must work without loading the old seven still poses');
 assert.equal(actor.overlay,null);
}
actors.update(0,16,{tx:0,ty:0});
assert.equal(actors.getHealthSnapshot().actorCount,6);
assert.equal(actors.getHealthSnapshot().expectedActorCount,6);
assert.equal(actors.getHealthSnapshot().activeCount,1);
assert.equal(actors.actors[0].motion.actionTime,0);
assert.equal(actors.actors[0].stateEndsAt,NPC_ACTIVITY_CONFIG.merchants[MERCHANT_MOTION_CAST[0].id].durationsMs.player);
actors.actors[0].baseVisual.setVisible(false);
actors.update(16,16,{tx:0,ty:0});
assert.equal(actors.actors[0].baseVisual.visible,false,'Motion must respect merchant availability');
assert.equal(actors.getHealthSnapshot().groundContactViolationCount,0);
actors.settleMerchant(MERCHANT_MOTION_CAST[0].id,16);
assert.equal(actors.actors[0].motion.settleElapsedMs,0);
actors.destroy();

let draws=0,uploads=0,disposed=0,removed=0;
const rendererScene={game:{renderer:{gl:{}}},cameras:{main:{worldView:{x:0,y:0,right:500,bottom:500}}},textures:{exists:()=>true,remove:()=>{removed++;}}};
const system=new MerchantMotionSystem(rendererScene);
system.texture={source:[{update:()=>{uploads++;}}]};
const sprite=new Visual().setPosition(100,100).setDisplaySize(99.2,99.2);
const entry={sprite,playback:new MerchantMotionPlayback(),renderer:{draw:()=>{draws++;},destroy:()=>{disposed++;}},texture:{source:[{update:()=>{uploads++;}}]},canvas:{},textureKey:'fixture',nextFrameAt:0,frameCount:1,layout:{}};
system.entries.set('fixture',entry);
for(let i=0;i<60;i++)system.update(1000/60);
assert.ok(draws>=29 && draws<=31,'The 30 fps budget must not drift down to 20 fps');
assert.equal(draws,uploads);
const secondSprite=new Visual().setPosition(200,100).setDisplaySize(99.2,99.2);
system.entries.set('second',{...entry,sprite:secondSprite,playback:new MerchantMotionPlayback(),wasVisible:false});
const uploadsBefore=uploads,drawsBefore=draws;
system.update(50);
assert.equal(uploads-uploadsBefore,1,'Multiple merchant frames must share one GPU upload');
assert.equal(draws-drawsBefore,2);
secondSprite.visible=false;
const before=draws;
sprite.visible=false;
for(let i=0;i<20;i++)system.update(50);
assert.equal(draws,before,'Hidden merchants must not upload textures');
sprite.visible=true;sprite.x=10000;
system.update(50);
assert.equal(draws,before,'Offscreen merchants must not upload textures');
sprite.x=100;
system.update(50);
assert.ok(draws>before,'Returning merchants refresh on the first visible frame');
system.destroy();system.destroy();
assert.equal(disposed,2,'Shutdown releases each merchant renderer once');
assert.equal(removed,1,'Shutdown removes the single shared Phaser atlas once');
assert.equal(system.entries.size,0);

const clock=Object.create(NPCManager.prototype);
clock.activityTimeMs=0;
const times=[];
clock.activitySystem={update:t=>times.push(t)};
clock.motionSystem={update:()=>{}};
clock.updateActivities(100000,16,null);
clock.updateActivities(900000,16,null);
assert.deepEqual(times,[16,32],'Wall-clock time spent paused must not skip activity phases');
console.log('MERCHANT_MOTION_CONTRACT_OK: six rigs, grounded feet, graceful release, schedule, visibility, bounded uploads, pause and cleanup');
