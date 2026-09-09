import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log(m.type(),m.text().slice(0,500));});
page.on('pageerror',e=>console.log('PAGE_ERROR',e.stack));
page.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));
await page.goto('http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/',{waitUntil:'domcontentloaded'});
try {
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:60000});
 console.log('LIVE_READY',await page.evaluate(()=>window.__layeredWorldReview.snapshot()));
 const child=page.frames().find(f=>f!==page.mainFrame());
 await child.evaluate(()=>{window.__phaserGame.scene.stop('PlayScene');});
 console.log('LIFECYCLE',await child.evaluate(()=>({inspector:!!window.__jkdLayeredSkyReview,owned:Object.keys(window.__phaserGame.textures.list).filter(k=>k.includes(':clean-alpha')||k.includes(':feather:')||k.startsWith('layered-sky-review-mask'))})));
} finally {await browser.close();}

