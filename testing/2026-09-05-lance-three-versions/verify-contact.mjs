import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { STELLAR_LANCE_PRESENTATION as P } from "../../values/stellarLancePresentation.js";
import { LANCE_VISUAL_REVIEW as C } from "../../values/stellarLanceVisualReview.js";
const { chromium } = createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const out=path.dirname(fileURLToPath(import.meta.url)), errors=[];
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",args:["--enable-webgl","--enable-unsafe-swiftshader","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1440,height:1400},deviceScaleFactor:1});
page.on("pageerror",e=>errors.push(e.message));
page.on("response",r=>{if(r.status()>=400&&!r.url().endsWith("favicon.ico")) errors.push(r.status()+" "+r.url());});
const snap=ms=>page.evaluate(t=>{lanceReview.scene.seek(t); return lanceReview.snapshot();},ms);
const paint=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const proof={cases:[],errors};
try {
 await page.goto("http://127.0.0.1:8080/testing/2026-09-05-lance-three-versions/index.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.lanceReview?.scene.ready,null,{timeout:45000});
 for (const attack of ["punch","kick"]) {
  await page.selectOption("#attack",attack);
  const launch=C.attacks[attack].contactFrame/C.attacks[attack].frameRate*1000;
  for(const direction of [1,-1]){
   await page.selectOption("#direction",String(direction));
   const before=await snap(launch-.01), at=await snap(launch), later=await snap(launch+1000);
   assert.equal(at.renderer,2); assert.equal(at.projectiles.length,4);
   assert.ok(before.projectiles.every(p=>!p.flying&&p.contactsDue===0));
   for(let i=0;i<4;i++){
    const p=at.projectiles[i], q=later.projectiles[i], contact=at.contacts[i];
    assert.ok(contact.authored);
    assert.equal(contact.visibleFrame,contact.contactFrame);
    assert.equal(p.x,contact.rawPoint.x);
    assert.equal(p.y,contact.rawPoint.y-contact.pose.height*contact.pose.scaleY*P.contactTopLiftFraction);
    assert.equal(p.originX,.02);
    const rear=direction>0?p.bounds.x:p.bounds.x+p.bounds.width;
    assert.ok(direction*(rear-contact.rawPoint.x)>=-1.3 && direction*(rear-contact.rawPoint.x)<=0,
      "only the dark rear padding overlaps the fist; the visible flame extends outward");
    assert.ok(p.flying&&p.contactsDue===1&&p.contactsVisible===1);
    assert.ok(Math.abs(q.x-p.x-direction*225)<1e-8);
    for(const k of ["width","height","y","angle"]) assert.equal(p[k],q[k]);
    assert.equal(p.width,64); assert.equal(p.height,28); assert.equal(p.alpha,1);
    assert.equal(q.alpha,1,"the core stays solid throughout flight");
    assert.ok(q.echoes.length>0,"short echoes are retained");
    for(const echo of q.echoes){
     assert.ok(echo.alpha>0&&echo.alpha<=.18);
     assert.equal(echo.width,64); assert.equal(echo.height,28); assert.equal(echo.angle,q.angle);
     assert.ok(direction*(q.x-echo.x)>=28-1e-8,"echoes stay behind the core");
    }
   }
   const steady=[];
   for(const age of [1,100,350,700,1300,1750]) {
    const state=await snap(launch+age);
    assert.ok(state.projectiles.every(p=>p.flying&&p.alpha===1&&p.width===64&&p.height===28));
    steady.push({age,alpha:state.projectiles.map(p=>p.alpha)});
   }
   const ended=await snap(C.cycleMs);
   assert.ok(ended.projectiles.every(p=>!p.flying&&p.echoes.length===0));
   assert.equal(ended.displayObjects,at.displayObjects);
   await snap(launch); await paint();
   await page.locator("#stage canvas").screenshot({path:path.join(out,attack+"-"+(direction>0?"right":"left")+"-contact.png")});
   proof.cases.push({attack,direction,at,later,steady});
  }
 }
 await page.selectOption("#direction","1"); await page.selectOption("#attack","punch");
 await page.click("#freeze"); await paint();
 await page.screenshot({path:path.join(out,"cinder-variations.png"),fullPage:true});
 await page.click("#replay");
 await page.waitForFunction(()=>lanceReview.scene.elapsedMs>500&&lanceReview.scene.elapsedMs<1500);
 assert.equal(await page.evaluate(()=>lanceReview.scene.playing),true);
 await page.setViewportSize({width:780,height:1100}); await paint();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.click("#freeze"); await paint();
 await page.screenshot({path:path.join(out,"cinder-compact.png"),fullPage:true});
 assert.deepEqual(errors,[]);
 proof.status="PASS"; fs.writeFileSync(path.join(out,"contact-browser-proof.json"),JSON.stringify(proof,null,2));
 console.log("CINDER_CONTACT_BROWSER_PASS: four palettes, punches/kicks left/right, 225px/s, fully opaque fixed cores, stable echoes, controls, responsive layout");
} catch(e) {
 proof.failure=e.stack;
 await page.screenshot({path:path.join(out,"contact-qa-failure.png"),fullPage:true}).catch(()=>{});
 fs.writeFileSync(path.join(out,"contact-browser-proof.json"),JSON.stringify(proof,null,2));
 console.error(JSON.stringify({failure:e.message,errors}));
 process.exitCode=1;
} finally {await browser.close();}

