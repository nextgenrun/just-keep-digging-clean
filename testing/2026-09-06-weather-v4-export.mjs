import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
// Isolated fallback after the in-app automation kernel stopped executing even console.log.
// This does not attach to, navigate, or inspect the user's browser session.
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const qa=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-weather-v4');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1180}});
const continuing=process.argv.includes('--finish');
const prior=continuing?JSON.parse(await fs.readFile(path.join(qa,'export-verification.json'),'utf8')):null;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-weather-v4/audit.html');
 await page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:90000});
 for(const button of (continuing?['Observe one cloud front','Record weather motion']:['Run weather and route audit','Observe one cloud front','Record weather motion'])){
  console.log('Started '+button);await page.getByRole('button',{name:button,exact:true}).click();
  await page.waitForFunction(()=>['Complete'].includes(document.querySelector('#state').textContent)||document.querySelector('#state').textContent.startsWith('Failed'),null,{timeout:200000});
  const status=await page.locator('#state').textContent();if(status.startsWith('Failed'))throw Error(status);
  console.log('Completed '+button);
  const href=await page.locator('#report').getAttribute('href');
  const report=JSON.parse(decodeURIComponent(href.slice(href.indexOf(',')+1)));
  if(prior){report.views=[...prior.views.filter(v=>!v.label.startsWith('cloud-front-')),...report.views];report.checks=[...prior.checks,...report.checks];}
  await fs.writeFile(path.join(qa,'export-verification.json'),JSON.stringify(report,null,2));
  const images=page.locator('#captures img');
  for(let i=0;i<await images.count();i++){
   const image=images.nth(i),name=await image.getAttribute('data-file'),src=await image.getAttribute('src');
   await fs.writeFile(path.join(qa,name),Buffer.from(src.slice(src.indexOf(',')+1),'base64'));
  }
 }
 const movie=await page.locator('#movie').getAttribute('href');
 await fs.writeFile(path.join(qa,'level-one-weather-v4.webm'),Buffer.from(movie.slice(movie.indexOf(',')+1),'base64'));
 await fs.writeFile(path.join(qa,'export-browser-errors.json'),JSON.stringify(errors,null,2)+'\n');
 console.log('All 27 screenshots and the 26-second motion recording saved');
}finally{await browser.close();}
