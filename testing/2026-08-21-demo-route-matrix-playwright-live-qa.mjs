import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

function argument(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length)
    || fallback;
}

const url = argument(
  "url",
  "http://127.0.0.1:8080/?jkd_e2e=1&demoRouteMatrix=20260821-playwright",
);
const output = path.resolve(argument(
  "output",
  "tmp/2026-08-21-demo-route-matrix-live/report.json",
));
const routes = [
  { id: "casual-guided", mode: "casual", tutorialChoice: "yes", stage: "move" },
  { id: "casual-skip", mode: "casual", tutorialChoice: "no", stage: "skipped" },
  { id: "hardcore-guided", mode: "hardcore", tutorialChoice: "yes", stage: "move" },
  { id: "hardcore-skip", mode: "hardcore", tutorialChoice: "no", stage: "skipped" },
];

fs.mkdirSync(path.dirname(output), { recursive: true });
const browserIssues = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (message) => {
    if (message.type() === "error") browserIssues.push(`console:${message.text()}`);
  });
  page.on("pageerror", (error) => browserIssues.push(`pageerror:${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserIssues.push(`response:${response.status()}:${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => Boolean(window.__phaserGame?.scene?.getScenes?.(true)
      ?.some((scene) => ["MainMenuScene", "StartMenuScene"].includes(scene.sys.settings.key))),
    null,
    { timeout: 300_000 },
  );

  const results = [];
  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    await page.evaluate(({ route, index }) => {
      window.__jkdUiErrors = [];
      const data = {
        saveSlot: index + 1,
        worldIdentity: `feedback-route-${route.id}`,
        isNewSave: true,
        tutorialChoice: route.tutorialChoice,
        hardcoreModeData: {
          mode: route.mode,
          armed: false,
          selectedAt: 1,
        },
      };
      if (index === 0) window.__phaserGame.scene.start("WorldLoadScene", data);
      else window.__phaserGame.scene.getScene("PlayScene").scene.restart(data);
    }, { route, index });

    await page.waitForFunction(
      ({ saveSlot }) => {
        const scene = window.__phaserGame?.scene?.getScene?.("PlayScene");
        return Boolean(
          window.__phaserGame.scene.isActive("PlayScene")
          && scene?._setupPhase === "ready"
          && scene?.saveSlot === saveSlot
          && scene?.retentionProgressSystem
          && scene?.runtimeAssetLoadCoordinator,
        );
      },
      { saveSlot: index + 1 },
      { timeout: 120_000 },
    );

    const snapshot = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      return {
        mode: scene.hardcoreModeData?.mode,
        lives: scene.hardcoreModeData?.livesRemaining ?? null,
        tutorial: scene.retentionProgressSystem.getTutorialState(),
        barrier: scene.townSquareTutorialSystem?.getHealthSnapshot?.()?.townExitBarrier || null,
        demoMode: scene.gameplayCapabilities?.demoMode,
        gameState: scene.gameState,
        errors: [...(window.__jkdUiErrors || [])],
        assets: scene.runtimeAssetLoadCoordinator.getSnapshot(),
      };
    });

    assert.equal(snapshot.mode, route.mode);
    assert.equal(snapshot.tutorial.choice, route.tutorialChoice);
    assert.equal(snapshot.tutorial.stage, route.stage);
    assert.equal(snapshot.barrier?.active, route.tutorialChoice === "yes");
    assert.equal(snapshot.lives, route.mode === "hardcore" ? 2 : null);
    assert.equal(snapshot.demoMode, true);
    assert.notEqual(snapshot.gameState, "safe-paused");
    assert.deepEqual(snapshot.errors, []);
    assert.equal(
      snapshot.assets.assetCatalog?.blockedQueueAttempts,
      0,
      `${route.id} blocked an asset queue: ${JSON.stringify(snapshot.assets.assetCatalog)}`,
    );
    assert.deepEqual(
      snapshot.assets.assetCatalog?.gatedResidentOwners,
      [],
      `${route.id} retained gated assets: ${JSON.stringify(snapshot.assets.assetCatalog)}`,
    );
    results.push({ id: route.id, snapshot });
  }

  assert.deepEqual(browserIssues, []);
  fs.writeFileSync(output, `${JSON.stringify({
    schema: "demo-route-matrix-playwright-live-qa@1",
    generatedUtc: new Date().toISOString(),
    url,
    browserIssues,
    results,
  }, null, 2)}\n`);
  console.log(output);
} finally {
  await browser.close();
}
