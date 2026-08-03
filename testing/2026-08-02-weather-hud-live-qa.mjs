// Hidden-Edge QA for the approved weather HUD and legacy-panel exclusion.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const DEFAULT_URL = "http://127.0.0.1:8080/testing/2026-08-02-weather-hud-visual-harness.html";
const DEFAULT_OUTPUT = path.resolve("tmp/weather-hud-live");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function main() {
  const outputDir = path.resolve(argument("output", DEFAULT_OUTPUT));
  const allowLegacy = argument("allow-legacy", "0") === "1";
  fs.mkdirSync(outputDir, { recursive: true });
  const browserIssues = [];
  const browser = await chromium.launch({
    executablePath: argument("edge", DEFAULT_EDGE),
    headless: true,
    args: ["--use-angle=swiftshader"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("console", message => {
      if (message.type() === "error") browserIssues.push(`console:${message.text()}`);
    });
    page.on("pageerror", error => browserIssues.push(`pageerror:${error.message}`));

    await page.goto(argument("url", DEFAULT_URL), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => globalThis.__WEATHER_HUD_HARNESS__?.ready === true,
      null,
      { timeout: 30_000 },
    );

    const hud = await page.evaluate(() => globalThis.__WEATHER_HUD_HARNESS__);
    const screenshotPath = path.join(outputDir, "weather-hud.png");
    await page.screenshot({ path: screenshotPath });
    const report = {
      schema: "weather-hud-live-qa@1",
      generatedUtc: new Date().toISOString(),
      hud,
      browserIssues,
      screenshotPath,
    };
    const reportPath = path.join(outputDir, "live-qa-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    if (!hud.approvedSkinActive || !hud.approvedWorldFrameVisible) {
      throw new Error(`Approved weather HUD is not active: ${JSON.stringify(hud)}`);
    }
    if (!hud.clockTextVisible || !hud.weatherTextVisible || !hud.temperatureTextVisible) {
      throw new Error(`Live weather data is not visible: ${JSON.stringify(hud)}`);
    }
    const legacyVisible = hud.legacyClockPanelVisible
      || hud.legacyWeatherPanelVisible
      || hud.legacySeasonTextVisible;
    if (!allowLegacy && legacyVisible) {
      throw new Error(`Legacy weather UI is visible: ${JSON.stringify(hud)}`);
    }
    if (browserIssues.length) {
      throw new Error(`Browser issues: ${JSON.stringify(browserIssues)}`);
    }
    console.log(reportPath);
  } finally {
    await browser.close();
  }
}

await main();
