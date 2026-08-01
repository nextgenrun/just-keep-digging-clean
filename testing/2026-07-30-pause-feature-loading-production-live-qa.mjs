// Hidden-Edge QA for real ESC > Talents loading, cancellation, and reopen.
import fs from "node:fs";
import path from "node:path";
import {
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";
import { getRuntimeFeatureAssetGroup } from
  "../world/rendering/runtimeFeatureAssetGroups.js";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const GAME_URL = process.argv.find(value => value.startsWith("--url="))
  ?.slice("--url=".length)
  || "http://127.0.0.1:8090/";
const OUTPUT_DIR = process.argv.find(value => value.startsWith("--output="))
  ?.slice("--output=".length)
  || "visual-approval-previews/pause-feature-loading-v1";
const DEBUG_PORT = 9395;
const GROUP_ID = RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight;
const GROUP = getRuntimeFeatureAssetGroup(GROUP_ID);
const GROUP_KEYS = GROUP.assets.map(asset => asset.key);
const PRELOADED_CREST_KEY = "ui-starlight-modal-crest-v2";

function buildUrl() {
  const url = new URL(GAME_URL);
  url.searchParams.set("jkd_e2e", "1");
  url.searchParams.set("runtimeAssetQueue", "1");
  url.searchParams.set("runtimeFeatureAssets", "1");
  return url.href;
}

function browserErrors(client) {
  return client.events.filter(event => (
    event.method === "Runtime.exceptionThrown"
    || (
      event.method === "Log.entryAdded"
      && event.params?.entry?.level === "error"
    )
  ));
}

async function launchFreshWorld(client, url) {
  console.error("[pause-loader-qa] navigating production");
  await client.send("Page.navigate", { url });
  await client.waitFor(
    `Boolean(window.__phaserGame?.scene?.getScenes(true)?.some(scene => (
      ["MainMenuScene", "StartMenuScene"].includes(
        scene.sys?.settings?.key || scene.scene?.key
      )
    )))`,
    "production main menu",
    120000,
  );
  console.error("[pause-loader-qa] main menu ready");
  await client.evaluate(`(() => {
    window.__phaserGame.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "pause-feature-loading-live-qa",
      isNewSave: true,
      tutorialChoice: "no",
    });
    return true;
  })()`);
  await client.waitFor(
    `Boolean(
      window.__jkdE2E
      && window.__phaserGame?.scene?.isActive("PlayScene")
      && window.__phaserGame.scene.getScene("PlayScene")
        ?.runtimeFeatureAssetManager
    )`,
    "production PlayScene",
    180000,
  );
  await client.waitFor(
    `(() => {
      const coordinator = window.__phaserGame.scene.getScene("PlayScene")
        ?.runtimeAssetLoadCoordinator;
      return !coordinator || (
        coordinator.queue.length === 0
        && coordinator.activeRecords.size === 0
      );
    })()`,
    "settled production runtime art queue",
    120000,
  );
  console.error("[pause-loader-qa] PlayScene ready");
}

async function openThrottledLoader(client) {
  console.error("[pause-loader-qa] opening throttled ESC loader");
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 30,
    downloadThroughput: 900000,
    uploadThroughput: 900000,
  });
  const before = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    window.__jkdE2E.closeAll();
    for (const key of ${JSON.stringify(GROUP_KEYS)}) {
      if (
        key !== ${JSON.stringify(PRELOADED_CREST_KEY)}
        && scene.textures.exists(key)
      ) {
        scene.textures.remove(key);
      }
    }
    const progress = scene.runtimeFeatureAssetManager
      .getGroupProgress(${JSON.stringify(GROUP_ID)});
    scene.showPauseMenu({ initialTabKey: "talents" });
    return progress;
  })()`);
  await client.waitFor(
    `Boolean(
      window.__jkdPauseFeatureLoading?.active
      && window.__phaserGame.scene.getScene("PlayScene")
        ?._pausePanel?.state?.pendingFeatureGroup
        === ${JSON.stringify(GROUP_ID)}
    )`,
    "production ESC Starlight loader",
    30000,
  );
  await client.waitFor(
    `(() => {
      const progress = window.__jkdPauseFeatureLoading;
      return progress?.active
        && progress.loadedAssets >= 5
        && progress.loadedAssets < progress.totalAssets;
    })()`,
    "visible production asset progress",
    60000,
  );
  console.error("[pause-loader-qa] real progress visible");
  return before;
}

async function captureAndValidate(client) {
  const loading = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    return {
      diagnostic: window.__jkdPauseFeatureLoading,
      manager: scene.runtimeFeatureAssetManager
        .getGroupProgress(${JSON.stringify(GROUP_ID)}),
      activeTab: scene._pausePanel?.state?.tabKeys?.[
        scene._pausePanel?.state?.activeTab
      ],
      pendingGroup: scene._pausePanel?.state?.pendingFeatureGroup,
      viewMounted: Boolean(scene._pausePanel?.state?.featureLoadingView),
    };
  })()`);
  const diagnostic = loading.diagnostic;
  if (
    loading.activeTab !== "talents"
    || loading.pendingGroup !== GROUP_ID
    || !loading.viewMounted
    || !diagnostic?.active
    || diagnostic.loadedAssets !== loading.manager?.loadedAssets
    || diagnostic.totalAssets !== GROUP.assets.length
    || diagnostic.progress !== loading.manager?.progress
  ) {
    throw new Error(`Production loader mismatch: ${JSON.stringify(loading)}`);
  }
  const screenshot = path.join(
    OUTPUT_DIR,
    "production-esc-talents-loading.png",
  );
  await client.screenshot(screenshot);
  console.error("[pause-loader-qa] production screenshot captured");
  return { loading, screenshot };
}

async function cancelAndReopen(client) {
  console.error("[pause-loader-qa] cancelling partial load");
  const cancelled = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    scene.hidePauseMenu();
    return {
      pauseClosed: scene._pausePanel === null,
      loaderActive: window.__jkdPauseFeatureLoading?.active,
      progress: scene.runtimeFeatureAssetManager
        .getGroupProgress(${JSON.stringify(GROUP_ID)}),
    };
  })()`);
  await delay(400);
  const postCancel = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    return {
      pauseClosed: scene._pausePanel === null,
      loaderActive: window.__jkdPauseFeatureLoading?.active,
      progress: scene.runtimeFeatureAssetManager
        .getGroupProgress(${JSON.stringify(GROUP_ID)}),
    };
  })()`);
  if (
    !postCancel.pauseClosed
    || postCancel.loaderActive !== false
    || postCancel.progress.status !== "idle"
  ) {
    throw new Error(`Loader did not cancel cleanly: ${JSON.stringify({
      cancelled,
      postCancel,
    })}`);
  }
  console.error("[pause-loader-qa] cancellation clean; reopening");

  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await client.evaluate(`window.__phaserGame.scene.getScene("PlayScene")
    .showPauseMenu({ initialTabKey: "talents" })`);
  await client.waitFor(
    `Boolean(
      window.__phaserGame.scene.getScene("PlayScene")
        ?._pausePanel?.state?.talentTree
      && window.__jkdPauseFeatureLoading?.active === false
    )`,
    "reopened production talent tree",
    120000,
  );
  const ready = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const result = scene.runtimeFeatureAssetManager
      .getGroupProgress(${JSON.stringify(GROUP_ID)});
    window.__jkdE2E.closeAll();
    return result;
  })()`);
  if (!ready.ready || ready.loadedAssets !== GROUP.assets.length) {
    throw new Error(`Talent art did not finish: ${JSON.stringify(ready)}`);
  }
  console.error("[pause-loader-qa] reopened tree ready");
  return { cancelled, postCancel, ready };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({
    port: DEBUG_PORT,
    width: 1280,
    height: 720,
  });
  edge.on("exit", (code, signal) => {
    console.error(`[pause-loader-qa] Edge exited code=${code} signal=${signal}`);
  });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    const url = buildUrl();
    await launchFreshWorld(client, url);
    const before = await openThrottledLoader(client);
    const captured = await captureAndValidate(client);
    const lifecycle = await cancelAndReopen(client);
    const errors = browserErrors(client);
    if (errors.length) {
      throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
    }
    console.log(JSON.stringify({
      status: "pass",
      url,
      before,
      ...captured,
      ...lifecycle,
    }, null, 2));
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
