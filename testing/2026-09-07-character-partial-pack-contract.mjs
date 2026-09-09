import assert from 'node:assert/strict';
import { PLAYER_ASSET_PROFILES } from '../values/playerAssetProfiles.js';
import { PlayerDeferredAnimationAssetController } from '../player/PlayerDeferredAnimationAssetController.js';
const profile=PLAYER_ASSET_PROFILES.survivalUal, textures=new Set(), animations=new Map(), requests=[];
const scene={time:{now:0},children:{list:[]},textures:{exists:key=>textures.has(key),get:()=>({has:()=>true,setFilter(){}})},
 anims:{exists:key=>animations.has(key),create:a=>animations.set(a.key,a)},
 runtimeAssetLoadCoordinator:{enabled:true,request:(asset,options)=>{requests.push({asset,options});return{cancel(){}}}}};
const controller=new PlayerDeferredAnimationAssetController(scene,profile);
let settled=false;
const pack=controller.ensureForAnimation(profile.complexDigSideAnimationKeys[1]);pack.then(()=>settled=true);
assert.ok(requests.length>1);
const cross=requests.find(r=>r.asset.key===profile.complexDigCrossSheet);assert.ok(cross);
textures.add(cross.asset.key);cross.options.onReady();await Promise.resolve();
assert.equal(settled,false,'The pack still waits for its remaining atlases');
assert.equal(controller.isReadyOrRequest(profile.complexDigSideAnimationKeys[1]),true,'Use Cross immediately after its complete atlas arrives');
assert.equal(animations.has(profile.complexDigSideAnimationKeys[2]),false,'Do not register an unfinished atlas');
for(const r of requests)if(r!==cross){textures.add(r.asset.key);r.options.onReady()}
assert.equal((await pack).ready,true);controller.destroy();
console.log('CHARACTER_PARTIAL_PACK_READINESS_OK');
