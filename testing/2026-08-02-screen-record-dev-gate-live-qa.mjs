// Verifies the development-side recorder gate in a real browser without
// depending on PlayScene/world-load health.
import {
  CdpClient,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const GAME_URL = process.argv.find(value => value.startsWith("--url="))
  ?.slice("--url=".length)
  || "http://127.0.0.1:8080/?jkd_e2e=1&nativeDensity=0";
const DEBUG_PORT = 9481;

async function main() {
  const edge = launchSurfaceHeroQaEdge({
    port: DEBUG_PORT,
    width: 1280,
    height: 720,
  });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    await client.send("Page.navigate", { url: GAME_URL });
    await client.waitFor(`Boolean(
      window.__phaserGame?.scene
      && window.__phaserGame.scene.getScenes(true).some(
        scene => ["MainMenuScene", "StartMenuScene"].includes(scene.scene.key)
      )
    )`, "game menu", 180000);

    const state = await client.evaluate(`(async () => {
      const { GAME_CONFIG } = await import("/values/gameConfig.js");
      const { KEYBIND_ACTIONS, createDefaultKeybinds } = await import(
        "/values/keybindActions.js"
      );
      const { ScreenRecordSystem } = await import(
        "/systems/visual/ScreenRecordSystem.js"
      );
      const originalPrompt = globalThis.prompt;
      let prompted = false;
      globalThis.prompt = () => {
        prompted = true;
        return null;
      };
      const toggleResult = await new ScreenRecordSystem(null).toggle();
      globalThis.prompt = originalPrompt;
      return {
        productionMarker: globalThis.__DIG_GAME_PRODUCTION__ === true,
        debugMode: GAME_CONFIG.debugMode,
        preserveDrawingBuffer: GAME_CONFIG.rendererQuality.preserveDrawingBuffer,
        screenRecordAction: KEYBIND_ACTIONS.find(action => action.id === "screenRecord") || null,
        defaultScreenRecordKey: createDefaultKeybinds().screenRecord || null,
        prompted,
        toggleResult,
      };
    })()`);

    if (
      state.productionMarker
      || state.debugMode !== true
      || state.preserveDrawingBuffer !== true
      || state.screenRecordAction?.devOnly !== true
      || state.defaultScreenRecordKey !== "F9"
      || state.prompted !== true
      || state.toggleResult !== false
    ) {
      throw new Error(`Development recorder gate failed: ${JSON.stringify(state)}`);
    }

    const browserErrors = client.events.filter(event => (
      event.method === "Runtime.exceptionThrown"
      || (
        event.method === "Log.entryAdded"
        && event.params?.entry?.level === "error"
        && !String(event.params.entry.url || "").endsWith("/favicon.ico")
      )
    ));
    if (browserErrors.length) {
      throw new Error(`Browser errors: ${JSON.stringify(browserErrors)}`);
    }

    console.log(JSON.stringify({ status: "pass", url: GAME_URL, state }, null, 2));
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
