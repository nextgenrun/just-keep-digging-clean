const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const remote=process.argv.includes('--remote'),slow=process.argv.includes('--slow'),fail=process.argv.includes('--fail'),production=process.argv.includes('--production'),manual=process.argv.includes('--manual'),play=process.argv.includes('--play');
 const tag='motion-v2-'+(play?'optimized-world-smoke':production?'production-recovery-7mbps':remote?'live':fail?'recovery-7mbps':slow?'optimized-7mbps':'baseline');
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1280,height:720}}),c=await p.context().newCDPSession(p),start=Date.now();
 await c.send('Network.enable');await c.send('Network.setCacheDisabled',{cacheDisabled:true});
 if(slow)await c.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:7000000/8,uploadThroughput:1000000/8});
 let injectedFailures=0,failedAssetRequests=0,manualRetried=false;const failureLimit=manual?9:3;
 if(fail){const mapping=await import('../../values/startupImageVariants.js');const target=mapping.STARTUP_IMAGE_VARIANTS['sprites/environment/starless-scar-v2/starless-scar-territory-material-v2.png'];if(!target)throw Error('Missing failure fixture');await p.route('**/'+target,async route=>{failedAssetRequests++;if(injectedFailures<failureLimit){injectedFailures++;await route.abort('failed')}else await route.continue()});}
 const errors=[],previewApiWarnings=[],requests=[],responses=[];let bytes=0,firstLoading=null,last=null,bootAttempt=0,motionSamples=[];
 c.on('Network.loadingFinished',e=>bytes+=e.encodedDataLength);
 p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message)});
 p.on('request',r=>requests.push(r.url()));
 p.on('response',r=>{if(r.status()>=400){const message=r.status()+' '+r.url();if(production&&r.url().includes('/api/'))previewApiWarnings.push(message);else errors.push(message);}responses.push({url:r.url(),status:r.status(),encoding:r.headers()['content-encoding'],length:r.headers()['content-length']})});
 try{
 const nav=await p.goto(remote?'https://www.nextgen.run/diggame-beta-1/':production?JSON.parse(fs.readFileSync(path.join(__dirname,'preview-server-v2.json'),'utf8').replace(/^\uFEFF/,'' )).url+'/index.html?startupQa='+tag:'http://localhost:8765/index.html?jkd_e2e=1&startupQa='+tag,{waitUntil:'commit',timeout:60000});console.log('NAV',nav.status());
 for(let i=0;i<(remote?90:180);i++){
  last=await p.evaluate(()=>{const g=window.__phaserGame,s=g?.scene?.getScenes(true).find(s=>s.sys.settings.key==='BootScene')||g?.scene?.getScenes(true).find(s=>s.sys.settings.key==='LaunchScene');return {scenes:g?.scene?.getScenes(true).map(s=>s.sys.settings.key)||[],loading:!!s?.loadingUi,progress:s?.load?.progress,queue:s?.load?.totalToLoad,failed:s?.load?.totalFailed,logo:s?.children?.getByName('brand-logo-view')?.getData('state'),videoTime:s?.children?.getByName('brand-logo-view')?.getData('video')?.video?.currentTime,title:document.title}});
  if(last.loading)motionSamples.push({at:(Date.now()-start)/1000,scenes:last.scenes,state:last.logo,videoTime:last.videoTime});
  if(last.loading&&!firstLoading){firstLoading=(Date.now()-start)/1000;await p.screenshot({path:path.join(__dirname,tag+'-loading.png')});}
  bootAttempt=Math.max(bootAttempt,await p.evaluate(()=>window.__phaserGame?.scene?.getScene('BootScene')?._bootAttempt||0));
  if(manual&&!manualRetried&&bootAttempt>=3&&await p.locator('.menu-loading__retry').isVisible()){await p.screenshot({path:path.join(__dirname,tag+'-retry.png')});await p.locator('.menu-loading__retry').click();manualRetried=true;console.log('MANUAL_RETRY_CLICKED');}
  if(i%10===0)console.log('STATE',Math.round((Date.now()-start)/1000),JSON.stringify(last),'MB',(bytes/1e6).toFixed(1));
  if(last.scenes.includes('MainMenuScene')){await p.waitForTimeout(1500);await p.screenshot({path:path.join(__dirname,tag+'-menu.png')});break;}
  if(last.scenes.includes('OpeningCinematicScene')){await p.keyboard.down('Escape');await p.waitForTimeout(2400);await p.keyboard.up('Escape');}
  if(nav.status()>=400)break;
  await p.waitForTimeout(2000);
 }
 }catch(e){errors.push(e.message)}
 let gameplay=null;
 if(play&&last?.scenes.includes('MainMenuScene')){
  await p.evaluate(()=>window.__phaserGame.scene.getScene('MainMenuScene').scene.start('WorldLoadScene',{saveSlot:1,isNewSave:true,tutorialChoice:false}));
  await p.waitForFunction(()=>window.__phaserGame?.scene.isActive('PlayScene'),null,{timeout:180000});await p.waitForTimeout(4000);
  gameplay=await p.evaluate(()=>({scenes:window.__phaserGame.scene.getScenes(true).map(s=>s.sys.settings.key),textures:window.__phaserGame.textures.getTextureKeys().length}));
  await p.screenshot({path:path.join(__dirname,tag+'-town.png')});
 }
 const root=path.resolve(__dirname,'../..');const files=[...new Set(requests)].map(u=>{try{const f=decodeURIComponent(new URL(u).pathname).replace(/^\//,'');const disk=path.join(root,f);return fs.existsSync(disk)&&fs.statSync(disk).isFile()?{path:f,bytes:fs.statSync(disk).size}:null}catch{return null}}).filter(Boolean).sort((a,b)=>b.bytes-a.bytes);
 const report={tag,motionSamples,gameplay,manualRetried,previewApiWarnings,injectedFailures,failedAssetRequests,bootAttempt,seconds:(Date.now()-start)/1000,firstLoading,bytes,last,errors,files,responses};fs.writeFileSync(path.join(__dirname,tag+'.json'),JSON.stringify(report,null,2));if(!remote&&(!last?.scenes.includes('MainMenuScene')||errors.length))process.exitCode=1;if(fail&&(injectedFailures!==failureLimit||failedAssetRequests<failureLimit+1||bootAttempt<(manual?4:2)||(manual&&!manualRetried)))process.exitCode=1;if(!motionSamples.some(s=>s.state==='playing'&&s.videoTime>1))process.exitCode=1;console.log('DONE',JSON.stringify({...report,files:files.slice(0,15),responses:responses.slice(0,4)}));await b.close();
})().catch(e=>{console.error(e);process.exitCode=1});
