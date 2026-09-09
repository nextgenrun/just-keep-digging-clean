import fs from "node:fs/promises";
import path from "node:path";
import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const out=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa");
const final=["final-handoff.png","final-east-handoff.png","final-mine-handoff.png","final-town.png","final-sky.png","final-heavenblocks.png","final-travel.png"];
const galleryPath=path.join(out,"gallery.html");
let gallery=await fs.readFile(galleryPath,"utf8");
const section='<h2>Final horizon correction</h2><p>Six fresh checks and the end of the final travel recording. The earlier survey below predates this final forest fade.</p><main>'+final.map(f=>'<figure><a href="'+f+'"><img loading="lazy" src="'+f+'"></a><figcaption>'+f+'</figcaption></figure>').join("")+'</main><h2>Earlier 49-view survey</h2>';
gallery=gallery.replace("<main>",section+"<main>");
await fs.writeFile(galleryPath,gallery);
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try {
  const page=await browser.newPage({viewport:{width:1480,height:1720}});
  const cells=await Promise.all(final.map(async f=>'<figure style="margin:0"><img style="width:100%;display:block" src="data:image/png;base64,'+(await fs.readFile(path.join(out,f))).toString("base64")+'"><figcaption>'+f+'</figcaption></figure>'));
  await page.setContent('<body style="margin:14px;background:#0a111c;color:#cde2eb;font:12px sans-serif"><main style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">'+cells.join("")+'</main></body>');
  await page.screenshot({path:path.join(out,"final-review-sheet.jpg"),type:"jpeg",quality:90});
} finally {await browser.close();}

