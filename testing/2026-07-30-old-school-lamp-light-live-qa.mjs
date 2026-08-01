// Hidden-Edge same-position comparison of Fire Light V3 and old-school lamp review.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const DEFAULT_URL = "http://127.0.0.1:8090/";
const DEFAULT_OUTPUT = path.resolve("tmp/old-school-lamp-light-live");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const FIRE_KEYS = Object.freeze([
  "fire-light-v3-flame-steady", "fire-light-v3-flame-states",
  "fire-light-v3-volume", "fire-light-v3-rays",
  "fire-light-v3-atmosphere", "fire-light-v3-hot-core",
  "fire-light-v3-penumbra", "fire-light-v3-bounce",
  "fire-light-v3-breakup", "fire-light-v3-environment",
]);
const LAMP_KEYS = Object.freeze([
  "old-school-lamp-v1-source", "old-school-lamp-v1-volume",
  "old-school-lamp-v1-rays", "old-school-lamp-v1-penumbra",
  "old-school-lamp-v1-bounce", "old-school-lamp-v1-hot-core",
  "old-school-lamp-v1-atmosphere",
]);

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function scenarioUrl(baseUrl, scenario) {
  const url = new URL(baseUrl);
  url.searchParams.set("jkd_e2e", "1");
  url.searchParams.set("runtimeAssetQueue", "1");
  url.searchParams.set("nativeDensity", "0");
  if (scenario === "lamp") url.searchParams.set("carriedLightStyle", "lamp-review");
  return url.href;
}

async function launchPlayScene(page) {
  await page.waitForFunction(
    () => Boolean(
      window.__phaserGame?.scene
      && window.__phaserGame.scene.getScenes(true).some(
        scene => ["MainMenuScene", "StartMenuScene"].includes(scene.scene.key),
      )
    ),
    null,
    { timeout: 180_000 },
  );
  await page.evaluate(() => {
    window.__phaserGame.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "old-school-lamp-light-comparison",
      isNewSave: true,
      tutorialChoice: "no",
    });
  });
  await page.waitForFunction(
    () => Boolean(
      window.__jkdE2E
      && window.__phaserGame?.scene?.isActive("PlayScene")
      && window.__phaserGame.scene.getScene("PlayScene")?.lightSystem
    ),
    null,
    { timeout: 180_000 },
  );
}

async function prepareView(page) {
  return page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const model = scene.worldModel;
    const width = model.widthTiles || model.width || scene.config.worldWidthTiles;
    const startX = Math.max(2, (scene.config.spawnTileX || 28) - 80);
    const endX = Math.min(width - 3, startX + 160);
    const startY = scene.config.topAirRows + 140;
    let target = null;
    for (let ty = startY; ty < startY + 100 && !target; ty += 1) {
      for (let tx = startX; tx <= endX; tx += 1) {
        if (
          !model.isSolid(tx, ty)
          && !model.isSolid(tx, ty - 1)
          && model.isSolid(tx, ty + 1)
        ) {
          target = { tx, ty };
          break;
        }
      }
    }
    if (!target) throw new Error("No underground standing-air tile found");
    window.__jkdE2E.closeAll();
    window.__jkdE2E.forcePlayerState(target);
    scene.worldRenderer?.updateRenderWindow?.(target);
    scene.worldRenderer?.invalidate?.();
    scene.weatherSystem?.forceWeather?.("clear", 0, 600_000);
    const maxGp = scene.playerController.getGemPowerMax();
    scene.playerController.setGemPowerExact(maxGp, {
      silent: true,
      source: "old-school-lamp-light-live-qa",
    });
    scene.gameState = "playing";
    if (!scene.lightSystem.isTorchActive()) scene.lightSystem._toggleTorch();
    scene.cameras.main.startFollow(scene.player, true);
    return { target, maxGp };
  });
}

async function captureScenario(page, baseUrl, outputDir, scenario) {
  const url = scenarioUrl(baseUrl, scenario);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await launchPlayScene(page);
  const placement = await prepareView(page);
  await page.waitForFunction(
    (scenarioId) => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      const snapshot = scene.lightSystem.getFireLightSnapshot();
      const expectedId = scenarioId === "lamp"
        ? "old-school-lamp-light-v1"
        : "fire-light-v3";
      return scene.lightSystem.isTorchActive()
        && snapshot?.id === expectedId
        && snapshot.enabled === true
        && snapshot.active === true
        && snapshot.raysRequested === false
        && snapshot.rays?.visibleRayCount === 0
        && snapshot.eyeAdaptation?.available === true;
    },
    scenario,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1_400);
  const evidence = await page.evaluate(({ fireKeys, lampKeys }) => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const carriedLight = scene.lightSystem.getFireLightSnapshot();
    const keys = carriedLight.id === "old-school-lamp-light-v1"
      ? lampKeys
      : fireKeys;
    return {
      carriedLight,
      textures: Object.fromEntries(keys.map(
        key => [key, scene.textures.exists(key)]
      )),
      torchActive: scene.lightSystem.isTorchActive(),
      darkness: {
        active: scene.lightSystem._darknessRenderActive,
        alpha: scene.lightSystem._darknessRenderAlpha,
      },
      shader: scene.lightSystem.getShaderSnapshot(),
      health: window.__jkdHealth?.snapshot?.() || null,
      uiErrors: [...(window.__jkdUiErrors || [])],
      renderer: {
        type: scene.game.renderer.type,
        width: scene.game.renderer.width,
        height: scene.game.renderer.height,
      },
      camera: {
        scrollX: scene.cameras.main.scrollX,
        scrollY: scene.cameras.main.scrollY,
        zoom: scene.cameras.main.zoom,
      },
    };
  }, { fireKeys: FIRE_KEYS, lampKeys: LAMP_KEYS });
  const screenshotPath = path.join(outputDir, `${scenario}.png`);
  await page.screenshot({ path: screenshotPath });
  return { id: scenario, url, placement, screenshotPath, evidence };
}

function assertEvidence(scenarios, responses, browserIssues) {
  const torch = scenarios.find(entry => entry.id === "torch");
  const lamp = scenarios.find(entry => entry.id === "lamp");
  if (!torch || !lamp) throw new Error("Torch and lamp captures are required");
  if (JSON.stringify(torch.placement.target) !== JSON.stringify(lamp.placement.target)) {
    throw new Error("Comparison targets differ");
  }
  if (
    torch.evidence.carriedLight.id !== "fire-light-v3"
    || torch.evidence.shader.carriedLightPresentationId !== "fire-light-v3"
    || torch.evidence.carriedLight.raysRequested
    || torch.evidence.carriedLight.rays.visibleRayCount !== 0
    || !Object.values(torch.evidence.textures).every(Boolean)
  ) {
    throw new Error(`Torch evidence invalid: ${JSON.stringify(torch.evidence)}`);
  }
  if (
    lamp.evidence.carriedLight.id !== "old-school-lamp-light-v1"
    || lamp.evidence.carriedLight.authoredComponentCount !== 112
    || lamp.evidence.carriedLight.authoredLightFrameCount !== 96
    || lamp.evidence.carriedLight.raysRequested
    || lamp.evidence.carriedLight.rays.visibleRayCount !== 0
    || lamp.evidence.shader.carriedLightPresentationId !== "old-school-lamp-light-v1"
    || lamp.evidence.shader.fireLightProceduralMix !== 0.12
    || !Object.values(lamp.evidence.textures).every(Boolean)
  ) {
    throw new Error(`Lamp evidence invalid: ${JSON.stringify(lamp.evidence)}`);
  }
  for (const entry of [torch, lamp]) {
    if (
      !entry.evidence.torchActive
      || entry.evidence.uiErrors.length > 0
      || entry.evidence.renderer.type !== 2
    ) {
      throw new Error(`${entry.id} runtime evidence unhealthy`);
    }
  }
  const lampResponses = responses.filter(entry => (
    entry.url.includes("/old-school-lamp-light-v1/")
  ));
  if (
    lampResponses.length !== 7
    || lampResponses.some(entry => entry.status < 200 || entry.status >= 400)
  ) {
    throw new Error(`Lamp asset responses invalid: ${JSON.stringify(lampResponses)}`);
  }
  const fatal = browserIssues.filter(issue => (
    issue.startsWith("pageerror:")
    || issue.startsWith("requestfailed:")
    && issue.includes("/old-school-lamp-light-v1/")
  ));
  if (fatal.length > 0) {
    throw new Error(`Fatal browser issues: ${JSON.stringify(fatal)}`);
  }
}

async function main() {
  const outputDir = path.resolve(argument("output", DEFAULT_OUTPUT));
  const baseUrl = argument("url", DEFAULT_URL);
  fs.mkdirSync(outputDir, { recursive: true });
  const browserIssues = [];
  const assetResponses = [];
  const browser = await chromium.launch({
    executablePath: argument("edge", DEFAULT_EDGE),
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
    const scenarios = [];
    for (const scenario of ["torch", "lamp"]) {
      console.log(`capturing ${scenario}`);
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
        if (
          response.url().includes("/fire-light-v3/")
          || response.url().includes("/old-school-lamp-light-v1/")
        ) {
          assetResponses.push({ status: response.status(), url: response.url() });
        }
      });
      try {
        const result = await captureScenario(
          page,
          baseUrl,
          outputDir,
          scenario
        );
        scenarios.push(result);
        console.log(`captured ${scenario}`);
      } finally {
        await page.close();
      }
    }
    assertEvidence(scenarios, assetResponses, browserIssues);
    const report = {
      schema: "old-school-lamp-light-live-qa@1",
      generatedUtc: new Date().toISOString(),
      viewport: { width: 1280, height: 720 },
      scenarios,
      assetResponses,
      browserIssues,
    };
    const reportPath = path.join(outputDir, "live-qa-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(reportPath);
  } finally {
    await browser.close();
  }
}

await main();
