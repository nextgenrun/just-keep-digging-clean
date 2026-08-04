import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const outputDir = path.resolve("tmp/2026-08-03-save-menu-safe-fields-live-qa");
fs.mkdirSync(outputDir, { recursive: true });
const failures = [];
const warnings = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--use-angle=swiftshader"],
});

function outside(bounds, area) {
  return bounds.left < area.safeLeft - 0.5
    || bounds.right > area.safeRight + 0.5
    || bounds.top < area.safeTop - 0.5
    || bounds.bottom > area.safeBottom + 0.5;
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console:error:${message.text()}`);
    if (message.type() === "warning") warnings.push(`console:warning:${message.text()}`);
  });
  page.on("pageerror", error => failures.push(`pageerror:${error.message}`));
  page.on("requestfailed", request => failures.push(
    `requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`,
  ));

  await page.goto("http://127.0.0.1:8080/?jkd_e2e=1&skylineVfx=0", {
    waitUntil: "commit",
    timeout: 30_000,
  });
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
    { timeout: 120_000 },
  );
  await page.waitForTimeout(900);

  await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("StartMenuScene");
    scene.saveSlots = [
      {
        id: 1, hasData: true, dugTiles: 8432, resources: {}, updatedAt: Date.now() - 86400000,
        playerCharacterId: null, level: 12, currentDepth: 486, bestDepth: 540,
        wallet: 123456, stars: 22, hardcoreModeData: { mode: "casual", armed: false },
      },
      {
        id: 2, hasData: true, dugTiles: 17750, resources: {}, updatedAt: Date.now() - 3600000,
        playerCharacterId: null, level: 21, currentDepth: 910, bestDepth: 1032,
        wallet: 785000, stars: 61, hardcoreModeData: { mode: "hardcore", armed: true },
      },
      {
        id: 3, hasData: false, dugTiles: 0, resources: {}, updatedAt: null,
        playerCharacterId: null, hardcoreModeData: { mode: "casual", armed: false },
      },
    ];
    scene._destroyCards();
    scene._buildCards();
    scene._selectSlot(1);
  });
  await page.waitForTimeout(250);

  const slotHeaders = await page.evaluate(async () => {
    const { SAVE_MENU_PRESENTATION } = await import("/values/saveMenuPresentation.js");
    const scene = window.__phaserGame.scene.getScene("StartMenuScene");
    const layout = SAVE_MENU_PRESENTATION.slot.textLayout;
    const cardHeight = SAVE_MENU_PRESENTATION.slot.displayHeightPx;
    return scene._cardObjects.map((objects, index) => {
      const card = scene._cardGraphics[index];
      return {
        slotId: card.slotId,
        safeTop: card.cy - cardHeight / 2 + layout.headerSafeTopOffsetYPx,
        safeBottom: card.cy - cardHeight / 2 + layout.headerSafeBottomOffsetYPx,
        texts: objects
          .filter(object => object.type === "Text"
            && (object.text.startsWith("SLOT") || object.text.startsWith("LAST")))
          .map(object => {
            const bounds = object.getBounds();
            return { text: object.text, top: bounds.top, bottom: bounds.bottom };
          }),
      };
    });
  });
  for (const card of slotHeaders) {
    if (!card.texts.length || card.texts.some(text => (
      text.top < card.safeTop - 0.5 || text.bottom > card.safeBottom + 0.5
    ))) failures.push(`slot-${card.slotId}-header-outside-inner-band`);
  }

  await page.evaluate(() => {
    const scene = window.__phaserGame.scene.getScene("StartMenuScene");
    scene._selectSlot(3);
    scene._startGame();
  });
  await page.waitForTimeout(250);
  const casualScreenshot = path.join(outputDir, "save-menu-mode-casual-safe-field.png");
  await page.screenshot({ path: casualScreenshot, timeout: 120_000 });

  async function readChoices() {
    return page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      const selector = scene._modeSelector;
      const layout = selector.config.ui.modeSelector;
      const boundsOf = object => {
        const bounds = object.getBounds();
        return {
          left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height,
        };
      };
      return {
        selectedMode: selector.selectedMode,
        choices: selector.choiceObjects.map(choice => {
          const hit = choice.hit.getBounds();
          return {
            mode: choice.mode,
            scale: choice.container.scaleX,
            selectedVisible: choice.selectedText.visible,
            iconMasked: Boolean(choice.icon.mask),
            safeLeft: hit.centerX - layout.choiceWidth / 2 + layout.innerSafeInsetXPx,
            safeRight: hit.centerX + layout.choiceWidth / 2 - layout.innerSafeInsetXPx,
            safeTop: hit.centerY + layout.innerSafeTopY,
            safeBottom: hit.centerY + layout.innerSafeBottomY,
            icon: boundsOf(choice.icon),
            title: boundsOf(choice.titleText),
            body: boundsOf(choice.bodyText),
            selected: boundsOf(choice.selectedText),
          };
        }),
        uiErrors: [...(window.__jkdUiErrors || [])],
      };
    });
  }

  const casualState = await readChoices();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(160);
  const hardcoreState = await readChoices();
  const hardcoreScreenshot = path.join(outputDir, "save-menu-mode-hardcore-safe-field.png");
  await page.screenshot({ path: hardcoreScreenshot, timeout: 120_000 });

  for (const state of [casualState, hardcoreState]) {
    for (const choice of state.choices) {
      for (const role of ["icon", "title", "body", "selected"]) {
        if (outside(choice[role], choice)) failures.push(`${choice.mode}-${role}-outside-safe-field`);
      }
      if (choice.scale !== 1) failures.push(`${choice.mode}-choice-scale-drift`);
    }
    if (state.uiErrors.length) failures.push(`ui-errors:${state.uiErrors.length}`);
  }
  if (casualState.choices[0]?.iconMasked || !casualState.choices[1]?.iconMasked) {
    failures.push("hardcore-crest-mask-drift");
  }
  if (casualState.selectedMode !== "casual" || hardcoreState.selectedMode !== "hardcore") {
    failures.push("mode-keyboard-selection-drift");
  }

  const report = {
    schema: "save-menu-safe-fields-focused-qa@1",
    generatedUtc: new Date().toISOString(),
    slotHeaders,
    casualState,
    hardcoreState,
    failures,
    warnings,
    screenshots: { casualScreenshot, hardcoreScreenshot },
  };
  const reportPath = path.join(outputDir, "focused-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(reportPath);
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
