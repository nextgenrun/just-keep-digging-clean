import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'readme.md'),'# Rendered review evidence\n\nFresh isolated Chromium through the canonical serve.py. Review captures hold the actor; the Play here input check restores the real controller.\n');
const server=spawn('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-u','-c',"import runpy,sys,webbrowser; webbrowser.open=lambda *a,**k:False; sys.argv=['serve.py','8193']; runpy.run_path('serve.py',run_name='__main__')"],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
let browser;
try {
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8193/main.js')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1536,height:1100}});
 const errors=[],failed=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:8193/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/',{waitUntil:'domcontentloaded',timeout:60000});
 try {await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:120000});}
 catch(e){await page.screenshot({path:path.join(out,'boot-failure.png')});console.log(await page.locator('body').innerText());console.log(JSON.stringify({errors,failed,frames:await Promise.all(page.frames().map(async f=>({url:f.url(),text:await f.locator('body').innerText().catch(()=>''),state:await f.evaluate(()=>({phase:window.__phaserGame?.scene?.getScenes(true).map(s=>s.sys.settings.key),ready:window.__jkdLayeredSkyReview?.snapshot()})).catch(()=>null)})))}));throw e;}
 await page.waitForTimeout(3000);
 const captures=[];
 for(const [id,x,y] of [['promenade',47,63],['town-handoff',20,63],['open-sky',100,46],['forest-edge',100,57],['observatory',231,63],['heavenblocks',230,30]]){
  await page.evaluate(({x,y})=>window.__layeredWorldReview.seek(x,y),{x,y});
  await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(out,id+'.png')});
  const state=await page.evaluate(()=>window.__layeredWorldReview.snapshot());
  captures.push({id,...state});console.log(JSON.stringify({id,...state}));
 }
 await fs.writeFile(path.join(out,'smoke.json'),JSON.stringify({errors,failed,captures},null,2));
 console.log('SMOKE_DONE',JSON.stringify({errors,failed}));
} finally {await browser?.close();server.kill();}

