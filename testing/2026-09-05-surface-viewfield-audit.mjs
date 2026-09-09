// Capture the current game and existing surface reviews without changing runtime files.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'testing/2026-09-05-surface-viewfield-audit');
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const port = 8187;
const origin = `http://127.0.0.1:${port}`;
await fs.mkdir(out, { recursive: true });
const server = spawn('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe', [
  '-u', '-c', `import sys,runpy,webbrowser; webbrowser.open=lambda *a,**k: False; sys.argv=['serve.py','${port}']; runpy.run_path('serve.py',run_name='__main__')`,
], { cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let serverError = '';
server.stderr.on('data', chunk => { serverError = (serverError + chunk).slice(-2000); });
let browser;
try {
  for (let retry = 0; retry < 50; retry++) {
    try { if ((await fetch(`${origin}/main.js`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (server.exitCode !== null) throw new Error(`Canonical server did not start: ${serverError}`);
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1536, height: 864 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const responses = [];
  page.on('response', response => { if (response.status() >= 400) responses.push({status: response.status(), url: response.url()}); });
  await page.goto(`${origin}/?jkd_e2e=1&cinematics=0&gameplayProfile=full-review`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(18000);
  await page.screenshot({ path: path.join(out, 'boot.png') });
  const boot = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 3000),
    globals: Object.keys(window).filter(key => /jkd|game|phaser/i.test(key)),
    canvases: [...document.querySelectorAll('canvas')].map(c => ({width:c.width,height:c.height})),
  }));
  await fs.writeFile(path.join(out, 'boot.json'), JSON.stringify({boot, errors, responses}, null, 2));

  console.log(JSON.stringify({phase:'boot', boot, errors, responses}));
  await page.evaluate(() => window.__phaserGame.scene.getScene('MainMenuScene').scene.start('WorldLoadScene', {
    saveSlot: 3, worldIdentity: 'surface-viewfield-audit', isNewSave: true, tutorialChoice: 'skip',
  }));
  await page.waitForFunction(() => window.__phaserGame?.scene.getScene('PlayScene')?.worldRenderer?.created, null, { timeout: 120000 });
  await page.waitForTimeout(9000);
  const state = await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene('PlayScene');
    scene.physics.world.pause();
    scene.playerController.setControlsEnabled(false);
    scene.playerController.update = () => {}; // Freeze only the survey actor; scenery keeps updating.
    scene.cameras.main.stopFollow();
    scene.cameras.main.setZoom(1);
    return {config: {tileSize:scene.config.tileSize, topAirRows:scene.config.topAirRows, worldWidthTiles:scene.config.worldWidthTiles, worldWidthPx:scene.config.worldWidthPx},
      phase:scene.gameState, player:{x:scene.player.x,y:scene.player.y},
      globals:Object.keys(window).filter(k=>/jkd|E2E/i.test(k)),
      camera:{x:scene.cameras.main.worldView.centerX,y:scene.cameras.main.worldView.centerY,width:scene.cameras.main.width,height:scene.cameras.main.height},
      renderer:scene.worldRenderer.constructor.name, registryProfile:scene.game.registry.get('gameplayCapabilities')?.profileId};
  });
  console.log(JSON.stringify({phase:'game-ready',state}));
  await page.screenshot({path:path.join(out,'game-initial.png')});
  const captures=process.argv.includes('--sky') ? JSON.parse(await fs.readFile(path.join(out,'survey.json'),'utf8')).captures.filter(c=>c.id.startsWith('surface-')) : [];
  const capture = async (id, x, y, zoom=1) => {
    await page.evaluate(({x,y,zoom})=>{
      const s=window.__phaserGame.scene.getScene('PlayScene');
      s.playerController.teleportToTile(Math.floor(x), y >= 61 ? 64 : Math.floor(y)); s.physics.world.pause(); const c=s.cameras.main; c.stopFollow(); c.setZoom(zoom); c.centerOn(x*s.config.tileSize,y*s.config.tileSize); c.preRender();
    },{x,y,zoom});
    await page.waitForTimeout(400);
    await page.waitForFunction(() => {
      const s=window.__phaserGame.scene.getScene('PlayScene'); const r=s.worldRenderer;
      const c=s.cameras.main.worldView; const b=r.lastBounds; const ts=s.config.tileSize;
      return b && b.left <= Math.floor(c.x/ts) && b.right >= Math.ceil((c.x+c.width)/ts)
        && b.top <= Math.floor(c.y/ts) && b.bottom >= Math.ceil((c.y+c.height)/ts)
        && r.skyCohesionLayer.getSnapshot().pendingFeatureAssets === 0;
    }, null, {timeout:30000});
    await page.waitForTimeout(600);
    const snapshot=await page.evaluate(()=>{
      const s=window.__phaserGame.scene.getScene('PlayScene'); const c=s.cameras.main; const r=s.worldRenderer;
      return {camera:{x:c.worldView.x,y:c.worldView.y,width:c.worldView.width,height:c.worldView.height,zoom:c.zoom},
        phase:s.gameState, player:{x:s.player.x,y:s.player.y}, streamedBounds:r.lastBounds, surfaceProps:r.surfacePropLayer?.getSnapshot?.(), sky:r.skyCohesionLayer?.getSnapshot?.(),
        motion:r.surfaceStage?.surfacePack?.getMotionSnapshot?.(),
        visibleFar:r.surfaceStage?.far.filter(i=>i.visible&&Phaser.Geom.Intersects.RectangleToRectangle(i.getBounds(),c.worldView)).map(i=>({name:i.name,x:i.x,y:i.y,width:i.displayWidth,height:i.displayHeight,flipped:i.flipX})),
      };
    });
    const file=`${id}.jpg`;
    await page.screenshot({path:path.join(out,file),type:'jpeg',quality:88});
    captures.push({id,file,x,y,zoom,snapshot});
    await fs.writeFile(path.join(out,'survey.json'),JSON.stringify({state,captures,errors,responses},null,2));
    console.log(JSON.stringify({phase:'capture',id,camera:snapshot.camera}));
  };
  if(!process.argv.includes('--sky')) for(let x=7;x<280;x+=10) await capture(`surface-x${String(x).padStart(3,'0')}`,x,63);
  for(const x of [20,60,100,140,180,220,260]) {
    for(const y of [8,14,23,30,38,46,52,57]) await capture(`sky-x${x}-y${y}`,x,y);
  }
  await capture('wide-town-handoff',20,61,0.78);
  await capture('wide-central-handoff',132,61,0.78);
  await page.close();
  const review=await context.newPage();
  review.on('pageerror',e=>errors.push('review: '+e.message));
  await review.goto(`${origin}/testing/animation-sandbox/2026-08-30-ground-level-world-v1/?chapter=observatory&day=12&hour=22&weather=clear&motion=100`,{waitUntil:'domcontentloaded',timeout:90000});
  await review.waitForFunction(()=>window.__groundLevelWorldReview?.snapshot().ready,null,{timeout:90000});
  const reviews=[];
  for(const chapter of ['merchant-hearth','titan-west','titan-east','craftsmen','skywell','relic-grove','mine-threshold','arrival-forge','caravan-rest','starwell-herb','timberwright','observatory','frontier-survey','far-east']) {
    await review.evaluate(id=>window.__groundLevelWorldReview.jumpChapter(id),chapter);
    await review.waitForTimeout(700);
    const file=`review-${chapter}.jpg`;
    await review.screenshot({path:path.join(out,file),type:'jpeg',quality:90});
    reviews.push({chapter,file,snapshot:await review.evaluate(()=>window.__groundLevelWorldReview.snapshot())});
  }
  await review.evaluate(()=>window.__groundLevelWorldReview.jumpChapter('observatory'));
  await review.screenshot({path:path.join(out,'observatory-motion-t0.png')});
  await review.waitForTimeout(12000);
  await review.screenshot({path:path.join(out,'observatory-motion-t12.png')});
  await fs.writeFile(path.join(out,'survey.json'),JSON.stringify({state,captures,reviews,errors,responses},null,2));
  const cards=[...captures.map(c=>({title:c.id,file:c.file})),...reviews.map(r=>({title:r.chapter+' - existing review',file:r.file}))];
  await fs.writeFile(path.join(out,'gallery.html'),`<!doctype html><meta charset="utf-8"><title>Above-ground viewfield audit</title><style>body{background:#0a101b;color:#dae7f0;font:16px system-ui;margin:28px}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0;background:#162132;padding:8px}img{width:100%;display:block}figcaption{padding:8px}a{color:inherit}</style><h1>Current above-ground viewfield</h1><p>Unmodified screenshots of this checkout through serve.py. Current feature flags, isolated fresh run, player and camera moved together; no runtime patch applied. Eastern chapters may remain disabled by the demo feature facade.</p><main>${cards.map(c=>`<figure><a href="${c.file}"><img src="${c.file}" loading="lazy"></a><figcaption>${c.title}</figcaption></figure>`).join('')}</main>`);
  console.log(JSON.stringify({phase:'done',captures:captures.length,reviews:reviews.length,errors,responses}));

} finally {
  await browser?.close();
  server.kill();
}
