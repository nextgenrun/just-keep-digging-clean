import fs from "node:fs/promises";
import path from "node:path";
import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const out=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated");
const all=await fs.readdir(out),order=(a,b)=>a.localeCompare(b,undefined,{numeric:true});
const features=["crownfall-night.jpg","crownfall-day.jpg","crownfall-dawn.jpg","crownfall-dusk.jpg","crownfall-storm.jpg","crownfall-snow.jpg","moonfall-night.jpg","moonfall-rain.jpg","eastern-cascades-night.jpg","island-wide.png"];
const files=[...features.filter(file=>all.includes(file)),...all.filter(f=>/^surface-\d+\.png$/.test(f)).sort(order),...all.filter(f=>/^sky-\d+-\d+\.png$/.test(f)).sort(order),"final-travel.png"];
const html='<!doctype html><meta charset="utf-8"><title>Regenerated horizons - world survey</title><style>body{background:#0a111c;color:#cde2eb;font:14px system-ui;margin:18px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}img{width:100%}a{color:inherit}video{width:min(100%,1000px)}</style><h1>Regenerated horizons</h1><p>Level 2: three waterfall landmarks, flowing water, layered mist and live time/weather. White ambient flecks removed. Town video preserved. Includes 23 surface views, 12 flight views, weather variations and the refreshed island platforms.</p><video controls src="regenerated-horizons.mp4"></video><main>'+files.map(f=>'<figure><a href="'+f+'"><img loading="lazy" src="'+f+'"></a><figcaption>'+f+'</figcaption></figure>').join("")+"</main>";
await fs.writeFile(path.join(out,"gallery.html"),html);
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try {
 const page=await browser.newPage({viewport:{width:1500,height:1200}});
 for(let index=0;index<files.length;index+=12){
  const cells=await Promise.all(files.slice(index,index+12).map(async file=>'<figure style="margin:0"><img style="width:100%;display:block" src="data:image/'+(file.endsWith(".jpg")?"jpeg":"png")+';base64,'+(await fs.readFile(path.join(out,file))).toString("base64")+'"><figcaption>'+file+'</figcaption></figure>'));
  await page.setContent('<body style="margin:15px;background:#0a111c;color:#cde2eb;font:12px sans-serif"><main style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'+cells.join("")+"</main></body>");
  await page.screenshot({path:path.join(out,"sheet-"+(index/12+1)+".jpg"),type:"jpeg",quality:92});
 }
 console.log(JSON.stringify({captures:files.length,sheets:Math.ceil(files.length/12)}));
}finally{await browser.close();}
