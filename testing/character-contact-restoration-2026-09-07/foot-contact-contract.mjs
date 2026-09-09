import assert from "node:assert/strict";
import {particleHarness} from "../2026-09-03-particle-fx-harness.mjs";
import {GroundFootstepFxSystem} from "../../systems/visual/GroundFootstepFxSystem.js";
import {SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile} from "../../values/survivalUalPlayerAssetProfile.js";
import {TILE_TYPES as T} from "../../values/tileTypes.js";
let contacts=0;
for(const [sheet,data]of Object.entries(profile.groundingContacts))for(const tileType of [T.DIRT,T.STONE,T.COPPER,T.MAGMA_CRYSTAL])for(const flipX of [false,true]) {
 const frames=Object.keys(data.contacts).map(Number);if(!frames.length)continue;
 const h=particleHarness({tileType});h.player.texture.key=sheet;h.player.scaleX=h.player.scaleY=101/512;h.player.frame.realWidth=h.player.frame.realHeight=512;h.player.flipX=flipX;h.body.vx=flipX?-160:160;
 const system=new GroundFootstepFxSystem(h.scene,h.player,h.controller,h.world,profile);assert.ok(system.create());
 for(const frame of frames){
  system._handleAnimationUpdate({key:"native-walk"},{index:frame+1,textureFrame:frame,textureKey:sheet});h.events.emit("postupdate");
  const e=system.lastContact;assert.equal(e.frame,frame);assert.equal(e.y,h.body.y+h.body.h);assert.equal(e.tileType,tileType);
  const expected=h.player.x+(flipX?-1:1)*(data.contacts[frame][0]-data.size*.5)*101/data.size;
  assert.ok(Math.abs(e.x-expected)<.57, JSON.stringify({sheet,frame,x:e.x,expected}));contacts++;
 }
 assert.ok(h.images[0].alpha>=.42);system.destroy();assert.equal(system.activeObjects.size,0);
}
console.log("NATIVE_FOOT_CONTACTS_PASS",{contacts});

const h=particleHarness();const system=new GroundFootstepFxSystem(h.scene,h.player,h.controller,h.world,profile);system.create();
h.setGrounded(false);h.events.emit("postupdate");assert.equal(system.contactSequence,0,"airborne feet emit nothing");
h.setGrounded(true);h.events.emit("postupdate");assert.equal(system.contactSequence,1);assert.equal(system.lastContact.landing,true);assert.equal(system.lastContact.y,h.body.y+h.body.h);
h.events.emit("postupdate");assert.equal(system.contactSequence,1,"landing scuff happens once");system.destroy();assert.equal(system.activeObjects.size,0);
console.log("LANDING_SCUFF_OWNERSHIP_PASS");
