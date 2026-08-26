import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT = path.join(ROOT, "testing/visual-approval-previews/player-collider-contact-polish-v2");
const GAME_URL = process.argv.find((value) => value.startsWith("--url="))?.slice(6)
  || "http://127.0.0.1:8080/?renderer=webgl&unifiedAnimation=1&colliderV2=1";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

fs.mkdirSync(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const issues = [];
page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") issues.push(`console:${message.text()}`);
});

try {
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => Boolean(
    window.__phaserGame?.scene?.getScenes(true).some(
      (scene) => ["MainMenuScene", "StartMenuScene"].includes(scene.scene.key),
    ),
  ), null, { timeout: 300_000 });
  await page.evaluate(() => window.__phaserGame.scene.start("WorldLoadScene", {
    saveSlot: 1,
    worldIdentity: "player-collider-contact-polish-v2-live-qa",
    isNewSave: true,
    tutorialChoice: "no",
  }));
  await page.waitForFunction(() => Boolean(
    window.__phaserGame?.scene?.isActive("PlayScene")
    && window.__phaserGame.scene.getScene("PlayScene")?.playerController,
  ), null, { timeout: 300_000 });
  await page.evaluate(async () => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    window.__jkdE2E?.closeAll?.();
    scene.gameState = "playing";
    const deferredResults = await Promise.all([
      scene.playerDeferredAnimationAssetController.ensureForAnimation(
        scene.playerAssetProfile.flyAnim,
      ),
      scene.playerDeferredAnimationAssetController.ensureForAnimation(
        scene.playerAssetProfile.duckAnim,
      ),
    ]);
    if (deferredResults.some((result) => result?.ready !== true)) {
      throw new Error(`Deferred character pack failed: ${JSON.stringify(deferredResults)}`);
    }
    scene.scene.pause();
  });

  async function capture(id, profileId, animationProperty, sheetProperty, textureFrame, label) {
    const snapshot = await page.evaluate(({ profileId: requestedProfile, animationProperty: property, sheetProperty: sheet, textureFrame: frame, label: title }) => {
      const scene = window.__phaserGame.scene.getScene("PlayScene");
      const controller = scene.playerController;
      const body = controller.physicsBody;
      controller._forceCollisionPolishProfile(requestedProfile);
      const animationKey = scene.playerAssetProfile[property];
      controller._syncSpriteWithPhysics();
      scene.player.setVisible(false);
      scene.__colliderQaSprite?.destroy();
      const anchor = body.getVisualAnchor();
      const sheetKey = scene.playerAssetProfile[sheet];
      const texture = scene.textures.get(sheetKey);
      const textureReady = scene.textures.exists(sheetKey)
        && texture?.has?.(String(frame)) === true;
      if (!textureReady) {
        const frameNames = scene.textures.get(sheetKey)?.getFrameNames?.() || [];
        throw new Error(`Missing QA frame ${sheetKey}:${frame}; frames=${JSON.stringify(frameNames.slice(0, 12))}; total=${frameNames.length}`);
      }
      const qaSprite = scene.add.sprite(
        anchor.x,
        anchor.y,
        sheetKey,
        String(frame),
      ).setOrigin(0.5, 0.890625).setDisplaySize(101, 101).setDepth(999998);
      scene.__colliderQaSprite = qaSprite;
      scene.__colliderQaGraphics?.destroy();
      scene.__colliderQaText?.destroy();
      const graphics = scene.add.graphics().setDepth(999999);
      graphics.lineStyle(3, 0x00ff9d, 1).strokeRect(body.x, body.y, body.w, body.h);
      graphics.lineStyle(2, 0xffd15c, 1)
        .lineBetween(anchor.x - 7, anchor.y, anchor.x + 7, anchor.y)
        .lineBetween(anchor.x, anchor.y - 7, anchor.x, anchor.y + 7);
      const text = scene.add.text(
        anchor.x - 150,
        body.y - 62,
        `${title}\n${body.w}x${body.h} px  offset ${body.visualAnchorOffsetYPx}px`,
        { fontFamily: "Arial", fontSize: "18px", color: "#ffffff", backgroundColor: "#111827dd", padding: { x: 10, y: 7 } },
      ).setDepth(1000000);
      scene.__colliderQaGraphics = graphics;
      scene.__colliderQaText = text;
      const camera = scene.cameras.main;
      return {
        enabled: controller.collisionPolishV2Enabled,
        profileId: body.collisionProfileId,
        width: body.w,
        height: body.h,
        anchor,
        screenX: anchor.x - camera.worldView.x,
        screenY: anchor.y - camera.worldView.y,
        animationKey,
        sheetKey,
        textureReady,
      };
    }, { profileId, animationProperty, sheetProperty, textureFrame, label });
    assert.equal(snapshot.enabled, true);
    assert.equal(snapshot.profileId, profileId);
    const clip = {
      x: Math.max(0, Math.min(920, snapshot.screenX - 180)),
      y: Math.max(0, Math.min(360, snapshot.screenY - 260)),
      width: 360,
      height: 360,
    };
    await page.screenshot({ path: path.join(OUTPUT, `${id}.png`), clip });
    return snapshot;
  }

  const evidence = {
    fixedFlightBefore: await capture("01-fixed-upright-body-on-flight-before", "upright", "flyAnim", "flySheet", 26, "BEFORE · fixed upright body on flight"),
    flightAfter: await capture("02-flight-envelope-after", "flight", "flyAnim", "flySheet", 26, "AFTER · pose-aware flight envelope"),
    locomotionAfter: await capture("03-locomotion-envelope-after", "locomotion", "walkLoopAnim", "walkLoopSheet", 14, "AFTER · protected locomotion core"),
    crouchAfter: await capture("04-crouch-envelope-after", "crouch", "duckAnim", "duckSheet", 9, "AFTER · clearance-safe crouch"),
  };
  assert.deepEqual(
    [evidence.flightAfter.width, evidence.flightAfter.height],
    [66, 34],
  );
  assert.deepEqual(
    [evidence.locomotionAfter.width, evidence.locomotionAfter.height],
    [48, 75],
  );
  const blockingIssues = issues.filter((issue) => (
    issue.startsWith("pageerror:")
    || (issue.startsWith("console:") && !issue.includes("favicon"))
  ));
  assert.deepEqual(blockingIssues, []);
  fs.writeFileSync(
    path.join(OUTPUT, "evidence.json"),
    `${JSON.stringify({ result: "PLAYER_COLLIDER_CONTACT_POLISH_V2_LIVE_QA_OK", evidence, issues }, null, 2)}\n`,
  );
  console.log("PLAYER_COLLIDER_CONTACT_POLISH_V2_LIVE_QA_OK", evidence);
} finally {
  await browser.close();
}
