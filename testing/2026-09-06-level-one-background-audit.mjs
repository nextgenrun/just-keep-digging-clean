import {createRequire} from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const phase=process.argv[2]||"before",qa=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one");
const result={phase,errors:[],views:[]};
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on("pageerror",e=>{result.errors.push(e.message);console.log("Page error",e.message);});
try{
 await page.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=level-one-"+phase);
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 const child=page.frames().find(f=>f!==page.mainFrame());
 result.scope=await child.evaluate(()=>{const s=window.__phaserGame.scene.getScene("PlayScene");return {profile:s.gameplayCapabilities.profileId,levelTwo:s.gameplayCapabilities.isLevelEnabled(2),bounds:s.cameras.main.getBounds(),tileSize:s.config.tileSize};});
 for(const [label,x,y,time]of [
  ...[7,13,19,25,31,43,55,67,79,91,103,117,126].map(x=>["day-"+x,x,63,.475]),
  ...[19,47,79,126].map(x=>["night-"+x,x,63,.95]),
  ...[60,56,48,24].map(y=>["sky-"+y,47,y,.475])]){
  await page.evaluate(([x,y,time])=>{window.__layeredWorldReview.seek(x,y);window.__layeredWorldReview.setEnvironment(time,"clear");},[x,y,time]);
  await page.waitForTimeout(350);
  const layers=await child.evaluate(()=>{const s=window.__phaserGame.scene.getScene("PlayScene"),o=s.worldRenderer.surfaceStage.layeredSky,c=s.cameras.main;
   return {camera:{x:c.worldView.x,y:c.worldView.y,width:c.worldView.width,height:c.worldView.height},
    trees:[...o.landscape.cards].filter(([id])=>id.startsWith("forest:")).map(([id,i])=>({id,x:i.x,y:i.y,pipeline:i.pipeline.name})),
    clouds:[...o.clouds.active.keys()],motion:s.worldRenderer.surfaceStage.surfacePack?.getMotionSnapshot()};});
  const file=phase+"-"+label+".jpg";
  await page.locator("#game").screenshot({path:path.join(qa,file),type:"jpeg",quality:88});
  result.views.push({label,file,...layers});console.log("Captured",phase,label);
 }
 await fs.writeFile(path.join(qa,phase+"-audit.json"),JSON.stringify(result,null,2));
 const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#111822;color:#e0e8f4;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0}img{width:100%;display:block}figcaption{padding:4px}</style><main>'+result.views.map(v=>'<figure><img src="'+v.file+'"><figcaption>'+v.label+'</figcaption></figure>').join('')+'</main>';
 await fs.writeFile(path.join(qa,phase+"-gallery.html"),html);
 const gallery=await browser.newPage({viewport:{width:1600,height:1250}});
 await gallery.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/"+phase+"-gallery.html");
 await gallery.screenshot({path:path.join(qa,phase+"-sheet.jpg"),type:"jpeg",quality:90,fullPage:true});
 console.log(JSON.stringify({scope:result.scope,views:result.views.length,errors:result.errors}));
}catch(error){
 result.failure=error.stack;
 result.diagnostic=await page.evaluate(()=>({status:document.getElementById("status")?.textContent,frameUrl:document.getElementById("game")?.src,
  scenes:document.getElementById("game")?.contentWindow.__phaserGame?.scene?.getScenes(false)?.map(s=>({key:s.scene.key,active:s.scene.isActive()}))}));
 await fs.writeFile(path.join(qa,phase+"-audit.json"),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));throw error;
}finally{await browser.close();}


