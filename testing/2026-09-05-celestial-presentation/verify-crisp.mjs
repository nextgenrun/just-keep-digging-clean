import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const out = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args: ["--enable-webgl", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
const result = { cases: [] };
try {
  for (const [name, query] of [
    ["wayward", "ability=star&rank=3"], ["hollow", "ability=hollow&rank=3"],
    ["lance", "ability=rage&rank=3"], ["companions", "ability=star&rank=3&passives=1"],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:8080/testing/2026-09-05-celestial-presentation/index.html?" + query,
      { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.celestialAbilitiesReady === "true",
      null, { timeout: 45000 });
    await page.evaluate(() => {
      const scene = __celestialReviewGame.scene.getScene("CelestialAbilitiesHarnessScene");
      const proof = window.__crispProof = { coreSamples: 0, echoSamples: 0, maxEchoes: 0,
        coreAlpha: [], failures: [], frames: 0 };
      const seen = new WeakMap();
      const sample = (sprite, echo = false) => {
        if (!sprite?.active || !sprite.visible || sprite.alpha <= 0) return;
        const previous = seen.get(sprite);
        const state = { width: sprite.displayWidth, height: sprite.displayHeight,
          alpha: sprite.alpha, angle: sprite.angle };
        if (echo) {
          proof.echoSamples++;
          if (previous && (Math.abs(previous.width - state.width) > 1e-8
            || Math.abs(previous.height - state.height) > 1e-8
            || previous.angle !== state.angle || state.alpha > previous.alpha + 1e-8))
            proof.failures.push("An echo changed shape, heading or increased opacity.");
        } else {
          proof.coreSamples++;
          if (!proof.coreAlpha.includes(state.alpha)) proof.coreAlpha.push(state.alpha);
          if (state.alpha !== 1) proof.failures.push("A skill core became transparent.");
          if (previous && (Math.abs(previous.width - state.width) > 1e-8
            || Math.abs(previous.height - state.height) > 1e-8))
            proof.failures.push("A skill core changed size.");
        }
        seen.set(sprite, state);
      };
      scene.events.on("postupdate", () => {
        proof.frames++;
        const owners = scene.passiveMode
          ? [scene.apexPassives.wayward, scene.apexPassives.hollow, scene.apexPassives.lance]
          : scene.effect?.children || [scene.effect];
        let echoes = 0;
        for (const owner of owners.filter(Boolean)) {
          const visual = owner.visual;
          if (visual && !visual.destroyed && visual.envelope.value > 0) {
            sample(visual.sprite);
            if (visual.core?.alpha > 0 && visual.core.alpha !== 1)
              proof.failures.push("A Hollow Sun centre became transparent.");
          }
          for (const core of owner.projectiles || []) sample(core);
          for (const echo of visual?.trails || owner.vfx?.trails || []) {
            sample(echo, true); echoes++;
            if (visual && echo.texture.key !== visual.assetKey)
              proof.failures.push("A fire overlay replaced a matching star echo.");
          }
        }
        proof.maxEchoes = Math.max(proof.maxEchoes, echoes);
        if (scene.children.list.some(sprite => sprite.frame?.name === "ember-p03"))
          proof.failures.push("Burn residue was rendered.");
      });
    });
    await page.waitForTimeout(1500);
    await page.locator("canvas").screenshot({ path: path.join(out, "crisp-" + name + ".png") });
    await page.waitForTimeout(1900);
    const proof = await page.evaluate(() => ({
      ...__crispProof,
      snapshot: JSON.parse(document.body.dataset.celestialAbilitiesSnapshot),
    }));
    assert.ok(proof.coreSamples > 30, name + ": sampled real rendered cores");
    assert.deepEqual(proof.coreAlpha, [1], name + ": full opacity throughout");
    assert.deepEqual(proof.failures, [], name + ": stable cores and echoes");
    if (name !== "hollow") assert.ok(proof.echoSamples > 0 && proof.maxEchoes > 0, name + ": echoes remain");
    assert.deepEqual(proof.snapshot.runtimeErrors, []);
    assert.deepEqual(proof.snapshot.missingTextures, []);
    assert.deepEqual(errors, []);
    result.cases.push({ name, ...proof, errors });
    console.log("CRISP_BROWSER_PASS " + name + ": " + proof.coreSamples + " core samples, "
      + proof.echoSamples + " stable echo samples, no burn residue");
    await page.close();
  }
  result.status = "PASS";
} catch (error) {
  result.failure = error.stack;
  process.exitCode = 1;
  console.error(error.stack);
} finally {
  fs.writeFileSync(path.join(out, "crisp-browser-proof.json"), JSON.stringify(result, null, 2));
  await browser.close();
}
