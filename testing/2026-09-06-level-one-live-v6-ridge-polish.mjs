import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/2026-09-06-level-one-live-v6');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1536,height:864},deviceScaleFactor:1});
const result={entry:'/?jkd_e2e=1&cinematics=0',errors:[],warnings:[],views:[]};
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(['error','warning'].includes(m.type())&&/frame|shader|WebGL|swallow|layered/i.test(m.text()))result.warnings.push(m.text());});
async function boot(suffix=''){
 await page.goto('http://127.0.0.1:8195'+result.entry+suffix,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__phaserGame?.scene.isActive('MainMenuScene'),null,{timeout:120000});
 await page.evaluate(()=>{window.__phaserGame.scene.getScene('MainMenuScene').scene.start('WorldLoadScene',{
  saveSlot:3,worldIdentity:'level-one-live-v6-qa',isNewSave:true,tutorialChoice:'skip'});});
 await page.waitForFunction(()=>{const s=window.__phaserGame?.scene.getScene('PlayScene');return s?._sceneSetupReady===true&&s.worldRenderer?.created&&s.gameState==='playing';},null,{timeout:120000});
 await page.evaluate(()=>window.__jkdE2E?.closeAll?.());
}
const sample=()=>page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene('PlayScene'),o=s.worldRenderer.surfaceStage.layeredSky,p=s.playerController.physicsBody;
 return {query:location.search,profile:s.gameplayCapabilities.profileId,levelTwo:s.gameplayCapabilities.isLevelEnabled(2),
  renderer:o?.snapshot()||null,legacyFar:s.worldRenderer.surfaceStage.far.length,oldClouds:s.atmosphereSystem?.clouds?.length??null,
  body:{x:p.x,y:p.y},fps:s.game.loop.actualFps,
  event:o?.ambientEvents.actors.map(a=>({x:a.image.x,y:a.image.y,alpha:a.image.alpha,width:a.image.displayWidth,frame:a.image.frame.name}))||[]};
});
async function view(x,y,time=.4,weather){
 await page.evaluate(([x,y,time,weather])=>{
  const s=window.__phaserGame.scene.getScene('PlayScene');s.playerController.setControlsEnabled(false);s.playerController.update=()=>{};
  s.playerController.teleportToTile(Math.floor(x),y>=61?64:Math.floor(y));s.cameras.main.stopFollow();
  s.cameras.main.setZoom(1).centerOn(x*s.config.tileSize,y*s.config.tileSize);
  s.dayNightCycle.fromJSON({currentTime:time});s.dayNightCycle.update(0);
  if(weather)s.weatherSystem.forceWeather(weather,weather==='clear'?0:.94,120000,true);
 },[x,y,time,weather]);
 await page.waitForTimeout(weather?8500:700);
}
async function capture(label){
 const state=await sample();assert.equal(state.profile,'demo');assert.equal(state.levelTwo,false);
 assert(state.renderer&&!state.renderer.reviewOnly);assert.equal(state.legacyFar,0);
 await page.screenshot({path:path.join(out,label+'.jpg'),type:'jpeg',quality:89});result.views.push({label,...state});console.log(label);
}
try{
 await boot();
 for(const x of [19,47,63,79,95,111,126]){await view(x,63,.4,x===19?'clear':undefined);await capture('ridge-polish-day-'+x);}
 result.eastObjects=await page.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene('PlayScene'),camera=s.cameras.main;
  return s.children.list.filter(o=>o.visible&&o.alpha>.05&&o.texture&&o.depth<0).map(o=>{
   const b=o.getBounds();return {name:o.name,key:o.texture.key,depth:o.depth,x:b.x-camera.scrollX*o.scrollFactorX,y:b.y-camera.scrollY*o.scrollFactorY,w:b.width,h:b.height};
  }).filter(o=>o.x<1536&&o.x+o.w>0&&o.y<750&&o.y+o.h>300);
 });
 await fs.writeFile(path.join(out,'ridge-polish-check.json'),JSON.stringify(result,null,2));
}finally{await browser.close();}
