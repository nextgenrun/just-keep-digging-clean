import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const ffmpegRoot=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa/.browser-runtime');
process.env.PLAYWRIGHT_BROWSERS_PATH=ffmpegRoot;
await fs.mkdir(path.join(ffmpegRoot,'ffmpeg-1011'),{recursive:true});
await fs.copyFile('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe',path.join(ffmpegRoot,'ffmpeg-1011/ffmpeg-win64.exe'));
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'readme.md'),'# Rendered review evidence\n\nFresh isolated Chromium through the canonical serve.py. Review captures hold the actor; the Play here input check restores the real controller.\n');
const server=spawn('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-u','-c',"import runpy,sys,webbrowser; webbrowser.open=lambda *a,**k:False; sys.argv=['serve.py','8194']; runpy.run_path('serve.py',run_name='__main__')"],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
let browser;
try {
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8194/main.js')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const startedAt=Date.now();
 const page=await browser.newPage({viewport:{width:1536,height:1100},recordVideo:{dir:out,size:{width:1536,height:1100}}});
 const errors=[],failed=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:8194/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/',{waitUntil:'domcontentloaded',timeout:60000});
 try {await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:120000});}
 catch(e){await page.screenshot({path:path.join(out,'boot-failure.png')});console.log(await page.locator('body').innerText());console.log(JSON.stringify({errors,failed,frames:await Promise.all(page.frames().map(async f=>({url:f.url(),text:await f.locator('body').innerText().catch(()=>''),state:await f.evaluate(()=>({phase:window.__phaserGame?.scene?.getScenes(true).map(s=>s.sys.settings.key),ready:window.__jkdLayeredSkyReview?.snapshot()})).catch(()=>null)})))}));throw e;}
 await page.waitForTimeout(3000);

 const captures=[];
 async function seek(x,y) {
  await page.evaluate(({x,y})=>window.__layeredWorldReview.seek(x,y),{x,y});
  await page.waitForFunction(()=>{
   const s=window.__layeredWorldReview.getScene(), b=s.worldRenderer.lastBounds, c=s.cameras.main.worldView, t=s.config.tileSize;
   return b&&b.left<=Math.floor(c.x/t)&&b.right>=Math.ceil(c.right/t)&&b.top<=Math.floor(c.y/t)&&b.bottom>=Math.ceil(c.bottom/t)
     && s.worldRenderer.skyCohesionLayer.getSnapshot().pendingFeatureAssets===0;
  },null,{timeout:30000});
  await page.waitForTimeout(150);
 }
 async function capture(id,x,y) {
  await seek(x,y);
  await page.locator('#viewport').screenshot({path:path.join(out,id+'.jpg'),type:'jpeg',quality:84});
  const state=await page.evaluate(()=>{
   const r=window.__layeredWorldReview,s=r.getScene();
   return {...r.snapshot(),fps:s.game.loop.actualFps,props:s.worldRenderer.surfacePropLayer.getSnapshot(),camera:{...s.worldRenderer.lastBounds}};
  });
  captures.push({id,...state});await fs.writeFile(path.join(out,'capture-progress.json'),JSON.stringify({errors,failed,captures},null,2));console.log('CAPTURE',id);
 }
 for(let x=7;x<=267;x+=20) await capture('surface-'+x,x,63);
 for(const x of [20,100,180,230,270]) for(const y of [8,23,38,46,52,57]) await capture('sky-'+x+'-'+y,x,y);
 await seek(100,57);
 const pauseBefore=await page.evaluate(()=>{const r=window.frames[0].__jkdLayeredSkyReview;r.setPaused(true);return r.snapshot().traveledSeconds;});
 await page.waitForTimeout(1200);
 const pauseAfter=await page.evaluate(()=>window.frames[0].__jkdLayeredSkyReview.snapshot().traveledSeconds);
 if(pauseBefore!==pauseAfter)throw new Error('Cloud clock changed during pause');
 const getPositions=()=>page.evaluate(()=>{
  const s=window.__layeredWorldReview.getScene(),c=s.worldRenderer.surfaceStage.layeredSky.clouds;
  return {seconds:c.traveledSeconds,images:Object.fromEntries([...c.active].map(([id,i])=>[id,{x:i.x,y:i.y,layer:id.split(':')[0]}]))};
 });
 await page.evaluate(()=>window.frames[0].__jkdLayeredSkyReview.setPaused(false));
 const motionBefore=await getPositions();
 const clipStart=(Date.now()-startedAt)/1000;
 await page.waitForTimeout(6500);
 const motionAfter=await getPositions();
 const motionDeltas=Object.entries(motionBefore.images).filter(([id])=>motionAfter.images[id]).map(([id,p])=>({layer:p.layer,dx:motionAfter.images[id].x-p.x,dy:motionAfter.images[id].y-p.y}));
 if(!motionDeltas.length||motionDeltas.some(d=>d.dx<=0||d.dy!==0))throw new Error('Continuous wind invariant failed');
 await page.click('#tour');await page.waitForTimeout(10000);await page.click('#tour');
 await page.locator('#viewport').screenshot({path:path.join(out,'candidate-travel.jpg'),type:'jpeg',quality:92});
 await seek(47,63);await page.click('#play');
 const playerPosition=()=>page.evaluate(()=>{const s=window.__layeredWorldReview.getScene();return {x:s.player.x,y:s.player.y};});
 const walkBefore=await playerPosition();await page.keyboard.down('d');await page.waitForTimeout(1200);await page.keyboard.up('d');const walkAfter=await playerPosition();
 await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');await page.keyboard.up('Shift');const flightAfter=await playerPosition();
 await page.locator('#viewport').screenshot({path:path.join(out,'actual-flight.jpg'),type:'jpeg',quality:88});
 const inputProof={walkBefore,walkAfter,flightAfter,walked:walkAfter.x-walkBefore.x>40,flew:flightAfter.y<walkAfter.y-40};
 console.log('INPUT',JSON.stringify(inputProof));
 await page.click('#play');
 await capture('candidate-forest-edge',100,57);
 await capture('candidate-open-sky',100,46);
 await page.evaluate(()=>window.__layeredWorldReview.compare('baseline'));
 await page.waitForFunction(()=>window.__layeredWorldReview.snapshot().ready,null,{timeout:120000});
 await capture('baseline-forest-edge',100,57);await capture('baseline-open-sky',100,46);
 const baselineReviewLoaded=await page.evaluate(()=>Boolean(window.frames[0].__jkdLayeredSkyReview));
 if(baselineReviewLoaded)throw new Error('Review enabled in default mode');
 await page.evaluate(()=>window.__layeredWorldReview.compare('candidate'));
 await page.waitForFunction(()=>window.__layeredWorldReview.snapshot().ready,null,{timeout:120000});
 await capture('candidate-final',100,57);
 const assetsBeforeDestroy=await page.evaluate(()=>Object.keys(window.frames[0].__phaserGame.textures.list).filter(k=>k.includes(':clean-alpha')||k.includes(':feather:')||k.startsWith('layered-sky-review-mask')));
 const child=page.frames().find(f=>f!==page.mainFrame());
 await child.evaluate(()=>{window.__phaserGame.scene.stop('PlayScene');});
 await page.waitForTimeout(200);
 const lifecycle=await child.evaluate(()=>({inspectorPresent:Boolean(window.__jkdLayeredSkyReview),retainedOwnedTextures:Object.keys(window.__phaserGame.textures.list).filter(k=>k.includes(':clean-alpha')||k.includes(':feather:')||k.startsWith('layered-sky-review-mask'))}));
 await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({errors,failed,captures,pauseBefore,pauseAfter,motionDeltas,inputProof,baselineReviewLoaded,assetsBeforeDestroy,lifecycle,clipStart,clipDuration:16},null,2));
 const video=page.video();await page.close();const videoPath=await video.path();
 const ffmpeg=spawn('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe',['-y','-i',videoPath,'-ss',String(clipStart),'-t','16','-vf','crop=1472:828:32:104','-an','-c:v','libx264','-crf','20','-preset','fast','-movflags','+faststart',path.join(out,'living-horizons.mp4')],{windowsHide:true,stdio:'ignore'});
 await new Promise((resolve,reject)=>{ffmpeg.on('exit',code=>code===0?resolve():reject(new Error('Video encoding failed')));ffmpeg.on('error',reject);});
 const gallery=await browser.newPage({viewport:{width:1600,height:1200}});
 for(let offset=0;offset<captures.length;offset+=12){
  const html=await Promise.all(captures.slice(offset,offset+12).map(async c=>'<figure style="margin:0"><img style="width:100%" src="data:image/jpeg;base64,'+(await fs.readFile(path.join(out,c.id+'.jpg'))).toString('base64')+'"><figcaption>'+c.id+'</figcaption></figure>'));
  await gallery.setContent('<body style="margin:16px;background:#0a111c;color:#cde2eb;font:13px sans-serif"><main style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'+html.join('')+'</main></body>');
  await gallery.screenshot({path:path.join(out,'review-sheet-'+(offset/12+1)+'.jpg'),type:'jpeg',quality:90});
 }
 console.log('VERIFIED',JSON.stringify({captures:captures.length,errors,failed,inputProof,lifecycle}));
 if(errors.length||failed.length||!inputProof.walked||!inputProof.flew||lifecycle.inspectorPresent||lifecycle.retainedOwnedTextures.length)process.exitCode=1;

} catch(error) {console.error('QA_FAILURE',error.stack);throw error;} finally {await browser?.close();server.kill();try{await fs.chmod(path.join(ffmpegRoot,'ffmpeg-1011/ffmpeg-win64.exe'),0o666);await fs.unlink(path.join(ffmpegRoot,'ffmpeg-1011/ffmpeg-win64.exe'));}catch(error){console.log('TEMP_ENCODER_CLEANUP',error.message);}}

