import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { PLAYER_ASSET_PROFILES } from '../values/playerAssetProfiles.js';
import { applyCharacterDefinitionRuntimeV2, CHARACTER_DEFINITION_RUNTIME_V2 as definition } from '../values/characterDefinitionRuntimeV2.js';
import { getUniquePlayerSheetEntries } from '../player/PlayerAssetSheetCatalog.js';
import { getPlayerDeferredAssetPack, queuePlayerProfileSheets } from '../player/PlayerAssetLoader.js';
import { createUalNativePlayerAnimations } from '../player/UalNativePlayerAnimations.js';
import { RuntimeAssetLoadCoordinator } from '../world/rendering/RuntimeAssetLoadCoordinator.js';
import { RUNTIME_ASSET_LOADING as config } from '../values/runtimeAssetLoading.js';
const before=JSON.parse(fs.readFileSync('testing/character-definition-v2-export/inventory.json','utf8')).profile;
const profile=applyCharacterDefinitionRuntimeV2(PLAYER_ASSET_PROFILES.survivalUal,true);
assert.equal(profile.characterDefinitionRuntime.clothEnabled,false);
assert.equal(profile.frameWidth,512);assert.equal(profile.frameHeight,512);
for(const field of ['visualOriginBySheet','requiredSheets','complexDigSideAnimationKeys','actionRecoveryAnimationByCompletedAnimation']){
  assert.deepEqual(profile[field],before[field],field+' must preserve existing choreography and anchors');
}
for(const [key,size] of Object.entries(before.displaySizePxByAnimation)){
  const moving=definition.calibratedAnimationPrefixes.some(prefix=>key.startsWith(prefix));
  assert.equal(profile.displaySizePxByAnimation[key],moving?definition.movingDisplaySizePx:size);
  assert.deepEqual(profile.visualOriginByAnimation[key],moving?definition.movingOrigin:before.visualOriginByAnimation[key]);
}
const entries=getUniquePlayerSheetEntries(profile);
assert.ok(entries.every(e=>e.type==='multiatlas' && e.frameConfig.frameWidth===512 && e.path.includes(definition.runtimeRoot)));
const queued=[];
queuePlayerProfileSheets({textures:{exists:()=>false},load:{multiatlas:(...args)=>queued.push(args)}},profile);
assert.ok(queued.length>0);
assert.ok(queued.every(([key,url,path])=>key && url.endsWith('.json?v='+definition.version) && path===definition.runtimeRoot+'/'));
const flight=getPlayerDeferredAssetPack(profile,'flight');
assert.ok(flight.length && flight.every(a=>a.type==='multiatlas' && a.requiredFrames.length));

// Pages must become available together; a decoded first page cannot release an animation.
const loader=new EventEmitter();loader.loading=false;loader.queued=[];
loader.isLoading=()=>loader.loading;loader.start=()=>{loader.loading=true;};
loader.multiatlas=(...args)=>loader.queued.push(args);
const textures=new Map();let ready=0,failed=0;
const scene={load:loader,textures:{exists:key=>textures.has(key),get:key=>textures.get(key),remove:key=>textures.delete(key)}};
const coordinator=new RuntimeAssetLoadCoordinator(scene,config,'?runtimeAssetBitmap=0');
const asset={key:'definition-test',path:'definition-test.json',atlasPath:'assets/',type:'multiatlas',requiredFrames:[0,1,2]};
coordinator.request(asset,{onReady:()=>ready++,onError:()=>failed++});
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(loader.queued.length,1);
textures.set(asset.key,{has:key=>key==='0'});
loader.emit('filecomplete-image-MA0_page0');loader.emit('filecomplete-multiatlas-'+asset.key);
assert.equal(ready,0,'Never switch to a partly loaded character');
textures.set(asset.key,{has:key=>['0','1','2'].includes(key),source:[{image:{width:32,height:32}},{image:{width:64,height:32}}]});
loader.loading=false;loader.emit('complete');assert.equal(ready,1);assert.equal(failed,0);
coordinator.request({...asset,requiredFrames:[0,1,2,3]},{onReady:()=>ready++,onError:()=>failed++});
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(textures.has(asset.key),false,'Replace incomplete old textures before registering new frames');
loader.emit('loaderror',{key:'MA1_failed-page',multiFile:{key:asset.key}});
assert.equal(failed,1,'Report errors from atlas pages instead of leaving an animation pending');
coordinator.destroy();

if(process.argv.includes('--assets')){
  const inventory=JSON.parse(fs.readFileSync('testing/character-definition-v2-export/inventory.json','utf8'));
  const manifest=JSON.parse(fs.readFileSync(definition.runtimeRoot+'/manifest.json','utf8'));
  assert.equal(manifest.complete,true);assert.equal(manifest.clothEnabled,false);
  const frameSets=new Map();
  for(const entry of entries){
    const atlas=JSON.parse(fs.readFileSync(entry.path.split('?')[0],'utf8'));
    const frames=new Map(atlas.textures.flatMap(t=>t.frames.map(f=>[f.filename,f])));
    frameSets.set(entry.key,new Set(frames.keys()));
    for(const frame of inventory.sheets.find(s=>s.key===entry.key).frames)assert.ok(frames.has(String(frame)),entry.key+':'+frame);
    for(const texture of atlas.textures){
      assert.ok(texture.size.w<=4096 && texture.size.h<=4096);
      assert.ok(fs.existsSync(definition.runtimeRoot+'/'+texture.image.split('?')[0]));
      for(const f of texture.frames){
        assert.deepEqual(f.sourceSize,{w:512,h:512});
        assert.ok(f.spriteSourceSize.x>=0 && f.spriteSourceSize.y>=0);
        assert.ok(f.spriteSourceSize.x+f.spriteSourceSize.w<=512);
        assert.ok(f.spriteSourceSize.y+f.spriteSourceSize.h<=512);
      }
    }
  }
  const registered=new Set();
  createUalNativePlayerAnimations({anims:{exists:key=>registered.has(key),create:animation=>{registered.add(animation.key);for(const f of animation.frames)assert.ok(frameSets.get(f.key)?.has(String(f.frame)),animation.key+' references missing frame '+f.key+':'+f.frame);}},textures:{exists:key=>frameSets.has(key),get:()=>({setFilter(){}})}},profile);
  assert.ok(registered.size>200);
  console.log('ALL_DEFINITION_FRAMES_COVERED',manifest.summary);
}
console.log('CHARACTER_DEFINITION_ALIGNMENT_AND_LOADING_CONTRACT_OK');
