import fs from "node:fs";
import path from "node:path";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const BASE_URL = process.argv.find(value => value.startsWith("--url="))
  ?.slice("--url=".length)
  || "http://127.0.0.1:8090/testing/2026-07-30-pause-feature-loading-harness.html";
const OUTPUT_DIR = process.argv.find(value => value.startsWith("--output="))
  ?.slice("--output=".length)
  || "visual-approval-previews/pause-feature-loading-v1";
const DEBUG_PORT = 9394;

function assertSnapshot(snapshot, expectedLoaded, expectedProgress) {
  const diagnostic = snapshot?.diagnostic;
  if (
    !snapshot?.texturesReady
    || !diagnostic?.active
    || diagnostic.revision !== "pause-feature-loading-v1-20260730"
    || diagnostic.loadedAssets !== expectedLoaded
    || Math.abs(diagnostic.progress - expectedProgress) > 0.0001
    || snapshot.root?.scaleX < 0.9
    || snapshot.root?.scaleY < 0.9
  ) {
    throw new Error(`Invalid pause loader snapshot: ${JSON.stringify(snapshot)}`);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({
    port: DEBUG_PORT,
    width: 1280,
    height: 720,
  });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    await client.send("Page.navigate", { url: BASE_URL });
    await client.waitFor(
      "Boolean(window.__pauseFeatureLoadingHarness?.ready)",
      "pause feature loading harness",
      45000,
    );
    await delay(300);
    const initial = await client.evaluate(
      "window.__pauseFeatureLoadingHarness.snapshot()",
    );
    assertSnapshot(initial, 8, 8 / 41);

    await client.evaluate(
      "window.__pauseFeatureLoadingHarness.setLoaded(25)",
    );
    await delay(260);
    const progress = await client.evaluate(
      "window.__pauseFeatureLoadingHarness.snapshot()",
    );
    assertSnapshot(progress, 25, 25 / 41);
    if (progress.diagnostic.phaseIndex < 2) {
      throw new Error(`Thematic loading phase did not advance: ${JSON.stringify(progress)}`);
    }
    const progressScreenshot = path.join(
      OUTPUT_DIR,
      "starlight-loading-61-percent.png",
    );
    await client.screenshot(progressScreenshot);

    await client.evaluate(
      "window.__pauseFeatureLoadingHarness.complete()",
    );
    await delay(80);
    const complete = await client.evaluate(
      "window.__pauseFeatureLoadingHarness.snapshot()",
    );
    assertSnapshot(complete, 41, 1);
    if (!complete.diagnostic.completed || complete.diagnostic.status !== "ready") {
      throw new Error(`Ready state did not render: ${JSON.stringify(complete)}`);
    }
    const completeScreenshot = path.join(
      OUTPUT_DIR,
      "starlight-loading-ready.png",
    );
    await client.screenshot(completeScreenshot);

    await client.evaluate(
      "window.__pauseFeatureLoadingHarness.destroy()",
    );
    const destroyed = await client.evaluate(
      "window.__pauseFeatureLoadingHarness.snapshot()",
    );
    if (destroyed.diagnostic?.active !== false) {
      throw new Error(`Loader teardown diagnostic stayed active: ${JSON.stringify(destroyed)}`);
    }

    const browserErrors = client.events.filter(event => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method !== "Log.entryAdded") return false;
      return event.params?.entry?.level === "error";
    });
    if (browserErrors.length) {
      throw new Error(`Browser errors: ${JSON.stringify(browserErrors)}`);
    }
    console.log(JSON.stringify({
      status: "pass",
      initial,
      progress,
      complete,
      screenshots: { progressScreenshot, completeScreenshot },
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
