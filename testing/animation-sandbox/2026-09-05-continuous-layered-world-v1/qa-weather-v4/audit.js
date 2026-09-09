import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from '../../../../values/worldVisualLayeredSkyReview.js';
const frame=document.querySelector('#review'),state=document.querySelector('#state');
const data={date:'2026-09-06',kind:'actual-canonical-serve-runtime',views:[],front:[],checks:[],errors:[],warnings:[]};
let scene,review,busy=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(ok,message){data.checks.push({passed:!!ok,message});if(!ok)throw Error(message);}
function publish(){
 const report=document.querySelector('#report');report.hidden=false;
 report.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data,null,2));
 document.querySelector('#summary').textContent=JSON.stringify({views:data.views.length,frontSamples:data.front.length,checks:data.checks.length,failed:data.checks.filter(c=>!c.passed),errors:data.errors,warnings:data.warnings.length},null,2);
}
async function run(task){if(busy)return;busy=true;state.textContent="Running...";try{await ready;await task();state.textContent='Complete';}catch(error){data.errors.push(error.stack);state.textContent='Failed: '+error.message;}finally{busy=false;publish();}}
const ready=(async()=>{
 for(let i=0;i<240;i++){
  review=frame.contentWindow.__layeredWorldReview;
  if(review?.snapshot().ready){
   scene=review.getScene();const win=frame.contentWindow.document.querySelector('#game').contentWindow;
   for(const name of ['warn','error']){const original=win.console[name].bind(win.console);win.console[name]=(...args)=>{data[name==='warn'?'warnings':'errors'].push(args.map(String).join(' '));original(...args);};}
   check(scene.gameplayCapabilities.profileId==='demo','Demo profile');
   check(!scene.gameplayCapabilities.isLevelEnabled(2),'Level 2 remains disabled');
   state.textContent='Ready';return;
  }
  await wait(500);
 }
 throw Error('Review did not become ready');
})();
function sample(label){
 const owner=scene.worldRenderer.surfaceStage.layeredSky,weather=scene.weatherSystem;
 const clouds=[...owner.clouds.active].map(([id,i])=>({id,x:i.x,y:i.y,width:i.displayWidth,height:i.displayHeight,scaleX:i.scaleX,scaleY:i.scaleY,alpha:i.alpha,depth:i.depth,texture:i.texture.key,thickness:i.pipelineData.thickness}));
 const drops=weather.impactRainController.drops.map(d=>({layer:d.layer,height:d.sprite?.displayHeight||0,width:d.sprite?.displayWidth||0,alpha:d.sprite?.alpha||0,texture:d.sprite?.texture.key,frame:d.sprite?.frame.name}));
 return {label,position:review.snapshot(),fps:scene.game.loop.actualFps,weather:weather.getLightingSnapshot(),clouds,drops,
  snow:weather.snowController.flakes.length,impacts:weather.particleController.impactController.actors.length,
  pool:owner.clouds.pool.length,leafCount:owner.details.active.size};
}
async function capture(label){
 const snapshot=sample(label);data.views.push(snapshot);
 check(snapshot.clouds.length+snapshot.pool<=CONFIG.maxCloudSprites,label+' cloud pool bounded');
 check(snapshot.clouds.every(c=>c.scaleX<=1&&c.scaleY<=1),label+' native source density');
 check(snapshot.drops.every(d=>d.texture===CONFIG.weatherAtlas.key),label+' rain uses V4 atlas');
 check(!snapshot.position.renderer.landmarks.length,label+' no Level 2 landmarks');
 const pixels=await new Promise(resolve=>scene.game.events.once('postrender',()=>resolve(scene.game.canvas.toDataURL('image/png'))));
 const figure=document.createElement('figure'),image=new Image(),caption=document.createElement('figcaption');
 image.src=pixels;image.alt=label;image.dataset.file=label+'.png';caption.textContent=label;
 figure.append(image,caption);document.querySelector('#captures').append(figure);publish();return snapshot;
}
async function set(x,y,time,weather,settle=6500){
 review.seek(x,y);review.setEnvironment(time,weather);await wait(settle);
}
document.querySelector('#run').onclick=()=>run(async()=>{
 scene.cameras.main.setZoom(1);
 for(const [kind,x,y,time] of [['clear',47,63,.4],['drizzle',47,63,.4],['rain',47,63,.4],['storm',47,63,.4],['storm',95,63,.95],['rain',19,63,.7],['rain',7,63,.4],['rain',63,48,.4],['storm',126,24,.95]]){
  const label=kind+'-'+x+'-'+y+'-'+(time>.9?'night':time>.6?'dusk':'day');state.textContent='Capturing '+label;
  await set(x,y,time,kind,8000);await capture(label);
 }
 scene.dayNightCycle.fromJSON({day:22});await set(47,63,.4,'snow',14000);await capture('snow-woodland');
 await set(47,63,.4,'clear',12000);
 for(const x of [13,25,31,43,55,67,79,91,103,117,126]){state.textContent='Checking Level 1 route X '+x;await set(x,63,.4,undefined,350);await capture('route-'+x);}
 scene.cameras.main.setZoom(.6);await set(63,24,.4,'rain',7000);await capture('rain-wide-sky');
 scene.cameras.main.setZoom(1);
 check(!data.errors.length,'No runtime errors during weather or travel');
 check(!data.warnings.some(w=>/no frame|shader|WebGL|INVALID/i.test(w)),'No missing weather frames or shader warnings');
});
document.querySelector('#front').onclick=()=>run(async()=>{
 await set(47,58,.4,'clear',7000);const start=scene.weatherSystem.cloudFront.seconds;
 let captured=0;
 while(scene.weatherSystem.cloudFront.seconds-start<84){
  const s=sample('front');data.front.push({seconds:s.weather.cloudFront.seconds,cover:s.weather.cloudCoverAmount,clouds:s.clouds});
  state.textContent='Watching passing cloud cover — '+Math.round(s.weather.cloudFront.seconds-start)+' / 84 game seconds';
  if(s.weather.cloudFront.seconds-start>=captured*20){await capture('cloud-front-'+captured);captured++;}
  await wait(1000);
 }
 const covers=data.front.map(s=>s.cover),min=Math.min(...covers),max=Math.max(...covers);
 check(max-min>.35,'Fair-weather clouds form and disperse substantially');
 check(data.front.every(s=>s.clouds.every(c=>c.scaleX<=1&&c.scaleY<=1)),'All changing cloud sizes remain at native density');
});
document.querySelector('#record').onclick=()=>run(async()=>{
 await set(47,63,.4,'rain',8000);
 const stream=scene.game.canvas.captureStream(30),chunks=[];
 const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:10000000});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 const ended=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
 state.textContent='Recording actual rain motion';await wait(8000);
 review.setEnvironment(.4,'storm');state.textContent='Recording storm build-up';await wait(10000);
 review.seek(47,58);state.textContent='Recording moving cloud banks';await wait(8000);
 recorder.stop();await ended;stream.getTracks().forEach(track=>track.stop());
 const blob=new Blob(chunks,{type:'video/webm'}),url=URL.createObjectURL(blob),video=document.createElement('video');
 video.src=url;video.controls=true;document.querySelector('#movies').append(video);
 const reader=new FileReader();reader.readAsDataURL(blob);await new Promise(resolve=>reader.onload=resolve);
 const link=document.querySelector('#movie');link.href=reader.result;link.hidden=false;
 data.recording={durationSeconds:26,source:'actual canvas.captureStream',targetFps:30,bytes:blob.size};
});
