import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const output = process.env.WIKI_PROOF_DIR || "testing/2026-09-07-hints-wiki-public-proof";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const wiki = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], searches = [];
wiki.on("pageerror", error => errors.push(error.message));
const url = process.env.WIKI_URL || "http://127.0.0.1:8093/game/undersstar-wiki/";
try {
  await wiki.goto(url, { waitUntil: "networkidle" });
  await wiki.locator(".guide-preview img").evaluate(image => image.decode());
  const search = wiki.getByRole("searchbox", { name: "Search the wiki" });
  for (const [query, expected] of [["how do I fly", /fly|flight/i], ["talnet points", /talent/i], ["portla", /portal|route/i], ["save backup", /save|backup/i], ["worm", /wurm/i], ["ember charges", /ember|campfire/i], ["low gp", /gem power|low|gp/i]]) {
    await search.fill(query);
    const answer = await wiki.locator(".search-results ol a").first().innerText();
    assert.match(answer, expected, query);
    searches.push({ query, answer });
  }
  await search.fill("talnet points");
  await wiki.screenshot({ path: `${output}/wiki-search-desktop.png` });
  await search.press("ArrowDown"); await wiki.keyboard.press("Escape");
  assert.equal(await wiki.locator("[data-search-results]").isVisible(), false, "Escape closes search from a result");
  await search.fill("talnet points");
  await search.press("ArrowDown"); await wiki.keyboard.press("Enter");
  assert.ok(wiki.url().includes("#"));
  assert.equal(await wiki.locator("[data-search-results]").isVisible(), false);
  await search.fill("zzzznonexistent");
  assert.equal(await wiki.locator("[data-search-empty]").isVisible(), true);
  await wiki.getByRole("button", { name: "Clear and close search" }).click();
  assert.equal(await search.inputValue(), "");
  await wiki.keyboard.press("Tab"); await wiki.keyboard.press("/");
  assert.equal(await search.evaluate(input => document.activeElement === input), true);
  await search.fill("<img src=x onerror=alert(1)>");
  assert.equal(await wiki.locator(".search-results img").count(), 0);
  await search.press("Escape");
  await wiki.goto(url, { waitUntil: "networkidle" });
  await wiki.screenshot({ path: `${output}/wiki-desktop.png` });
  const ids = await wiki.locator("[id]").evaluateAll(nodes => nodes.map(node => node.id));
  assert.equal(new Set(ids).size, ids.length, "Unique section and answer links");
  for (const img of await wiki.locator(".guide-preview img, .visual-grid img, .poster img").all()) {
    await img.scrollIntoViewIfNeeded(); await img.evaluate(image => image.decode());
    assert.equal(await img.evaluate(image => image.naturalWidth), 1280);
  }
  for (const width of [390, 768]) {
    await wiki.setViewportSize({ width, height: 844 });
    await wiki.evaluate(() => scrollTo(0, 0));
    await wiki.screenshot({ path: `${output}/wiki-${width}.png` });
    assert.equal(await wiki.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`);
    await search.fill("low gp");
    await wiki.screenshot({ path: `${output}/wiki-search-${width}.png` });
    await search.press("Escape");
    assert.equal(await wiki.locator("[data-search-results]").isVisible(), false);
  }
  await wiki.goto(url + "?q=portla", { waitUntil: "networkidle" });
  assert.equal(await wiki.locator("[data-search-results]").isVisible(), true);
  await wiki.goto(url + "#hint-low-gp", { waitUntil: "networkidle" });
  assert.equal(await wiki.locator("#hint-low-gp").isVisible(), true);
  const faqId = await wiki.locator("details[id]").first().getAttribute("id");
  await wiki.goto(url + "#" + faqId, { waitUntil: "networkidle" });
  assert.equal(await wiki.locator(`#${faqId}`).getAttribute("open"), "");
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/wiki-results.json`, JSON.stringify({ ok: true, searches, errors }, null, 2));
  console.log("WIKI_BROWSER_OK", JSON.stringify({ searches: searches.length, viewports: [1440, 768, 390], errors }));
} catch (error) {
  await wiki.screenshot({ path: `${output}/wiki-failure.png` }).catch(() => {});
  throw error;
} finally { await browser.close(); }
