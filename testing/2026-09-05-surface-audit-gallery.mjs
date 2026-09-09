import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/2026-09-05-surface-viewfield-audit');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
const page=await browser.newPage({viewport:{width:1536,height:1080}});
await page.goto(pathToFileURL(path.join(out,'gallery.html')).href);
const count=await page.locator('figure').count();
for(let start=0;start<count;start+=9){
 await page.evaluate(({start})=>{
  [...document.querySelectorAll('figure')].forEach((f,i)=>f.style.display=i>=start&&i<start+9?'block':'none');
  document.querySelector('h1').textContent=`Current viewfield - captures ${start+1} to ${Math.min(start+9,document.querySelectorAll('figure').length)}`;
  document.querySelectorAll('img').forEach(i=>i.loading='eager');
 },{start});
 await page.waitForFunction(()=>[...document.querySelectorAll('figure')].filter(f=>f.style.display!=='none').every(f=>f.querySelector('img').complete));
 await page.screenshot({path:path.join(out,`sheet-${String(start/9+1).padStart(2,'0')}.jpg`),fullPage:true,type:'jpeg',quality:92});
}
console.log(JSON.stringify({sheets:Math.ceil(count/9),images:count}));
}finally{await browser.close();}
