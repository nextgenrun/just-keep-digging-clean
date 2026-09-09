// Isolated real-game rendering session; closes its own canonical server on exit.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'visual-approval-previews/2026-09-06-hp-alignment-and-next-visuals');
const origin = 'http://127.0.0.1:8196';
const server = spawn('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe', [
  '-u', '-c', "import sys,runpy,webbrowser; webbrowser.open=lambda *a,**k: False; sys.argv=['serve.py','8196']; runpy.run_path('serve.py',run_name='__main__')",
], { cwd: root, windowsHide: true, stdio: 'ignore' });
let browserServer;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin + '/main.js')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (server.exitCode !== null) throw new Error('Review server failed to start');
  browserServer = await chromium.launchServer({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, host: '127.0.0.1',
    args: ['--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=9338'],
  });
  const browser = await chromium.connect(browserServer.wsEndpoint());
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR', error.message); });
  await fs.writeFile(path.join(output, 'wired-session.json'), JSON.stringify({ endpoint: browserServer.wsEndpoint(), origin, serverPid: server.pid }));
  await page.goto(origin + '/?jkd_e2e=1&cinematics=0', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__phaserGame?.scene.getScenes(true).some(s => ['MainMenuScene','StartMenuScene'].includes(s.sys.settings.key)), null, { timeout: 180000 });
  await page.screenshot({ path: path.join(output, 'wired-menu.png') });
  console.log('MENU_READY', JSON.stringify(await page.evaluate(() => ({ scenes: window.__phaserGame.scene.getScenes(true).map(s => s.sys.settings.key), renderer: window.__phaserGame.renderer.type }))));
  await page.evaluate(() => {
    window.__phaserGame.scene.stop('MainMenuScene');
    window.__phaserGame.scene.start('WorldLoadScene', {
      saveSlot: 1, worldIdentity: 'hp-alignment-review-20260906', isNewSave: true, tutorialChoice: 'no',
    });
  });
  await page.waitForFunction(() => window.__jkdE2E && window.__phaserGame.scene.getScene('PlayScene')._sceneSetupReady, null, { timeout: 240000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(output, 'wired-start.png') });
  await fs.writeFile(path.join(output, 'wired-initial-state.json'), JSON.stringify(await page.evaluate(() => ({
    state: window.__jkdE2E.getState(),
    keys: Object.keys(window.__phaserGame.scene.getScene('PlayScene')),
    saveBlocked: window.__phaserGame.scene.getScene('PlayScene')._saveWritesBlocked,
    hudObjects: window.__phaserGame.scene.getScene('PlayScene').children.list.filter(x => x.visible && x.scrollFactorX === 0).map(x => ({
      type:x.type, name:x.name, texture:x.texture?.key, text:x.text, x:x.x,y:x.y,width:x.displayWidth,height:x.displayHeight,alpha:x.alpha,depth:x.depth
    })),
  })), null, 2));
  console.log('GAME_READY');
  await new Promise(resolve => browserServer.on('close', resolve));
  await fs.writeFile(path.join(output, 'wired-session-errors.json'), JSON.stringify(errors, null, 2));
} finally {
  await browserServer?.close();
  server.kill();
}

