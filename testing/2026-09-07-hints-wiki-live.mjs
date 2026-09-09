import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const sharp = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const output = process.env.HINTS_PROOF_DIR || "testing/2026-09-07-hints-wiki-proof";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", error => { errors.push(error.message); console.log("PAGE_ERROR", error.message); });
const rootUrl = process.env.HINTS_GAME_URL || "http://127.0.0.1:8093/";
async function capture(name) {
  const pixels = await page.screenshot({ path: `${output}/${name}.png` });
  await sharp(pixels).webp({ quality: 90 }).toFile(`${output}/${name}-20260907.webp`);
}
async function clickTab(key) {
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene")._pausePanel);
  const point = await page.evaluate(key => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const state = scene._pausePanel.state;
    const bounds = state.tabs.buttons[state.tabKeys.indexOf(key)].root.getBounds();
    return { x: bounds.centerX, y: bounds.centerY, w: scene.scale.width, h: scene.scale.height };
  }, key);
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.click(canvas.x + point.x * canvas.width / point.w, canvas.y + point.y * canvas.height / point.h);
  await page.waitForFunction(key => {
    const state = window.__phaserGame.scene.getScene("PlayScene")._pausePanel?.state;
    return state?.tabKeys[state.activeTab] === key;
  }, key);
}
async function clickHintControl(offset) {
  const point = await page.evaluate(offset => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const controls = scene._pausePanel.state.hintsView.getControls();
    const bounds = controls[controls.length + offset].root.getBounds();
    return { x: bounds.centerX, y: bounds.centerY, w: scene.scale.width, h: scene.scale.height };
  }, offset);
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.click(canvas.x + point.x * canvas.width / point.w, canvas.y + point.y * canvas.height / point.h);
}
try {
  await page.goto(rootUrl + "?jkd_e2e=1&cinematics=0&character=survivalUal", { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("LOADING_GAME");
  await page.waitForFunction(() => window.__phaserGame?.scene?.isActive("MainMenuScene") || window.__phaserGame?.scene?.isActive("StartMenuScene"), null, { timeout: 120000 });
  if (await page.evaluate(() => window.__phaserGame.scene.isActive("MainMenuScene"))) await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__phaserGame.scene.isActive("StartMenuScene"));
  await page.keyboard.press("1"); await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("StartMenuScene")?._newRunSetup?.isVisible);
  await page.waitForTimeout(150); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight"); await page.keyboard.type("YES"); await page.keyboard.press("Enter");
  console.log("LOADING_WORLD");
  await page.waitForFunction(() => window.__phaserGame.scene.isActive("PlayScene"), null, { timeout: 120000 });
  await page.waitForFunction(() => !window.__phaserGame.scene.getScene("PlayScene")._teleportInAnimating, null, { timeout: 60000 });
  if (!process.env.HINTS_PRODUCTION) assert.equal(await page.evaluate(() => window.__phaserGame.scene.getScene("PlayScene")._saveWritesBlocked), true);
  await page.waitForTimeout(2200);
  await capture("town");
  await page.keyboard.press("Escape", { delay: 180 }); await clickTab("hints");
  await page.waitForTimeout(400); await capture("hints");
  const hintState = await page.evaluate(() => window.__phaserGame.scene.getScene("PlayScene")._pausePanel.state.hintsView.getHealthSnapshot());
  assert.equal(hintState.entryCount, Number(process.env.HINTS_EXPECTED_COUNT || 16));
  console.log("HINT_PANEL", JSON.stringify(hintState));
  await clickHintControl(-2);
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene")._pausePanel.state.hintsView.getHealthSnapshot().page === 1);
  await clickHintControl(-3);
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene")._pausePanel.state.hintsView.getHealthSnapshot().page === 0);
  const popupPromise = page.waitForEvent("popup");
  await clickHintControl(-1);
  const popup = await popupPromise;
  await popup.waitForURL(/nextgen\.run\/game\/undersstar-wiki\/#hint-/);
  assert.equal(new URL(popup.url()).hash, "#hint-" + hintState.selectedId);
  await popup.close();
  await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
  await clickTab("saves"); await clickTab("hints");
  await clickTab("talents");
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene")._pausePanel.state.talentTree);
  await page.waitForTimeout(700); await capture("talents");
  await page.keyboard.press("Escape", { delay: 180 }); await page.keyboard.press("i", { delay: 180 });
  await page.waitForTimeout(900); await capture("inventory");
  await page.keyboard.press("Escape", { delay: 180 });
  assert.equal(await page.evaluate(() => Boolean(window.__phaserGame.scene.getScene("PlayScene")._pausePanel)), false);
  assert.deepEqual(errors, []);
  if (process.env.HINTS_CAPTURE_ONLY) { console.log("HINTS_GAMEPLAY_OK"); await fs.writeFile(`${output}/gameplay.json`, JSON.stringify({hintState,errors}, null, 2)); await browser.close(); process.exit(0); }
  const wiki = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  wiki.on("pageerror", error => errors.push(error.message));
  await wiki.goto("http://127.0.0.1:8093/game/undersstar-wiki/", { waitUntil: "networkidle" });
  const search = wiki.getByRole("searchbox", { name: "Search the wiki" });
  for (const query of ["how do I fly", "talnet points", "portla", "save backup", "worm", "ember charges"]) {
    await search.fill(query);
    const answer = await wiki.locator(".search-results ol a").first().innerText();
    console.log("SEARCH", JSON.stringify({ query, answer }));
    assert.ok(answer.length > 10);
  }
  await search.fill("talnet points"); await wiki.screenshot({ path: `${output}/wiki-search-desktop.png` });
  await search.press("ArrowDown"); await wiki.keyboard.press("Enter");
  assert.ok((await wiki.url()).includes("#"));
  assert.equal(await wiki.locator("[data-search-results]").isVisible(), false);
  await search.fill("zzzznonexistent");
  assert.equal(await wiki.locator("[data-search-empty]").isVisible(), true);
  await wiki.getByRole("button", { name: "Clear and close search" }).click();
  await wiki.goto("http://127.0.0.1:8093/game/undersstar-wiki/", { waitUntil: "networkidle" });
  await wiki.screenshot({ path: `${output}/wiki-desktop.png` });
  for (const width of [390, 768]) {
    await wiki.setViewportSize({ width, height: 844 });
    await wiki.screenshot({ path: `${output}/wiki-${width}.png` });
    assert.equal(await wiki.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`);
    await search.fill("low gp");
    await wiki.screenshot({ path: `${output}/wiki-search-${width}.png` });
    await search.press("Escape");
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/results.json`, JSON.stringify({ ok: true, hintState, errors }, null, 2));
  console.log("HINTS_WIKI_LIVE_OK");
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally { await browser.close(); }
