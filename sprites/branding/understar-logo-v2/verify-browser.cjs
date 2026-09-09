const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = __dirname;
let browser, page;
(async()=>{
  browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
  page = await browser.newPage({viewport:{width:1600,height:1040},deviceScaleFactor:1});
  const failures = [];
  page.on('pageerror',e=>failures.push(e.message));
  await page.goto('http://localhost:8765/sprites/branding/understar-logo-v2/review.html',{waitUntil:'networkidle'});
  const assets = await page.locator('img').evaluateAll(images=>images.map(i=>({id:i.id,loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight,displayWidth:i.getBoundingClientRect().width,displayHeight:i.getBoundingClientRect().height})));
  if(assets.some(a=>!a.loaded)) throw new Error('Preview image failed to load');
  await page.screenshot({path:path.join(out,'review-dark.png'),fullPage:true});
  await page.getByRole('button',{name:'Light',exact:true}).click();
  await page.screenshot({path:path.join(out,'review-light.png'),fullPage:true});
  await page.setViewportSize({width:480,height:900});
  await page.getByRole('button',{name:'Game dark',exact:true}).click();
  await page.screenshot({path:path.join(out,'review-mobile.png'),fullPage:true});
  const mobileOverflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(mobileOverflow) throw new Error('Review page overflows on mobile');
  console.log('LOGO_PREVIEW_OK',JSON.stringify(assets));
  await page.setViewportSize({width:1280,height:720});
  const requests = [];
  page.on('response',r=>{if(r.url().includes('understar-rift-monolith-runtime'))requests.push({url:r.url(),status:r.status()})});
  await page.goto('http://localhost:8765/index.html?jkd_e2e=1&renderQuality=uhd&logoQa=v2',{waitUntil:'commit',timeout:60000});
  await page.locator('canvas').waitFor({state:'visible',timeout:120000});
  let previousSceneState = '';
  for(let i=0;i<60;i++){
    const active = await page.evaluate(()=>window.__phaserGame?.scene?.getScenes(true).map(s=>s.sys.settings.key)||[]);
    if(active.join(',')!==previousSceneState){previousSceneState=active.join(',');console.log('LOGO_GAME_SCENES',previousSceneState)}
    if(active.includes('MainMenuScene'))break;
    await page.mouse.click(640,150);
    if(active.includes('OpeningCinematicScene'))await page.keyboard.press('Escape');
    await page.waitForTimeout(1800);
  }
  await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive('MainMenuScene')===true,null,{timeout:60000});
  await page.waitForTimeout(1800);
  const readLogo = key=>page.evaluate(sceneKey=>{
    const game=window.__phaserGame,scene=game.scene.getScene(sceneKey);
    const logo=scene.children.list.find(o=>o.texture?.key==='brand-logo');
    const source=logo?.texture?.source?.[0];
    return {scene:sceneKey,active:game.scene.isActive(sceneKey),textureSize:source?[source.width,source.height]:null,
      display:logo?[logo.displayWidth,logo.displayHeight]:null,position:logo?[logo.x,logo.y]:null,alpha:logo?.alpha,
      source:source?.image?.currentSrc||source?.image?.src||null,canvas:[game.canvas.width,game.canvas.height]};
  },key);
  const main=await readLogo('MainMenuScene');
  const delivered = main.source?.includes('understar-logo-v2') || requests.some(r=>r.url.includes('understar-logo-v2')&&r.status===200);
  if(main.textureSize?.[0]!==2048||!delivered)throw new Error('Runtime did not load V2 logo: '+JSON.stringify(main));
  await page.screenshot({path:path.join(out,'runtime-main-menu.png')});
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive('StartMenuScene')===true,null,{timeout:15000});
  await page.waitForTimeout(1200);
  const saves=await readLogo('StartMenuScene');
  await page.screenshot({path:path.join(out,'runtime-save-menu.png')});
  const result={preview:assets,mobileOverflow,mainMenu:main,saveMenu:saves,logoRequests:requests,pageErrors:failures};
  fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify(result,null,2));
  console.log('LOGO_RUNTIME_OK',JSON.stringify(result));
  await browser.close();
})().catch(async e=>{fs.writeFileSync(path.join(out,'browser-failure.txt'),e.stack);try{await page?.screenshot({path:path.join(out,'browser-failure.png')})}catch{};await browser?.close();console.error(e);process.exit(1)});
