// Real-game hidden-Edge QA for authored save slots, dialogs, choices, and rollback.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const DEFAULT_URL = "http://127.0.0.1:8080/?jkd_e2e=1";
const DEFAULT_OUTPUT = path.resolve("tmp/2026-08-03-save-menu-presentation-live-qa");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function artDisabledUrl(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("saveMenuArt", "0");
  return parsed.toString();
}

async function enterSaveMenu(page, url) {
  await page.goto(url, { waitUntil: "commit", timeout: 30_000 });
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
    page.on("console", message => {
      if (message.type() === "error") failures.push(`console:error:${message.text()}`);
      if (message.type() === "warning") warnings.push(`console:warning:${message.text()}`);
    });
    page.on("pageerror", error => failures.push(`pageerror:${error.stack || error.message}`));
    page.on("requestfailed", request => {
      failures.push(`requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`);
    });
    page.on("response", response => {
      if (response.status() >= 400) failures.push(`response:${response.status()}:${response.url()}`);
    });

    const url = argument("url", DEFAULT_URL);
    await enterSaveMenu(page, url);
    await page.waitForFunction(() => {
      const scene = window.__phaserGame?.scene?.getScene?.("StartMenuScene");
      return Boolean(scene?._useAuthoredSaveMenuArt
        && scene.textures.exists("save-menu-slot-idle-v1")
        && scene.textures.exists("save-menu-slot-selected-v1")
        && scene.textures.exists("save-menu-modal-backup-v1"));
    }, null, { timeout: 120_000 });

    // Synthetic values exist only in this browser scene. No storage or save
    // API is called, so the user's real save slots remain untouched.
    await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      scene.saveSlots = [
        {
          id: 1, hasData: true, dugTiles: 8432, resources: {},
          updatedAt: Date.now() - 86400000, playerCharacterId: null,
          level: 2, currentDepth: 486, bestDepth: 540, wallet: 123456,
          stars: 22, hardcoreModeData: { mode: "casual", armed: false },
        },
        {
          id: 2, hasData: true, dugTiles: 17750, resources: {},
          updatedAt: Date.now() - 3600000, playerCharacterId: null,
          level: 3, currentDepth: 910, bestDepth: 1032, wallet: 785000,
          stars: 61, hardcoreModeData: { mode: "hardcore", armed: true },
        },
        {
          id: 3, hasData: false, dugTiles: 0, resources: {}, updatedAt: null,
          playerCharacterId: null,
          hardcoreModeData: { mode: "casual", armed: false },
        },
      ];
      scene._destroyCards();
      scene._buildCards();
      scene._selectSlot(1);
    });
    await page.waitForTimeout(450);

    const slotTextLayout = await page.evaluate(async () => {
      const { SAVE_MENU_PRESENTATION } = await import('/values/saveMenuPresentation.js');
      const scene = window.__phaserGame.scene.getScene('StartMenuScene');
      const {
        horizontalSafeInsetPx,
        headerSafeTopOffsetYPx,
        headerSafeBottomOffsetYPx,
        summaryMaxWidthPx,
      } = SAVE_MENU_PRESENTATION.slot.textLayout;
      const cardWidth = SAVE_MENU_PRESENTATION.slot.displayWidthPx;
      const cardHeight = SAVE_MENU_PRESENTATION.slot.displayHeightPx;

      return scene._cardObjects.map((objects, index) => {
        const card = scene._cardGraphics[index];
        return {
          slotId: card.slotId,
          safeLeft: card.cx - cardWidth / 2 + horizontalSafeInsetPx,
          safeRight: card.cx + cardWidth / 2 - horizontalSafeInsetPx,
          headerSafeTop: card.cy - cardHeight / 2 + headerSafeTopOffsetYPx,
          headerSafeBottom: card.cy - cardHeight / 2 + headerSafeBottomOffsetYPx,
          summaryMaxWidthPx,
          texts: objects
            .filter(object => object.type === 'Text')
            .map(object => {
              const bounds = object.getBounds();
              return {
                text: object.text,
                left: bounds.left,
                right: bounds.right,
                top: bounds.top,
                bottom: bounds.bottom,
                height: bounds.height,
                width: bounds.width,
                fontSize: Number.parseFloat(object.style.fontSize),
              };
            }),
        };
      });
    });

    const screenshots = {
      slots: path.join(outputDir, "save-menu-slots-high.png"),
      confirm: path.join(outputDir, "save-menu-clear-confirm-high.png"),
      backup: path.join(outputDir, "save-menu-backups-high.png"),
      import: path.join(outputDir, "save-menu-import-high.png"),
      mode: path.join(outputDir, "save-menu-mode-choice-high.png"),
      tutorial: path.join(outputDir, "save-menu-tutorial-choice-high.png"),
      rollback: path.join(outputDir, "save-menu-graphics-rollback.png"),
    };
    await page.screenshot({ path: screenshots.slots, timeout: 120_000 });

    await page.keyboard.press("2");
    await page.waitForTimeout(120);
    const keyboardSelectedSlot = await page.evaluate(
      () => window.__phaserGame.scene.getScene("StartMenuScene").selectedSlot,
    );
    await page.mouse.click(326, 390);
    await page.waitForTimeout(120);
    const pointerSelectedSlot = await page.evaluate(
      () => window.__phaserGame.scene.getScene("StartMenuScene").selectedSlot,
    );

    await page.evaluate(() => {
      window.__phaserGame.scene.getScene("StartMenuScene")._showConfirm(1);
    });
    await page.waitForTimeout(180);
    await page.screenshot({ path: screenshots.confirm, timeout: 120_000 });
    const confirmInfo = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      return {
        texture: scene._confirmPanel.objects[1].texture?.key || null,
        controlCount: scene._confirmPanel.controls.length,
      };
    });
    await page.evaluate(() => window.__phaserGame.scene.getScene("StartMenuScene")._closeConfirm());

    await page.evaluate(() => {
      window.__phaserGame.scene.getScene("StartMenuScene")._showBackupPanel(1);
    });
    await page.waitForTimeout(180);
    await page.screenshot({ path: screenshots.backup, timeout: 120_000 });
    const backupTexture = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      return scene._backupPanel.objects[1].texture?.key || null;
    });
    await page.evaluate(() => window.__phaserGame.scene.getScene("StartMenuScene")._closeBackupPanel());

    await page.evaluate(() => {
      window.__phaserGame.scene.getScene("StartMenuScene")._showImportPanel();
    });
    await page.waitForTimeout(180);
    await page.screenshot({ path: screenshots.import, timeout: 120_000 });
    const importTexture = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      return scene._importPanel.objects[1].texture?.key || null;
    });
    await page.evaluate(() => window.__phaserGame.scene.getScene("StartMenuScene")._closeImportPanel());

    await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      scene._selectSlot(3);
      scene._startGame();
    });
    await page.waitForTimeout(220);
    await page.screenshot({ path: screenshots.mode, timeout: 120_000 });
    const newRunSetup = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      const overlay = scene._newRunSetup;
      return {
        visible: overlay.isVisible,
        panel: { ...overlay.config.panel },
        mode: overlay.mode,
        tutorialChoice: overlay.tutorialChoice,
        cards: [...overlay.cards.entries()].map(([id, card]) => {
          const hit = card.root.list.at(-1);
          return {
            id,
            x: card.root.x,
            y: card.root.y,
            hitWidth: hit.width,
            hitHeight: hit.height,
            authored: Boolean(card.chrome?.root),
            selected: card.selected.visible,
          };
        }),
      };
    });

    await page.evaluate(() => {
      window.__phaserGame.scene.getScene("StartMenuScene")._newRunSetup._setTutorial("no");
    });
    await page.waitForTimeout(220);
    await page.screenshot({ path: screenshots.tutorial, timeout: 120_000 });
    const skipSetup = await page.evaluate(() => {
      const scene = window.__phaserGame.scene.getScene("StartMenuScene");
      const overlay = scene._newRunSetup;
      return {
        visible: overlay.isVisible,
        tutorialChoice: overlay.tutorialChoice,
        status: overlay.status.text,
        selected: [...overlay.cards.entries()]
          .filter(([, card]) => card.selected.visible)
          .map(([id]) => id),
      };
    });

    const runtime = await page.evaluate(() => {
      const game = window.__phaserGame;
      const scene = game.scene.getScene("StartMenuScene");
      const textureInfo = key => {
        const source = scene.textures.get(key).getSourceImage();
        return { key, width: source.width, height: source.height };
      };
      return {
        activeScenes: game.scene.getScenes(true).map(active => active.sys.settings.key),
        renderDensity: window.__jkdRenderDensity || null,
        canvas: { width: game.canvas.width, height: game.canvas.height },
        authoredSaveMenuArt: scene._useAuthoredSaveMenuArt,
        cardGeometry: scene._cardGraphics.map(card => ({
          x: card.cx,
          y: card.cy,
          slotId: card.slotId,
          authored: Boolean(card.g.__saveMenuChrome),
        })),
        transferHits: scene._saveTransferControls.map(button => ({
          width: button.hit.width,
          height: button.hit.height,
        })),
        textures: [
          textureInfo("save-menu-slot-idle-v1"),
          textureInfo("save-menu-slot-selected-v1"),
          textureInfo("save-menu-modal-confirm-v1"),
          textureInfo("save-menu-modal-backup-v1"),
          textureInfo("save-menu-modal-import-v1"),
          textureInfo("save-menu-choice-idle-v1"),
          textureInfo("save-menu-choice-selected-v1"),
        ],
        uiErrors: [...(window.__jkdUiErrors || [])],
      };
    });

    const verifyRollback = argument("rollback", "0") === "1";
    let rollback = { tested: false };
    if (verifyRollback) {
      await enterSaveMenu(page, artDisabledUrl(url));
      rollback = await page.evaluate(() => {
        const scene = window.__phaserGame.scene.getScene("StartMenuScene");
        return {
          tested: true,
          authoredSaveMenuArt: scene._useAuthoredSaveMenuArt,
          graphicsCards: scene._cardGraphics.map(card => card.g.type === "Graphics"),
        };
      });
      await page.screenshot({ path: screenshots.rollback, timeout: 120_000 });
    }

    if (keyboardSelectedSlot !== 2) failures.push(`keyboard-selection:${keyboardSelectedSlot}`);
    if (pointerSelectedSlot !== 1) failures.push(`pointer-selection:${pointerSelectedSlot}`);
    if (runtime.renderDensity?.preset !== "high" || runtime.renderDensity?.density !== 1.5) {
      failures.push("high-render-density-drift");
    }
    if (runtime.canvas.width !== 1920 || runtime.canvas.height !== 1080) {
      failures.push(`unexpected-backing:${runtime.canvas.width}x${runtime.canvas.height}`);
    }
    if (!runtime.authoredSaveMenuArt || runtime.cardGeometry.some(card => !card.authored)) {
      failures.push("authored-slot-chrome-missing");
    }
    if (runtime.cardGeometry.map(card => `${card.x},${card.y}`).join("|") !== "326,390|640,390|954,390") {
      failures.push("slot-geometry-drift");
    }
    if (runtime.transferHits.some(hit => hit.width !== 220 || hit.height !== 42)) {
      failures.push("transfer-hit-geometry-drift");
    }
    for (const card of slotTextLayout) {
      for (const text of card.texts) {
        if (text.left < card.safeLeft - 0.5 || text.right > card.safeRight + 0.5) {
          failures.push(`slot-${card.slotId}-text-overflow:${text.text}`);
        }
      }
    }
    for (const card of slotTextLayout) {
      const headerTexts = card.texts.filter(text => (
        text.text.startsWith('SLOT') || text.text.startsWith('LAST')
      ));
      if (!headerTexts.length || headerTexts.some(text => (
        text.top < card.headerSafeTop - 0.5
        || text.bottom > card.headerSafeBottom + 0.5
      ))) {
        failures.push(`slot-${card.slotId}-header-outside-inner-band`);
      }
    }
    const summaries = slotTextLayout.flatMap(card => card.texts
      .filter(text => text.text.includes('DEPTH'))
      .map(text => ({ ...text, slotId: card.slotId, maxWidth: card.summaryMaxWidthPx })));
    if (summaries.length !== 2 || summaries.some(summary => (
      summary.text.split('\n').length !== 4
      || summary.width > summary.maxWidth + 0.5
      || summary.fontSize < 10
    ))) {
      failures.push('save-slot-summary-layout-drift');
    }
    if (confirmInfo.texture !== "save-menu-modal-confirm-v1" || confirmInfo.controlCount !== 2) {
      failures.push("confirm-panel-contract-drift");
    }
    if (backupTexture !== "save-menu-modal-backup-v1") failures.push("backup-panel-art-missing");
    if (importTexture !== "save-menu-modal-import-v1") failures.push("import-panel-art-missing");
    if (!newRunSetup.visible
      || newRunSetup.panel.width !== 1040
      || newRunSetup.panel.height !== 660
      || newRunSetup.mode !== "hardcore"
      || newRunSetup.tutorialChoice !== "yes"
      || newRunSetup.cards.length !== 4
      || newRunSetup.cards.some(card => (
        !card.authored || card.hitWidth !== 398 || card.hitHeight !== 146
      ))) failures.push("integrated-new-run-contract-drift");
    const setupPositions = newRunSetup.cards
      .map(card => `${card.id}:${card.x},${card.y}`)
      .join("|");
    if (setupPositions !== "casual:-222,-92|hardcore:222,-92|guided:-222,112|skip:222,112") {
      failures.push("integrated-new-run-card-geometry-drift");
    }
    const initialSelected = newRunSetup.cards.filter(card => card.selected).map(card => card.id);
    if (initialSelected.join("|") !== "hardcore|guided") {
      failures.push("integrated-new-run-default-selection-drift");
    }
    if (!skipSetup.visible
      || skipSetup.tutorialChoice !== "no"
      || skipSetup.selected.join("|") !== "hardcore|skip"
      || !skipSetup.status.includes("TYPE YES")) {
      failures.push("integrated-skip-confirmation-drift");
    }
    if (runtime.uiErrors.length) failures.push(`ui-errors:${runtime.uiErrors.length}`);
    if (rollback.tested
      && (rollback.authoredSaveMenuArt || rollback.graphicsCards.some(value => !value))) {
      failures.push("graphics-rollback-failed");
    }

    const report = {
      schema: "save-menu-presentation-live-qa@1",
      generatedUtc: new Date().toISOString(),
      url,
      runtime,
      slotTextLayout,
      interactions: { keyboardSelectedSlot, pointerSelectedSlot },
      dialogs: { confirmInfo, backupTexture, importTexture },
      choices: { newRunSetup, skipSetup },
      rollback,
      failures,
      warnings: warnings.slice(0, 100),
      screenshots,
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
