import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const ROOT_URL =
  "http://127.0.0.1:8090/testing/2026-07-30-ground-damage-piskel-production-harness.html";
const EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const OUTPUT_DIR = resolve(
  "visual-approval-previews/ground-damage-piskel-production",
);
const POLISHED_SCREENSHOT = resolve(OUTPUT_DIR, "01-production-polished.png");
const LEGACY_SCREENSHOT = resolve(OUTPUT_DIR, "02-production-legacy-atlas-rollback.png");
const EXPECTED_POLISHED_PATH =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/"
  + "ground-damage-piskel-anchor-v2.png?v=20260730a";
const EXPECTED_LEGACY_PATH =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/"
  + "ground-damage-imagegen-v1.png?v=20260729a";

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

async function capture(page, url, expectedRevision, expectedPath, outputPath) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => document.body.dataset.groundDamagePiskelProductionReady === "true",
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(350);
  const snapshot = await page.evaluate(() => ({
    body: { ...document.body.dataset },
    runtime: globalThis.__GROUND_DAMAGE_PISKEL_PRODUCTION__,
    canvas: {
      width: document.querySelector("canvas")?.width,
      height: document.querySelector("canvas")?.height,
    },
  }));
  if (snapshot.body.selectedRevision !== expectedRevision) {
    throw new Error(
      `Expected ${expectedRevision} revision, got ${snapshot.body.selectedRevision}`,
    );
  }
  if (snapshot.runtime?.selectedAtlasPath !== expectedPath) {
    throw new Error(
      `Expected ${expectedPath}, got ${snapshot.runtime?.selectedAtlasPath}`,
    );
  }
  if (
    snapshot.runtime?.frameCount !== 120
    || snapshot.runtime?.frameSizePx !== 188
    || snapshot.runtime?.logicalTilePx !== 94
    || snapshot.runtime?.pooledImageCount
      !== snapshot.runtime?.materialCount * snapshot.runtime?.stateCount
  ) {
    throw new Error(`Invalid runtime geometry: ${JSON.stringify(snapshot.runtime)}`);
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
    if (/ground-damage-(?:piskel-anchor-v2|imagegen-v1)\.png/i.test(response.url())) {
      atlasResponses.push({ status: response.status(), url: response.url() });
    }
  });

  const polished = await capture(
    page,
    ROOT_URL,
    "polished",
    EXPECTED_POLISHED_PATH,
    POLISHED_SCREENSHOT,
  );
  const legacy = await capture(
    page,
    `${ROOT_URL}?groundDamageAtlas=legacy`,
    "legacy",
    EXPECTED_LEGACY_PATH,
    LEGACY_SCREENSHOT,
  );

  const fatalIssues = browserIssues.filter(issue => (
    issue.startsWith("pageerror:")
    || issue.startsWith("requestfailed:")
  ));
  if (fatalIssues.length > 0 || httpFailures.length > 0) {
    throw new Error(
      `Fatal browser issues: ${JSON.stringify({ fatalIssues, httpFailures })}`,
    );
  }
  if (
    atlasResponses.length < 2
    || atlasResponses.some(response => response.status !== 200)
  ) {
    throw new Error(`Atlas response failure: ${JSON.stringify(atlasResponses)}`);
  }

  console.log(JSON.stringify({
    phase: "complete",
    polished,
    legacy,
    screenshots: {
      polished: POLISHED_SCREENSHOT,
      legacy: LEGACY_SCREENSHOT,
    },
    atlasResponses,
    httpFailures,
    browserIssues,
  }, null, 2));
} finally {
  await browser.close();
}
