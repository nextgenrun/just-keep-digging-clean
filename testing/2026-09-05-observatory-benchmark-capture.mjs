import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd();const out=path.join(root,'testing/2026-09-05-surface-viewfield-audit');
const server=spawn('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-u','-c',"import runpy,sys,webbrowser; webbrowser.open=lambda *a,**k:False; sys.argv=['serve.py','8187']; runpy.run_path('serve.py',run_name='__main__')"],{cwd:root,windowsHide:true,stdio:'ignore'});
let browser;
try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:8187/main.js')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1536,height:864}});const errors=[];const failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),url:r.url()});});
 await page.goto('http://127.0.0.1:8187/testing/animation-sandbox/2026-08-30-observatory-authored-layers-v3/?view=runtime&day=12&hour=22&weather=clear&rev=16',{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(3000);
 await page.screenshot({path:path.join(out,'observatory-v16-t0.png')});
 await page.waitForTimeout(12000);
 await page.screenshot({path:path.join(out,'observatory-v16-t12.png')});
 const state=await page.evaluate(()=>({dataset:{...document.body.dataset},text:document.body.innerText.slice(0,3000)}));
 await fs.writeFile(path.join(out,'observatory-v16.json'),JSON.stringify({state,errors,failed},null,2));
 console.log(JSON.stringify({errors,failed,state}));
}finally{await browser?.close();server.kill();}
