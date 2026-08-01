import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const ROOT_URL = "http://127.0.0.1:8090/";
const EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const OUTPUT_DIR = resolve(
  "C:/Users/Mila/.codex/visualizations/2026/07/29/019faee2-4c52-7fa1-8534-7da6b082d0fa",
);
const AUTHORED_SCREENSHOT = resolve(OUTPUT_DIR, "thunder-authored-runtime.png");
const ROLLBACK_SCREENSHOT = resolve(
  OUTPUT_DIR,
  "thunder-procedural-rollback-runtime.png",
);

const issues = [];
const assetResponses = [];
const browser = await chromium.launch({
  executablePath: EDGE_PATH,
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--use-angle=swiftshader",
  ],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console:${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
  page.on("requestfailed", (request) => {
    issues.push(`requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`);
  });
  page.on("response", (response) => {
    if (/hardcore|high-impact-v1/i.test(response.url())) {
      assetResponses.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });

  await page.goto(
    `${ROOT_URL}?jkd_e2e=1&highImpactFx=1&runtimeAssetQueue=1&nativeDensity=0`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  await page.waitForFunction(
    () => Boolean(
      window.__phaserGame?.scene
      && window.__phaserGame.scene.getScenes(true).some(
        (scene) => ["MainMenuScene", "StartMenuScene"].includes(scene.scene.key),
      )
    ),
    null,
    { timeout: 180_000 },
  );

  const bootProbe = await page.evaluate(() => {
    const game = window.__phaserGame;
    const keys = [
      "ui-hardcore-oath-panel-v1",
      "ui-hardcore-oath-crest-v1",
      "environment-hardcore-memorial-v1",
    ];
    return {
      scenes: game.scene.getScenes(true).map((scene) => scene.scene.key),
      textures: Object.fromEntries(
        keys.map((key) => [key, game.textures.exists(key)]),
      ),
    };
  });

  await page.evaluate(() => {
    const game = window.__phaserGame;
    game.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "high-impact-fx-live-qa",
      isNewSave: true,
      tutorialChoice: "no",
    });
  });
  await page.waitForFunction(
    () => Boolean(
      window.__jkdE2E
      && window.__phaserGame?.scene?.isActive("PlayScene")
      && window.__phaserGame.scene.getScene("PlayScene")
        ?.thunderStrikeActionRuntime?.impactFx
      && window.__jkdHighImpactFx?.snapshot?.().state === "ready"
    ),
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(1_500);

  const authored = await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    window.__jkdE2E.closeAll();
    scene.weatherSystem?.forceWeather?.("clear", 0, 600_000);
    const tileSize = scene.config.tileSize;
    const tx = Math.floor(scene.player.x / tileSize);
    const ty = Math.floor(scene.player.y / tileSize) + 1;
    scene.cameras.main.stopFollow();
    scene.cameras.main.centerOn(scene.player.x, scene.player.y - tileSize * 1.5);
    scene.thunderStrikeActionRuntime.impactFx.play(
      {
        results: [{ tx, ty }],
        chainEffectiveDamageMultiplier: 2.25,
      },
      scene.player,
      2,
    );
    return {
      hit: { tx, ty },
      snapshot: window.__jkdHighImpactFx.snapshot(),
      activeScenes: window.__phaserGame.scene.getScenes(true)
        .map((activeScene) => activeScene.scene.key),
    };
  });
  await page.waitForTimeout(90);
  await page.screenshot({ path: AUTHORED_SCREENSHOT });
  await page.waitForTimeout(650);

  const rollback = await page.evaluate(() => {
    const before = window.__jkdHighImpactFx.snapshot();
    const changed = window.__jkdHighImpactFx.rollback();
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const tileSize = scene.config.tileSize;
    const tx = Math.floor(scene.player.x / tileSize);
    const ty = Math.floor(scene.player.y / tileSize) + 1;
    scene.thunderStrikeActionRuntime.impactFx.play(
      {
        results: [{ tx, ty }],
        chainEffectiveDamageMultiplier: 2.25,
      },
      scene.player,
      2,
    );
    return {
      changed,
      before,
      after: window.__jkdHighImpactFx.snapshot(),
      hit: { tx, ty },
    };
  });
  await page.waitForTimeout(90);
  await page.screenshot({ path: ROLLBACK_SCREENSHOT });

  const fatalIssues = issues.filter((issue) => (
    issue.startsWith("pageerror:")
    || issue.includes("Fatal error during setupScene")
    || issue.startsWith("requestfailed:")
  ));
  if (authored.snapshot.state !== "ready" || !authored.snapshot.atomicReady) {
    throw new Error(`Authored runtime was not atomically ready: ${
      JSON.stringify(authored.snapshot)
    }`);
  }
  if (
    rollback.changed !== true
    || rollback.after.state !== "rolled-back"
    || rollback.after.atomicReady !== false
  ) {
    throw new Error(`Rollback did not reach the expected state: ${
      JSON.stringify(rollback)
    }`);
  }
  if (fatalIssues.length > 0) {
    throw new Error(`Fatal browser issues: ${JSON.stringify(fatalIssues)}`);
  }

  console.log(JSON.stringify({
    phase: "complete",
    bootProbe,
    authored,
    rollback,
    screenshots: {
      authored: AUTHORED_SCREENSHOT,
      rollback: ROLLBACK_SCREENSHOT,
    },
    assetResponses,
    issues,
  }, null, 2));
} finally {
  await browser.close();
}
