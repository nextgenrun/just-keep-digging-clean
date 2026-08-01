// Hidden-Edge production QA for default, narrow rollback, and full legacy fire light.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const DEFAULT_URL = "http://127.0.0.1:8090/";
const DEFAULT_OUTPUT = path.resolve("tmp/fire-light-v3-live");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const FIRE_KEYS = Object.freeze([
  "fire-light-v3-flame-steady", "fire-light-v3-flame-states", "fire-light-v3-volume",
  "fire-light-v3-rays", "fire-light-v3-atmosphere", "fire-light-v3-hot-core",
  "fire-light-v3-penumbra", "fire-light-v3-bounce", "fire-light-v3-breakup", "fire-light-v3-environment",
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
  if (scenario === "narrow") url.searchParams.set("eyeAdaptation", "0");
  if (scenario === "rays") url.searchParams.set("fireRays", "1");
  if (scenario === "layered") url.searchParams.set("fireLightStyle", "layered");
  if (scenario === "legacy") url.searchParams.set("fireLight", "legacy");
  return url.href;
}
async function launchPlayScene(page, scenario) {
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
  await page.evaluate((scenarioId) => {
    window.__phaserGame.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "fire-light-v3-live-comparison",
      isNewSave: true,
      tutorialChoice: "no",
    });
  }, scenario);
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
async function prepareTorchView(page) {
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
      source: "fire-light-v3-live-qa",
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
  await launchPlayScene(page, scenario);
  const placement = await prepareTorchView(page);
  await page.waitForFunction(
    (scenarioId) => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      const snapshot = scene.lightSystem.getFireLightSnapshot();
      if (!scene.lightSystem.isTorchActive()) return false;
      if (scenarioId === "legacy") return snapshot?.enabled === false;
      if (scenarioId === "rays") return snapshot?.enabled === true
        && snapshot.active === true && snapshot.raysRequested === true
        && snapshot.rays?.visibleRayCount > 0;
      if (scenarioId === "narrow") return snapshot?.enabled === true
        && snapshot.active === true && snapshot.raysRequested === false
        && snapshot.eyeAdaptationRequested === false;
      return snapshot?.enabled === true
        && snapshot.active === true && snapshot.raysRequested === false
        && snapshot.rays?.visibleRayCount === 0
        && snapshot.eyeAdaptation?.available === true;
    },
    scenario,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1_200);
  const evidence = await page.evaluate((keys) => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const fire = scene.lightSystem.getFireLightSnapshot();
    return {
      activeScenes: window.__phaserGame.scene.getScenes(true)
        .map(activeScene => activeScene.scene.key),
      fire,
      textures: Object.fromEntries(keys.map(key => [key, scene.textures.exists(key)])),
      torchActive: scene.lightSystem.isTorchActive(),
      legacyGlow: {
        haloVisible: scene.lightSystem._torchHalo?.visible,
        haloAlpha: scene.lightSystem._torchHalo?.alpha,
        coreVisible: scene.lightSystem._torchCoreGlow?.visible,
        flameVisible: scene.lightSystem._torchFlameGlow?.visible,
      },
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
        width: scene.cameras.main.width,
        height: scene.cameras.main.height,
        scrollX: scene.cameras.main.scrollX,
        scrollY: scene.cameras.main.scrollY,
        zoom: scene.cameras.main.zoom,
      },
      dom: {
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        centerStack: document.elementsFromPoint(innerWidth * 0.5, innerHeight * 0.5)
          .map(element => ({
            tag: element.tagName,
            id: element.id,
            className: String(element.className || ""),
            background: getComputedStyle(element).backgroundColor,
          })),
        canvases: [...document.querySelectorAll("canvas")].map(canvas => {
          const rect = canvas.getBoundingClientRect();
          return {
            width: canvas.width,
            height: canvas.height,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          };
        }),
      },
    };
  }, FIRE_KEYS);
  const screenshotPath = path.join(outputDir, `${scenario}.png`);
  await page.screenshot({ path: screenshotPath });
  return { id: scenario, url, placement, screenshotPath, evidence };
}
function assertEvidence(scenarios, browserIssues) {
  const byId = Object.fromEntries(scenarios.map(entry => [entry.id, entry]));
  const production = byId.default?.evidence, rays = byId.rays?.evidence;
  const narrow = byId.narrow?.evidence, layered = byId.layered?.evidence;
  const legacy = byId.legacy?.evidence;
  if (production && !Object.values(production.textures).every(Boolean)) {
    throw new Error(`Default Fire Light textures missing: ${JSON.stringify(production.textures)}`);
  }
  if (
    production && (!production.fire.enabled
    || !production.fire.active
    || production.fire.raysRequested
    || production.fire.rays.visibleRayCount !== 0
    || !production.fire.eyeAdaptation.available
    || production.fire.presentationId !== "natural-fire-v1"
    || production.fire.renderer?.visibleLayerCount !== 1
    || production.fire.illuminationRequested
    || !production.fire.proceduralWorldGlow
    || production.shader.fireLightProceduralMix !== 0.96)
  ) {
    throw new Error(`Default Fire Light V3 evidence invalid: ${JSON.stringify(production)}`);
  }
  if (
    rays && (!rays.fire.enabled
    || !rays.fire.raysRequested
    || rays.fire.rays.visibleRayCount !== 6)
  ) {
    throw new Error(`Explicit ray evidence invalid: ${JSON.stringify(rays)}`);
  }
  if (
    narrow && (!narrow.fire.enabled
    || narrow.fire.raysRequested
    || narrow.fire.eyeAdaptationRequested
    || !narrow.fire.renderer.active)
  ) {
    throw new Error(`Narrow rollback evidence invalid: ${JSON.stringify(narrow)}`);
  }
  if (
    layered && (!layered.fire.enabled
    || layered.fire.presentationId !== "layered-fire-v3"
    || layered.fire.renderer?.visibleLayerCount !== 3
    || layered.fire.illumination?.visibleLayerCount !== 4
    || layered.fire.proceduralWorldGlow
    || layered.shader.fireLightProceduralMix !== 0.10)
  ) throw new Error(`Layered rollback evidence invalid: ${JSON.stringify(layered)}`);
  if (
    legacy && (legacy.fire.enabled
    || legacy.fire.disabledReason !== "legacy-query"
    || legacy.shader.fireLightProceduralMix !== 1)
  ) {
    throw new Error(`Legacy rollback evidence invalid: ${JSON.stringify(legacy)}`);
  }
  const fatal = browserIssues.filter(issue => (
    issue.startsWith("pageerror:")
    || issue.includes("Fatal error during setupScene")
    || issue.includes("/fire-light-v3/") && issue.startsWith("requestfailed:")
  ));
  if (fatal.length > 0) throw new Error(`Fatal browser issues: ${JSON.stringify(fatal)}`);
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
    args: ["--disable-background-timer-throttling",
      "--disable-renderer-backgrounding", "--use-angle=swiftshader"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
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
      if (response.url().includes("/fire-light-v3/")) {
        assetResponses.push({ status: response.status(), url: response.url() });
      }
    });

    const scenarios = [];
    const scenarioIds = argument("scenarios", "default,rays,narrow,layered,legacy")
      .split(",").filter(Boolean);
    for (const scenario of scenarioIds) {
      scenarios.push(await captureScenario(page, baseUrl, outputDir, scenario));
    }
    assertEvidence(scenarios, browserIssues);
    const report = {
      schema: "fire-light-v3-live-qa@1",
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
