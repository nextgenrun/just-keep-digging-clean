// Captures default-versus-rollback landmark views and records browser/runtime evidence in an isolated Edge profile.
import fs from "node:fs";
import path from "node:path";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const DEFAULT_OUTPUT_DIR = path.resolve(
  "tmp/surface-hero-landmarks-v4-live",
);
const DEFAULT_BASE_URL = "http://127.0.0.1:8090/";
const DEBUG_PORT = 9384;
const CAPTURES = Object.freeze([
  Object.freeze({ id: "arrival-forge", tx: 155.2, showPortal: false }),
  Object.freeze({ id: "caravan-rest", tx: 166.5, showPortal: false }),
  Object.freeze({ id: "starwell", tx: 188, showPortal: true }),
  Object.freeze({ id: "timberwright", tx: 207.6, showPortal: false }),
  Object.freeze({ id: "observatory", tx: 229.8, showPortal: false }),
  Object.freeze({ id: "frontier-survey", tx: 248.4, showPortal: false }),
  Object.freeze({ id: "three-kings", tx: 262.8, showPortal: false }),
]);
const HERO_TEXTURE_KEYS = Object.freeze([
  "surface-hero-arrival-forge-shelter-v4",
  "surface-hero-caravan-waystation-v4",
  "surface-hero-starwell-portal-frame-v4",
  "surface-hero-timberwright-yard-v4",
  "surface-hero-observatory-telescope-v4",
  "surface-hero-frontier-survey-pavilion-v4",
  "surface-hero-three-kings-overlook-v4",
]);


function argument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find(value => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function scenarioUrl(baseUrl, rollback) {
  const url = new URL(baseUrl);
  url.searchParams.set("jkd_e2e", "1");
  if (rollback) url.searchParams.set("surfaceHeroLandmarksV4", "0");
  return url.href;
}

async function launchPlayScene(client) {
  await client.waitFor(
    `Boolean(
      window.__phaserGame
      && window.__phaserGame.scene
      && window.__phaserGame.scene.getScenes(true).some(
        scene => ["MainMenuScene", "StartMenuScene"].includes(scene.sys.settings.key)
      )
    )`,
    "main menu",
    120000,
  );
  await client.evaluate(`(() => {
    const game = window.__phaserGame;
    if (game.scene.isActive("PlayScene")) return "already-active";
    game.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "surface-hero-landmarks-v4-live-qa",
      isNewSave: true,
      tutorialChoice: "no",
    });
    return "launched";
  })()`);
  try {
    await client.waitFor(
      `Boolean(
        window.__jkdE2E
        && window.__phaserGame?.scene?.isActive("PlayScene")
        && window.__phaserGame.scene.getScene("PlayScene")?.worldRenderer
      )`,
      "PlayScene and save-safe harness",
      180000,
    );
  } catch (error) {
    const diagnostic = await client.evaluate(`(() => ({
      activeScenes: window.__phaserGame?.scene?.getScenes(true)?.map(
        scene => scene.sys.settings.key,
      ) || [],
      allScenes: window.__phaserGame?.scene?.scenes?.map(scene => ({
        key: scene.sys.settings.key,
        status: scene.sys.settings.status,
        loaderLoading: scene.load?.isLoading?.() || false,
        loaderProgress: scene.load?.progress,
      })) || [],
      health: window.__jkdHealth?.snapshot?.() || null,
      uiErrors: [...(window.__jkdUiErrors || [])],
    }))()`);
    throw new Error(`${error.message}\n${JSON.stringify(diagnostic, null, 2)}`);
  }
  await delay(1500);
}

async function captureLocation(client, outputDir, scenarioId, target) {
  const placement = await client.evaluate(`(() => {
    const game = window.__phaserGame;
    const scene = game.scene.getScene("PlayScene");
    const tx = ${target.tx};
    const ty = scene.config.topAirRows - 1;
    window.__jkdE2E.closeAll();
    window.__jkdE2E.forcePlayerState({ tx, ty });
    scene.weatherSystem?.forceWeather?.("clear", 0, 600000);
    scene.v11SkyIslandVisualSystem?.setGroundPortalUnlocked?.(
      2,
      ${target.showPortal ? "true" : "false"},
    );
    const camera = scene.cameras.main;
    camera.stopFollow();
    camera.centerOn(
      tx * scene.config.tileSize,
      (scene.config.topAirRows - 3.2) * scene.config.tileSize,
    );
    scene.worldRenderer.updateRenderWindow({ tx, ty });
    return {
      tx,
      ty,
      playerX: scene.player?.x,
      playerY: scene.player?.y,
      cameraX: camera.scrollX,
      cameraY: camera.scrollY,
    };
  })()`);
  // Teleporting is intentionally harsher than normal walking. Give the scenic
  // demand queue time to replace its opaque fallback before evidence capture.
  await delay(6500);
  const screenshotPath = path.join(
    outputDir,
    `${scenarioId}-${target.id}.png`,
  );
  await client.screenshot(screenshotPath);
  const runtime = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const heroLayer = scene.worldRenderer?.surfaceHeroLandmarkLayer;
    return {
      activeHeroSprites: heroLayer
        ? [...heroLayer.active.entries()].map(([id, sprite]) => ({
          id,
          x: sprite.x,
          y: sprite.y,
          depth: sprite.depth,
          alpha: sprite.alpha,
          width: sprite.displayWidth,
          height: sprite.displayHeight,
          distance: sprite.getData?.("surfaceHeroLandmarkDistance"),
          fadePercent: sprite.getData?.("surfaceHeroLandmarkFadePercent"),
          staticTransform: sprite.getData?.("surfaceHeroLandmarkStaticTransform"),
        }))
        : [],
      hero: window.__jkdSurfaceHeroLandmarksV4?.snapshot?.() || null,
      retained: window.__jkdSurfaceProps?.snapshot?.() || null,
      expansion: window.__jkdSurfacePropsV3?.snapshot?.() || null,
      health: window.__jkdHealth?.snapshot?.() || null,
      uiErrors: [...(window.__jkdUiErrors || [])],
      heroTextures: ${JSON.stringify(HERO_TEXTURE_KEYS)}.map(key => ({
        key,
        loaded: scene.textures.exists(key),
      })),
    };
  })()`);
  return {
    id: target.id,
    screenshotPath,
    placement,
    runtime,
  };
}

async function runScenario(client, outputDir, baseUrl, rollback) {
  const scenarioId = rollback ? "rollback" : "default";
  const url = scenarioUrl(baseUrl, rollback);
  await client.send("Page.navigate", { url });
  try {
    await client.waitFor(
      `document.readyState === "complete" && Boolean(window.__phaserGame)`,
      `${scenarioId} game boot`,
      30000,
    );
  } catch (error) {
    const browserErrors = client.events.filter(event => (
      event.method === "Runtime.exceptionThrown"
      || event.method === "Log.entryAdded"
    ));
    throw new Error(`${error.message}\n${JSON.stringify(browserErrors, null, 2)}`);
  }
  await launchPlayScene(client);
  const captures = [];
  for (const target of CAPTURES) {
    captures.push(await captureLocation(
      client,
      outputDir,
      scenarioId,
      target,
    ));
  }
  return { id: scenarioId, url, captures };
}

async function main() {
  const outputDir = path.resolve(argument("output", DEFAULT_OUTPUT_DIR));
  const baseUrl = argument("url", DEFAULT_BASE_URL);
  fs.mkdirSync(outputDir, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({
    edgePath: argument("edge", ""),
    port: DEBUG_PORT,
  });

  let client = null;
  try {
    const webSocketUrl = await waitForTarget(DEBUG_PORT);
    client = await new CdpClient(webSocketUrl).connect();
    const defaultScenario = await runScenario(
      client,
      outputDir,
      baseUrl,
      false,
    );
    const rollbackScenario = await runScenario(
      client,
      outputDir,
      baseUrl,
      true,
    );
    const report = {
      schema: "surface-hero-landmarks-v4-live-qa@1",
      generatedUtc: new Date().toISOString(),
      viewport: { width: 1600, height: 900 },
      scenarios: [defaultScenario, rollbackScenario],
      browserEvents: client.events
        .filter(event => (
          event.method === "Runtime.exceptionThrown"
          || event.method === "Log.entryAdded"
        ))
        .map(event => event.params),
    };
    const reportPath = path.join(outputDir, "live-qa-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(reportPath);
  } finally {
    try {
      await client?.send("Browser.close");
    } catch (_) {
      edge.kill();
    }
    client?.close();
    edge.kill();
  }
}

await main();
