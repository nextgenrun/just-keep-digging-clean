import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { BAKED_UI_ART, BAKED_UI_LABELS, BAKED_UI_BADGES } from "../../values/bakedUiArt.js";
import { CELESTIAL_CURRENCY_HUD_CONFIG } from "../../values/celestialCurrencyHud.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";
import { CELESTIAL_FOCUS_ASSETS } from "../../values/celestialTalentFocusUi.js";
import { getBakedUiArt, getBakedUiLabel, fitBakedControlKey, fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";
const root = new URL("../../", import.meta.url);
const sourceFrames = JSON.parse(await readFile(new URL("sprites/UI/baked-copy-v1/source-frames.json", root)));
const focusManifest = JSON.parse(await readFile(new URL("sprites/UI/celestial-focus-v1/manifest.json", root)));
const assets = [...Object.values(BAKED_UI_ART.assets), STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation,
  STAR_IDENTITY_LIBRARY_CONFIG.inventory.emptyFoundation, ...Object.values(CELESTIAL_FOCUS_ASSETS),
  CELESTIAL_CURRENCY_HUD_CONFIG.assets.foundation,
  ...Object.keys(APPROVED_HUD_SKIN.frames).map(id=>({key:ASSET_KEYS.ui.approvedHud[id],
    path:APPROVED_HUD_SKIN.paths[id],...APPROVED_HUD_SKIN.frames[id]}))];
assert.equal(BAKED_UI_ART.enabled, true);
const dimensions = new Map();
let decodedBytes=0;
for (const asset of assets) {
  const data = await readFile(new URL(asset.path, root));
  assert.equal(data.subarray(1,4).toString(), "PNG", asset.path);
  const width=data.readUInt32BE(16), height=data.readUInt32BE(20);
  dimensions.set(asset.key,{width,height}); decodedBytes+=width*height*4;
  if (/integrated-v2/.test(asset.path)) assert.equal(data[25],6,'Integrated HUD art requires real RGBA transparency');
  const metadata=focusManifest.find(entry=>entry.path===asset.path)
    || Object.values(sourceFrames).find(entry=>asset.path.endsWith("/"+entry.file));
  assert.ok(metadata, "Every active asset requires source provenance: "+asset.path);
  assert.equal(createHash("sha256").update(data).digest("hex"), metadata.sha256, "Source pixels must remain unchanged");
}
const within = (key,rect) => {
  assert.equal(rect.length,4);
  const [x,y,w,h]=rect, size=dimensions.get(key);
  assert.ok(Number.isInteger(x)&&Number.isInteger(y)&&w>0&&h>0);
  assert.ok(x>=0&&y>=0&&x+w<=size.width&&y+h<=size.height, "Frame outside "+key);
};
for (const asset of assets) if(asset.rect) within(asset.key,asset.rect);
const manifest=JSON.parse(await readFile(new URL('sprites/UI/baked-copy-v1/manifest.json',root)));
const focusedKeys = new Set(Object.values(CELESTIAL_FOCUS_ASSETS).map(asset=>asset.key));
assert.deepEqual(new Set(manifest.assets.filter(x=>x.key!=="ui-celestial-talent-foundation-baked-v1").map(x=>x.key)),
  new Set(assets.filter(x=>!focusedKeys.has(x.key)).map(x=>x.key)), 'Shared manifest covers the active shared UI graph');
assert.deepEqual(new Set(focusManifest.map(x=>x.path)),new Set(Object.values(CELESTIAL_FOCUS_ASSETS).map(x=>x.path)),
  'Focused manifest covers every selector, foundation, control and feedback asset');
for(const entry of focusManifest) {
  const bytes=await readFile(entry.source);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'Preserve original ImageGen pixels');
  if(['controls.png','feedback.png','free.png'].includes(entry.file)) assert.equal(bytes[25],6,'Real alpha is required');
}
for (const badge of Object.values(BAKED_UI_BADGES)) within(BAKED_UI_ART.assets.iconBadges.key,badge.rect);
for (const frame of Object.values(BAKED_UI_ART.hudDetails)) if(frame?.rect) within(BAKED_UI_ART.assets.hudDetails.key,frame.rect);
for (const frame of Object.values(BAKED_UI_ART.pauseStats)) if(frame?.rect) within(BAKED_UI_ART.assets.pauseStats.key,frame.rect);
assert.equal(BAKED_UI_ART.caption.maximumSourceScale,0.5,"Captions retain native pixels at Ultra density");
for (const [label,record] of Object.entries(BAKED_UI_LABELS)) {
  const key=BAKED_UI_ART.assets[record.asset].key;
  within(key,record.rect); within(key,record.captionRect);
  const [x,y,w,h]=record.rect,[cx,cy,cw,ch]=record.captionRect;
  assert.ok(cx>=x&&cy>=y&&cx+cw<=x+w&&cy+ch<=y+h,label+" caption must stay inside its art");
}
for (const label of ["STAR CODEX","HOLDINGS","RESOURCE CODEX","SPECIAL BLOCKS","STARS","GENERAL","SAVES","SETTINGS","SAVE GAME","RESET CONTROLS"]) assert.ok(BAKED_UI_LABELS[label]);
// Baked lettering must stay proportional inside every control size, including
// wide pause actions, compact toggles and modal titles. Resizing must be stable.
const fitBoxes = [[380,44],[260,34],[62,26],[104,30],[72,80]];
for (const record of Object.values(BAKED_UI_LABELS)) {
  const [, , width, height] = record.rect;
  const image = {
    width, height,
    setDisplaySize(w,h) { this.displayWidth=w; this.displayHeight=h; return this; },
  };
  for (const [maxWidth,maxHeight] of fitBoxes) {
    fitBakedUiImage(image,maxWidth,maxHeight);
    assert.ok(Math.abs(image.displayWidth / width - image.displayHeight / height) < 1e-12,
      "Baked letters must use equal horizontal and vertical scaling");
    assert.ok(image.displayWidth <= maxWidth + 1e-9 && image.displayHeight <= maxHeight + 1e-9,
      "Fitted art must remain inside its existing control bounds");
    const fitted=[image.displayWidth,image.displayHeight];
    fitBakedUiImage(image,maxWidth,maxHeight);
    assert.deepEqual([image.displayWidth,image.displayHeight],fitted,"Repeated layout must not accumulate scale");
  }
}
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


