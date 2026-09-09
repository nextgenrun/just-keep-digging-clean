const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true, args:['--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:720}, reducedMotion:'reduce'});
    let imports = 0;
    const videos = [];
    page.on('request', request => { if (request.url().includes('understar-logo-light')) videos.push(request.url()); });
    await page.route('**/RuntimeScenes.js*', async route => { imports++; await route.abort('failed'); });
    const url = JSON.parse(fs.readFileSync(path.join(__dirname,'preview-server-v2.json'),'utf8')).url;
    await page.goto(url, {waitUntil:'domcontentloaded'});
    await page.locator('.menu-loading__retry').waitFor({state:'visible',timeout:45000});
    assert.equal(imports,1);
    assert.match(await page.locator('.menu-loading__error').innerText(),/finish downloading/);
    assert.equal(videos.length,0,'Reduced motion must not fetch either logo clip');
    await page.screenshot({path:path.join(__dirname,'motion-v2-launch-retry.png')});
    await page.locator('.menu-loading__retry').click();
    await page.waitForFunction(() => document.querySelector('.menu-loading__retry')?.hidden === false, null, {timeout:45000});
    await page.waitForTimeout(500);
    assert.equal(imports,2,'Retry must reload the failed ES-module graph');
    const report={result:'passed',failedGraphRequests:imports,reducedMotionVideoRequests:videos.length};
    fs.writeFileSync(path.join(__dirname,'motion-v2-launch-contract.json'),JSON.stringify(report,null,2));
    console.log(report);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
