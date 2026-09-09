import { setupSaveMenuReview } from "./save-menu-review.js";
// Local production-game review. No normal game page imports this file.
import { STAR_IDENTITY_LIBRARY_CONFIG } from "/values/starIdentityLibrary.js";
import { BAKED_TALENT_NODES } from "/values/bakedCelestialUi.js";
import { BAKED_UI_ART, BAKED_UI_LABELS } from "/values/bakedUiArt.js";
import { ensureHardcorePresentationRuntime } from "/world/playScene/HardcorePresentationRuntime.js";
if (!["127.0.0.1","localhost"].includes(location.hostname) || !new URLSearchParams(location.search).has("jkd_e2e")) throw Error("Local E2E review only");
const panel = document.createElement("aside");
panel.setAttribute("aria-label", "Baked UI review");
panel.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:100000;background:#101923ee;color:#eee;font:12px monospace;padding:6px";
panel.innerHTML = '<div id="baked-controls"></div><output id="baked-status">Use Play and a save slot to enter the game. E2E blocks game saves.</output><details><summary>UI diagnostics</summary><pre id="baked-data"></pre></details>';
document.body.append(panel);
const showReview = document.createElement("button");
showReview.textContent = "Show review controls";
showReview.style.cssText = "position:fixed;bottom:0;left:0;z-index:100001;font:11px monospace;display:none";
document.body.append(showReview);
showReview.addEventListener("click", () => { panel.style.visibility="visible";showReview.style.display="none";showReview.blur(); });
setupSaveMenuReview(panel, showReview);
const getScene = () => window.__phaserGame?.scene.getScenes(true).find(scene => scene.uiInventoryPopup);
const buttons = [];
function add(label, action) {
  const button = document.createElement("button"); button.textContent = label;
  button.addEventListener("click", async () => {
    const scene = getScene();
    if (!scene?._saveWritesBlocked || !window.__jkdE2E) return;
    try { const result=await action(scene); if(result?.ok===false) throw Error(result.reason); }
    catch (error) { panel.dataset.failure = error.stack || error.message; }
    button.blur(); document.querySelector("#game-root canvas")?.focus();
  });
  panel.querySelector("#baked-controls").append(button); buttons.push(button);
}
add("Pause", () => window.__jkdE2E.open("pause"));
for (const [label, count] of [["Star Codex: empty", 0], ["Star Codex: collected", 14]]) {
  add(label, async scene => {
    window.__jkdE2E.closeAll();
    scene.systemIntroductionSystem.enabled = false;
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
add("Hide review controls", () => { panel.style.visibility="hidden";showReview.style.display="block"; });
let cancelBurstCapture = null;
add("Capture next talent burst", scene => {
  cancelBurstCapture?.();
  const game = scene.game;
  const stop = () => { game.events.off("postrender", captureBurst); clearTimeout(timeout); cancelBurstCapture = null; };
  const captureBurst = () => {
    const tree = scene._pausePanel?.state?.talentTree;
    if (!tree?.feedback?.active || tree.feedback.elapsed < 120) return;
    const img = document.createElement("img");
    img.src = game.canvas.toDataURL("image/png");
    img.alt = "Native game canvas capture";
    img.style.cssText = "position:absolute;left:0;top:78px;z-index:99999;width:100%;height:auto";
    panel.dataset.burstState = JSON.stringify(tree.getHealthSnapshot());
    img.addEventListener("click", () => img.remove());
    document.querySelector('img[alt="Native game canvas capture"]')?.remove();
    document.body.append(img);
    stop();
  };
  const timeout = setTimeout(stop, 15000);
  cancelBurstCapture = stop;
  game.events.on("postrender", captureBurst);
});
add("Star Codex: all rarities", async scene => {
  window.__jkdE2E.closeAll();
  scene.systemIntroductionSystem.enabled=false;
  const data=scene.floatingTextSystem.getSaveData();
  const identityCounts=Array(STAR_IDENTITY_LIBRARY_CONFIG.identities.length).fill(1);
  identityCounts[0]=987654;
  scene.floatingTextSystem.loadSaveData({...data,identityCounts});
  scene.uiInventoryPopup.open();
  await scene.uiInventoryPopup._activateStarAtlasRarity(0);
});
let talentFixture=null;
for(const [label,mode] of [["Talents: ready","ready"],["Talents: mastered","mastered"],["Talents: restore","restore"]]) {
  add(label,scene=>{
    window.__jkdE2E.closeAll();
    const system=scene.celestialTalentProgressionSystem;
    if(!talentFixture) talentFixture={data:system.getSaveData(),level:system._getPlayerLevel,god:system._isGodModeActiveProvider};
    if(mode==="restore") {
      system._getPlayerLevel=talentFixture.level;
      system._isGodModeActiveProvider=talentFixture.god;
      system.loadSaveData(talentFixture.data);
      talentFixture=null;
    } else {
      system._getPlayerLevel=()=>80;
      system._isGodModeActiveProvider=()=>false;
      system.loadSaveData(null);
      system.grantStars(999999999);
      if(mode==="mastered") {
        for(const id of Object.keys(BAKED_TALENT_NODES)) {
          if(system.getNodeAvailability(id).available)system.purchaseNode(id);
          for(let rank=0;rank<8&&system.getNodeAvailability(id).action==="upgrade"&&system.getNodeAvailability(id).available;rank++) system.upgradeNode(id);
        }
      }
    }
    scene.showPauseMenu({initialTabKey:"talents"});
  });
}
let hardcoreFixture = null;
for (const [label, mode] of [["Hardcore: calm", "hardcore"], ["Hardcore: restore", "restore"]]) {
  add(label, async scene => {
    window.__jkdE2E.closeAll();
    const runtime = scene._hardcoreRuntime;
    if (mode !== "restore") {
      if (!await ensureHardcorePresentationRuntime(scene, runtime)) throw Error("Hardcore art is not ready");
      scene.playerController.fillGemPower();
    }
    if (!hardcoreFixture) hardcoreFixture = runtime.system.getSaveData();
    runtime.system.loadSaveData(mode === "restore" ? hardcoreFixture : {
      ...hardcoreFixture, mode, armed: true, stress: 0, exhausted: false,
    });
    if (mode === "restore") hardcoreFixture = null;
    scene.hardcoreModeData = runtime.system.getSaveData();
    runtime.hud.update(runtime.system.getSnapshot(), scene.time.now,
      scene.playerController.getGemPowerExact(), { gameplayActive: true });
  });
}
add("Settings", () => window.__jkdE2E.open("pauseSettings"));
add("Campfire", () => window.__jkdE2E.open("campfire"));
add("Merchant", () => window.__jkdE2E.open("playerUpgrades"));
add("World Map", scene => { window.__jkdE2E.closeAll(); scene.showWorldMap(); });
let hudFixture = null;
add("Large HUD values", scene => {
  window.__jkdE2E.closeAll();
  const currency = scene.celestialCurrencyHudSystem, xp = scene.xpProgressBar;
  if (!hudFixture) hudFixture = {money:currency.getMoney,stars:currency.getStars,xpUpdate:xp.update,
    pickaxe:scene.hudSystem.approvedSkin.getPickaxeHudSnapshot().pickaxeId};
  currency.getMoney = () => 987654321012;
  currency.getStars = () => 999999999;
  currency.update(true); currency.pulseStars();
  xp.update = () => hudFixture.xpUpdate.call(xp,999,500000,1000000);
  xp.update();
  scene.hudSystem.approvedSkin.setCurrentPickaxe("dragonPickaxe");
});
add("Normal HUD values", scene => {
  if (!hudFixture) return;
  const currency=scene.celestialCurrencyHudSystem;
  currency.getMoney=hudFixture.money; currency.getStars=hudFixture.stars;
  scene.xpProgressBar.update=hudFixture.xpUpdate;
  scene.hudSystem.approvedSkin.setCurrentPickaxe(hudFixture.pickaxe); hudFixture=null;
  currency.update(true);
});
for (const [label,current] of [["XP empty",0],["XP half",500000],["XP full",1000000]]) {
  add(label, scene => {
    if (!hudFixture) return;
    const xp=scene.xpProgressBar;
    xp.update=()=>hudFixture.xpUpdate.call(xp,999,current,1000000);
    xp.update();
  });
}
add("Level-up banner", scene => {
  window.__jkdE2E.closeAll();
  scene.levelUpRewardPresentation.show({level:999,levelsGained:12,talentPointsGain:12,
    panicResistanceGainMeters:120,panicResistanceMeters:9999,miningPowerGainPercent:180,gemPowerMaxGain:120});
  scene.time.delayedCall(700,()=>capture.click());
});
add("Close UI", () => window.__jkdE2E.closeAll());
const capture = document.createElement("button"); capture.textContent = "Inspect native canvas";
capture.addEventListener("click", () => {
  const game=window.__phaserGame;
  if (!game) return;
  capture.blur();
  game.events.once("postrender", () => {
    const img=document.createElement("img"); img.src=game.canvas.toDataURL("image/png"); img.alt="Native game canvas capture"; img.style.cssText="position:absolute;left:0;top:68px;z-index:99999;max-width:none";
    img.addEventListener("click", () => { img.remove(); game.canvas.tabIndex=0; game.canvas.focus(); }); document.querySelector('img[alt="Native game canvas capture"]')?.remove(); document.body.append(img);
  });
});
panel.querySelector("#baked-controls").append(capture);
const live = document.createElement("button"); live.textContent = "Live game";
live.addEventListener("click", () => { document.querySelector('img[alt="Native game canvas capture"]')?.remove(); live.blur(); const canvas=document.querySelector("#game-root canvas"); if(canvas){canvas.tabIndex=0;canvas.focus();} });
panel.querySelector("#baked-controls").append(live);
function isVisible(object) {
  if (!object) return false;
  for(let current=object;current;current=current.parentContainer) if(current.visible===false || current.alpha===0) return false;
  return true;
}
function displays(root, all = []) {
  for (const object of root?.list || []) {
    all.push(object); if (object.list) displays(object, all);
  }
  return all;
}
function measureArt(object, density) {
  const matrix = object.getWorldTransformMatrix();
  const sx = Math.hypot(matrix.a, matrix.b), sy = Math.hypot(matrix.c, matrix.d);
  const bounds = object.getBounds();
  return { key:object.texture.key, frame:object.frame.name, label:object.getData?.("bakedLabel")||null,
    source:[object.width,object.height], logical:[object.width*sx,object.height*sy],
    pixelScale:[sx*density,sy*density], bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height} };
}
const timer=setInterval(() => {
  const scene=getScene(); const canvas=document.querySelector("#game-root canvas"); if(canvas)canvas.tabIndex=0; for(const button of buttons) button.disabled=!scene?._saveWritesBlocked;
  const active=window.__phaserGame?.scene.getScenes(true)||[];
  const list=active.flatMap(s=>displays(s.children));
  const inventory=scene?.uiInventoryPopup;
  const tree=scene?._pausePanel?.state?.talentTree;
  const density=window.__jkdRenderDensity?.density || 1;
  const snapshot={
    savesBlocked: scene?._saveWritesBlocked===true,
    phase:scene?.gameState||active.map(s=>s.scene.key).join(", "),
    viewport:scene?{width:scene.scale.width,height:scene.scale.height}:null,
    enabled:BAKED_UI_ART.enabled,labelCount:Object.keys(BAKED_UI_LABELS).length,
    bakedSprites:list.filter(x=>x.type==="Image" && x.texture?.key?.includes("baked")).map(x=>({key:x.texture.key,frame:x.frame.name,scaleX:x.scaleX,scaleY:x.scaleY,visible:isVisible(x),label:x.getData?.("bakedLabel")||null})),
    visibleText:list.filter(x=>x.type==="Text" && isVisible(x)).map(x=>x.text),
    artQuality:list.filter(x=>["Image","Sprite"].includes(x.type) && isVisible(x)
      && /^(ui-|star-codex|celestial-talent)|baked/.test(x.texture?.key||""))
      .map(x=>measureArt(x,density)),
    density,
    celestialQuality: {
      starArt:list.filter(x=>isVisible(x)&&x.getData?.("bakedStarMotion")).map(x=>({
        identity:x.getData("starIdentityIndex"),key:x.texture.key,frame:x.frame.name,
        x:x.x,y:x.y,scaleX:x.scaleX,scaleY:x.scaleY,angle:x.angle,alpha:x.alpha,
        tint:[x.tintTopLeft,x.tintTopRight,x.tintBottomLeft,x.tintBottomRight],
      })),
      talents:tree?.nodes.filter(view=>isVisible(view.root)).map(view=>({
        id:view.node.id,rank:view.snapshot?.rank,maxRank:view.snapshot?.maxRank,
        available:view.snapshot?.available,reason:view.snapshot?.reason,
        face:measureArt(view.icon,density),hit:view.hit.getBounds(),
        statusBounds:isVisible(view.status)?view.status.getBounds():null,
        statusArtBounds:isVisible(view.statusArt)?view.statusArt.getBounds():null,
      }))||[],
      description:tree?.detail?.card&&isVisible(tree.detail.card)?measureArt(tree.detail.card,density):null,
      focus:tree?{
        selector:tree.selector.cards.map(card=>({branchId:card.branchId,bounds:card.image.getBounds()})),
        back:tree.backHit.getBounds(),action:tree.detail.action.getBounds(),rank:tree.detail.rank.getBounds(),
        cost:{text:tree.detail.cost.text,bounds:tree.detail.cost.getBounds()},
        root:{x:tree.root.x,y:tree.root.y,scale:tree.root.scaleX},
        feedback:tree.feedback.getSnapshot(),
        sound:scene.soundSystem.reviewedSfx.history.filter(entry=>entry.id==="levelUpShort").slice(-5),
      }:null,
    },
    buffs: scene ? (() => {
      const view = scene.hudSystem?.approvedSkin?.buffView;
      const hud = scene._hardcoreRuntime?.hud;
      const empower = scene.celestialEngineController?.getEmpowerSnapshot(scene.time.now);
      const bounds = object => object?.getBounds?.() || null;
      return {state:view?.getSnapshot(),
        entries:view?.entries,frames:view?.frames.filter(isVisible).map(bounds),
        texts:view?.texts.filter(isVisible).map(text=>({text:text.text,bounds:bounds(text)})),
        tooltip:{frame:bounds(view?.tooltipFrame),title:bounds(view?.tooltipTitle),body:bounds(view?.tooltipBody)},
        hardcore:{state:hud?.getDebugSnapshot(),frame:bounds(hud?.frame)},
        empower:empower?{passiveEcho:empower.passiveEcho===true,remainingMs:empower.remainingMs}:null};
    })():null,
    worldMapOpen:scene?.worldMapOverlay?.isOpen===true,
    hudQuality:scene?{
      currency:scene.celestialCurrencyHudSystem?.getHealthSnapshot(),
      liveValues:[scene.celestialCurrencyHudSystem?.moneyText,scene.celestialCurrencyHudSystem?.starsText,
        scene.xpProgressBar?.levelText,scene.xpProgressBar?.xpText,scene._gpLabelText,scene.hudSystem?.statsText]
        .filter(Boolean).map(text=>({text:text.text,width:text.displayWidth,height:text.displayHeight,scaleX:text.scaleX,scaleY:text.scaleY})),
      xp:{percent:scene.xpProgressBar?._fillPercent,segmentWidth:scene.xpProgressBar?.segmentWidth,
        barWidth:scene.xpProgressBar?.barWidth,bakedFrame:scene.xpProgressBar?.frame?.frame.name},
      levelUp:scene.levelUpRewardPresentation?.getHealthSnapshot(),
      pickaxe:scene.hudSystem?.approvedSkin?.getPickaxeHudSnapshot(),
    }:null,
    inventory:inventory?{open:inventory.isOpen,tab:inventory.activeTab,rarity:inventory.selectedStarRarity,selected:inventory.selectedStarIdentity}:null,
    talents:tree?{open:tree.isOpen(),health:tree.getHealthSnapshot(),points:tree.talentPointsText.text,stars:tree.starsText.text,level:tree.levelText.text,legacyTitle:Boolean(tree.title),legacySubtitle:Boolean(tree.subtitle)}:null,
    errors:window.__jkdUiErrors||[],failure:panel.dataset.failure||null
  };
  panel.dataset.snapshot=JSON.stringify(snapshot);
  panel.querySelector("#baked-data").textContent=JSON.stringify(snapshot,null,2);
  panel.querySelector("#baked-status").textContent=snapshot.phase+" | "+snapshot.labelCount+" authored labels | saves blocked: "+snapshot.savesBlocked;
},300);
window.addEventListener("pagehide",()=>{cancelBurstCapture?.();clearInterval(timer);panel.remove();showReview.remove();},{once:true});
