import {
  runEarlyDeepScenarios,
  runLateDeepScenarios,
} from "./2026-08-03-roboplaytest-deep-scenarios.mjs";

async function bootFreshSave(driver) {
  const { page, config } = driver;
  await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: config.loadTimeoutMs });
  await driver.waitFor(() => {
    const scenes = globalThis.__phaserGame?.scene?.getScenes?.(true) || [];
    return scenes.some(scene => ["MainMenuScene", "StartMenuScene"].includes(scene.scene?.key));
  }, "main menu", config.loadTimeoutMs);

  let active = await page.evaluate(() => (
    globalThis.__phaserGame.scene.getScenes(true).map(scene => scene.scene.key)
  ));
  if (active.includes("MainMenuScene")) {
    await page.keyboard.press("Enter");
    await driver.waitFor(() => globalThis.__phaserGame?.scene?.isActive?.("StartMenuScene"), "save-slot menu");
  }

  await page.keyboard.press("1");
  await page.keyboard.press("Space");
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.getScene?.("StartMenuScene")?._modeSelector?.isVisible === true
  ), "casual/hardcore selector");
  await page.waitForTimeout(80);
  await page.keyboard.press("Enter");
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.getScene?.("StartMenuScene")?._tutorialSelector?.isVisible === true
  ), "tutorial selector");
  await page.waitForTimeout(80);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.isActive?.("PlayScene")
    && globalThis.__jkdE2E
  ), "PlayScene and E2E harness", config.loadTimeoutMs);
  const openingGateStartedAt = Date.now();
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    return Boolean(scene) && scene._teleportInAnimating !== true;
  }, "opening player animation to release gameplay actions", config.loadTimeoutMs);
  const openingGateWaitMs = Date.now() - openingGateStartedAt;
  await page.waitForTimeout(500);
  active = await page.evaluate(() => globalThis.__phaserGame.scene.getScenes(true).map(scene => scene.scene.key));
  if (!active.includes("PlayScene")) throw new Error(`PlayScene is not active: ${active.join(", ")}`);
  return { activeScenes: active, saveSlot: 1, tutorial: "no", openingGateWaitMs };
}

async function purchaseFirstUpgrade(driver) {
  return driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    globalThis.__jkdE2E.closeAll();
    scene.upgradeSystem.setMoney(5_000);
    const opened = scene.shopOverlay.show("playerUpgrades");
    if (!opened) throw new Error("Player upgrade shop did not open.");
    const candidate = scene.shopOverlay.allUpgrades.find(item => (
      item.availability?.available !== false
      && scene.upgradeSystem.canPurchaseUpgrade(item.id).canPurchase
    ));
    if (!candidate) throw new Error("No purchasable player upgrade was exposed by the shop.");
    const before = scene.upgradeSystem.getUpgradeLevel(candidate.id);
    scene.shopOverlay.purchaseUpgrade(candidate.id);
    const after = scene.upgradeSystem.getUpgradeLevel(candidate.id);
    if (after <= before) throw new Error(`Shop purchase did not advance ${candidate.id}.`);
    globalThis.__jkdE2E.closeAll();
    return { upgradeId: candidate.id, before, after };
  });
}

async function exerciseDepthGates(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { DEPTH_GATE_CONFIG } = await import("/values/depthGateConfig.js");
    scene.depthGateSystem.accepted.clear();
    const transitions = [];
    for (const gate of DEPTH_GATE_CONFIG.gates) {
      scene.retentionProgressSystem.updateDepth(gate.threshold);
      const opened = scene.depthGateSystem._open(gate);
      if (!opened || !scene.depthGateSystem.isOpen()) {
        throw new Error(`Depth gate ${gate.threshold}m did not open.`);
      }
      const modal = scene.depthGateSystem.modal;
      modal.buffer = modal.confirmationWord;
      await modal._commitConfirmation();
      const accepted = scene.depthGateSystem.accepted.has(gate.threshold);
      if (!accepted || modal.isVisible || scene.depthGateSystem.isOpen()) {
        throw new Error(`Depth gate ${gate.threshold}m did not persist acceptance.`);
      }
      transitions.push({ threshold: gate.threshold, opened, accepted });
    }
    scene.journeySystem.update(Number.MAX_SAFE_INTEGER);
    return { transitions, saveData: scene.depthGateSystem.getSaveData() };
  });
}

async function enterWorldTwo(driver) {
  const setup = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const grant = scene.upgradeSystem.grantUpgrade("worldTwoTunnelAccess");
    scene.surfaceTunnelDoorSystem?.syncFromUpgrade?.(true);
    scene.upgradeSystem.setGodMode(true);
    scene.playerController?.abilities?.setGodMode?.(true);
    return {
      grant,
      owned: scene.upgradeSystem.getUpgradeLevel("worldTwoTunnelAccess"),
      layout: scene.worldModel.getSecondWorldLayoutHealth?.() || null,
    };
  });
  const target = await driver.teleportToDepth(110, 2);
  if (!setup.owned || !target) throw new Error("World Two access did not become playable.");
  return { ...setup, target };
}

async function completeHeavenblocks(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { HEAVENBLOCKS_PROGRESSION_CONFIG } = await import(
      "/values/heavenblocksProgressionConfig.js"
    );
    const progression = scene.heavenblocksProgressionSystem;
    scene.ancientRelicSystem.add(18);
    progression.syncRelicEligibility();
    const gate = progression.activateSkyGate();
    if (!gate.success) throw new Error(`Sky Gate failed: ${gate.reason}`);
    const transitions = [];
    for (const region of HEAVENBLOCKS_PROGRESSION_CONFIG.regions) {
      const visit = progression.visitRegion(region.id);
      const complete = progression.completeRegion(region.id);
      const discover = progression.discoverPart(region.uniquePartId);
      const install = progression.installPart(region.uniquePartId);
      if (![visit, complete, discover, install].every(result => result.success)) {
        throw new Error(`Heavenblock region failed: ${region.id}`);
      }
      transitions.push({ regionId: region.id, partId: region.uniquePartId });
    }
    scene.journeySystem.update(Number.MAX_SAFE_INTEGER);
    return { transitions, state: progression.getSaveData() };
  });
}

async function forgeArcCore(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { CRAFTING_RECIPE_IDS } = await import("/values/craftingRecipes.js");
    const resources = Object.fromEntries(
      Object.keys(scene.digSystem.getResourceTotals()).map(key => [key, 5_000]),
    );
    scene.digSystem.setResourceTotals(resources);
    const status = scene.craftingSystem.getRecipeStatus(CRAFTING_RECIPE_IDS.ARC_CORE);
    if (!status.canCraft) throw new Error(`Arc Core not craftable: ${status.reason}`);
    const result = scene.craftingSystem.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
    if (!result.success) throw new Error(`Arc Core craft failed: ${result.reason}`);
    scene.journeySystem.recordCraft(result);
    scene.arcCoreVehicleSystem?.syncOwnership?.();
    return { status, result, owned: scene.upgradeSystem.getUpgradeLevel("arcCoreVehicle") };
  });
}

async function forgeOmegaArcCore(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { CRAFTING_RECIPE_IDS } = await import("/values/craftingRecipes.js");
    const { HEAVENBLOCKS_PROGRESSION_CONFIG } = await import(
      "/values/heavenblocksProgressionConfig.js"
    );
    const progression = scene.heavenblocksProgressionSystem;
    const vaults = HEAVENBLOCKS_PROGRESSION_CONFIG.omegaVaults.map(vault => {
      const result = progression.openOmegaVault(vault.id);
      if (!result.success) throw new Error(`Omega vault failed: ${vault.id}`);
      return { vaultId: vault.id, result };
    });
    const status = scene.craftingSystem.getRecipeStatus(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE);
    if (!status.canCraft) throw new Error(`Omega Arc Core not craftable: ${status.reason}`);
    const result = scene.craftingSystem.craft(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE);
    if (!result.success) throw new Error(`Omega Arc Core craft failed: ${result.reason}`);
    scene.journeySystem.recordCraft(result);
    scene.arcCoreVehicleSystem?.syncOwnership?.();
    scene.journeySystem.update(Number.MAX_SAFE_INTEGER);
    return {
      vaults,
      result,
      state: progression.getSaveData(),
      owned: scene.upgradeSystem.getUpgradeLevel("omegaArcCoreVehicle"),
    };
  });
}

async function verifyFinalState(driver) {
  const target = await driver.teleportToDepth(4_990, 2);
  await driver.page.waitForTimeout(500);
  const result = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    scene.retentionProgressSystem.updateDepth(5_000);
    scene.journeySystem.update(Number.MAX_SAFE_INTEGER);
    const snapshot = scene.journeySystem.captureSnapshot();
    const heavenblocks = scene.heavenblocksProgressionSystem.getSaveData();
    const omegaOwned = scene.upgradeSystem.getUpgradeLevel("omegaArcCoreVehicle") > 0;
    const complete = omegaOwned
      && heavenblocks.installedPartIds.length === 3
      && heavenblocks.openedOmegaVaultIds.length === 3
      && heavenblocks.zenithKeystone
      && snapshot.progress.bestDepth >= 5_000;
    return { complete, omegaOwned, heavenblocks, journey: snapshot, gameState: scene.gameState };
  });
  if (!result.complete) throw new Error("The authoritative critical-path completion invariant was not met.");
  return { ...result, target };
}

export async function runRoboplaytestScenarios(driver) {
  await driver.runPhase(
    { id: "fresh-save", title: "Boot, menu navigation, and isolated fresh save", fatal: true },
    () => bootFreshSave(driver),
  );
  await driver.runPhase(
    { id: "starter-dig", title: "Real keyboard mining input changes a live tile" },
    async () => driver.minePreparedTarget(await driver.prepareStarterMineTarget()),
  );
  await driver.runPhase(
    { id: "first-upgrade", title: "Player shop completes a permanent upgrade transaction" },
    () => purchaseFirstUpgrade(driver),
  );
  if (driver.config.profile === "deep") await runEarlyDeepScenarios(driver);
  await driver.runPhase(
    { id: "depth-gates", title: "100m, 300m, and 1000m gates open and accept", accelerated: true },
    () => exerciseDepthGates(driver),
  );
  await driver.runPhase(
    { id: "world-two", title: "World Two unlock and deep renderer checkpoint", accelerated: true },
    () => enterWorldTwo(driver),
  );
  await driver.runPhase(
    { id: "heavenblocks", title: "Three Heavenblock regions and parts complete", accelerated: true },
    () => completeHeavenblocks(driver),
  );
  await driver.runPhase(
    { id: "arc-core", title: "Arc Core recipe validates and crafts", accelerated: true },
    () => forgeArcCore(driver),
  );
  await driver.runPhase(
    { id: "omega-arc-core", title: "Three Omega vaults unlock the final forge", accelerated: true },
    () => forgeOmegaArcCore(driver),
  );
  await driver.runPhase(
    { id: "critical-path-end", title: "5000m and Omega Arc Core completion invariant", accelerated: true },
    () => verifyFinalState(driver),
  );
  if (driver.config.profile === "deep") await runLateDeepScenarios(driver);
}
