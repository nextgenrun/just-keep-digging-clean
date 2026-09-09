import { BAKED_UI_ART, BAKED_UI_LABELS } from '/values/bakedUiArt.js';
import { STAR_IDENTITY_LIBRARY_CONFIG } from '/values/starIdentityLibrary.js';
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from '/values/celestialTalentTreeUi.js';
import { CELESTIAL_CURRENCY_HUD_CONFIG } from '/values/celestialCurrencyHud.js';
import { APPROVED_HUD_SKIN } from '/values/approvedHudSkin.js';
const assets = {...BAKED_UI_ART.assets,
  starCodex: STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation,
  starCodexEmpty: STAR_IDENTITY_LIBRARY_CONFIG.inventory.emptyFoundation,
  talents: CELESTIAL_TALENT_TREE_UI_CONFIG.assets.foundation,
  currency: CELESTIAL_CURRENCY_HUD_CONFIG.assets.foundation,
  playerCore: {path:APPROVED_HUD_SKIN.paths.playerCoreShell},
  xp: {path:APPROVED_HUD_SKIN.paths.xp},
  levelUp: {path:APPROVED_HUD_SKIN.paths.levelUpShell}};
const nav=document.querySelector('nav'),stage=document.querySelector('#stage'),result=document.querySelector('output');
async function show(id,asset) {
  for(const button of nav.children)button.setAttribute('aria-pressed',String(button.textContent===id));
  const img=new Image();img.alt=id;img.src='/'+asset.path;await img.decode();
  stage.replaceChildren(img);
  const labels=Object.keys(BAKED_UI_LABELS).filter(label=>BAKED_UI_LABELS[label].asset===id);
  const snapshot={id,path:asset.path,width:img.naturalWidth,height:img.naturalHeight,labels};
  document.body.dataset.qualitySnapshot=JSON.stringify(snapshot);
  result.textContent=id+' | '+img.naturalWidth+' x '+img.naturalHeight+' source pixels | '+labels.length+' fixed labels';
}
for(const [id,asset] of Object.entries(assets)){
  const button=document.createElement('button');button.textContent=id;button.setAttribute('aria-pressed','false');
  button.onclick=()=>show(id,asset);nav.append(button);
}
await show('currency',assets.currency);
