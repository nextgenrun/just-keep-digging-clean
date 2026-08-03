import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";
import { TILE_TYPES } from "../values/tileTypes.js";

const URL = "http://127.0.0.1:8080/?jkd_e2e=1&renderQuality=ultra&regressionQa=20260803";
const OUTPUT_DIR = "C:/tmp/dig-game-player-progression-regressions-live";
const DEBUG_PORT = 9474;

const INITIAL_PROBE = [
  "(() => {",
  "  const scene = window.__phaserGame.scene.getScene('PlayScene');",
  "  const top = scene.config.topAirRows;",
  "  const barrier = scene.townSquareTutorialSystem?.getHealthSnapshot?.()?.townExitBarrier || null;",
  "  const portal = scene.firstSessionPortalSystem?.getHealthSnapshot?.() || null;",
  "  const cells = [-3, -2, -1].map(offset => ({",
  "    tx: 66,",
  "    ty: top + offset,",
  "    type: scene.worldModel.getTileType(66, top + offset),",
  "    solid: scene.worldModel.isSolid(66, top + offset),",
  "  }));",
  "  return {",
  "    tutorial: scene.retentionProgressSystem?.getTutorialState?.() || null,",
  "    barrier,",
  "    portal,",
  "    cells,",
  "    milestones: scene.systemIntroductionSystem?.isFeatureAvailable?.('milestones'),",
  "    upgrades: Object.fromEntries(['strength', 'bronzePickaxe', 'quickReflexes'].map(id => [",
  "      id, scene.systemIntroductionSystem?.isUpgradeAvailable?.(id),",
  "    ])),",
  "    errors: [...(window.__jkdUiErrors || [])],",
  "  };",
  "})()",
].join("\n");

const REPAIR_PROBE = [
  "(() => {",
  "  const scene = window.__phaserGame.scene.getScene('PlayScene');",
  "  const ty = scene.config.topAirRows - 2;",
  "  scene.worldModel.setTile(66, ty, 0, 0);",
  "  scene.worldRenderer?.applyTileUpdate?.(66, ty);",
  "  const before = scene.worldModel.getTileType(66, ty);",
  "  scene.townSquareTutorialSystem?.firstFive?.townExitBarrier?.sync?.();",
  "  const after = scene.worldModel.getTileType(66, ty);",
  "  window.__jkdE2E.forcePlayerState({ tx: 64, ty: scene.config.topAirRows - 1 });",
  "  return { before, after, solid: scene.worldModel.isSolid(66, ty) };",
  "})()",
].join("\n");

const PAUSE_PROBE = [
  "(() => {",
  "  const scene = window.__phaserGame.scene.getScene('PlayScene');",
  "  window.__jkdE2E.closeAll();",
  "  scene.showPauseMenu({ initialTabKey: 'titans' });",
  "  const state = scene._pausePanel?.state;",
  "  return {",
  "    tabKeys: [...(state?.tabKeys || [])],",
  "    activeTabKey: state?.tabKeys?.[state.activeTab] || null,",
  "    titanArchiveReady: Boolean(state?.titanArchive),",
  "    loading: Boolean(state?.featureLoadingView),",
  "  };",
  "})()",
].join("\n");

const TITAN_DIAGNOSTIC = [
  "(() => {",
  "  const scene = window.__phaserGame.scene.getScene('PlayScene');",
  "  const state = scene._pausePanel?.state;",
  "  const manager = scene.runtimeFeatureAssetManager;",
  "  return {",
  "    gameState: scene.gameState,",
  "    tabKeys: [...(state?.tabKeys || [])],",
  "    activeTabKey: state?.tabKeys?.[state.activeTab] || null,",
  "    pendingFeatureGroup: state?.pendingFeatureGroup || null,",
  "    activeFeatureGroup: state?.activeFeatureGroup || null,",
  "    loading: Boolean(state?.featureLoadingView),",
  "    titanArchiveReady: Boolean(state?.titanArchive),",
  "    progress: manager?.getGroupProgress?.('titan-archive') || null,",
  "    manager: manager?.getSnapshot?.() || null,",
  "    queue: scene.runtimeAssetLoadCoordinator?.getSnapshot?.() || null,",
  "    errors: [...(window.__jkdUiErrors || [])],",
  "  };",
  "})()",
].join("\n");

const COMPLETE_TUTORIAL = [
  "(() => {",
  "  const scene = window.__phaserGame.scene.getScene('PlayScene');",
  "  const retention = scene.retentionProgressSystem;",
  "  window.__jkdE2E.closeAll();",
  "  retention.recordTutorialMovement(2);",
  "  retention.recordMiningResult({ success: true, destroyed: true, resourceType: 'dirt', resourceAmount: 1 });",
  "  retention.claimTutorialFlightTraining();",
  "  retention.recordTutorialFlight();",
  "  retention.recordPortalActivated('QA Return Gate');",
  "  retention.recordSale(1, 1);",
  "  retention.recordTutorialPortalResume();",
  "  scene.townSquareTutorialSystem?.firstFive?.townExitBarrier?.sync?.();",
  "  return retention.getTutorialState();",
  "})()",
].join("\n");

const BACKDROP_PROBE = [
  "(() => {",
  "  const scene = window.__phaserGame.scene.getScene('PlayScene');",
  "  const stage = scene.worldRenderer?.depthBackdropStage;",
  "  const segments = [...(stage?.segments?.values?.() || [])].map(segment => ({",
  "    assetKey: segment.asset?.key || null,",
  "    requestedAssetKey: segment.requestedAssetKey || null,",
  "    visible: segment.backwall?.visible !== false,",
  "    alpha: Number(segment.backwall?.alpha || 0),",
  "  }));",
  "  return {",
  "    playerTile: scene.playerController?.getPlayerTile?.() || null,",
  "    segmentCount: segments.length,",
  "    segments,",
  "    errors: [...(window.__jkdUiErrors || [])],",
  "  };",
  "})()",
].join("\n");

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({ port: DEBUG_PORT, width: 1600, height: 900 });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    await client.send("Page.navigate", { url: URL });
    await client.waitFor("Boolean(window.__phaserGame)", "Phaser game", 180000);
    await client.waitFor(
      "Boolean(window.__phaserGame.scene.getScenes(true).some(scene => ['MainMenuScene', 'StartMenuScene'].includes(scene.sys.settings.key)))",
      "main menu",
      300000,
    );
    await client.evaluate([
      "(() => {",
      "  window.__phaserGame.scene.start('WorldLoadScene', {",
      "    saveSlot: 1,",
      "    worldIdentity: 'player-progression-regressions-live',",
      "    isNewSave: true,",
      "    tutorialChoice: 'yes',",
      "  });",
      "  return true;",
      "})()",
    ].join("\n"));
    await client.waitFor(
      "Boolean(window.__jkdE2E && window.__phaserGame.scene.isActive('PlayScene'))",
      "tutorial PlayScene",
      300000,
    );
    await delay(3500);

    const initial = await client.evaluate(INITIAL_PROBE);
    assert.equal(initial.tutorial.choice, "yes");
    assert.equal(initial.tutorial.stage, "move");
    assert.equal(initial.barrier.active, true);
    assert.equal(initial.cells.length, 3);
    assert.ok(initial.cells.every(cell => cell.type === TILE_TYPES.BEDROCK && cell.solid));
    assert.equal(initial.portal.ready, true);
    assert.equal(initial.portal.tile.depth, 15);
    assert.equal(initial.portal.tile.ty, initial.cells[0].ty + 18);
    assert.equal(initial.milestones, true);
    assert.equal(initial.upgrades.strength, true);
    assert.equal(initial.upgrades.bronzePickaxe, true);
    assert.equal(initial.upgrades.quickReflexes, false);
    assert.deepEqual(initial.errors, []);

    const repaired = await client.evaluate(REPAIR_PROBE);
    assert.equal(repaired.before, TILE_TYPES.AIR);
    assert.equal(repaired.after, TILE_TYPES.BEDROCK);
    assert.equal(repaired.solid, true);
    await delay(1800);
    const wallScreenshot = path.join(OUTPUT_DIR, "tutorial-bedrock-wall.png");
    await client.screenshot(wallScreenshot);

    const pause = await client.evaluate(PAUSE_PROBE);
    assert.equal(pause.tabKeys.includes("talents"), false);
    assert.equal(pause.tabKeys.includes("titans"), true);
    assert.equal(pause.activeTabKey, "titans");
    assert.equal(pause.titanArchiveReady, true);
    assert.equal(pause.loading, false);
    await delay(1200);
    const titanDiagnostic = await client.evaluate(TITAN_DIAGNOSTIC);
    assert.equal(titanDiagnostic.activeTabKey, "titans");
    assert.equal(titanDiagnostic.titanArchiveReady, true);
    assert.equal(titanDiagnostic.loading, false);
    assert.equal(titanDiagnostic.progress.ready, true);
    const titanScreenshot = path.join(OUTPUT_DIR, "escape-titan-archive.png");
    await client.screenshot(titanScreenshot);

    const completed = await client.evaluate(COMPLETE_TUTORIAL);
    assert.equal(completed.stage, "complete");
    for (let index = 0; index < 3; index += 1) {
      await client.evaluate(
        "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'PageDown', ctrlKey: true, altKey: true, bubbles: true }))",
      );
      await delay(900);
    }
    await client.waitFor(
      "Boolean(window.__phaserGame.scene.getScene('PlayScene')?.worldRenderer?.depthBackdropStage?.segments?.size)",
      "deep backdrop segments",
      120000,
    );
    await delay(4500);
    const backdrop = await client.evaluate(BACKDROP_PROBE);
    assert.ok(backdrop.playerTile.ty >= 700);
    assert.ok(backdrop.segmentCount > 0);
    assert.ok(backdrop.segments.every(segment => (
      segment.assetKey && segment.requestedAssetKey && segment.visible && segment.alpha > 0
    )));
    assert.deepEqual(backdrop.errors, []);
    const backdropScreenshot = path.join(OUTPUT_DIR, "depth-700m-backdrop.png");
    await client.screenshot(backdropScreenshot);

    const browserErrors = client.events
      .filter(event => event.method === "Runtime.exceptionThrown")
      .map(event => event.params);
    assert.deepEqual(browserErrors, []);
    const report = {
      schema: "player-progression-regressions-live-qa@1",
      generatedUtc: new Date().toISOString(),
      initial,
      repaired,
      pause,
      titanDiagnostic,
      completed,
      backdrop,
      screenshots: {
        wallScreenshot,
        titanScreenshot,
        backdropScreenshot,
      },
      browserErrors,
    };
    const reportPath = path.join(OUTPUT_DIR, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(reportPath);
  } finally {
    try {
      await Promise.race([client?.send("Browser.close"), delay(1500)]);
    } catch (_) {
      edge.kill();
    }
    client?.close();
    edge.kill();
  }
}

await main();
