import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const qa='testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-atmosphere-v3';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}}),errors=[],failed=[],states=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
page.on('console',m=>{if(m.type()==='error'&&/shader|uniform|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=atmosphere-v3');
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 const child=page.frames().find(f=>f!==page.mainFrame());
 for(const [name,x,y,time,weather] of [['day',47,63,.40,'clear'],['noon',66.5,60,.5,'clear'],['storm',47,63,.40,'storm'],['night',59,61,.95,'clear'],['sky',63,24,.4,'clear']]){
   await page.evaluate(([x,y,time,weather])=>{window.__layeredWorldReview.seek(x,y);window.__layeredWorldReview.setEnvironment(time,weather);},[x,y,time,weather]);
   await page.waitForTimeout(7000);
   const state=await child.evaluate(()=>{const s=window.__phaserGame.scene.getScene('PlayScene');return {renderer:window.__jkdLayeredSkyReview.snapshot(),sun:s.dayNightCycle.getSunState(),camera:{...s.cameras.main.worldView},fps:s.game.loop.actualFps};});
   states.push({name,...state});await page.locator('#game').screenshot({path:qa+'/'+name+'.jpg',type:'jpeg',quality:92});
   console.log(JSON.stringify({name,fps:state.fps,sun:state.renderer.celestial?.sun,clouds:state.renderer.cloudSprites,details:state.renderer.floatingDetails}));
 }
 await fs.writeFile(qa+'/first-look.json',JSON.stringify({errors,failed,states},null,2));
 console.log(JSON.stringify({errors,failed}));
}catch(e){console.log(JSON.stringify({error:e.stack,errors,failed,status:await page.locator('#status').textContent()}));throw e;}
finally{await browser.close();}
