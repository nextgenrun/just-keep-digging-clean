import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { BAKED_UI_ART, BAKED_UI_LABELS } from "../../values/bakedUiArt.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";
import { getBakedUiArt, getBakedUiLabel, fitBakedControlKey } from "../../systems/visual/bakedUiArt.js";
const root = new URL("../../", import.meta.url);
const sourceFrames = JSON.parse(await readFile(new URL("sprites/UI/baked-copy-v1/source-frames.json", root)));
const assets = [...Object.values(BAKED_UI_ART.assets), STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation,
  STAR_IDENTITY_LIBRARY_CONFIG.inventory.emptyFoundation, CELESTIAL_TALENT_TREE_UI_CONFIG.assets.foundation];
assert.equal(BAKED_UI_ART.enabled, true);
const dimensions = new Map();
let decodedBytes=0;
for (const asset of assets) {
  const data = await readFile(new URL(asset.path, root));
  assert.equal(data.subarray(1,4).toString(), "PNG", asset.path);
  const width=data.readUInt32BE(16), height=data.readUInt32BE(20);
  dimensions.set(asset.key,{width,height}); decodedBytes+=width*height*4;
  const metadata=Object.values(sourceFrames).find(entry=>asset.path.endsWith("/"+entry.file));
  if (metadata) assert.equal(createHash("sha256").update(data).digest("hex"), metadata.sha256, "Source pixels must remain unchanged");
}
const within = (key,rect) => {
  assert.equal(rect.length,4);
  const [x,y,w,h]=rect, size=dimensions.get(key);
  assert.ok(Number.isInteger(x)&&Number.isInteger(y)&&w>0&&h>0);
  assert.ok(x>=0&&y>=0&&x+w<=size.width&&y+h<=size.height, "Frame outside "+key);
};
for (const asset of assets) if(asset.rect) within(asset.key,asset.rect);
for (const [label,record] of Object.entries(BAKED_UI_LABELS)) {
  const key=BAKED_UI_ART.assets[record.asset].key;
  within(key,record.rect); within(key,record.captionRect);
  const [x,y,w,h]=record.rect,[cx,cy,cw,ch]=record.captionRect;
  assert.ok(cx>=x&&cy>=y&&cx+cw<=x+w&&cy+ch<=y+h,label+" caption must stay inside its art");
}
for (const label of ["STAR CODEX","HOLDINGS","RESOURCE CODEX","SPECIAL BLOCKS","STARS","GENERAL","SAVES","SETTINGS","SAVE GAME","RESET CONTROLS"]) assert.ok(BAKED_UI_LABELS[label]);
const textures = new Map();
const scene={textures:{exists:key=>dimensions.has(key),get(key){
  if(!textures.has(key))textures.set(key,{frames:new Map(),has(name){return this.frames.has(name)},add(name,index,...rect){this.frames.set(name,rect)}});
  return textures.get(key);
}}};
const art=getBakedUiLabel(scene,"Settings");
assert.deepEqual(art,getBakedUiLabel(scene," SETTINGS "));
assert.equal(scene.textures.get(art.key).frames.size,1,"Repeated controls share a frame");
assert.equal(getBakedUiLabel(scene,"SAVE GAME  •  42 M"),null,"Live state must retain text");
assert.equal(getBakedUiLabel(scene,"F12"),null,"Rebound keys must not become baked labels");
assert.equal(getBakedUiArt({textures:{exists:()=>false}},"menu"),null,"Missing art uses fallback");
const key={width:180,setText(v){this.value=v;return this},setFontSize(v){this.font=v;return this},setPosition(x,y){this.x=x;this.y=y;return this},setScale(v){this.scale=v;return this}};
fitBakedControlKey(key,"PageDown",BAKED_UI_ART.keys.worldMap,156,14);
assert.equal(key.value,"PageDown");
assert.ok(key.width*key.scale<=156*BAKED_UI_ART.keys.worldMap.maxWidthRatio+1e-9);
assert.equal(STAR_IDENTITY_LIBRARY_CONFIG.inventory.bakedCopy,true);
assert.equal(CELESTIAL_TALENT_TREE_UI_CONFIG.assets.foundation.bakedCopy,true);
console.log(JSON.stringify({pass:true,labels:Object.keys(BAKED_UI_LABELS).length,assets:assets.length,decodedMiB:Math.round(decodedBytes/1048576)}));


