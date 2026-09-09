import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {EventEmitter} from "node:events";
import {DIG_IMPACT_CONTACTS as original} from "../../values/digImpactContacts.generated.js";
import {CHARACTER_DEFINITION_IMPACT_CONTACTS as native} from "../../values/characterDefinitionImpactContacts.js";
import {SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile} from "../../values/survivalUalPlayerAssetProfile.js";
import {captureDigImpactPose,resolveDigImpactContact} from "../../systems/visual/digImpactContact.js";
import {StellarLanceContactPresenter} from "../../world/playScene/StellarLanceContactPresenter.js";
const root=new URL("../../",import.meta.url),tileSize=94,body={x:470,y:325,w:40,h:75},targetTile={tx:6,ty:3};
let projections=0,variantContacts=0;
for(const sheet of new Set([...Object.keys(original),...Object.keys(native)])) {
 const legacy=original[sheet];
 const recordSets=[...(legacy?[[legacy,legacy.size]]:[]),[native[sheet]||legacy,512]];
 for(const [data,width] of recordSets) for(const row of new Map(Object.values(data.contacts).map(r=>[r[0],r])).values()) {
  for(const flipX of [false,true])for(const rotation of [0,.3,-.3]) {
   const player={x:500,y:400,scaleX:101/width,scaleY:101/width,originX:.5,originY:.890625,flipX,rotation,
    texture:{key:sheet},frame:{name:row[0],realWidth:width,realHeight:width,width:93,height:150},
    anims:{currentAnim:{key:sheet,frames:Array.from({length:1400},(_,i)=>({textureFrame:i}))}}};
   const event={animationKey:sheet,contactSequenceIndex:row[0],contactFrame:row[0]};
   const pose=captureDigImpactPose(player,event),saved=JSON.stringify(player),contact=resolveDigImpactContact({pose,body,targetTile,tileSize});
   assert.equal(contact.authored,true,`${sheet} ${row[0]} ${width}`);
   const x=((flipX?data.size-row[1]:row[1])-data.size*.5)*101/data.size;
   const y=(row[2]-data.size*.890625)*101/data.size;
   assert.ok(Math.hypot(contact.rawPoint.x-(500+x*Math.cos(rotation)-y*Math.sin(rotation)),contact.rawPoint.y-(400+x*Math.sin(rotation)+y*Math.cos(rotation)))<1e-8);
   assert.equal(saved,JSON.stringify(player));projections++;
   const scene={player,events:new EventEmitter(),playerController:{physicsBody:body},config:{tileSize},time:{now:1},game:{loop:{frame:1}}};
   const presenter=new StellarLanceContactPresenter(scene),shots=[];
   presenter.queue({targetTile,contactEvent:event},shot=>shots.push(shot));scene.events.emit("postupdate");
   assert.equal(shots.length,1);assert.equal(shots[0].originSource,"authored-hand-foot");assert.equal(shots[0].contactPose.visibleFrame,row[0]);presenter.destroy();
  }
 }
}
for(const [sheet,data]of Object.entries(native)) {
 const entry=profile.sheetFiles.find(e=>profile[e[0]]===sheet),bytes=fs.readFileSync(new URL(`${entry[3]}/${entry[1]}`,root));
 assert.equal(createHash("sha256").update(bytes).digest("hex"),data.atlasSha256);
}
for(const contacts of [profile.actionContactByAnimation,profile.quickslashActionContactByAnimation]) for(const [key,spec]of Object.entries(contacts)) {
 const variant=profile.digAnimationVariants.find(v=>v.key===key);if(!native[variant?.sheet])continue;
 const actual=variant.frames[spec.sequenceIndex];assert.ok(Object.values(native[variant.sheet].contacts).some(r=>r[0]===actual),key);variantContacts++;
}
assert.ok(variantContacts>=24);
for(const pose of [undefined,{}, {sheet:Object.keys(original)[0],width:512,height:256},{sheet:"missing",width:512,height:512}]) {
 assert.equal(resolveDigImpactContact({pose,body,targetTile,tileSize}).authored,false);
}
console.log("CURRENT_CONTACTS_PASS",{projections,variantContacts,sheets:new Set([...Object.keys(original),...Object.keys(native)]).size});

for(const [key,spec]of Object.entries(profile.actionContactByAnimation)) {
 const v=profile.digAnimationVariants.find(v=>v.key===key);if(!v)continue;
 const sheet=native[v.sheet]||original[v.sheet];
 for(const contact of spec.contacts||[spec])assert.ok(Object.values(sheet?.contacts||{}).some(row=>row[0]===v.frames[contact.sequenceIndex]),`Missing current gameplay contact: ${key}`);
}
console.log("ALL_CURRENT_MINING_ACTIONS_HAVE_CONTACTS");
