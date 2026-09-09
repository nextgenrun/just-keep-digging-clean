import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-cloud-polish-v5');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=cloud-polish-v5-motion');
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 await page.evaluate(()=>{window.__layeredWorldReview.seek(31,63);window.__layeredWorldReview.setEnvironment(.4,'clear');});
 await page.waitForTimeout(7500);
 const joins=await page.evaluate(async()=>{
  const scene=window.__layeredWorldReview.getScene(),owner=scene.worldRenderer.surfaceStage.layeredSky;
  const {WORLD_VISUAL_LAYERED_SKY_REVIEW:C}=await import('/values/worldVisualLayeredSkyReview.js');
  let pixels=0,silhouettes=0,guardPixels=0,maxCoverageLoss=0,maxGuardAlphaDifference=0,maxGuardColorDifference=0;
  const layers=[];
  for(const [id,section] of owner.landscape.sections){
   const {stride,pad,height,period}=section,width=stride+pad*2;
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const draw=(item,x)=>{
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(item.source,x,height-section.maxOffset+item.offset-item.height,item.width,item.height);
    return ctx.getImageData(0,0,width,height).data;
   };
   const data=col=>scene.textures.get(section.texture(col).key).getContext().getImageData(0,0,width,height).data;
   for(let col=0;col<period;col++){
    const current=draw(section.variant(col),pad),previous=draw(section.variant(col-1),pad-stride);
    const joined=data(col),next=data(col+1);
    for(let y=0;y<height;y++){
     for(let x=C.landscapeJoin.coverageFeatherPx;x<section.layer.overlapPx-C.landscapeJoin.coverageFeatherPx;x++){
      const i=(y*width+x+pad)*4,coverage=Math.max(current[i+3],previous[i+3]);
      maxCoverageLoss=Math.max(maxCoverageLoss,coverage-joined[i+3]);pixels++;
      if(coverage>250&&Math.min(current[i+3],previous[i+3])<5)silhouettes++;
     }
     for(let x=-pad;x<pad;x++){
      const a=(y*width+stride+pad+x)*4,b=(y*width+pad+x)*4;
      maxGuardAlphaDifference=Math.max(maxGuardAlphaDifference,Math.abs(joined[a+3]-next[b+3]));
      for(let c=0;c<3;c++)maxGuardColorDifference=Math.max(maxGuardColorDifference,Math.abs(joined[a+c]*joined[a+3]/255-next[b+c]*next[b+3]/255));
      guardPixels++;
     }
    }
   }
   layers.push({id,phases:period,width,height});
  }
  return {layers,pixels,silhouettes,guardPixels,maxCoverageLoss,maxGuardAlphaDifference,maxGuardColorDifference};
 });
 await fs.writeFile(path.join(out,'runtime-joins.json'),JSON.stringify(joins,null,2));
 assert.equal(joins.layers.length,4);assert(joins.silhouettes>1000);
 assert(joins.maxCoverageLoss<=1);assert(joins.maxGuardAlphaDifference<=1);assert(joins.maxGuardColorDifference<=1);
 console.log('Actual generated texture joins passed: '+JSON.stringify(joins));
 const recording=await page.evaluate(async()=>{
  const review=window.__layeredWorldReview,scene=review.getScene(),owner=scene.worldRenderer.surfaceStage.layeredSky;
  const stream=scene.game.canvas.captureStream(30),chunks=[],samples=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const ended=new Promise(resolve=>recorder.onstop=resolve);recorder.start(1000);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const sample=()=>({seconds:owner.clouds.traveledSeconds,windDistance:owner.clouds.windDistance,foliageTime:owner.landscape.motion.pipeline.motionSeconds,
   cloudRows:[...owner.clouds.active.keys()].map(id=>Number(id.split(':')[1])),fps:scene.game.loop.actualFps});
  samples.push(sample());
  const start=performance.now();
  while(performance.now()-start<8000){review.seek(31+16*(performance.now()-start)/8000,63);await wait(100);}
  review.seek(47,63);review.setEnvironment(.4,'rain');samples.push(sample());await wait(8000);
  review.seek(47,58);samples.push(sample());await wait(8000);samples.push(sample());
  recorder.stop();await ended;stream.getTracks().forEach(track=>track.stop());
  const blob=new Blob(chunks,{type:'video/webm'}),reader=new FileReader();reader.readAsDataURL(blob);
  await new Promise(resolve=>reader.onload=resolve);
  return {data:reader.result,bytes:blob.size,durationSeconds:(performance.now()-start)/1000,samples};
 });
 await fs.writeFile(path.join(out,'level-one-cloud-polish-v5.webm'),Buffer.from(recording.data.split(',')[1],'base64'));
 delete recording.data;
 assert(recording.samples.at(-1).seconds-recording.samples[0].seconds>18,'Cloud motion advances');
 assert(recording.samples.at(-1).foliageTime-recording.samples[0].foliageTime>18,'Forest motion advances');
 assert(recording.samples.every(s=>s.cloudRows.every(row=>row<=0)),'No ground cloud rows in motion');
 assert.equal(errors.length,0);
 const result={passed:true,source:'actual canonical PlayScene canvas capture',...recording,errors};
 await fs.writeFile(path.join(out,'motion-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
