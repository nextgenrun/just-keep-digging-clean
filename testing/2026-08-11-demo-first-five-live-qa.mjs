import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const URL = "http://127.0.0.1:8080/?jkd_e2e=1&recoveryQa=20260811-first-five";
const OUTPUT_DIR = path.resolve("tmp/2026-08-11-demo-first-five-live-qa");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const errors = [];
const warnings = [];
const consoleTail = [];
const browser = await chromium.launch({
  executablePath: EDGE,
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
  });
  const page = await context.newPage();
  page.on("console", message => {
    consoleTail.push(`${message.type()}:${message.text()}`);
    if (consoleTail.length > 120) consoleTail.shift();
    if (message.type() === "error") errors.push(`console:${message.text()}`);
    if (message.type() === "warning") warnings.push(message.text());
  });
  page.on("pageerror", error => errors.push(`pageerror:${error.stack || error.message}`));
  page.on("requestfailed", request => {
    errors.push(`requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`);
  });
  page.on("response", response => {
    if (response.status() >= 400) errors.push(`response:${response.status()}:${response.url()}`);
  });

  await page.goto(URL, { waitUntil: "commit", timeout: 30_000 });
  await page.waitForFunction(
    () => window.__phaserGame?.scene?.isActive?.("MainMenuScene"),
    null,
    { timeout: 600_000 },
  );
  await page.waitForTimeout(700);
  await page.mouse.click(640, 330);
  await page.waitForFunction(
    () => window.__phaserGame?.scene?.isActive?.("StartMenuScene"),
    null,
    { timeout: 180_000 },
  );
  await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("StartMenuScene");
    scene._selectSlot(1);
    scene._startGame();
  });
  await page.waitForFunction(
    () => window.__phaserGame.scene.getScene("StartMenuScene")?._newRunSetup?.isVisible,
    null,
    { timeout: 30_000 },
  );
  const selection = await page.evaluate(() => {
    const overlay = window.__phaserGame.scene.getScene("StartMenuScene")._newRunSetup;
    return {
      mode: overlay.mode,
      tutorialChoice: overlay.tutorialChoice,
      confirmed: overlay._confirm(),
    };
  });
  assert.deepEqual(selection, {
    mode: "hardcore",
    tutorialChoice: "yes",
    confirmed: true,
  });

  try {
    await page.waitForFunction(
      () => window.__phaserGame?.scene?.isActive?.("PlayScene"),
      null,
      { timeout: 180_000 },
    );
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const game = window.__phaserGame;
      const worldLoad = game?.scene?.getScene?.("WorldLoadScene");
      const loader = worldLoad?.load;
      return {
        activeScenes: game?.scene?.getScenes?.(true)?.map(scene => scene.sys.settings.key) || [],
        worldLoad: worldLoad ? {
          active: game.scene.isActive("WorldLoadScene"),
          startedPlayScene: worldLoad._startedPlayScene,
          loader: {
            isLoading: loader?.isLoading?.(),
            progress: loader?.progress,
            totalToLoad: loader?.totalToLoad,
            totalComplete: loader?.totalComplete,
            totalFailed: loader?.totalFailed,
            inflight: loader?.inflight?.size,
            queue: loader?.queue?.size,
            list: loader?.list?.size,
          },
        } : null,
        uiErrors: [...(window.__jkdUiErrors || [])],
      };
    });
    throw new Error(`PlayScene launch timed out: ${JSON.stringify({ diagnostics, errors, consoleTail })}`, {
      cause: error,
    });
  }
  await page.waitForFunction(
    () => Boolean(
      window.__phaserGame.scene.getScene("PlayScene")?.retentionProgressSystem
      && window.__phaserGame.scene.getScene("PlayScene")?.hudSystem?.quickControls,
    ),
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(1500);

  const initial = await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    return {
      tutorial: scene.retentionProgressSystem.getTutorialState(),
      hardcore: { ...scene.hardcoreModeData },
      barrier: scene.townSquareTutorialSystem?.getHealthSnapshot?.()?.townExitBarrier || null,
      hud: scene.hudSystem.quickControls.getHealthSnapshot(),
      promiseHud: scene.nextPromiseHudSystem?.getHealthSnapshot?.() || null,
      starterSite: {
        aboveType: scene.worldModel.getTileType(12, scene.config.topAirRows - 1),
        groundType: scene.worldModel.getTileType(12, scene.config.topAirRows),
        legacySquareVisible: scene.worldRenderer?.tutorialTileVisual?.visible === true,
      },
      townPillar: (() => {
        const visual = scene.starPillarSystem?._townWorldVisual?.pillar;
        const image = visual?.getImage?.();
        const centerX = scene.starPillarSystem?._townPillarCenterX || 0;
        const baseY = scene.starPillarSystem?._townPillarBaseY || 0;
        const tileSize = scene.config.tileSize;
        return {
          active: image?.active === true,
          textureKey: image?.texture?.key || null,
          width: image?.displayWidth || 0,
          height: image?.displayHeight || 0,
          stageTextures: (visual?.stageKeys || []).map(key => ({
            key,
            exists: scene.textures.exists(key),
            sourceWidth: scene.textures.get(key)?.getSourceImage?.()?.width || 0,
            sourceHeight: scene.textures.get(key)?.getSourceImage?.()?.height || 0,
          })),
          nearbyDisplayObjects: scene.children.list
            .filter(object => (
              object?.visible !== false
              && Math.abs((object.x || 0) - centerX) <= tileSize * 1.5
              && (object.y || 0) >= baseY - tileSize * 2.5
              && (object.y || 0) <= baseY + tileSize * 0.75
            ))
            .map(object => ({
              type: object.type || object.constructor?.name || null,
              name: object.name || null,
              textureKey: object.texture?.key || null,
              frameName: object.frame?.name ?? null,
              x: object.x || 0,
              y: object.y || 0,
              width: object.displayWidth || object.width || 0,
              height: object.displayHeight || object.height || 0,
              depth: object.depth || 0,
              alpha: object.alpha,
            })),
          nearbyTiles: Array.from({ length: 5 }, (_, dx) => dx - 2).flatMap(dx => (
            Array.from({ length: 5 }, (_, dy) => dy - 3).map(dy => ({
              tx: Math.floor(scene.starPillarSystem._townPillarTileX) + dx,
              ty: scene.config.topAirRows + dy,
              type: scene.worldModel.getTileType(
                Math.floor(scene.starPillarSystem._townPillarTileX) + dx,
                scene.config.topAirRows + dy,
              ),
            }))
          )),
        };
      })(),
    };
  });
  assert.equal(initial.tutorial.choice, "yes");
  assert.equal(initial.tutorial.stage, "move");
  assert.equal(initial.hardcore.mode, "hardcore");
  assert.equal(initial.hardcore.livesRemaining, 2);
  assert.equal(initial.hardcore.freeReviveAvailable, true);
  assert.equal(initial.barrier.active, true);
  assert.equal(initial.starterSite.aboveType, 0);
  assert.equal(initial.starterSite.groundType, 1);
  assert.equal(initial.starterSite.legacySquareVisible, false);
  assert.equal(initial.hud.active, true);
  assert.equal(initial.hud.inventory.keyLabel, "I");
  assert.equal(Math.round(initial.hud.inventory.width), 94);
  assert.equal(Math.round(initial.hud.inventory.height), 94);
  assert.equal(initial.hud.pause.active, true);
  assert.equal(initial.hud.pause.label, "Esc  MENU");
  assert.equal(Math.round(initial.hud.pause.width), 154);
  assert.equal(Math.round(initial.hud.pause.height), 36);
  assert.equal(initial.promiseHud.visible, true);
  assert.equal(initial.promiseHud.textureKey, "opening-flight-v2-objective-hud-frame");
  assert.match(initial.promiseHud.promise, /STEP 1.*WALK TO THE MARKED GROUND/);
  assert.ok(initial.promiseHud.y + initial.promiseHud.height < 647);
  assert.equal(initial.townPillar.active, true);
  assert.ok(initial.townPillar.textureKey?.startsWith("environment-star-pillar-stage-"));
  assert.ok(initial.townPillar.stageTextures.every(texture => (
    texture.exists && texture.sourceWidth > 64 && texture.sourceHeight > 64
  )));

  const screenshot = path.join(OUTPUT_DIR, "guided-opening-live.png");
  await page.screenshot({ path: screenshot, timeout: 120_000 });

  const route = await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const retention = scene.retentionProgressSystem;
    const barrier = scene.townSquareTutorialSystem?.firstFive?.townExitBarrier;
    const snapshots = [];
    const capture = label => {
      barrier?.sync?.();
      const barrierState = scene.townSquareTutorialSystem
        ?.getHealthSnapshot?.()?.townExitBarrier;
      snapshots.push({
        label,
        stage: retention.getTutorialState().stage,
        barrierActive: barrierState?.active === true,
      });
    };
    capture("initial");
    retention.recordTutorialMovement(2);
    capture("move");
    retention.recordMiningResult({
      success: true,
      destroyed: true,
      resourceType: "dirt",
      resourceAmount: 1,
    });
    capture("dig");
    retention.claimTutorialFlightTraining();
    retention.recordTutorialFlight();
    capture("flight");
    retention.recordPortalActivated("QA Return Gate");
    capture("portal");
    retention.recordSale(1, 1);
    capture("sell");
    retention.recordUpgrade("QA Upgrade", { upgradeId: "agility" });
    capture("upgrade");
    retention.recordTutorialPortalResume();
    capture("resume");
    return snapshots;
  });
  assert.deepEqual(
    route.map(entry => entry.stage),
    ["move", "dig", "flight", "portal", "sell", "upgrade", "resume", "complete"],
  );
  assert.deepEqual(
    route.map(entry => entry.barrierActive),
    [true, true, true, true, false, false, false, false],
  );
  assert.deepEqual(errors, []);

  const report = {
    schema: "demo-first-five-live-qa@1",
    generatedUtc: new Date().toISOString(),
    url: URL,
    selection,
    initial,
    route,
    warnings,
    errors,
    screenshot,
  };
  const reportPath = path.join(OUTPUT_DIR, "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(reportPath);
} finally {
  await browser.close();
}
