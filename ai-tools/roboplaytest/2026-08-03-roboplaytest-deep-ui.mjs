async function auditOnboardingAndDisclosure(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { SYSTEM_INTRODUCTION_CONFIG } = await import("/values/systemIntroduction.js");
    const { UPGRADES } = await import("/values/upgradeDefinitions.js");
    const config = SYSTEM_INTRODUCTION_CONFIG;
    const thresholdEntries = Object.entries(config.thresholds);
    const depthThresholds = thresholdEntries.filter(([key]) => key.endsWith("Depth"));
    const depthValues = depthThresholds.map(([, value]) => value);
    const depthsIncrease = depthValues.every((value, index) => (
      index === 0 || value > depthValues[index - 1]
    ));
    const talentLevel = config.thresholds.talentLevel;
    const validTalentLevel = Number.isInteger(talentLevel) && talentLevel >= 1;
    const validSignals = new Set([
      "always",
      ...Object.keys(config.featureUnlocks),
      ...Object.values(config.featureUnlocks),
    ]);
    const invalidFeatures = Object.entries(config.featureUnlocks)
      .filter(([, signal]) => !validSignals.has(signal)).map(([feature]) => feature);
    const invalidMerchants = Object.entries(config.merchantUnlocks)
      .filter(([, feature]) => !validSignals.has(feature)).map(([merchant]) => merchant);
    const invalidUpgradeIds = Object.keys(config.upgradeUnlocks)
      .filter(id => !Object.hasOwn(UPGRADES, id));
    const invalidUpgradeSignals = Object.entries(config.upgradeUnlocks)
      .filter(([, signal]) => !validSignals.has(signal)).map(([id]) => id);
    const invalidPromises = config.promiseOrder
      .filter(item => !validSignals.has(item.feature))
      .map(item => item.feature);
    const tutorial = scene.townSquareTutorialSystem?.getHealthSnapshot?.() || null;
    const firstFive = scene.townSquareTutorialSystem?.firstFive?.getHealthSnapshot?.() || null;
    const introduction = scene.systemIntroductionSystem?.getHealthSnapshot?.() || null;
    const nextPromise = scene.systemIntroductionSystem?.getNextPromise?.() || null;
    const failures = {
      depthThresholdOrder: depthsIncrease ? [] : depthThresholds,
      invalidTalentLevel: validTalentLevel ? [] : [talentLevel],
      invalidFeatures,
      invalidMerchants,
      invalidUpgradeIds,
      invalidUpgradeSignals,
      invalidPromises,
    };
    if (!tutorial || !introduction || Object.values(failures).some(items => items.length)) {
      throw new Error(`Onboarding/disclosure contract failed: ${JSON.stringify(failures)}`);
    }
    return {
      tutorial,
      firstFive,
      introduction,
      nextPromise,
      thresholds: Object.fromEntries(thresholdEntries),
      featureCount: Object.keys(config.featureUnlocks).length,
      merchantCount: Object.keys(config.merchantUnlocks).length,
      upgradeGateCount: Object.keys(config.upgradeUnlocks).length,
      promiseCount: config.promiseOrder.length,
    };
  });
}

async function exerciseUiSurfaceMatrix(driver) {
  return driver.page.evaluate(async () => {
    const harness = globalThis.__jkdE2E;
    if (!harness) throw new Error("JkdE2EHarness is not installed.");
    const cases = [
      ["pause", {}, state => state.pauseOpen],
      ["pauseSettings", { settingsTab: "audio" }, state => state.pauseOpen],
      ["pauseSettings", { settingsTab: "controls" }, state => state.pauseOpen],
      ["pauseSettings", { settingsTab: "display" }, state => state.pauseOpen],
      ["playerUpgrades", {}, state => state.shopVisible],
      ["gearMerchant", {}, state => state.shopVisible],
      ["gemPowerMerchant", {}, state => state.shopVisible],
      ["boboMerchant", {}, state => state.shopVisible],
      ["moneyMonster", { sellMode: true }, state => state.shopVisible],
      ["inventory", {}, state => state.inventoryOpen],
      ["levelChoice", {}, () => true],
      ["levelContinue", {}, () => true],
      ["campfire", {}, state => state.campfireOpen],
      ["milestone", {}, state => state.milestoneOpen],
      ["depth100", {}, state => state.depthGateOpen && state.depthGateThreshold === 100],
      ["depth300", {}, state => state.depthGateOpen && state.depthGateThreshold === 300],
      ["depth1000", {}, state => state.depthGateOpen && state.depthGateThreshold === 1000],
      ["dialog", {}, state => state.dialogVisible],
    ];
    const activeSurfaces = state => [
      ["pause", state.pauseOpen], ["shop", state.shopVisible], ["inventory", state.inventoryOpen],
      ["campfire", state.campfireOpen], ["milestone", state.milestoneOpen], ["starChart", state.starChartOpen],
      ["depthGate", state.depthGateOpen], ["dialog", state.dialogVisible],
    ].filter(([, active]) => active).map(([name]) => name);
    const waitForUi = async predicate => {
      const deadline = performance.now() + 5_000;
      while (!predicate() && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    };


    const results = [];
    for (const [surface, options, predicate] of cases) {
      const opened = harness.open(surface, options);
      await new Promise(resolve => setTimeout(resolve, 35));
      const state = harness.getState();
      const openSurfaces = activeSurfaces(state);
      const expectsModal = surface !== "levelChoice" && surface !== "levelContinue";
      const exclusive = openSurfaces.length === (expectsModal ? 1 : 0);
      const passed = opened.ok === true && predicate(state) && exclusive;
      const cleanupImmediate = harness.closeAll();
      await waitForUi(() => activeSurfaces(harness.getState()).length === 0);
      const cleanupState = harness.getState();
      const cleanupSurfaces = activeSurfaces(cleanupState);
      const cleanupPassed = cleanupSurfaces.length === 0
        && cleanupState.gameState === "playing" && cleanupState.controlsEnabled === true;
      results.push({ surface, options, passed, openSurfaces, state,
        cleanup: { passed: cleanupPassed, activeSurfaces: cleanupSurfaces, immediate: cleanupImmediate, state: cleanupState } });
      if (!passed) throw new Error(`UI surface ${surface} was not healthy and mutually exclusive: ${JSON.stringify(openSurfaces)}.`);
      if (!cleanupPassed) throw new Error(`UI surface ${surface} survived closeAll: ${JSON.stringify({ cleanupSurfaces, cleanupState })}`);
    }
    const finalSurface = harness.open("pauseSettings", { settingsTab: "display" });
    return { surfaceCount: results.length, results, finalSurface };
  });
}

async function exerciseAudioContract(driver) {
  await driver.page.keyboard.press("Enter").catch(() => undefined);
  await driver.closeTransientUi();
  return driver.page.evaluate(() => {
    const sound = globalThis.__phaserGame.scene.getScene("PlayScene").soundSystem;
    const before = {
      masterVolume: sound.masterVolume,
      musicVolume: sound.musicVolume,
      sfxVolume: sound.sfxVolume,
      voiceVolume: sound.voiceVolume,
      musicEnabled: sound.musicEnabled,
      sfxEnabled: sound.sfxEnabled,
    };
    sound.applySettings({
      masterVolume: 0.37,
      musicVolume: 0.41,
      sfxVolume: 0.43,
      voiceVolume: 0.47,
    });
    const applied = {
      masterVolume: sound.masterVolume,
      musicVolume: sound.musicVolume,
      sfxVolume: sound.sfxVolume,
      voiceVolume: sound.voiceVolume,
    };
    const exact = applied.masterVolume === 0.37
      && applied.musicVolume === 0.41
      && applied.sfxVolume === 0.43
      && applied.voiceVolume === 0.47;
    sound.applySettings(before);
    const restored = {
      masterVolume: sound.masterVolume,
      musicVolume: sound.musicVolume,
      sfxVolume: sound.sfxVolume,
      voiceVolume: sound.voiceVolume,
      musicEnabled: sound.musicEnabled,
      sfxEnabled: sound.sfxEnabled,
    };
    if (!exact || JSON.stringify(before) !== JSON.stringify(restored)) {
      throw new Error("Sound volume settings did not apply and restore exactly.");
    }
    return { before, applied, restored, runtimeAssets: sound.getRuntimeAudioSnapshot?.() || null };
  });
}

async function openStarlightAssets(driver) {
  const before = await driver.page.evaluate(() => {
    const system = globalThis.__phaserGame.scene.getScene("PlayScene").starPillarSystem;
    return {
      viewOpen: system._isViewOpen === true,
      viewLoading: system._isViewLoading === true,
      ...system.getTalentTreeHealthSnapshot(),
    };
  });
  await driver.page.evaluate(() => {
    globalThis.__jkdE2E.closeAll();
    const system = globalThis.__phaserGame.scene.getScene("PlayScene").starPillarSystem;
    if (!system.openConstellationView()) throw new Error("Starlight view rejected the open request.");
  });
  await driver.waitFor(() => {
    const system = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.starPillarSystem;
    return system?._isViewOpen === true && system?.getTalentTreeHealthSnapshot?.().ready === true;
  }, "the Starlight lazy asset group and active talent-tree view", driver.config.loadTimeoutMs);
  const active = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    return {
      viewOpen: system._isViewOpen === true,
      viewLoading: system._isViewLoading === true,
      ...system.getTalentTreeHealthSnapshot(),
      featureAssets: scene.runtimeFeatureAssetManager?.getSnapshot?.() || null,
    };
  });
  if (!active.ready || !active.viewOpen) throw new Error("Starlight view opened without a healthy asset set.");
  return { before, active };
}

async function releaseStarlightAssets(driver) {
  const beforeErrorCount = await driver.page.evaluate(() => (globalThis.__jkdUiErrors || []).length);
  await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    scene.starPillarSystem.closeConstellationView();
  });
  await driver.waitFor(() => {
    const system = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.starPillarSystem;
    return system?._isViewOpen === false && system?._isViewLoading === false;
  }, "the Starlight view to close", 15_000);
  const releaseDelayMs = await driver.page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .runtimeFeatureAssetManager?.config?.featureResidency?.releaseDelayMs || 5_000
  ));
  await driver.page.waitForTimeout(releaseDelayMs + 1_000);
  const released = await driver.page.evaluate((errorOffset) => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    const health = system.getTalentTreeHealthSnapshot();
    return {
      viewOpen: system._isViewOpen === true,
      retained: system._starlightFeatureRetained === true,
      ready: health.ready,
      missingTextureCount: health.missingTextures.length,
      featureAssets: scene.runtimeFeatureAssetManager?.getSnapshot?.() || null,
      runtimeErrors: (globalThis.__jkdUiErrors || []).slice(errorOffset),
    };
  }, beforeErrorCount);
  if (released.viewOpen || released.retained) throw new Error("Starlight assets retained a closed view consumer.");
  if (released.runtimeErrors.length) {
    driver.report.addIssue(
      "error",
      "starlight-release",
      `Closing Starlight caused ${released.runtimeErrors.length} renderer error(s).`,
      released.runtimeErrors,
    );
  }
  return { released };
}

export async function runDeepUiScenarios(driver) {
  await driver.runPhase(
    { id: "onboarding-disclosure", title: "First-five and staged system-disclosure contracts", category: "onboarding" },
    () => auditOnboardingAndDisclosure(driver),
  );
  await driver.runPhase(
    { id: "ui-surface-matrix", title: "Supported pause, shop, inventory, board, gate, and dialog surfaces", category: "ui" },
    () => exerciseUiSurfaceMatrix(driver),
  );
  await driver.runPhase(
    { id: "audio-settings", title: "Reversible settings and runtime-audio contract", category: "audio" },
    () => exerciseAudioContract(driver),
  );
}

export async function runStarlightScenarios(driver) {
  await driver.runPhase(
    { id: "starlight-assets", title: "Starlight lazy-load and active-view health", category: "ui" },
    () => openStarlightAssets(driver),
  );
  await driver.runPhase(
    { id: "starlight-release", title: "Starlight view close and lazy asset release", category: "ui" },
    () => releaseStarlightAssets(driver),
  );
}
