import { CELESTIAL_TALENT_NODES_BY_ID } from "/values/celestialTalentProgression.js";
import { TILE_TYPES } from "/values/tileTypes.js";
const local = ["localhost","127.0.0.1"].includes(location.hostname);
if (!local || !new URLSearchParams(location.search).has("jkd_e2e")) throw Error("Local save-safe capture only");
const NativeRecorder = window.MediaRecorder;
window.MediaRecorder = class extends NativeRecorder { constructor(stream,options={}) { super(stream,{...options,videoBitsPerSecond:16000000,audioBitsPerSecond:256000}); } };
const panel = document.createElement("div");
panel.id = "trailer-controls";
panel.style.cssText = "position:fixed;z-index:99999;left:8px;top:8px;padding:8px;background:#08121fee;color:#fff;font:14px sans-serif;max-width:660px;border:1px solid #456";
panel.innerHTML = '<button id="film-boot">Start filming session</button> <select id="film-shot" aria-label="Shot"><option>town</option><option>flight</option><option>mine</option><option>blue</option><option>amber</option><option>crystal</option><option>star</option><option>titan</option><option>worldroot</option><option>wayward</option><option>hollow</option><option>lance</option><option>thunder</option><option>treasure</option><option>shadow</option><option>talents</option></select> <button id="film-prepare">Prepare shot</button> <button id="film-record">Record 22 seconds</button> <button id="film-stop">Stop</button><div id="film-status">Loading game modules...</div><div id="film-detail"></div>';
document.body.append(panel);
const status = panel.querySelector("#film-status");
const detail = panel.querySelector("#film-detail");
const timers = [];
const held = new Set();
let busy = false, prepared = "", recordStart = 0, lastMessage = "";
const scene = () => window.__phaserGame?.scene?.getScene?.("PlayScene");
const key = (code,down) => {
 const letter=code.startsWith("Key")?code.slice(3).toLowerCase():code==="ShiftLeft"?"Shift":code==="Space"?" ":code;
 const keyCode=code.startsWith("Key")?code.charCodeAt(3):code==="ShiftLeft"?16:code==="Space"?32:Number(code.slice(1))+111;
 window.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{code,key:letter,keyCode,which:keyCode,bubbles:true,shiftKey:held.has("ShiftLeft")}));
 down?held.add(code):held.delete(code);
};
const after=(ms,fn)=>timers.push(setTimeout(fn,ms));
const release=()=>{for(const id of timers)clearTimeout(id);timers.length=0;for(const code of [...held])key(code,false);};
const message=text=>{lastMessage=text;detail.textContent=text;};
function carve(tx,ty,width=5) {
 const s=scene(),cells=[];
 for(let x=tx-width;x<=tx;x++)for(let y=ty-1;y<=ty;y++)cells.push(x+","+y);
 const applied=s.worldModel.applyDugTileKeys(cells)||[];
 for(const cell of applied)s.worldRenderer.applyTileUpdate(cell.tx,cell.ty);
 window.__jkdE2E.forcePlayerState({tx,ty});
}
function progression(powers=false) {
 const s=scene();
 s.soundSystem?.setMusicVolume?.(0);
 s.soundSystem?.setVoiceVolume?.(0);
 s.playerLevelSystem?.fromJSON?.({progressionVersion:2,level:powers?35:28,currentXP:0,totalXP:0});
 s.upgradeSystem.setUpgradeLevels({...s.upgradeSystem.upgradeLevels,gemPowerUnlock:1,gemPowerTank:5,gemPowerEfficiency:3,gemPowerRegeneration:3,gemFlySpeed:2,agility:3,strength:powers?8:4,quickReflexes:3,heavyPunch:3,quickslashAbility:1,thunderStrikeAbility:1,torchRange:3,torchDrainEfficiency:3});
 if(powers) {
   const ids=Object.keys(CELESTIAL_TALENT_NODES_BY_ID);
   s.celestialTalentProgressionSystem.loadSaveData({version:3,purchasedNodeIds:ids,nodeRanks:Object.fromEntries(ids.map(id=>[id,1])),stars:2800,lifetimeStarsEarned:13000});
 }
 s.playerController.fillGemPower();
}
async function prepare() {
 if(busy)return;
 const s=scene(),h=window.__jkdE2E;
 if(!s?.playerController||!h){message("Wait for PlayScene");return;}
 release();h.closeAll();s._saveWritesBlocked=true;
 s.gameSaveCoordinator?.discardPending?.();
 const shot=panel.querySelector("#film-shot").value;
 const power=["wayward","hollow","lance","thunder","talents"].includes(shot);
 progression(power);
 s.weatherSystem?.forceWeather?.("clear",0,600000,false);
 if(shot==="town")h.forcePlayerState({tx:12,ty:64});
 if(shot==="flight")h.forcePlayerState({tx:34,ty:64});
 if(shot==="mine")carve(45,90);
 if(shot==="blue")carve(48,390);
 if(shot==="amber")carve(71,925);
 if(shot==="crystal")carve(85,1635);
 if(["wayward","hollow","lance","thunder"].includes(shot))carve(50,shot==="wayward"?390:shot==="hollow"?925:shot==="lance"?1635:125);
 if(shot==="star"){key("F6",true);key("F6",false);}
 if(shot==="titan") {h.advanceTitanPreview();h.advanceTitanPreview();h.advanceTitanPreview();}
 if(shot==="worldroot"){h.previewWorldroot();h.previewWorldroot();}
 if(shot==="treasure")h.previewTreasureChest();
 if(shot==="shadow")h.previewShadowMiner();
 if(shot==="talents")h.forcePlayerState({tx:24,ty:64});
 prepared=shot;
 message("Prepared "+shot+"; let nearby artwork stream before recording.");
}
function startRecord() {
 const s=scene(),rec=s?.screenRecordSystem;
 if(busy||!rec||!prepared)return;
 s.playerController.fillGemPower();
 release();window.__jkdE2E.closeAll();
 if(s.sound?.context?.state==="suspended")s.sound.context.resume();
 rec.config={...rec.config,fileNamePrefix:"trailer-clean-"+prepared,frameRate:60};
 if(!rec._start({...rec.config.modes.broad,hideUi:true})){message("Recorder could not start");return;}
 busy=true;recordStart=Date.now();message("Recording "+prepared);
 const shot=prepared;
 if(shot==="town") {after(1500,()=>key("KeyD",true));after(17500,()=>key("KeyD",false));}
 if(shot==="flight") {after(1500,()=>{key("KeyD",true);key("ShiftLeft",true);key("KeyW",true);});after(6500,()=>key("KeyW",false));after(12000,()=>{key("KeyS",true);});after(15500,()=>{key("KeyS",false);key("ShiftLeft",false);});after(19000,()=>key("KeyD",false));}
 if(["mine","blue","amber","crystal"].includes(shot)){after(1500,()=>{key("KeyD",true);key("KeyF",true);});after(19000,()=>{key("KeyD",false);key("KeyF",false);});}
 if(shot==="star"){after(1800,()=>{key("KeyD",true);key("KeyF",true);});after(12000,()=>{key("KeyF",false);key("KeyD",false);});}
 if(shot==="titan"){after(6500,()=>window.__jkdE2E.advanceTitanPreview());}
 if(shot==="worldroot"){after(4500,()=>key("KeyD",true));after(7500,()=>key("KeyD",false));}
 if(["wayward","hollow","lance"].includes(shot)) {
  after(1600,()=>{key("KeyD",true);key("KeyD",false);const id={wayward:"wayward-star",hollow:"hollow-sun",lance:"comet-engine"}[shot];const result=s.celestialEngineController.activateEngine(id);message("Activation "+JSON.stringify(result));});
  after(3000,()=>{key("KeyD",true);key("KeyF",true);});after(19000,()=>{key("KeyF",false);key("KeyD",false);});
 }
 if(shot==="thunder"){after(1800,()=>s.thunderStrikeActionRuntime.update(s.time.now,true));after(9500,()=>{key("KeyD",true);key("KeyF",true);});after(18000,()=>{key("KeyD",false);key("KeyF",false);});}
 if(shot==="treasure"){after(3000,()=>{key("KeyE",true);key("KeyE",false);});}
 if(shot==="shadow"){after(1500,()=>{key("KeyD",true);key("KeyF",true);});after(17000,()=>{key("KeyF",false);key("KeyD",false);});}
 if(shot==="talents"){after(3000,()=>window.__jkdE2E.open("talents"));}
 after(22000,stopRecord);
}
function stopRecord(){const s=scene();release();if(s?.screenRecordSystem?.recorder?.state==="recording")s.screenRecordSystem._stop();busy=false;message("Stopped "+prepared+"; saving through the game's recording endpoint.");}
panel.querySelector("#film-boot").onclick=()=>{const g=window.__phaserGame;if(!g){message("Game modules still loading");return;}for(const name of ["OpeningCinematicScene","MainMenuScene","StartMenuScene"])g.scene.stop(name);g.scene.start("WorldLoadScene",{saveSlot:99,isNewSave:true,worldIdentity:"understar-trailer-20260905",tutorialChoice:"no"});};
panel.querySelector("#film-prepare").onclick=()=>prepare().catch(error=>message(error.stack));
panel.querySelector("#film-record").onclick=startRecord;
panel.querySelector("#film-stop").onclick=stopRecord;
setInterval(()=>{const g=window.__phaserGame,s=scene();const active=g?.scene?.getScenes(true)?.map(x=>x.scene.key).join(", ");status.textContent=busy?"REC "+prepared+" "+((Date.now()-recordStart)/1000).toFixed(1)+"s":active?"Scenes: "+active:"Loading game modules...";if(s?.playerController&&!busy){const p=s.playerController.getPlayerTile();detail.textContent=lastMessage+" | "+JSON.stringify({tile:p,state:s.gameState,savesBlocked:s._saveWritesBlocked,god:s.upgradeSystem.godModeActive,GP:s.playerController.abilities.getGemPowerExact(),canvas:[g.canvas.width,g.canvas.height]});}},500);
window.addEventListener("beforeunload",release);
