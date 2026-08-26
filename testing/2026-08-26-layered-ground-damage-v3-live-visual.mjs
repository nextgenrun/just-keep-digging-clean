import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const ROOT_URL =
  "http://127.0.0.1:8090/testing/2026-08-26-layered-ground-damage-v3-harness.html";
const EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const OUTPUT_DIR = resolve("visual-approval-previews/ground-damage-layered-v3");
const LAYERED_SCREENSHOT = resolve(
  OUTPUT_DIR,
  "03-production-layered-resource-matrix.png",
);
const V2_SCREENSHOT = resolve(OUTPUT_DIR, "04-v2-rollback-resource-matrix.png");

mkdirSync(OUTPUT_DIR, { recursive: true });

const browserIssues = [];
const atlasResponses = [];
const httpFailures = [];
const browser = await chromium.launch({
  executablePath: EDGE_PATH,
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--use-angle=swiftshader",
  ],
});

async function capture(page, url, expected, outputPath) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => document.body.dataset.layeredGroundDamageV3Ready === "true",
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(350);
  const snapshot = await page.evaluate(() => ({
    body: { ...document.body.dataset },
    runtime: globalThis.__LAYERED_GROUND_DAMAGE_V3__,
    canvas: {
      width: document.querySelector("canvas")?.width,
      height: document.querySelector("canvas")?.height,
    },
  }));
  const runtime = snapshot.runtime;
  if (
    runtime?.selectedRevision !== expected.revision
    || runtime?.familyCount !== 17
    || runtime?.stateCount !== 5
    || runtime?.logicalTilePx !== 94
    || runtime?.productionPainter !== true
    || snapshot.canvas.width !== 1410
    || snapshot.canvas.height !== 940
  ) {
    throw new Error(`Invalid runtime snapshot: ${JSON.stringify(snapshot)}`);
  }
  const expectedPoolSize = runtime.familyCount * runtime.stateCount;
  if (
    runtime.structuralPool !== expectedPoolSize
    || runtime.rimPool !== expected.rimPool
    || runtime.responsePool !== expected.responsePool
  ) {
    throw new Error(`Invalid layer pools: ${JSON.stringify(runtime)}`);
  }
  await page.screenshot({ path: outputPath });
  return snapshot;
}

try {
  const context = await browser.newContext({
    viewport: { width: 1410, height: 940 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("console", message => {
    if (message.type() === "error") browserIssues.push(`console:${message.text()}`);
  });
  page.on("pageerror", error => browserIssues.push(`pageerror:${error.message}`));
  page.on("requestfailed", request => {
    browserIssues.push(
      `requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`,
    );
  });
  page.on("response", response => {
    if (response.status() >= 400) {
      httpFailures.push({ status: response.status(), url: response.url() });
    }
    if (
      /ground-damage-(?:fracture-v3|response-v3|piskel-anchor-v2)\.png/i
        .test(response.url())
    ) {
      atlasResponses.push({ status: response.status(), url: response.url() });
    }
  });

  const layered = await capture(page, `${ROOT_URL}?groundDamageAtlas=v3`, {
    revision: "layered-v3",
    rimPool: 85,
    responsePool: 85,
  }, LAYERED_SCREENSHOT);
  const v2 = await capture(page, `${ROOT_URL}?groundDamageAtlas=v2`, {
    revision: "polished-v2",
    rimPool: 0,
    responsePool: 0,
  }, V2_SCREENSHOT);

  const fatalIssues = browserIssues.filter(issue => (
    issue.startsWith("pageerror:") || issue.startsWith("requestfailed:")
  ));
  if (fatalIssues.length > 0 || httpFailures.length > 0) {
    throw new Error(
      `Fatal browser issues: ${JSON.stringify({ fatalIssues, httpFailures })}`,
    );
  }
  const requestedAtlases = new Set(
    atlasResponses.map(({ url }) => url.match(/ground-damage-[^/?]+\.png/i)?.[0]),
  );
  if (
    atlasResponses.some(response => response.status !== 200)
    || requestedAtlases.size !== 3
  ) {
    throw new Error(`Atlas response failure: ${JSON.stringify(atlasResponses)}`);
  }

  console.log(JSON.stringify({
    phase: "complete",
    layered,
    v2,
    screenshots: { layered: LAYERED_SCREENSHOT, v2: V2_SCREENSHOT },
    atlasResponses,
    httpFailures,
    browserIssues,
  }, null, 2));
} finally {
  await browser.close();
}
