import {createRequire} from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated");
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}}),errors=[];
page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
try{
 await page.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=level2-living",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 for(const [name,x,time] of [["crownfall-day",196,.475],["crownfall-night",196,.95],["moonfall-night",155,.95]]){
  await page.evaluate(([x,time])=>{window.__layeredWorldReview.seek(x,63);window.__layeredWorldReview.setEnvironment(time,"clear");},[x,time]);
  await page.waitForTimeout(750);
  await page.locator("#game").screenshot({path:path.join(qa,name+".png")});
  console.log(name,JSON.stringify(await page.evaluate(()=>window.__layeredWorldReview.snapshot())));
 }
 console.log("ERRORS",JSON.stringify(errors));
}finally{await browser.close();}
