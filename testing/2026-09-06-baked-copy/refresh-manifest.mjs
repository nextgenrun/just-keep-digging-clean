import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BAKED_UI_ART, BAKED_UI_LABELS, BAKED_UI_BADGES } from '../../values/bakedUiArt.js';
import { CELESTIAL_CURRENCY_HUD_CONFIG } from '../../values/celestialCurrencyHud.js';
import { APPROVED_HUD_SKIN } from '../../values/approvedHudSkin.js';
import { ASSET_KEYS } from '../../values/assetKeys.js';
import { STAR_IDENTITY_LIBRARY_CONFIG } from '../../values/starIdentityLibrary.js';
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from '../../values/celestialTalentTreeUi.js';
const root=new URL('../../',import.meta.url);
const entries=[...Object.values(BAKED_UI_ART.assets),CELESTIAL_CURRENCY_HUD_CONFIG.assets.foundation,
  ...Object.keys(APPROVED_HUD_SKIN.frames).map(id=>({key:ASSET_KEYS.ui.approvedHud[id],path:APPROVED_HUD_SKIN.paths[id]})),
  {...STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation,load:'star-codex'},
  {...STAR_IDENTITY_LIBRARY_CONFIG.inventory.emptyFoundation,load:'star-codex'},
  {...CELESTIAL_TALENT_TREE_UI_CONFIG.assets.foundation,load:'talents'}];
const assets=[];
for(const asset of entries){
  const bytes=await readFile(new URL(asset.path,root));
  assets.push({key:asset.key,file:asset.path.split('/').at(-1),load:asset.load||'boot',
    sha256:createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length});
}
const manifest={version:2,date:'2026-09-06',generator:'image_gen',originalBytesPreserved:true,
  labelCount:Object.keys(BAKED_UI_LABELS).length,badgeFrames:new Set(Object.values(BAKED_UI_BADGES).map(x=>x.frame)).size,
  bytes:assets.reduce((n,a)=>n+a.bytes,0),decodedBytes:assets.reduce((n,a)=>n+a.width*a.height*4,0),assets};
await writeFile(new URL('sprites/UI/baked-copy-v1/manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log({assets:assets.length,labels:manifest.labelCount,compressedMiB:manifest.bytes/1048576,decodedMiB:manifest.decodedBytes/1048576});
