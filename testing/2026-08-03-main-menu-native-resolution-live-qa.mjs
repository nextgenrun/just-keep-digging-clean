// Real-game hidden-Edge QA for the default High renderer and authored menu art.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const DEFAULT_URL = "http://127.0.0.1:8080/?jkd_e2e=1";
const DEFAULT_OUTPUT = path.resolve("tmp/2026-08-03-main-menu-native-resolution-live-qa");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function main() {
  const outputDir = path.resolve(argument("output", DEFAULT_OUTPUT));
  fs.mkdirSync(outputDir, { recursive: true });
  const failures = [];
  const warnings = [];
  const browser = await chromium.launch({
    executablePath: argument("edge", DEFAULT_EDGE),
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
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`console:error:${message.text()}`);
      if (message.type() === "warning") warnings.push(`console:warning:${message.text()}`);
    });
    page.on("pageerror", (error) => failures.push(`pageerror:${error.stack || error.message}`));
    page.on("requestfailed", (request) => {
      failures.push(`requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failures.push(`response:${response.status()}:${response.url()}`);
    });

    await page.goto(argument("url", DEFAULT_URL), { waitUntil: "commit", timeout: 30_000 });
    await page.waitForFunction(() => Boolean(window.__phaserGame), null, { timeout: 600_000 });
    await page.waitForFunction(() => {
      const game = window.__phaserGame;
      const scene = game?.scene?.getScene?.("MainMenuScene");
      return Boolean(scene?.scene?.isActive?.()
        && scene?._useAuthoredMenuArt
        && scene?.textures?.exists?.("main-menu-button-idle-v1")
        && scene?.textures?.exists?.("main-menu-button-selected-v1"));
    }, null, { timeout: 600_000 });
    await page.waitForTimeout(1_000);

    const idleScreenshot = path.join(outputDir, "main-menu-default-high.png");
    await page.screenshot({ path: idleScreenshot, timeout: 120_000 });
    await page.mouse.move(640, 396);
    await page.waitForTimeout(250);
    const hoverScreenshot = path.join(outputDir, "main-menu-hover-high.png");
    await page.screenshot({ path: hoverScreenshot, timeout: 120_000 });

    await page.mouse.down();
    await page.waitForTimeout(35);
    const pressedScreenshot = path.join(outputDir, "main-menu-pressed-high.png");
    await page.screenshot({ path: pressedScreenshot, timeout: 120_000 });
    const pressedButton = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("MainMenuScene");
      const button = scene._btnRefs[1];
      return {
        width: button.hoverLayer.displayWidth,
        height: button.hoverLayer.displayHeight,
        scaleX: button.hoverLayer.scaleX,
        scaleY: button.hoverLayer.scaleY,
      };
    });
    await page.mouse.up();
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      window.__phaserGame.scene.getScene("MainMenuScene")._closeOverlay();
    });

    const runtime = await page.evaluate(() => {
      const game = window.__phaserGame;
      const scene = game.scene.getScene("MainMenuScene");
      const textureInfo = (key) => {
        const source = scene.textures.get(key).getSourceImage();
        return { key, width: source.width, height: source.height };
      };
      const canvas = game.canvas;
      return {
        activeScenes: game.scene.getScenes(true).map((active) => active.sys.settings.key),
        renderDensity: window.__jkdRenderDensity || null,
        canvas: {
          width: canvas.width,
          height: canvas.height,
          cssWidth: canvas.getBoundingClientRect().width,
          cssHeight: canvas.getBoundingClientRect().height,
        },
        authoredMenuArt: scene._useAuthoredMenuArt,
        textures: [
          textureInfo("main-menu-button-idle-v1"),
          textureInfo("main-menu-button-selected-v1"),
        ],
        buttons: scene._btnRefs.map((button) => ({
          idleTexture: button.bg.texture?.key || null,
          selectedTexture: button.hoverLayer.texture?.key || null,
          width: button.bg.displayWidth,
          height: button.bg.displayHeight,
          hitWidth: button.hit.width,
          hitHeight: button.hit.height,
        })),
        uiErrors: [...(window.__jkdUiErrors || [])],
      };
    });

    if (runtime.renderDensity?.preset !== "high") failures.push("default-density-not-high");
    if (runtime.renderDensity?.density !== 1.5) failures.push("default-density-not-1.5x");
    if (runtime.canvas.width !== 1920 || runtime.canvas.height !== 1080) {
      failures.push(`unexpected-backing:${runtime.canvas.width}x${runtime.canvas.height}`);
    }
    if (runtime.textures.some((texture) => texture.width !== 2150 || texture.height !== 430)) {
      failures.push("unexpected-menu-texture-size");
    }
    if (runtime.buttons.some((button) => (
      button.idleTexture !== "main-menu-button-idle-v1"
      || button.selectedTexture !== "main-menu-button-selected-v1"
      || button.width !== 260
      || button.height !== 52
      || button.hitWidth !== 260
      || button.hitHeight !== 52
    ))) failures.push("menu-button-contract-drift");
    if (pressedButton.width !== 260 || pressedButton.height !== 52) {
      failures.push(
        `pressed-button-size-drift:${pressedButton.width}x${pressedButton.height}`,
      );
    }
    if (runtime.uiErrors.length) failures.push(`ui-errors:${runtime.uiErrors.length}`);

    const report = {
      schema: "main-menu-native-resolution-live-qa@1",
      generatedUtc: new Date().toISOString(),
      url: argument("url", DEFAULT_URL),
      runtime,
      pressedButton,
      failures,
      warnings: warnings.slice(0, 100),
      screenshots: { idleScreenshot, hoverScreenshot, pressedScreenshot },
    };
    const reportPath = path.join(outputDir, "report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(reportPath);
    if (failures.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
