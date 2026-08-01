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
  || "http://127.0.0.1:8080/testing/2026-07-28-starlight-talent-tree-visual-harness.html";
const OUTPUT_DIR = process.argv.find(value => value.startsWith("--output="))
  ?.slice("--output=".length)
  || "visual-approval-previews/starlight-talent-tree-v4";
const LABEL = process.argv.find(value => value.startsWith("--label="))
  ?.slice("--label=".length)
  || "current";
const DEBUG_PORT = 9397;
const VIEWPORT_WIDTH = Math.max(
  960,
  Math.min(1600, Number(process.argv.find(value => value.startsWith("--width="))
    ?.slice("--width=".length)) || 1280),
);
const VIEWPORT_HEIGHT = Math.max(
  640,
  Math.min(1000, Number(process.argv.find(value => value.startsWith("--height="))
    ?.slice("--height=".length)) || 720),
);

function buildUrl() {
  const url = new URL(BASE_URL);
  url.searchParams.set("width", String(VIEWPORT_WIDTH));
  url.searchParams.set("height", String(VIEWPORT_HEIGHT));
  url.searchParams.set("shell", "pause");
  url.searchParams.set("profile", "mid");
  return url.href;
}

function browserErrors(client) {
  return client.events.filter(event => (
    event.method === "Runtime.exceptionThrown"
    || (
      event.method === "Log.entryAdded"
      && event.params?.entry?.level === "error"
      && !event.params?.entry?.url?.endsWith("/favicon.ico")
    )
  ));
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({
    port: DEBUG_PORT,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
  });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    const url = buildUrl();
    await client.send("Page.navigate", { url });
    await client.waitFor(
      "Boolean(window.__starlightTalentReview?.ready)",
      "Starlight visual harness",
      45000,
    );
    await delay(450);

    const captures = [];
    for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
      await client.evaluate(
        `window.__starlightTalentReview.page(${pageIndex})`,
      );
      await delay(260);
      const snapshot = await client.evaluate(
        "window.__starlightTalentReview.snapshot()",
      );
      const health = await client.evaluate(
        "window.__starlightTalentReview.health()",
      );
      if (!health?.ready || snapshot?.pageIndex !== pageIndex) {
        throw new Error(`Invalid Starlight state: ${JSON.stringify({
          pageIndex,
          snapshot,
          health,
        })}`);
      }
      const screenshot = path.join(
        OUTPUT_DIR,
        `${LABEL}-page-${pageIndex + 1}.png`,
      );
      await client.screenshot(screenshot);
      captures.push({ pageIndex, screenshot, snapshot, health });
    }

    const errors = browserErrors(client);
    if (errors.length) {
      throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
    }
    console.log(JSON.stringify({ status: "pass", url, captures }, null, 2));
  } finally {
    client?.close();
    edge.kill();
  }
}

await main();
