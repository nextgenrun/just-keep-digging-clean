import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const URL = "http://127.0.0.1:8080/?jkd_e2e=1&renderQuality=balanced&demoInteractionQa=20260811";
const OUTPUT_DIR = "C:/tmp/dig-game-demo-interactions-live";
const DEBUG_PORT = 9486;

function browserExceptions(client) {
  return client.events
    .filter(event => event.method === "Runtime.exceptionThrown")
    .map(event => event.params);
}

function browserConsoleErrors(client) {
  return client.events
    .filter(event => (
      event.method === "Runtime.consoleAPICalled"
      && event.params?.type === "error"
    ))
    .map(event => ({
      type: event.params.type,
      args: (event.params.args || []).map(arg => (
        arg.value ?? arg.unserializableValue ?? arg.description ?? null
      )),
      stackTrace: event.params.stackTrace || null,
    }));
}

function assertAssetHealth(label, snapshot, maximumMiB) {
  assert.ok(snapshot, `${label} asset snapshot is missing`);
  assert.ok(
    snapshot.textureMemory.estimatedMiB <= maximumMiB,
    `${label} texture residency ${snapshot.textureMemory.estimatedMiB.toFixed(1)} MiB exceeds ${maximumMiB} MiB`,
  );
  assert.equal(snapshot.textureMemory.untrackedSourceCount, 0, `${label} has untracked texture sources`);
  assert.equal(snapshot.assetCatalog?.untrackedTextures, 0, `${label} has uncatalogued textures`);
  assert.equal(snapshot.assetCatalog?.blockedQueueAttempts, 0, `${label} queued gated assets`);
  assert.deepEqual(snapshot.assetCatalog?.gatedResidentOwners, [], `${label} retained gated owners`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({ port: DEBUG_PORT, width: 1280, height: 720 });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    await client.send("Page.navigate", { url: URL });
    await client.waitFor("Boolean(window.__phaserGame)", "Phaser game", 300000);
    await client.waitFor(
      "Boolean(window.__phaserGame.scene.getScenes(true).some(scene => ['MainMenuScene', 'StartMenuScene'].includes(scene.sys.settings.key)))",
      "main menu",
      300000,
    );
    await client.evaluate(`(() => {
      window.__phaserGame.scene.start("WorldLoadScene", {
        saveSlot: 1,
        worldIdentity: "demo-interactions-live-qa",
        isNewSave: true,
        tutorialChoice: "yes",
      });
      return true;
    })()`);
    await client.waitFor(
      "Boolean(window.__phaserGame.scene.isActive('PlayScene'))",
      "demo PlayScene",
      600000,
    );
    try {
      await client.waitFor(`(() => {
        const scene = window.__phaserGame.scene.getScene("PlayScene");
        return Boolean(
          scene?.gameState === "safe-paused"
          || (
            scene.campfireSystem
            && scene.starPillarSystem
            && scene.hudSystem
            && scene.runtimeAssetLoadCoordinator
          )
        );
      })()`, "initialized demo systems", 180000);
    } catch (error) {
      const diagnostics = await client.evaluate(`(() => {
        const scene = window.__phaserGame.scene.getScene("PlayScene");
        return {
          phase: scene?._setupPhase || null,
          timeline: scene?._setupTimeline || [],
          mode: scene?.gameState || null,
          activeScenes: window.__phaserGame.scene.getScenes(true)
            .map(active => active.sys.settings.key),
          assetLoader: scene?.runtimeAssetLoadCoordinator?.getSnapshot?.() || null,
          exceptions: ${JSON.stringify(browserExceptions(client))},
          consoleErrors: ${JSON.stringify(browserConsoleErrors(client))},
          uiErrors: [...(window.__jkdUiErrors || [])],
        };
      })()`);
      throw new Error(`Demo systems did not initialize: ${JSON.stringify(diagnostics)}`, {
        cause: error,
      });
    }
    const setupState = await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      return {
        phase: scene?._setupPhase || null,
        mode: scene?.gameState || null,
        timeline: scene?._setupTimeline || [],
      };
    })()`);
    if (setupState.mode === "safe-paused") {
      throw new Error(`PlayScene entered safe pause: ${JSON.stringify({
        ...setupState,
        exceptions: browserExceptions(client),
        consoleErrors: browserConsoleErrors(client),
      })}`);
    }
    await client.waitFor(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      const snapshot = scene.runtimeAssetLoadCoordinator?.getSnapshot?.();
      const settled = Boolean(
        snapshot
        && snapshot.queued === 0
        && snapshot.active === 0
        && scene.runtimeFeaturePrefetchSystem?.pendingRarities?.size === 0
      );
      if (!settled) {
        window.__jkdDemoSettledSince = 0;
        return false;
      }
      if (!window.__jkdDemoSettledSince) {
        window.__jkdDemoSettledSince = performance.now();
      }
      return performance.now() - window.__jkdDemoSettledSince >= 1500;
    })()`, "settled demo texture residency", 180000);

    const initial = await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      return {
        demoMode: scene.config.demoMode,
        actionBar: scene.celestialActionBarSystem?.getHealthSnapshot?.() || null,
        currency: scene.celestialCurrencyHudSystem?.getHealthSnapshot?.() || null,
        loadCoordinator: scene.runtimeAssetLoadCoordinator?.getSnapshot?.() || null,
        errors: [...(window.__jkdUiErrors || [])],
      };
    })()`);
    const hudScreenshot = path.join(OUTPUT_DIR, "demo-hud.png");
    await client.screenshot(hudScreenshot);

    await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      scene.campfireSystem._openBuffSelection();
      return scene.campfireSystem.isSelecting();
    })()`);
    await client.waitFor(
      "window.__phaserGame.scene.getScene('PlayScene').campfireSystem.isSelecting() === true",
      "Campfire UI",
      30000,
    );
    await delay(900);
    const campfire = await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      return {
        campfireOpen: scene.campfireSystem.isSelecting(),
        gameState: scene.gameState,
        loadCoordinator: scene.runtimeAssetLoadCoordinator?.getSnapshot?.() || null,
        errors: [...(window.__jkdUiErrors || [])],
      };
    })()`);
    const campfireScreenshot = path.join(OUTPUT_DIR, "campfire-open.png");
    await client.screenshot(campfireScreenshot);

    await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      scene.campfireSystem._closeBuffSelection();
      return scene.starPillarSystem.openConstellationView();
    })()`);
    let starWaitTimedOut = false;
    try {
      await client.waitFor(`(() => {
        const scene = window.__phaserGame.scene.getScene("PlayScene");
        return Boolean(
          scene.starPillarSystem?._talentTreeView
          || (
            scene.starPillarSystem?._isViewLoading === false
            && scene.starPillarSystem?._isViewOpen === false
          )
          || (window.__jkdUiErrors || []).length
        );
      })()`, "Star Pillar talent tree", 60000);
    } catch (_) {
      starWaitTimedOut = true;
    }
    await delay(1200);
    const starPillar = await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      const pillar = scene.starPillarSystem;
      return {
        gameState: scene.gameState,
        loading: pillar?._isViewLoading,
        open: pillar?._isViewOpen,
        health: pillar?.getTalentTreeHealthSnapshot?.() || null,
        featureProgress: scene.runtimeFeatureAssetManager?.getGroupProgress?.("starlight") || null,
        featureManager: scene.runtimeFeatureAssetManager?.getSnapshot?.() || null,
        loadCoordinator: scene.runtimeAssetLoadCoordinator?.getSnapshot?.() || null,
        starWaitTimedOut: ${starWaitTimedOut},
        errors: [...(window.__jkdUiErrors || [])],
      };
    })()`);
    const starPillarScreenshot = path.join(OUTPUT_DIR, "star-pillar-tree-open.png");
    await client.screenshot(starPillarScreenshot);

    const exceptions = browserExceptions(client);
    const consoleErrors = browserConsoleErrors(client);
    const report = {
      schema: "demo-interactions-live-qa@3",
      generatedUtc: new Date().toISOString(),
      initial,
      campfire,
      starPillar,
      exceptions,
      consoleErrors,
      screenshots: { hudScreenshot, campfireScreenshot, starPillarScreenshot },
    };
    const reportPath = path.join(OUTPUT_DIR, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(reportPath);

    assert.equal(initial.demoMode, true);
    assert.equal(initial.actionBar?.ready, true);
    assert.equal(initial.currency?.ready, true);
    assertAssetHealth("settled demo", initial.loadCoordinator, 640);
    assert.equal(campfire.campfireOpen, true);
    assertAssetHealth("Campfire churn", campfire.loadCoordinator, 704);
    assert.equal(starPillar.open, true);
    assert.equal(starPillar.loading, false);
    assert.equal(starPillar.health?.ready, true);
    assert.equal(starPillar.health?.nodeCount, 33);
    assert.equal(starPillar.health?.activeView?.nodeCount, 33);
    assert.ok(starPillar.health?.activeView?.connectorCount > 0);
    assertAssetHealth("Star Pillar churn", starPillar.loadCoordinator, 704);
    assert.deepEqual(starPillar.errors, []);
    assert.deepEqual(exceptions, []);
    assert.deepEqual(consoleErrors, []);
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
