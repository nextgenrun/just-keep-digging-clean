import assert from "node:assert/strict";
import fs from "node:fs";

import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const URL = "http://127.0.0.1:8080/?jkd_e2e=1&demoRouteMatrix=20260812";
const OUTPUT = "C:/tmp/dig-game-demo-route-matrix-live/report.json";
const DEBUG_PORT = 9487;
const routes = [
  { id: "casual-guided", mode: "casual", tutorialChoice: "yes", stage: "move" },
  { id: "casual-skip", mode: "casual", tutorialChoice: "no", stage: "skipped" },
  { id: "hardcore-guided", mode: "hardcore", tutorialChoice: "yes", stage: "move" },
  { id: "hardcore-skip", mode: "hardcore", tutorialChoice: "no", stage: "skipped" },
];
const selectedRoutes = routes.slice(0, Math.max(
  1,
  Math.min(routes.length, Math.floor(Number(process.argv[2]) || routes.length)),
));

fs.mkdirSync("C:/tmp/dig-game-demo-route-matrix-live", { recursive: true });
const edge = launchSurfaceHeroQaEdge({ port: DEBUG_PORT, width: 1280, height: 720 });
let client = null;
const results = [];
try {
  client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
  await client.send("Page.navigate", { url: URL });
  await client.waitFor("Boolean(window.__phaserGame)", "Phaser game", 300000);
  await client.waitFor(
    "Boolean(window.__phaserGame.scene.getScenes(true).some(scene => ['MainMenuScene', 'StartMenuScene'].includes(scene.sys.settings.key)))",
    "main menu",
    300000,
  );

  for (let index = 0; index < selectedRoutes.length; index += 1) {
    const route = selectedRoutes[index];
    await client.evaluate(`(() => {
      window.__jkdUiErrors = [];
      const data = {
        saveSlot: ${index + 1},
        worldIdentity: ${JSON.stringify(`demo-route-${route.id}`)},
        isNewSave: true,
        tutorialChoice: ${JSON.stringify(route.tutorialChoice)},
        hardcoreModeData: {
          mode: ${JSON.stringify(route.mode)},
          armed: false,
          selectedAt: 1,
        },
      };
      if (${index} === 0) {
        window.__phaserGame.scene.start("WorldLoadScene", data);
      } else {
        window.__phaserGame.scene.getScene("PlayScene").scene.restart(data);
      }
      return true;
    })()`);
    await client.waitFor(
      "Boolean(window.__phaserGame.scene.isActive('PlayScene'))",
      `${route.id} PlayScene`,
      600000,
    );
    try {
      await client.waitFor(`(() => {
        const scene = window.__phaserGame.scene.getScene("PlayScene");
        return Boolean(
          scene?._setupPhase === "ready"
          && scene?.saveSlot === ${index + 1}
          && scene?.retentionProgressSystem
          && scene?.runtimeAssetLoadCoordinator
        );
      })()`, `${route.id} runtime`, 60000);
    } catch (error) {
      const diagnostics = await client.evaluate(`(() => {
        const game = window.__phaserGame;
        const play = game.scene.getScene("PlayScene");
        const worldLoad = game.scene.getScene("WorldLoadScene");
        return {
          activeScenes: game.scene.getScenes(true).map(scene => scene.sys.settings.key),
          play: {
            active: game.scene.isActive("PlayScene"),
            phase: play?._setupPhase,
            timeline: play?._setupTimeline,
            saveSlot: play?.saveSlot,
            gameState: play?.gameState,
          },
          worldLoad: {
            active: game.scene.isActive("WorldLoadScene"),
            startedPlayScene: worldLoad?._startedPlayScene,
            loaderActive: worldLoad?.load?.isLoading?.(),
          },
          healthFindings: window.__jkdHealth?.snapshot?.()?.findings || [],
          errors: [...(window.__jkdUiErrors || [])],
        };
      })()`);
      const browserDiagnostics = client.events
        .filter(event => (
          event.method === "Runtime.exceptionThrown"
          || (
            event.method === "Runtime.consoleAPICalled"
            && event.params?.type === "error"
          )
        ))
        .slice(-10)
        .map(event => ({
          method: event.method,
          type: event.params?.type || null,
          exception: event.params?.exceptionDetails?.exception?.description
            || event.params?.exceptionDetails?.text
            || null,
          args: (event.params?.args || []).map(arg => (
            arg.value ?? arg.unserializableValue ?? arg.description ?? null
          )),
          stack: event.params?.stackTrace?.callFrames?.slice(0, 6) || [],
        }));
      throw new Error(`${route.id} setup diagnostics: ${JSON.stringify({
        diagnostics,
        browserDiagnostics,
      })}`, {
        cause: error,
      });
    }
    await delay(350);
    const snapshot = await client.evaluate(`(() => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      return {
        mode: scene.hardcoreModeData?.mode,
        lives: scene.hardcoreModeData?.livesRemaining,
        tutorial: scene.retentionProgressSystem.getTutorialState(),
        barrier: scene.townSquareTutorialSystem?.getHealthSnapshot?.()?.townExitBarrier || null,
        demoMode: scene.gameplayCapabilities?.demoMode,
        gameState: scene.gameState,
        errors: [...(window.__jkdUiErrors || [])],
        assets: scene.runtimeAssetLoadCoordinator.getSnapshot(),
      };
    })()`);
    assert.equal(snapshot.mode, route.mode);
    assert.equal(snapshot.tutorial.choice, route.tutorialChoice);
    assert.equal(snapshot.tutorial.stage, route.stage);
    assert.equal(snapshot.barrier?.active, route.tutorialChoice === "yes");
    assert.equal(snapshot.lives, route.mode === "hardcore" ? 2 : null);
    assert.equal(snapshot.demoMode, true);
    assert.notEqual(snapshot.gameState, "safe-paused");
    assert.deepEqual(snapshot.errors, []);
    assert.equal(snapshot.assets.assetCatalog?.blockedQueueAttempts, 0);
    assert.deepEqual(snapshot.assets.assetCatalog?.gatedResidentOwners, []);
    results.push({ id: route.id, snapshot });
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify({
    schema: "demo-route-matrix-live-qa@1",
    generatedUtc: new Date().toISOString(),
    results,
  }, null, 2)}\n`);
  console.log(OUTPUT);
} finally {
  try {
    await Promise.race([client?.send("Browser.close"), delay(1500)]);
  } catch (_) {
    edge.kill();
  }
  client?.close();
  edge.kill();
}
