import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {BAKED_CELESTIAL_ASSETS,BAKED_TALENT_NODES,BAKED_STAR_ATLASES} from "../../values/bakedCelestialUi.js";
import {CELESTIAL_TALENT_BRANCHES} from "../../values/celestialTalentBranches.js";
import {CELESTIAL_TALENT_RANK_BONUSES} from "../../values/celestialTalentRanks.js";
import {STAR_IDENTITY_LIBRARY_CONFIG} from "../../values/starIdentityLibrary.js";
import {getStarIdentityRarityAssets} from "../../values/starIdentityRuntimeAssets.js";

const root=new URL("../../",import.meta.url);
const prompts=JSON.parse(fs.readFileSync(new URL("sprites/UI/baked-stars-talents-v2/prompts.json",root),"utf8"));
const manifest=JSON.parse(fs.readFileSync(new URL("sprites/UI/baked-stars-talents-v2/manifest.json",root),"utf8"));
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
for(const entry of manifest) {
  const bytes=fs.readFileSync(new URL(entry.path,root));
  assert.equal(sha(bytes),entry.sha256,entry.file);
  assert.equal(sha(fs.readFileSync(entry.source)),entry.sha256,"Original ImageGen bytes: "+entry.file);
  assert.ok(prompts.assets.find(x=>x.file===entry.file)?.prompt,"Exact prompt retained");
}
const dimensions=new Map(Object.values(BAKED_CELESTIAL_ASSETS).map(asset=>{
  const bytes=fs.readFileSync(new URL(asset.path,root));
  return [asset.key,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]];
}));
let frameCount=0;
function check(frame) {
  const [width,height]=dimensions.get(frame.key);
  const [x,y,w,h]=frame.rect;
  assert.ok([x,y,w,h].every(Number.isInteger));
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,frame.frame);
  frameCount++;
}
assert.equal(Object.keys(BAKED_TALENT_NODES).length,36);
for(const node of CELESTIAL_TALENT_BRANCHES.flatMap(branch=>branch.nodes)) {
  const art=BAKED_TALENT_NODES[node.id];assert.ok(art,node.id);
  Object.values(art).forEach(check);
  assert.ok(art.face.rect[2]>=256&&art.face.rect[3]>=256,node.id+" native face detail");
  const prompt=prompts.assets.find(entry=>entry.file===art.card.path.split("/").at(-1)).prompt;
  assert.ok(prompt.includes(node.description),node.id+" base copy matches gameplay values");
  assert.ok(prompt.includes(CELESTIAL_TALENT_RANK_BONUSES[node.id].description),node.id+" rank copy matches gameplay values");
}
assert.deepEqual(BAKED_STAR_ATLASES.map(atlas=>atlas.frames.length),[60,50,50,40,30,20]);
assert.equal(STAR_IDENTITY_LIBRARY_CONFIG.identities.length,250);
for(const identity of STAR_IDENTITY_LIBRARY_CONFIG.identities) {
  const atlas=BAKED_STAR_ATLASES[identity.rarityIndex],art=atlas.frames[identity.frame];
  assert.ok(art,identity.id);check(art);
  assert.ok(getStarIdentityRarityAssets(identity.rarityIndex).some(a=>a.key===art.key),"Per-rarity loading");
}
assert.equal(new Set(Object.values(BAKED_TALENT_NODES).map(n=>n.face.key+":"+n.face.frame)).size,36);
console.log("PASS baked Celestial art: 17 byte-identical sources, 36 current descriptions, 250 mapped stars, "+frameCount+" valid frames.");
