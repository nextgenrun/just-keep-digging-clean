// Local QA entry only: the normal game page never imports this controller.
import { MERCHANT_MOTION_CAST } from '../values/merchantMotion.js';
if (!['127.0.0.1','localhost'].includes(location.hostname) || !new URLSearchParams(location.search).has('jkd_e2e')) throw new Error('Local save-safe game review required');
const panel=document.createElement('aside');
panel.setAttribute('aria-label','Merchant motion verification');
panel.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:100000;background:#111d;color:#eee;padding:8px;font:12px monospace;border:1px solid #796e87;';
panel.innerHTML='<div id="motion-review-controls"></div><output id="motion-review-status">Enter the game through Play.</output><details><summary>Merchant render diagnostics</summary><pre id="motion-review-data"></pre></details>';
document.body.append(panel);
const controls=panel.querySelector('#motion-review-controls');
const buttons=[];
const getScene=()=>window.__phaserGame?.scene.getScenes(true).find(s=>s.npcManager);
for(const cast of MERCHANT_MOTION_CAST){
 const button=document.createElement('button');button.textContent=cast.name;button.disabled=true;
 button.addEventListener('click',()=>{
  const scene=getScene();const npc=scene?.npcManager.npcDefs.find(n=>n.merchantId===cast.id);
  if(!npc || !scene._saveWritesBlocked || !window.__jkdE2E) return;
  window.__jkdE2E.closeAll();
  window.__jkdE2E.forcePlayerState({tx:npc.tx,ty:npc.ty});
  panel.dataset.selected=cast.id;
  button.blur();
  const canvas=document.querySelector('#game-root canvas');
  if(canvas){canvas.tabIndex=0;canvas.focus();}
 });
 controls.append(button);buttons.push({button,id:cast.id});
}
const minimize=document.createElement('button');minimize.textContent='Hide diagnostics';
minimize.addEventListener('click',()=>{const hidden=panel.dataset.minimized!=='true';panel.dataset.minimized=String(hidden);panel.querySelector('#motion-review-status').hidden=hidden;panel.querySelector('details').hidden=hidden;minimize.textContent=hidden?'Show diagnostics':'Hide diagnostics';});controls.append(minimize);
let previousSystem=null;
const timer=setInterval(()=>{
 const scene=getScene();const manager=scene?.npcManager;const system=manager?.motionSystem;
 if(system)previousSystem=system;
 const ids=manager?.npcDefs.map(n=>n.merchantId)||[];
 for(const {button,id}of buttons)button.disabled=!scene?._saveWritesBlocked || !ids.includes(id);
 const motion=system?.getHealthSnapshot();
 const health=manager?.getActivityHealthSnapshot();
 const prompts=(manager?._interactPrompts||[]).map(({npc,view})=>{
  const camera=scene.cameras.main;
  const point=camera.matrix.transformPoint(view.root.x-camera.scrollX,view.root.y-camera.scrollY,{});
  const width=view.size.width*view.root.scaleX*camera.zoomX;
  const height=view.size.height*view.root.scaleY*camera.zoomY;
  return {id:npc.merchantId,visible:view.root.visible,art:view.art?.key||null,key:view.keyLabel?.text||null,legacyTitle:Boolean(view.title),legacyAction:Boolean(view.detail),left:point.x-width/2,top:point.y-height/2,right:point.x+width/2,bottom:point.y+height/2};
 });
 const viewport=scene?{width:scene.scale.width,height:scene.scale.height}:null;
 const state={prompts,viewport,phase:scene?.gameState||'menus',fps:Math.round(window.__phaserGame?.loop.actualFps||0),saveBlocked:scene?._saveWritesBlocked===true,shop:scene?.shopOverlay?.isVisible?scene.shopOverlay.currentMerchant:null,motion,anchorViolations:health?.anchorViolationCount,groundViolations:health?.groundContactViolationCount,previousSystemDestroyed:previousSystem?.destroyed===true,remainingMotionTextures:Object.keys(window.__phaserGame?.textures.list||{}).filter(k=>k.startsWith('merchant-motion:')).length};
 panel.querySelector('#motion-review-status').textContent=manager ? state.phase+' | '+state.fps+' fps | '+(motion?.actors.filter(a=>a.ready).length||0)+' animated | saves blocked: '+state.saveBlocked+' | shop: '+(state.shop||'closed') : 'Enter the game through Play. Previous renderer destroyed: '+state.previousSystemDestroyed+'; remaining textures: '+state.remainingMotionTextures;
 panel.querySelector('#motion-review-data').textContent=JSON.stringify(state,null,2);
 panel.dataset.phase=state.phase;panel.dataset.snapshot=JSON.stringify(state);
},200);
window.addEventListener('pagehide',()=>{clearInterval(timer);panel.remove();},{once:true});
