import fs from "node:fs";
import {DIG_IMPACT_CONTACTS as old} from "../../values/digImpactContacts.generated.js";
import {CHARACTER_DEFINITION_IMPACT_CONTACTS as native} from "../../values/characterDefinitionImpactContacts.js";
import {SURVIVAL_UAL_PLAYER_ASSET_PROFILE as p} from "../../values/survivalUalPlayerAssetProfile.js";
const entries=Object.entries({...old,...native}).map(([key,data])=>{
 const file=p.sheetFiles.find(e=>p[e[0]]===key);return {key,...data,path:`${file[3]}/${file[1]}`};
});
fs.writeFileSync(new URL("contact-assets-updated.json",import.meta.url),JSON.stringify(entries,null,2));
