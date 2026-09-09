import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'readme.md'),'# Rendered review evidence\n\nFresh isolated Chromium through the canonical serve.py. Review captures hold the actor; the Play here input check restores the real controller.\n');
const server=spawn('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-u','-c',"import runpy,sys,webbrowser; webbrowser.open=lambda *a,**k:False; sys.argv=['serve.py','8187']; runpy.run_path('serve.py',run_name='__main__')"],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
let browser;
try {
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8187/main.js')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1536,height:1100}});
 const errors=[],failed=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:8187/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/',{waitUntil:'domcontentloaded',timeout:60000});
 try {await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:120000});}
 catch(e){await page.screenshot({path:path.join(out,'boot-failure.png')});console.log(await page.locator('body').innerText());throw e;}
 await page.waitForTimeout(3000);
 const captures=[];
 for(const [id,clouds,features,forest] of [['all',true,true,true],['no-clouds',false,true,true],['no-features',false,false,true],['sky-only',false,false,false],['cloud-only',true,false,false]]){
  await page.evaluate(({clouds,features,forest})=>{const s=window.__layeredWorldReview.getScene();s.worldRenderer.surfaceStage.layeredSky.clouds.update=()=>{};for(const i of s.worldRenderer.surfaceStage.layeredSky.clouds.active.values())i.setVisible(clouds);s.worldRenderer.skyCohesionLayer.enabled=features;for(const {image} of s.worldRenderer.skyCohesionLayer.cards.values())image.setVisible(features);for(const i of s.worldRenderer.surfaceStage.far)i.setVisible(forest);},{clouds,features,forest});
  await page.waitForTimeout(300);await page.locator('#viewport').screenshot({path:path.join(out,'isolate-'+id+'.png')});captures.push(id);
 }
 console.log(await page.evaluate(()=>{const s=window.__layeredWorldReview.getScene();const r=s.worldRenderer.surfaceStage.layeredSky;return [...r.cards.values()].slice(0,3).map(({image})=>{const c=image.texture.getSourceImage().getContext('2d');return {key:image.texture.key,x:image.x,y:image.y,a:Array.from(c.getImageData(0,0,8,1).data),center:Array.from(c.getImageData(800,400,1,1).data)}})}));
 await page.setContent('<body style="margin:0;background:#111;color:white;display:grid;grid-template-columns:1fr 1fr;font:16px sans-serif">'+(await Promise.all(captures.map(async id=>'<div>'+id+'<img style="width:600px;display:block" src="data:image/png;base64,'+(await fs.readFile(path.join(out,'isolate-'+id+'.png'))).toString('base64')+'"></div>'))).join('')+'</body>');await page.screenshot({path:path.join(out,'isolation-sheet.png'),fullPage:true});

} finally {await browser?.close();server.kill();}

