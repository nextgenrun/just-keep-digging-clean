export async function clickRuntimeControl(driver, locator, label, argument = null) {
  const point = await driver.page.evaluate(locator, argument);
  if (!point) throw new Error(`${label} has no live pointer target.`);
  console.log(`[roboplaytest:ui] CLICK ${label} @ ${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  // Match a human pointer path so Phaser receives pointerover before the
  // press. Playwright's instantaneous click can skip hover registration on a
  // frame-stalled WebGL canvas.
  await driver.page.mouse.move(point.x, point.y);
  await driver.page.waitForTimeout(180);
  await driver.page.mouse.down();
  // Keep the button held across at least one streamed-asset frame so Phaser
  // observes both pointer edges under the same conditions as a deliberate click.
  await driver.page.waitForTimeout(500);
  await driver.page.mouse.up();
  await driver.page.waitForTimeout(120);
  await driver.page.waitForTimeout(180);
  return point;
}

async function activateRuntimeControl(driver, locator, label, argument = null) {
  const activated = await driver.page.evaluate(locator, argument);
  if (activated !== true) throw new Error(`${label} could not be activated.`);
  console.log(`[roboplaytest:ui] ACTIVATE ${label}`);
  await driver.page.waitForTimeout(180);
  return true;
}

async function inventoryMatrix(driver) {
  const { page } = driver;
  await driver.closeTransientUi();
  await page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    if (scene.systemIntroductionSystem) {
      scene.systemIntroductionSystem.isFeatureAvailable = () => true;
    }
  });
  await page.keyboard.press("i");
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.uiInventoryPopup?.isOpen === true
  ), "the I-menu to open");

  const result = { tabs: [], stars: null };
  for (const index of [0, 1]) {
    await activateRuntimeControl(driver, tabIndex => {
      const popup = globalThis.__phaserGame.scene.getScene("PlayScene").uiInventoryPopup;
      popup.tabs?.setActive?.(tabIndex);
      return true;
    }, `I-menu tab ${index}`, index);
    const state = await page.evaluate(() => (
      globalThis.__phaserGame.scene.getScene("PlayScene").uiInventoryPopup.getHealthSnapshot()
    ));
    if (state.activeTab !== index || state.selectedTab !== index) {
      throw new Error(
        `I-menu tab ${index} did not activate: ${JSON.stringify(state)}`
      );
    }
    result.tabs.push({ index, state });
  }

  const resourceCount = await page.evaluate(() => {
    const popup = globalThis.__phaserGame.scene.getScene("PlayScene").uiInventoryPopup;
    return popup.shell.content.list.filter(child => (
      child?.list?.some?.(item => item?.input?.enabled === true)
    )).length;
  });
  if (resourceCount < 14) {
    throw new Error(`World Guide exposed only ${resourceCount} clickable resource rows.`);
  }

  await activateRuntimeControl(driver, () => {
    const popup = globalThis.__phaserGame.scene.getScene("PlayScene").uiInventoryPopup;
    popup.tabs?.setActive?.(2);
    return true;
  }, "STAR ATLAS tab");
  await driver.waitFor(() => {
    const popup = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.uiInventoryPopup;
    return popup?.activeTab === 2 && popup?.tabs?.getActive?.() === 2;
  }, "STAR ATLAS content", driver.config.loadTimeoutMs);
  result.stars = await page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const popup = scene.uiInventoryPopup;
    return {
      state: popup.getHealthSnapshot(),
      assets: scene.runtimeFeatureAssetManager?.getSnapshot?.() || null,
      foundationReady: scene.textures.exists("star-atlas-foundation-v1"),
    };
  });

  await activateRuntimeControl(driver, () => {
    const popup = globalThis.__phaserGame.scene.getScene("PlayScene").uiInventoryPopup;
    return popup.returnButton?.activate?.() === true;
  }, "I-menu Return to Game");
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.uiInventoryPopup?.isOpen === false
  ), "the I-menu to close");
  return { ...result, resourceCount };
}

async function pauseTab(driver, key) {
  await activateRuntimeControl(driver, tabKey => {
    const pause = globalThis.__phaserGame.scene.getScene("PlayScene")._pausePanel;
    const index = pause?.state?.tabKeys?.indexOf(tabKey) ?? -1;
    if (index < 0) return false;
    pause?.state?.tabs?.setActive?.(index);
    return true;
  }, `ESC ${key} tab`, key);
  await driver.waitFor(tabKey => {
    const pause = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?._pausePanel;
    return pause?.state?.tabKeys?.[pause?.state?.activeTab] === tabKey;
  }, `ESC ${key} content`, driver.config.phaseTimeoutMs, key);
  return true;
}

async function pauseMatrix(driver) {
  const { page } = driver;
  const opened = await page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene").showPauseMenu?.() === true
  ));
  if (!opened) throw new Error("The ESC menu public open route returned false.");
  await driver.waitFor(() => Boolean(
    globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?._pausePanel
  ), "the ESC menu to open");
  const result = { tabs: [] };

  for (const key of ["general", "saves", "journey", "titans", "settings", "talents"]) {
    await pauseTab(driver, key);
    result.tabs.push({ key });
    if (key === "saves") {
      await activateRuntimeControl(driver, () => {
        const pause = globalThis.__phaserGame.scene.getScene("PlayScene")._pausePanel;
        return pause?.state?.saveTransfer?.getControls?.()?.[0]?.activate?.() === true;
      }, "Save Now");
    } else if (key === "journey") {
      const goalCount = await page.evaluate(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene")
          .journeySystem?.getViewModel?.()?.goals?.length || 0
      ));
      if (goalCount < 1) {
        throw new Error("Journey opened without any goals in the full-review profile.");
      }
    } else if (key === "titans") {
      await page.waitForTimeout(500);
      await clickRuntimeControl(driver, () => {
        const pause = globalThis.__phaserGame.scene.getScene("PlayScene")._pausePanel;
        return globalThis.__jkdUiPoint(pause?.state?.titanArchive?.controls?.[24]?.hit);
      }, "Titan 25");
      await driver.waitFor(() => (
        globalThis.__phaserGame?.scene?.getScene?.("PlayScene")
          ?._pausePanel?.state?.titanArchive?.selectedIndex === 24
      ), "Titan 25 pointer selection", 5000);
    } else if (key === "settings") {
      for (let index = 0; index < 4; index += 1) {
        await activateRuntimeControl(driver, tabIndex => {
          const settings = globalThis.__phaserGame.scene.getScene("PlayScene")
            ._pausePanel?.state?.settings;
          settings?.tabs?.setActive?.(tabIndex);
          return true;
        }, `Settings tab ${index}`, index);
        const selected = await page.evaluate(() => (
          globalThis.__phaserGame.scene.getScene("PlayScene")
            ._pausePanel.state.settings.tabs.getActive()
        ));
        if (selected !== index) throw new Error(`Settings tab ${index} selected ${selected}.`);
      }
    } else if (key === "talents") {
      const before = await page.evaluate(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene")
          ._pausePanel.state.talentTree.selectedIndex
      ));
      const targetIndex = before === 1 ? 2 : 1;
      await clickRuntimeControl(driver, nodeIndex => {
        const tree = globalThis.__phaserGame.scene.getScene("PlayScene")
          ._pausePanel?.state?.talentTree;
        return globalThis.__jkdUiPoint(tree?.nodes?.[nodeIndex]?.hit);
      }, "Stars talent node", targetIndex);
      const after = await page.evaluate(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene")
          ._pausePanel.state.talentTree.selectedIndex
      ));
      if (after !== targetIndex) {
        throw new Error(`Stars pointer selected ${after}; expected ${targetIndex}.`);
      }
      await clickRuntimeControl(driver, () => {
        const tree = globalThis.__phaserGame.scene.getScene("PlayScene")
          ._pausePanel?.state?.talentTree;
        return globalThis.__jkdUiPoint(tree?.closeHit);
      }, "Stars ESC label");
      await driver.waitFor(() => {
        const pause = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?._pausePanel;
        return pause?.state?.tabKeys?.[pause?.state?.activeTab] === "general";
      }, "Stars ESC label to return to General");
    }
  }

  const pause = await page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return {
      tabKeys: scene._pausePanel?.state?.tabKeys || [],
      uiErrors: [...(globalThis.__jkdUiErrors || [])],
    };
  });
  if (pause.uiErrors.length) {
    throw new Error(`Menu matrix produced UI errors: ${JSON.stringify(pause.uiErrors)}`);
  }
  await page.evaluate(() => {
    globalThis.__phaserGame.scene.getScene("PlayScene").resumeGame?.();
  });
  await driver.waitFor(() => (
    !globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?._pausePanel
  ), "the ESC menu to close");
  return { ...result, ...pause };
}

export async function runUiMenuAuditScenarios(driver) {
  await driver.page.evaluate(() => {
    globalThis.__jkdUiPoint = displayObject => {
      const point = displayObject?.getWorldTransformMatrix?.().transformPoint?.(0, 0);
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
      const canvas = document.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect?.();
      const width = displayObject?.scene?.scale?.width || rect?.width;
      const height = displayObject?.scene?.scale?.height || rect?.height;
      if (!rect || !width || !height) return { x: point.x, y: point.y };
      return {
        x: rect.left + point.x * rect.width / width,
        y: rect.top + point.y * rect.height / height,
      };
    };
  });
  await driver.runPhase(
    { id: "i-menu-matrix", title: "I-menu tabs, resource controls, Star Atlas, and close path", category: "ui", accelerated: true, fatal: true },
    () => inventoryMatrix(driver),
  );
  await driver.runPhase(
    { id: "esc-menu-matrix", title: "ESC tabs, nested settings, Titans, Stars, and close path", category: "ui", accelerated: true, fatal: true },
    () => pauseMatrix(driver),
  );
}
