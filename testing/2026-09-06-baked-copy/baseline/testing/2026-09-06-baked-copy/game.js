// Local production-game review. No normal game page imports this file.
import { STAR_IDENTITY_LIBRARY_CONFIG } from "/values/starIdentityLibrary.js";
import { BAKED_UI_ART, BAKED_UI_LABELS } from "/values/bakedUiArt.js";
if (!["127.0.0.1","localhost"].includes(location.hostname) || !new URLSearchParams(location.search).has("jkd_e2e")) throw Error("Local E2E review only");
const panel = document.createElement("aside");
panel.setAttribute("aria-label", "Baked UI review");
panel.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:100000;background:#101923ee;color:#eee;font:12px monospace;padding:6px";
panel.innerHTML = '<div id="baked-controls"></div><output id="baked-status">Use Play and a save slot to enter the game. E2E blocks game saves.</output><details><summary>UI diagnostics</summary><pre id="baked-data"></pre></details>';
document.body.append(panel);
const getScene = () => window.__phaserGame?.scene.getScenes(true).find(scene => scene.uiInventoryPopup);
const buttons = [];
function add(label, action) {
  const button = document.createElement("button"); button.textContent = label;
  button.addEventListener("click", async () => {
    const scene = getScene();
    if (!scene?._saveWritesBlocked || !window.__jkdE2E) return;
    try { await action(scene); } catch (error) { panel.dataset.failure = error.stack || error.message; }
    button.blur(); document.querySelector("#game-root canvas")?.focus();
  });
  panel.querySelector("#baked-controls").append(button); buttons.push(button);
}
add("Pause", () => window.__jkdE2E.open("pause"));
for (const [label, count] of [["Star Codex: empty", 0], ["Star Codex: collected", 14]]) {
  add(label, async scene => {
    window.__jkdE2E.closeAll();
    const data = scene.floatingTextSystem.getSaveData();
    scene.floatingTextSystem.loadSaveData({ ...data, identityCounts: Array(STAR_IDENTITY_LIBRARY_CONFIG.identities.length).fill(0) });
    const identities = STAR_IDENTITY_LIBRARY_CONFIG.identities.filter(identity => identity.rarityIndex === 0).slice(0,count);
    for (const identity of identities) scene.floatingTextSystem._recordCollectedStar("dirt", 0, { identityIndex: identity.index });
    if (count) scene.floatingTextSystem._recordCollectedStar("dirt", 0, { identityIndex: identities[0].index });
    scene.uiInventoryPopup.open();
    await scene.uiInventoryPopup._activateStarAtlasRarity(0);
  });
}
add("Talents", scene => { window.__jkdE2E.closeAll(); scene.showPauseMenu({ initialTabKey: "talents" }); });
add("Settings", () => window.__jkdE2E.open("pauseSettings"));
add("Campfire", () => window.__jkdE2E.open("campfire"));
add("Merchant", () => window.__jkdE2E.open("playerUpgrades"));
add("Close UI", () => window.__jkdE2E.closeAll());
const capture = document.createElement("button"); capture.textContent = "Inspect native canvas";
capture.addEventListener("click", () => {
  const game=window.__phaserGame;
  if (!game) return;
  game.events.once("postrender", () => {
    const img=document.createElement("img"); img.src=game.canvas.toDataURL("image/png"); img.alt="Native game canvas capture"; img.style.cssText="position:absolute;left:0;top:68px;z-index:99999;max-width:none";
    img.addEventListener("click", () => img.remove()); document.querySelector('img[alt="Native game canvas capture"]')?.remove(); document.body.append(img);
  });
});
panel.querySelector("#baked-controls").append(capture);
function displays(root, all = []) {
  for (const object of root?.list || []) {
    all.push(object); if (object.list) displays(object, all);
  }
  return all;
}
const timer=setInterval(() => {
  const scene=getScene(); for(const button of buttons) button.disabled=!scene?._saveWritesBlocked;
  const active=window.__phaserGame?.scene.getScenes(true)||[];
  const list=active.flatMap(s=>displays(s.children));
  const inventory=scene?.uiInventoryPopup;
  const tree=scene?._pausePanel?.state?.talentTree;
  const snapshot={
    savesBlocked: scene?._saveWritesBlocked===true,
    phase:scene?.gameState||active.map(s=>s.scene.key).join(", "),
    viewport:scene?{width:scene.scale.width,height:scene.scale.height}:null,
    enabled:BAKED_UI_ART.enabled,labelCount:Object.keys(BAKED_UI_LABELS).length,
    bakedSprites:list.filter(x=>x.type==="Image" && x.texture?.key?.includes("baked")).map(x=>({key:x.texture.key,frame:x.frame.name,visible:x.visible,label:x.getData?.("bakedLabel")||null})),
    visibleText:list.filter(x=>x.type==="Text" && x.visible && x.parentContainer?.visible!==false).map(x=>x.text),
    inventory:inventory?{open:inventory.isOpen,tab:inventory.activeTab,rarity:inventory.selectedStarRarity,selected:inventory.selectedStarIdentity}:null,
    talents:tree?{open:tree.isOpen(),health:tree.getHealthSnapshot(),points:tree.talentPointsText.text,stars:tree.starsText.text,level:tree.levelText.text,legacyTitle:Boolean(tree.title),legacySubtitle:Boolean(tree.subtitle)}:null,
    errors:window.__jkdUiErrors||[],failure:panel.dataset.failure||null
  };
  panel.dataset.snapshot=JSON.stringify(snapshot);
  panel.querySelector("#baked-data").textContent=JSON.stringify(snapshot,null,2);
  panel.querySelector("#baked-status").textContent=snapshot.phase+" | "+snapshot.labelCount+" authored labels | saves blocked: "+snapshot.savesBlocked;
},300);
window.addEventListener("pagehide",()=>{clearInterval(timer);panel.remove();},{once:true});
