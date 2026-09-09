import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
const byId = id => document.getElementById(id);
const frame = byId("game"), overlay = byId("navigate");
const places = CONFIG.review.bookmarks;
const REVIEW = CONFIG.review;
for(const [label,time] of REVIEW.times)byId("time").add(new Option(label,time));
for(const kind of REVIEW.weatherKinds)byId("weather").add(new Option(kind[0].toUpperCase()+kind.slice(1),kind));
function setEnvironment(time,weather){
  if(!scene)return;
  if(Number.isFinite(time)){scene.dayNightCycle.fromJSON({currentTime:time});scene.dayNightCycle.update(0);}
  if(weather === "")scene.weatherSystem.resumeWeather();
  if(weather)scene.weatherSystem.forceWeather(weather,REVIEW.weatherIntensityByKind[weather]??REVIEW.weatherIntensity,REVIEW.weatherDurationMs,true);
}
byId("time").onchange=event=>{if(event.target.value!=="")setEnvironment(Number(event.target.value));};
byId("weather").onchange=event=>setEnvironment(undefined,event.target.value);
for (const [i, place] of places.entries()) byId("bookmark").add(new Option(place[0],i));
byId("bookmark").value = String(places.findIndex(place=>place[1]===REVIEW.startX&&place[2]===REVIEW.startY));
for (const [id,min,max,value] of [["position",REVIEW.minX,REVIEW.maxX,REVIEW.startX],["altitude",REVIEW.minY,REVIEW.maxY,REVIEW.startY]]) Object.assign(byId(id),{min,max,value});
let mode = "candidate", scene = null, started = false, ready = false;
let x = REVIEW.startX, y = REVIEW.startY, tour = false, held = false, playing = false, playerUpdate = null, drag = null;
const keys = new Set();
function load() {
  scene = null; started = ready = false; playing = false;
  byId("loading").style.display = "grid"; overlay.style.display = "block";
  byId("play").textContent = "Play here";
  frame.src = "/?jkd_e2e=1&cinematics=0&gameplayProfile="+REVIEW.profile+"&systemPacing=0&layeredSky=" + (mode==="candidate"?"1":"0");
  document.querySelectorAll("[data-mode]").forEach(button=>button.classList.toggle("selected",button.dataset.mode===mode));
}
function explore() {
  if (!scene) return;
  if (playing) { x=scene.cameras.main.worldView.centerX/scene.config.tileSize; y=scene.cameras.main.worldView.centerY/scene.config.tileSize; }
  playing = false; scene.playerController.update = ()=>{};
  scene.playerController.setControlsEnabled(false); scene.cameras.main.stopFollow();
  overlay.style.display = "block"; byId("play").textContent = "Play here";
}
function move() {
  if (!ready || playing) return;
  const ts = scene.config.tileSize;
  scene.playerController.teleportToTile(Math.floor(x), y>=61?64:Math.floor(y));
  scene.cameras.main.centerOn(x*ts,y*ts);
  byId("position").value = x; byId("altitude").value = y;
  const place = [...places].sort((a,b)=>Math.abs(a[1]-x)+Math.abs(a[2]-y)-Math.abs(b[1]-x)-Math.abs(b[2]-y))[0];
  byId("region").textContent = place[0];
}
function seek(nextX,nextY) {
  if (playing) explore();
  x = Math.max(REVIEW.minX,Math.min(REVIEW.maxX,Number(nextX))); y = Math.max(REVIEW.minY,Math.min(REVIEW.maxY,Number(nextY)));
  move();
}
document.querySelectorAll("[data-mode]").forEach(button=>button.onclick=()=>{mode=button.dataset.mode;load();});
byId("bookmark").onchange = event=>{const p=places[Number(event.target.value)];seek(p[1],p[2]);};
byId("position").oninput = event=>seek(event.target.value,y);
byId("altitude").oninput = event=>seek(x,event.target.value);
byId("tour").onclick = ()=>{if(playing)explore();tour=!tour;byId("tour").setAttribute("aria-pressed",tour);};
byId("pause").onclick = ()=>{
  held=!held;frame.contentWindow.__jkdLayeredSkyReview?.setPaused(held);
  byId("pause").textContent=held?"Resume atmosphere":"Hold atmosphere";
};
byId("play").onclick = ()=>{
  if(!ready)return;
  if(playing){explore();return;}
  tour=false;playing=true;overlay.style.display="none";
  scene.playerController.update=playerUpdate;scene.playerController.setControlsEnabled(true);
  scene.cameras.main.startFollow(scene.player,true,REVIEW.followLerp,REVIEW.followLerp);
  byId("play").textContent="Return to review";byId("hint").textContent="A / D walk  -  Shift + W / S fly";
  frame.contentWindow.focus();
};
overlay.onpointerdown=event=>{drag={x:event.clientX,y:event.clientY};overlay.setPointerCapture(event.pointerId);};
overlay.onpointermove=event=>{
  if(!drag||!ready)return;
  const scale=scene.cameras.main.width/overlay.clientWidth/scene.config.tileSize;
  seek(x-(event.clientX-drag.x)*scale,y-(event.clientY-drag.y)*scale);
  drag={x:event.clientX,y:event.clientY};
};
overlay.onpointerup=()=>{drag=null;};
window.addEventListener("keydown",event=>{if(!playing&&event.key.startsWith("Arrow")){keys.add(event.key);event.preventDefault();}});
window.addEventListener("keyup",event=>keys.delete(event.key));
window.addEventListener("blur",()=>keys.clear());
let last=performance.now();
function tick(now) {
  const delta=Math.min(REVIEW.maxDeltaSeconds,(now-last)/1000);last=now;
  try {
    const game=frame.contentWindow.__phaserGame;
    if(!started&&game?.scene?.isActive("MainMenuScene")){
      started=true;game.scene.getScene("MainMenuScene").scene.start("WorldLoadScene",{
        saveSlot:3,worldIdentity:"layered-horizon-review",isNewSave:true,tutorialChoice:"skip"});
    }
    if(started&&!ready){
      scene=game.scene.getScene("PlayScene");
      if(scene?.worldRenderer?.created && (mode==="baseline"||frame.contentWindow.__jkdLayeredSkyReview?.snapshot().ready)){
        ready=true;playerUpdate=scene.playerController.update;explore();scene.cameras.main.setZoom(1);move();
        frame.contentWindow.__jkdLayeredSkyReview?.setPaused(held);
        byId("loading").style.display="none";
      }
    }
    if(ready){
      const dx=(keys.has("ArrowRight")?1:0)-(keys.has("ArrowLeft")?1:0);
      const dy=(keys.has("ArrowDown")?1:0)-(keys.has("ArrowUp")?1:0);
      if(!playing&&(tour||dx||dy)){seek(x+(tour?REVIEW.tourTilesPerSecond:dx*REVIEW.panTilesPerSecond)*delta,y+dy*REVIEW.riseTilesPerSecond*delta);if(x>=REVIEW.maxX)tour=false;}
      const info=frame.contentWindow.__jkdLayeredSkyReview?.snapshot();
      byId("status").textContent=mode==="candidate"
        ? "In-game background  -  "+(info?.cloudSprites||0)+" visible clouds  -  X "+x.toFixed(1)
        : "Current renderer  -  X "+x.toFixed(1);
    }
  } catch (error) { byId("status").textContent=error.message; }
  requestAnimationFrame(tick);
}
window.__layeredWorldReview={seek, snapshot:()=>({ready,mode,x,y,playing,held,renderer:frame.contentWindow.__jkdLayeredSkyReview?.snapshot()}),
  setEnvironment,compare:next=>{mode=next;load();},getScene:()=>scene};
load();requestAnimationFrame(tick);

