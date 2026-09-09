import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa');
const files=(await fs.readdir(out)).filter(f=>/^(surface-\d+|sky-\d+-\d+|candidate-forest-edge|candidate-open-sky|candidate-final|baseline-forest-edge|baseline-open-sky)\.jpg$/.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
await fs.writeFile(path.join(out,'gallery.html'),'<!doctype html><meta charset="utf-8"><title>Living horizons - captured views</title><style>body{background:#0a111c;color:#cde2eb;font:14px system-ui;margin:18px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}img{width:100%}a{color:inherit}</style><h1>Living horizons - '+files.length+' captured views</h1><p>Actual PlayScene. Survey actor held for camera positioning. Gameplay input and motion checks are recorded separately.</p><main>'+files.map(f=>'<figure><a href="'+f+'"><img loading="lazy" src="'+f+'"></a><figcaption>'+f+'</figcaption></figure>').join('')+'</main>');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
const page=await browser.newPage({viewport:{width:1500,height:1200}});
for(let i=0;i<files.length;i+=12){
const cells=await Promise.all(files.slice(i,i+12).map(async f=>'<figure style="margin:0"><img style="width:100%;display:block" src="data:image/jpeg;base64,'+(await fs.readFile(path.join(out,f))).toString('base64')+'"><figcaption>'+f+'</figcaption></figure>'));
await page.setContent('<body style="margin:15px;background:#0a111c;color:#cde2eb;font:12px sans-serif"><main style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'+cells.join('')+'</main></body>');
await page.screenshot({path:path.join(out,'review-sheet-'+(i/12+1)+'.jpg'),type:'jpeg',quality:90});
}console.log(JSON.stringify({captures:files.length,sheets:Math.ceil(files.length/12)}));
}finally{await browser.close();}

