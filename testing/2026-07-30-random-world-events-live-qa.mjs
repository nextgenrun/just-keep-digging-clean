// Exercises Sleeping Jackpot and the three retained ambient events in an isolated Edge runtime.
import fs from "node:fs";
import path from "node:path";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const OUTPUT_DIR = path.resolve("tmp/random-world-events-live-qa");
const BASE_URL = "http://127.0.0.1:8090/";
const DEBUG_PORT = 9396;
const EVENT_TYPES = Object.freeze([
  "crystalChoir",
  "blackoutBloom",
  "moneyMonsterRush",
]);

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find(value => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function scenarioUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("jkd_e2e", "1");
  url.searchParams.set("randomEventDebug", "1");
  return url.href;
}

async function launchPlayScene(client) {
  await client.waitFor(
    `Boolean(window.__phaserGame?.scene?.getScenes(true)?.some(
      scene => ["MainMenuScene", "StartMenuScene"].includes(scene.sys.settings.key)
    ))`,
    "main menu",
    120000,
  );
  await client.evaluate(`(() => {
    window.__phaserGame.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "random-world-events-live-qa",
      isNewSave: true,
      tutorialChoice: "no",
    });
    return true;
  })()`);
  await client.waitFor(
    `Boolean(
      window.__jkdE2E
      && window.__jkdRandomEvents
      && window.__phaserGame?.scene?.isActive("PlayScene")
      && window.__phaserGame.scene.getScene("PlayScene")?.randomEventBridge
    )`,
    "PlayScene random-event bridge",
    180000,
  );
  await delay(1500);
}

async function prepareGallery(client) {
  return client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    window.__jkdE2E.closeAll();
    const gallery = window.__jkdE2E.previewTextureAudit("sparse");
    const resources = scene.digSystem.getResourceTotals();
    Object.keys(resources).forEach((key, index) => { resources[key] = 8 + index * 3; });
    resources.copper = 37;
    scene.digSystem.setResourceTotals(resources);
    scene.upgradeSystem.setMoney(2500);
    scene.uiResourceBar?.setResources?.(resources);
    scene.uiResourceBar?.setMoney?.(2500);
    return {
      gallery,
      textures: {
        panel: scene.textures.exists("ui-sleeping-jackpot-panel-v1"),
        sigils: scene.textures.exists("environment-random-event-sigils-v1"),
      },
    };
  })()`);
}

async function captureJackpot(client, outputDir) {
  const state = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const resources = scene.digSystem.getResourceTotals();
    const modal = scene.randomEventBridge.jackpot.modal;
    modal.showChoice({
      quote: {
        immediate: {
          enabled: true,
          wager: 500,
          possibleGain: 1500,
          oddsBps: 5000,
          reason: "",
        },
        maturity: {
          enabled: true,
          targetDepth: 100,
          multiplier: 9,
          oddsBps: 5000,
          escrow: resources,
          reason: "",
        },
      },
      onConfirm: async () => ({ title: "QA RESULT", body: "NO SAVE WRITE" }),
      onCancel: () => undefined,
    });
    modal._select("maturity");
    for (const key of "RISKALL") {
      modal._handleKey({ key, preventDefault() {}, stopPropagation() {} });
    }
    return {
      visible: modal.isVisible,
      selected: modal.selected,
      buffer: modal.buffer,
      left: modal.leftBody.text,
      right: modal.rightBody.text,
      instruction: modal.instruction.text,
      blocked: scene._randomEventModalVisible === true,
    };
  })()`);
  await delay(350);
  const screenshotPath = path.join(outputDir, "sleeping-jackpot-riskall.png");
  await client.screenshot(screenshotPath);
  await client.evaluate(`window.__phaserGame.scene.getScene("PlayScene")
    .randomEventBridge.jackpot.modal._close()`);
  return { screenshotPath, state };
}

async function startEvent(client, type) {
  return client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const bridge = scene.randomEventBridge;
    window.__jkdE2E.closeAll();
    if (bridge.director.state.active) bridge._finishActive({ interrupted: true });
    const gallery = window.__jkdE2E.previewTextureAudit("sparse");
    const { left, top, playerTile } = gallery;
    const choirAnchors = [1, 3, 5, 7, 9].map(offset => ({
      tx: left + offset,
      ty: top + 5,
    }));
    const blackoutAnchors = [2, 6, 10].map(offset => ({
      tx: left + offset,
      ty: top + 4,
    }));
    const payloads = {
      crystalChoir: { anchors: choirAnchors, sequence: [2, 0, 4], startedDepth: 20 },
      blackoutBloom: { anchors: blackoutAnchors, targetResource: "copper", startedDepth: 20 },
      moneyMonsterRush: { targetResource: "copper", startedDepth: 20 },
    };
    const active = bridge.director.start(${JSON.stringify(type)}, payloads[${JSON.stringify(type)}]);
    if (!active) throw new Error("Could not start ${type}");
    bridge._announceStart(active);
    bridge._syncPresentation(performance.now(), playerTile);
    return bridge.getSnapshot();
  })()`);
}

async function captureEvent(client, outputDir, type) {
  const started = await startEvent(client, type);
  await delay(type === "blackoutBloom" ? 1500 : 500);
  let rushFreeze = null;
  if (type === "moneyMonsterRush") {
    await client.evaluate(`window.__jkdE2E.open("moneyMonster")`);
    const before = await client.evaluate(`window.__jkdRandomEvents.snapshot().active.remainingMs`);
    await delay(1200);
    const after = await client.evaluate(`window.__jkdRandomEvents.snapshot().active.remainingMs`);
    rushFreeze = { before, after, driftMs: before - after };
  }
  const runtime = await client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const bridge = scene.randomEventBridge;
    const active = bridge.director.state.active;
    const visibleText = scene.children.list
      .filter(object => typeof object.text === "string" && object.visible)
      .map(object => object.text)
      .filter(Boolean);
    return {
      active: bridge.getSnapshot().active,
      ribbonVisible: bridge.view.ribbon.visible,
      ribbonTitle: bridge.view.ribbonTitle.text,
      ribbonDetail: bridge.view.ribbonDetail.text,
      nodes: bridge.view.nodeImages.length,
      visibleNodes: bridge.view.nodeImages.filter(node => node.visible).length,
      ambient: scene.lightSystem?._randomEventPresentation || null,
      rushHeader: bridge.getShopHeader("moneyMonster"),
      rushRow: bridge.getRushRowStatus("copper", "moneyMonster"),
      visibleText,
      uiErrors: [...(window.__jkdUiErrors || [])],
    };
  })()`);
  const screenshotPath = path.join(outputDir, `${type}.png`);
  await client.screenshot(screenshotPath);
  await client.evaluate(`(() => {
    window.__jkdE2E.closeAll();
    window.__jkdRandomEvents.cancel();
  })()`);
  return { type, screenshotPath, started, runtime, rushFreeze };
}

function assertReport(report) {
  if (!report.prepared.textures.panel || !report.prepared.textures.sigils) {
    throw new Error("Approved random-event textures were not loaded");
  }
  const jackpot = report.jackpot.state;
  if (!jackpot.visible || !jackpot.blocked || jackpot.selected !== "maturity" || jackpot.buffer !== "RISKALL") {
    throw new Error("Sleeping Jackpot typed-verification modal did not reach the expected state");
  }
  const normalizedMoneyCopy = jackpot.left.replace(/[,.]/g, "");
  if (!normalizedMoneyCopy.includes("YOU WILL GAMBLE 500 M") || !normalizedMoneyCopy.includes("YOU CAN GAIN +1500 M")) {
    throw new Error("Sleeping Jackpot exact money communication is missing");
  }
  if (!jackpot.right.includes("WIN: ×9 ALL RESOURCES") || !jackpot.right.includes("LOSE: ALL STAKED RESOURCES")) {
    throw new Error("Sleeping Jackpot maturity communication is missing");
  }
  const expectedNodes = { crystalChoir: 5, blackoutBloom: 3, moneyMonsterRush: 0 };
  for (const capture of report.events) {
    if (capture.runtime.active?.type !== capture.type || !capture.runtime.ribbonVisible) {
      throw new Error(`${capture.type} did not stay active with its ribbon visible`);
    }
    if (capture.runtime.nodes !== expectedNodes[capture.type]) {
      throw new Error(`${capture.type} rendered ${capture.runtime.nodes} nodes; expected ${expectedNodes[capture.type]}`);
    }
    if (capture.runtime.uiErrors.length) throw new Error(`${capture.type} produced UI errors`);
  }
  const blackout = report.events.find(entry => entry.type === "blackoutBloom");
  if (!(blackout.runtime.ambient?.ambientVisibilityScale < 1)) {
    throw new Error("Blackout Bloom did not contract ambient presentation lighting");
  }
  const rush = report.events.find(entry => entry.type === "moneyMonsterRush");
  if (!rush.runtime.rushHeader?.includes("COPPER ×2") || !rush.runtime.rushRow?.includes("RUSH ×2")) {
    throw new Error("Money Monster Rush shop communication is missing");
  }
  if (rush.rushFreeze.driftMs > 120) throw new Error("Money Monster Rush timer advanced while its shop was open");
  if (report.browserErrors.length) throw new Error("Browser runtime exceptions were recorded");
}

async function main() {
  const outputDir = path.resolve(argument("output", OUTPUT_DIR));
  fs.mkdirSync(outputDir, { recursive: true });
  const debugPort = Number(argument("port", DEBUG_PORT));
  const edge = launchSurfaceHeroQaEdge({
    edgePath: argument("edge", ""),
    port: debugPort,
  });
  let client = null;
  try {
    const webSocketUrl = await waitForTarget(debugPort);
    client = await new CdpClient(webSocketUrl).connect();
    await client.send("Network.enable");
    await client.send("Page.navigate", { url: scenarioUrl(argument("url", BASE_URL)) });
    await client.waitFor(
      `document.readyState === "complete" && Boolean(window.__phaserGame)`,
      "game boot",
      30000,
    );
    await launchPlayScene(client);
    const report = {
      schema: "random-world-events-live-qa@2",
      generatedUtc: new Date().toISOString(),
      prepared: await prepareGallery(client),
      jackpot: await captureJackpot(client, outputDir),
      events: [],
      browserErrors: [],
    };
    for (const type of EVENT_TYPES) report.events.push(await captureEvent(client, outputDir, type));
    report.browserErrors = client.events.filter(event => event.method === "Runtime.exceptionThrown");
    assertReport(report);
    const reportPath = path.join(outputDir, "live-qa-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`random-world-events live QA ok: ${reportPath}`);
  } finally {
    try {
      await Promise.race([client?.send("Browser.close"), delay(1500)]);
    } catch (_) { edge.kill(); }
    client?.close();
    edge.kill();
  }
}
await main();
