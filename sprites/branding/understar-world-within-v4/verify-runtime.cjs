const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname;let b,p;
(async()=>{
 b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 p=await b.newPage({viewport:{width:1280,height:720}});
 const errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));
 p.on('response',r=>{if(r.url().includes('understar-world-logo-runtime'))requests.push({url:r.url(),status:r.status()})});
 await p.goto('http://localhost:8765/index.html?jkd_e2e=1&renderQuality=uhd&logoQa=world-v4',{waitUntil:'commit',timeout:60000});
 await p.locator('canvas').waitFor({state:'visible',timeout:120000});
 for(let i=0;i<60;i++){
  const scenes=await p.evaluate(()=>window.__phaserGame?.scene?.getScenes(true).map(s=>s.sys.settings.key)||[]);
  if(scenes.includes('MainMenuScene'))break;
  await p.mouse.click(640,150);
  if(scenes.includes('OpeningCinematicScene'))await p.keyboard.press('Escape');
  await p.waitForTimeout(1800);
 }
 await p.waitForFunction(()=>window.__phaserGame?.scene?.isActive('MainMenuScene'),null,{timeout:60000});
 await p.waitForTimeout(1800);
 const inspect=key=>p.evaluate(k=>{const g=window.__phaserGame,s=g.scene.getScene(k),l=s.children.list.find(o=>o.texture?.key==='brand-logo'),t=l?.texture?.source?.[0];return {scene:k,texture:t?[t.width,t.height]:null,display:l?[l.displayWidth,l.displayHeight]:null,alpha:l?.alpha,position:l?[l.x,l.y]:null,canvas:[g.canvas.width,g.canvas.height]}},key);
 const main=await inspect('MainMenuScene');
 if(main.texture?.[0]!==2048||!requests.some(r=>r.status===200))throw Error('Wrong logo delivered '+JSON.stringify({main,requests}));
 await p.screenshot({path:path.join(out,'runtime-main-menu.png')});
 await p.keyboard.press('Enter');
 await p.waitForFunction(()=>window.__phaserGame?.scene?.isActive('StartMenuScene'),null,{timeout:20000});
 await p.waitForTimeout(1200);
 const saves=await inspect('StartMenuScene');
 await p.screenshot({path:path.join(out,'runtime-save-menu.png')});
 if(saves.texture?.[0]!==2048)throw Error('Save menu logo absent');
 fs.writeFileSync(path.join(out,'runtime-verification.json'),JSON.stringify({main,saves,requests,errors},null,2));
 console.log('RUNTIME_V4_OK',JSON.stringify({main,saves,requests,errors}));
 await b.close();
})().catch(async e=>{try{await p?.screenshot({path:path.join(out,'runtime-failure.png')})}catch{};await b?.close();console.error(e);process.exitCode=1});

