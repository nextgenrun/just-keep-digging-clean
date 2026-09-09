const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=__dirname;let b,p;
(async()=>{
 b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 p=await b.newPage({viewport:{width:1280,height:720}});
 const errors=[],responses=[];p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message)});
 p.on('response',r=>{if(r.url().includes('understar-logo-loop-alpha'))responses.push({status:r.status(),url:r.url()})});
 await p.goto('http://localhost:8765/index.html?jkd_e2e=1&logoQa=stone-footer-v1',{waitUntil:'commit',timeout:60000});
 console.log('NAVIGATED');
 await p.locator('canvas').waitFor({state:'visible',timeout:120000});
 for(let i=0;i<100;i++){const scenes=await p.evaluate(()=>window.__phaserGame?.scene?.getScenes(true).map(s=>s.sys.settings.key)||[]);
  if(i%5===0)console.log('BOOT',i,scenes);
  if(scenes.includes('MainMenuScene'))break;await p.mouse.click(640,150);
  if(scenes.includes('OpeningCinematicScene'))await p.keyboard.press('Escape');
  await p.waitForTimeout(1800);
 }
 const waitPlaying=key=>p.waitForFunction(k=>window.__phaserGame?.scene?.getScene(k)?.children.getByName('brand-logo-view')?.getData('state')==='playing',key,{timeout:45000});
 const inspect=key=>p.evaluate(k=>{const s=window.__phaserGame.scene.getScene(k),r=s.children.getByName('brand-logo-view'),f=s.children.getByName('release-phase-label'),back=r.getByName('brand-logo-backing');return {scene:k,logoBounds:[r.x,r.y,r.displayWidth,r.displayHeight],backing:{key:back.texture.key,alpha:back.alpha,frame:back.frame.name,first:r.list[0]===back},rate:r.getData('video').video.playbackRate,footer:{text:f.text,fontSize:f.style.fontSize,color:f.style.color,stroke:f.style.stroke,strokeThickness:f.style.strokeThickness,bounds:f.getBounds()}}},key);
 const results=[];
 for(const key of ['MainMenuScene','StartMenuScene']){
  await waitPlaying(key);await p.waitForTimeout(2500);
  const item=await inspect(key);results.push(item);console.log('MENU_READY',JSON.stringify(item));
  if(!item.backing.first||item.backing.alpha!==1||item.backing.frame!=='tight-stone'||item.footer.text!=='OPEN BETA DEMO'||item.footer.strokeThickness!==4)throw Error('Menu presentation mismatch');
  await p.screenshot({path:path.join(out,key==='MainMenuScene'?'stone-main-menu.png':'stone-save-menu.png')});
  if(key==='MainMenuScene')await p.keyboard.press('Enter');
 }
 fs.writeFileSync(path.join(out,'stone-menu-verification.json'),JSON.stringify({results,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('STONE_MENU_RUNTIME_OK');await b.close();
})().catch(async e=>{console.error(e);try{await p?.screenshot({path:path.join(out,'stone-runtime-failure.png'),timeout:10000})}catch{};await b?.close();process.exitCode=1});
