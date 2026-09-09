import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const tag=process.argv[2]||'before';
const out=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-cloud-polish-v5');
const result={tag,views:[],errors:[],warnings:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(['error','warning'].includes(m.type())&&/frame|shader|WebGL/i.test(m.text()))result.warnings.push(m.text());});
try{
 await page.goto('http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=cloud-polish-v5-'+tag);
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 await page.evaluate(()=>window.__layeredWorldReview.setEnvironment(.4,'clear'));
 await page.waitForTimeout(8500);
 const cases=[[7,63,.4,'clear'],[13,63,.4],[19,63,.4],[25,63,.4],[31,63,.4],[47,63,.4],[63,63,.4],[79,63,.4],[95,63,.4],[117,63,.4],[126,63,.4],[47,59,.4],[47,56,.4],[63,48,.4],[63,24,.4],[7,6,.4],[19,63,.95],[47,63,.95],[95,63,.95],[126,63,.95],[47,63,.4,'storm'],[47,58,.4,'storm'],[63,48,.4,'storm'],[63,24,.4,'storm']];
 if(tag==='after')cases.push([47,63,.4,undefined,.6],[63,24,.4,undefined,.6]);
 for(const [x,y,time,weather,zoom=1] of cases){
  await page.evaluate(([x,y,time,weather,zoom])=>{window.__layeredWorldReview.getScene().cameras.main.setZoom(zoom);window.__layeredWorldReview.seek(x,y);window.__layeredWorldReview.setEnvironment(time,weather);},[x,y,time,weather,zoom]);
  await page.waitForTimeout(weather?8500:300);
  const label=[weather==='storm'||zoom<1?'storm':time>.9?'night':'day',x,y,...(zoom<1?['wide']:[])].join('-');
  const s=await page.evaluate(()=>{
   const scene=window.__layeredWorldReview.getScene(),owner=scene.worldRenderer.surfaceStage.layeredSky,c=scene.cameras.main;
   return {profile:scene.gameplayCapabilities.profileId,levelTwo:scene.gameplayCapabilities.isLevelEnabled(2),renderer:owner.snapshot(),
    clouds:[...owner.clouds.active].map(([id,i])=>({id,x:i.x,y:i.y,width:i.displayWidth,height:i.displayHeight,scaleX:i.scaleX,scaleY:i.scaleY,alpha:i.alpha,depth:i.depth,screenBottom:i.y+i.displayHeight-c.scrollY*i.scrollFactorY,screenTop:i.y-c.scrollY*i.scrollFactorY})),
    landscape:[...owner.landscape.cards].map(([id,i])=>({id,x:i.x,y:i.y,key:i.texture.key,alpha:i.alpha,depth:i.depth})),camera:{width:c.width,height:c.height,zoom:c.zoom,scrollX:c.scrollX,scrollY:c.scrollY},fps:scene.game.loop.actualFps};
  });
  await page.locator('#game').screenshot({path:path.join(out,tag+'-'+label+'.jpg'),type:'jpeg',quality:89});
  result.views.push({label,...s});console.log(tag+' '+label);
 }
 if(tag==='after'){
  result.skyOnly=result.views.every(v=>v.clouds.every(c=>Number(c.id.split(':')[1])<=0));
  if(!result.skyOnly)result.errors.push('A cloud row was admitted below the sky ceiling');
 }
 await fs.writeFile(path.join(out,tag+'-verification.json'),JSON.stringify(result,null,2));
}finally{await browser.close();}
