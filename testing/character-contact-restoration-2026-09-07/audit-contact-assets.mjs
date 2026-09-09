import fs from "node:fs";
import { DIG_IMPACT_CONTACTS } from "../../values/digImpactContacts.generated.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as p } from "../../values/survivalUalPlayerAssetProfile.js";
import { resolveDigImpactContact } from "../../systems/visual/digImpactContact.js";
const entries=Object.entries(DIG_IMPACT_CONTACTS).map(([key,data])=>{
 const file=p.sheetFiles.find(entry=>p[entry[0]]===key);
 return {key,...data,path:file?`${file[3]}/${file[1]}`:null};
});
fs.writeFileSync(new URL("contact-assets.json",import.meta.url),JSON.stringify(entries,null,2));
const k="survival-mixamo-v3-complex-dig-cross-sheet", row=Object.values(DIG_IMPACT_CONTACTS[k].contacts)[0];
const pose={sheet:k,contactFrame:row[0],visibleFrame:row[0],x:500,y:400,width:512,height:512,scaleX:101/512,scaleY:101/512,originX:.5,originY:.890625,flipX:false};
console.log(JSON.stringify({beforeContact:resolveDigImpactContact({pose,body:{x:480,y:325,w:40,h:75},targetTile:{tx:6,ty:3},tileSize:94}),sourceSheets:entries.length,rig:p.rigManifestFile,base:p.basePath}));
