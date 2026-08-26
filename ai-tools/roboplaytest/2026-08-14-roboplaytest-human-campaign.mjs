const DEPTH_ROUTE = Object.freeze([18, 220, 540]);
const EARLY_UPGRADES = Object.freeze([
  ["playerUpgrades", "agility"],
  ["playerUpgrades", "strength"],
  ["playerUpgrades", "quickReflexes"],
]);

async function humanPress(page, key, holdMs = 180) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
}

async function installHumanPointer(driver) {
  await driver.page.evaluate(() => {
    globalThis.__jkdUiPoint ||= displayObject => {
      const point = displayObject?.getWorldTransformMatrix?.().transformPoint?.(0, 0);
      const canvas = document.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect?.();
      const width = displayObject?.scene?.scale?.width || rect?.width;
      const height = displayObject?.scene?.scale?.height || rect?.height;
      if (!rect || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
      return {
        x: rect.left + point.x * rect.width / width,
        y: rect.top + point.y * rect.height / height,
      };
    };
  });
}

async function readCampaignState(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { getCargoSellValue } = await import("/values/resourcePrices.js");
    const resources = scene.digSystem.getResourceTotals();
    const tile = scene.playerController.getPlayerTile();
    const journal = scene.retentionProgressSystem?.getJournalSnapshot?.() || {};
    return {
      money: scene.upgradeSystem.getMoney(),
      resources,
      cargoValue: getCargoSellValue(resources, scene.upgradeSystem.getUpgradeEffects()),
      tile,
      depth: Math.max(0, tile.ty - scene.config.topAirRows + 1),
      bestDepth: journal.stats?.bestDepth || 0,
      level: scene.playerLevelSystem?.level || 1,
      tilesBroken: journal.stats?.totalTilesBroken || 0,
      resourcesSold: journal.stats?.resourcesSold || 0,
      upgrades: scene.upgradeSystem.getUpgradeLevels(),
      gemPower: scene.playerController.abilities?.getGemPowerExact?.() ?? null,
      gemPowerMax: scene.playerController.abilities?.getGemPowerMax?.() ?? null,
      shop: scene.shopOverlay?.isVisible ? scene.shopOverlay.currentMerchant : null,
    };
  });
}

async function acceptOpenDepthGate(driver) {
  const word = await driver.page.evaluate(() => {
    const gate = globalThis.__phaserGame.scene.getScene("PlayScene").depthGateSystem;
    return gate?.isOpen?.() ? gate.modal?.confirmationWord || null : null;
  });
  if (!word) return false;
  await driver.page.keyboard.type(word, { delay: 45 });
  await humanPress(driver.page, "Enter", 220);
  await driver.waitFor(() => (
    !globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.depthGateSystem?.isOpen?.()
  ), `depth gate ${word} confirmation`, 10_000);
  return true;
}

async function prepareValuableTarget(driver, centerDepth) {
  const target = await driver.page.evaluate(async ({ centerDepth }) => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const model = scene.worldModel;
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const values = new Map([
      [TILE_TYPES.DIRT, 1], [TILE_TYPES.STONE, 5], [TILE_TYPES.COPPER, 15],
      [TILE_TYPES.DARK_DIRT_NORMAL, 3], [TILE_TYPES.DARK_DIRT_STRONG, 5],
      [TILE_TYPES.STEEL, 50], [TILE_TYPES.IRON, 75], [TILE_TYPES.BRONZE, 100],
      [TILE_TYPES.SILVER, 250], [TILE_TYPES.GOLD, 500],
    ]);
    const minY = scene.config.topAirRows + Math.max(1, centerDepth - 120) - 1;
    const maxY = Math.min(model.depth - 3, scene.config.topAirRows + centerDepth + 120 - 1);
    const maxX = scene.config.levelTwoLeftTile - 2;
    const directions = [
      { dx: 0, dy: 1, key: "s", aim: "down" },
      { dx: 1, dy: 0, key: "d", aim: "right" },
      { dx: -1, dy: 0, key: "a", aim: "left" },
    ];
    let best = null;
    for (let py = minY; py <= maxY; py += 1) {
      for (let px = 1; px <= maxX; px += 1) {
        if (model.isSolid(px, py) || !model.isSolid(px, py + 1)) continue;
        for (const direction of directions) {
          const tx = px + direction.dx;
          const ty = py + direction.dy;
          if (!model.inBounds(tx, ty) || !model.isDiggable(tx, ty)) continue;
          const type = model.getTileType(tx, ty);
          const hp = model.getTileHp(tx, ty);
          const value = values.get(type) || 0;
          const distance = Math.abs(centerDepth - (ty - scene.config.topAirRows + 1));
          const score = centerDepth >= 500
            ? value * 1_000_000 - distance * 1_000 - hp
            : value * 1_000 - distance * 10_000 - hp;
          if (!best || score > best.score) best = {
            tx, ty, playerTx: px, playerTy: py, type, hp, value,
            key: direction.key, aim: direction.aim, score,
          };
        }
      }
    }
    if (best) globalThis.__jkdE2E.forcePlayerState({ tx: best.playerTx, ty: best.playerTy });
    return best;
  }, { centerDepth });
  if (!target) throw new Error(`No human-reachable mining face near ${centerDepth}m.`);
  await driver.page.waitForTimeout(700);
  await acceptOpenDepthGate(driver);
  await driver.page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene").systemIntroductionSystem?.refresh?.()
  ));
  return target;
}

async function prepareGemPowerTarget(driver, centerDepth = 540) {
  const target = await driver.page.evaluate(async ({ centerDepth }) => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const model = scene.worldModel;
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const directions = [
      { dx: 0, dy: 1, key: "s", aim: "down" },
      { dx: 1, dy: 0, key: "d", aim: "right" },
      { dx: -1, dy: 0, key: "a", aim: "left" },
    ];
    const maxX = scene.config.levelTwoLeftTile - 2;
    let best = null;
    for (let py = scene.config.topAirRows; py < model.depth - 3; py += 1) {
      for (let px = 1; px <= maxX; px += 1) {
        if (model.isSolid(px, py) || !model.isSolid(px, py + 1)) continue;
        for (const direction of directions) {
          const tx = px + direction.dx;
          const ty = py + direction.dy;
          if (model.getTileType(tx, ty) !== TILE_TYPES.GEM_POWER_BLOCK) continue;
          const depth = ty - scene.config.topAirRows + 1;
          const distance = Math.abs(centerDepth - depth);
          if (!best || distance < best.distance) best = {
            tx, ty, playerTx: px, playerTy: py,
            hp: model.getTileHp(tx, ty), depth, distance,
            key: direction.key, aim: direction.aim,
          };
        }
      }
    }
    if (best) globalThis.__jkdE2E.forcePlayerState({ tx: best.playerTx, ty: best.playerTy });
    return best;
  }, { centerDepth });
  if (!target) throw new Error("No human-reachable Gem Power block was generated.");
  await driver.page.waitForTimeout(700);
  await acceptOpenDepthGate(driver);
  return target;
}

async function breakTargetWithHumanInput(driver, target) {
  await driver.page.keyboard.down(target.key);
  await driver.page.keyboard.down("f");
  try {
    await driver.waitFor(({ tx, ty }) => {
      const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
      return Boolean(scene) && !scene.worldModel.isSolid(tx, ty);
    }, `human mining break at ${target.tx},${target.ty}`, driver.config.naturalDigMs, target);
  } finally {
    await driver.page.keyboard.up("f").catch(() => undefined);
    await driver.page.keyboard.up(target.key).catch(() => undefined);
  }
  await driver.page.waitForTimeout(350);
  return readCampaignState(driver);
}

async function returnToSafety(driver) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await humanPress(driver.page, "Escape", 500);
    const opened = await driver.page.evaluate(() => Boolean(
      globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?._pausePanel
    ));
    if (opened) break;
  }
  await driver.waitFor(() => Boolean(
    globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?._pausePanel
  ), "ESC menu for human return", 8_000);
  const returnIndex = await driver.page.evaluate(() => {
    const controls = globalThis.__phaserGame.scene.getScene("PlayScene")
      ._pausePanel?.state?.controls || [];
    return Math.max(0, controls.length - 2);
  });
  for (let index = 0; index < returnIndex; index += 1) {
    await driver.page.keyboard.press("ArrowDown");
  }
  await driver.page.keyboard.press("Enter");
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.getScene?.("PlayScene")
      ?._hardcoreRuntime?.modal?.isVisible === true
  ), "Return-to-Safety typed confirmation", 8_000);
  const confirmationWord = await driver.page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      ._hardcoreRuntime.modal.confirmationWord
  ));
  await driver.page.keyboard.type(confirmationWord, { delay: 55 });
  await driver.page.keyboard.press("Enter");
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    const tile = scene?.playerController?.getPlayerTile?.();
    return Boolean(
      scene
      && !scene._pausePanel
      && scene.gameState === "playing"
      && scene._teleportInAnimating !== true
      && scene.playerController?.input?.controlsEnabled === true
      && tile
      && tile.ty <= scene.config.topAirRows + 1
    );
  }, "human return transition to finish", 30_000);
}

async function walkToMerchant(driver, merchantId) {
  const targetX = await driver.page.evaluate(async merchantId => {
    const { TOWN_SQUARE_CONFIG } = await import("/values/townSquareConfig.js");
    return TOWN_SQUARE_CONFIG.merchantSlots[merchantId]?.tileX ?? null;
  }, merchantId);
  if (!Number.isFinite(targetX)) throw new Error(`Unknown merchant ${merchantId}.`);
  console.log(`[roboplaytest:human] accelerated merchant approach ${merchantId}`);
  await driver.page.evaluate(targetX => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    globalThis.__jkdE2E.forcePlayerState({
      tx: Math.round(targetX),
      ty: scene.config.playerSpawnTileY,
    });
  }, targetX);
  await driver.page.waitForTimeout(700);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Merchant interaction is sampled by Phaser's frame-level JustDown check.
    // Keep E down across even the slowest observed gameplay frame instead of
    // generating a synthetic tap that a human/browser frame could entirely miss.
    await humanPress(driver.page, "e", 1_000);
    const opened = await driver.page.evaluate(expected => {
      const shop = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.shopOverlay;
      return shop?.isVisible === true && shop.currentMerchant === expected;
    }, merchantId);
    if (opened) break;
  }
  await driver.waitFor(expected => {
    const shop = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.shopOverlay;
    return shop?.isVisible === true && shop.currentMerchant === expected;
  }, `${merchantId} opened by E`, 8_000, merchantId);
}

async function sellCargo(driver) {
  console.log("[roboplaytest:human] accelerated surface checkpoint after live mining expedition");
  await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    globalThis.__jkdE2E.forcePlayerState({
      tx: scene.config.playerSpawnTileX,
      ty: scene.config.playerSpawnTileY,
    });
  });
  await driver.page.waitForTimeout(800);
  await walkToMerchant(driver, "moneyMonster");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await humanPress(driver.page, "ArrowRight", 320);
    const selling = await driver.page.evaluate(() => (
      globalThis.__phaserGame.scene.getScene("PlayScene")
        .shopOverlay.moneyMonsterMode === "sell"
    ));
    if (selling) break;
  }
  await driver.waitFor(() => (
    globalThis.__phaserGame?.scene?.getScene?.("PlayScene")
      ?.shopOverlay?.moneyMonsterMode === "sell"
  ), "Money Monster sell mode", 8_000);
  const items = await driver.page.evaluate(() => {
    const shop = globalThis.__phaserGame.scene.getScene("PlayScene").shopOverlay;
    return shop.sellItems.map(item => item.resource);
  });
  for (let index = 0; index < items.length; index += 1) {
    for (let step = 0; step < items.length + 2; step += 1) {
      const selected = await driver.page.evaluate(() => {
        const shop = globalThis.__phaserGame.scene.getScene("PlayScene").shopOverlay;
        return shop.sellItems[shop.selectedIndex]?.resource || null;
      });
      if (selected === items[index]) break;
      await humanPress(driver.page, "ArrowDown", 900);
    }
    const amount = await driver.page.evaluate(resource => (
      globalThis.__phaserGame.scene.getScene("PlayScene").digSystem.getResourceTotals()[resource] || 0
    ), items[index]);
    if (amount > 0) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await humanPress(driver.page, "f", 1_000);
        const remaining = await driver.page.evaluate(resource => (
          globalThis.__phaserGame.scene.getScene("PlayScene").digSystem.getResourceTotals()[resource] || 0
        ), items[index]);
        if (remaining <= 0) break;
      }
    }
  }
  await humanPress(driver.page, "Escape");
  return readCampaignState(driver);
}

async function buyUpgrade(driver, merchantId, upgradeId, { closeAfter = true } = {}) {
  const alreadyOpen = await driver.page.evaluate(expected => {
    const shop = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")?.shopOverlay;
    return shop?.isVisible === true && shop.currentMerchant === expected;
  }, merchantId);
  if (!alreadyOpen) await walkToMerchant(driver, merchantId);
  const selection = await driver.page.evaluate(upgradeId => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const shop = scene.shopOverlay;
    const index = shop.allUpgrades.findIndex(item => item.id === upgradeId);
    return {
      index,
      before: scene.upgradeSystem.getUpgradeLevel(upgradeId),
      canPurchase: scene.upgradeSystem.canPurchaseUpgrade(upgradeId),
    };
  }, upgradeId);
  if (selection.index < 0 || !selection.canPurchase.canPurchase) {
    if (closeAfter) await humanPress(driver.page, "Escape");
    return { purchased: false, reason: selection.canPurchase.reason || "not-listed" };
  }
  for (let step = 0; step < 30; step += 1) {
    const selectedId = await driver.page.evaluate(() => {
      const shop = globalThis.__phaserGame.scene.getScene("PlayScene").shopOverlay;
      return shop.allUpgrades[shop.selectedIndex]?.id || null;
    });
    if (selectedId === upgradeId) break;
    await humanPress(driver.page, "ArrowDown", 900);
  }
  let after = selection.before;
  for (let attempt = 0; attempt < 4 && after <= selection.before; attempt += 1) {
    await humanPress(driver.page, "Enter", 1_000);
    await driver.page.waitForTimeout(300);
    after = await driver.page.evaluate(upgradeId => (
      globalThis.__phaserGame.scene.getScene("PlayScene").upgradeSystem.getUpgradeLevel(upgradeId)
    ), upgradeId);
  }
  if (closeAfter) await humanPress(driver.page, "Escape");
  if (after <= selection.before) throw new Error(`${upgradeId} did not purchase through keyboard input.`);
  return { purchased: true, upgradeId, before: selection.before, after };
}

async function exerciseAbilities(driver) {
  await driver.page.evaluate(() => {
    const abilities = globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.abilities;
    if (abilities.__roboplaytestRestoreWrapped) return;
    const original = abilities.restoreGemPower;
    globalThis.__roboplaytestGemPowerRestores = [];
    abilities.restoreGemPower = function restoreGemPowerWithAudit(amount, context) {
      const before = this.getGemPowerExact();
      const restored = original.call(this, amount, context);
      globalThis.__roboplaytestGemPowerRestores.push({
        amount,
        before,
        after: this.getGemPowerExact(),
        restored,
        context: { ...(context || {}) },
      });
      return restored;
    };
    abilities.__roboplaytestRestoreWrapped = true;
    const digSystem = globalThis.__phaserGame.scene.getScene("PlayScene").digSystem;
    if (!digSystem.__roboplaytestSpecialWrapped) {
      const originalSpecial = digSystem._handleSpecialBlockEffects;
      globalThis.__roboplaytestSpecialBlocks = [];
      digSystem._handleSpecialBlockEffects = function specialBlockWithAudit(result, targetTile) {
        const output = originalSpecial.call(this, result, targetTile);
        globalThis.__roboplaytestSpecialBlocks.push({
          result: { ...(result || {}) },
          targetTile: { ...(targetTile || {}) },
          output: { ...(output || {}) },
        });
        return output;
      };
      digSystem.__roboplaytestSpecialWrapped = true;
    }
  });
  const target = await prepareValuableTarget(driver, 540);
  await driver.page.keyboard.down(target.key === "a" ? "a" : "d");
  await driver.page.keyboard.down("q");
  await driver.waitFor(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.abilities.isQuickslashActive()
  ), "Quick Slash activation", 8_000);
  await driver.page.keyboard.up("q");
  await driver.page.keyboard.up(target.key === "a" ? "a" : "d");
  await driver.waitFor(() => !(
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.abilities.isQuickslashActive()
  ), "Quick Slash release", 8_000);
  const rechargeTargets = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const gpState = await driver.page.evaluate(() => {
      const abilities = globalThis.__phaserGame.scene.getScene("PlayScene")
        .playerController.abilities;
      return {
        current: abilities.getGemPowerExact(),
        required: abilities.getThunderStrikeCost(),
      };
    });
    if (gpState.current >= gpState.required) break;
    const rechargeTarget = await prepareGemPowerTarget(driver);
    const rechargedState = await breakTargetWithHumanInput(driver, rechargeTarget);
    const restoreEvent = await driver.page.evaluate(({ tx, ty }) => (
      [...(globalThis.__roboplaytestGemPowerRestores || [])]
        .reverse()
        .find(event => event.context?.tx === tx && event.context?.ty === ty) || null
    ), rechargeTarget);
    if (!restoreEvent || restoreEvent.restored <= 0) {
      const specialAudit = await driver.page.evaluate(({ tx, ty }) => ({
        targetType: globalThis.__phaserGame.scene.getScene("PlayScene")
          .worldModel.getTileType(tx, ty),
        events: globalThis.__roboplaytestSpecialBlocks || [],
        restores: globalThis.__roboplaytestGemPowerRestores || [],
      }), rechargeTarget);
      throw new Error(
        `Mining a Gem Power block did not restore Gem Power: ${JSON.stringify(specialAudit)}`,
      );
    }
    rechargeTargets.push({ ...rechargeTarget, restoreEvent, rechargedGemPower: rechargedState.gemPower });
  }
  await driver.waitFor(() => {
    const abilities = globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.abilities;
    return abilities.getGemPowerExact() >= abilities.getThunderStrikeCost();
  }, "Gem Power recharge for Thunder Strike", 30_000);
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return scene.isDigAnimating !== true
      && scene.ualActionContactTimeline?.isActive !== true
      && scene.thunderStrikeActionRuntime?.isAnimating !== true;
  }, "idle action lane before Thunder Strike", driver.config.naturalDigMs);
  const thunderBefore = await driver.page.evaluate(() => {
    const abilities = globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.abilities;
    return {
      gemPower: abilities.getGemPowerExact(),
      cost: abilities.getThunderStrikeCost(),
    };
  });
  await driver.page.keyboard.down("c");
  try {
    await driver.waitFor(() => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      return scene.playerController.abilities.isThunderStrikeCharging()
        || scene.thunderStrikeActionRuntime?.isAnimating === true;
    }, "Thunder Strike activation", 8_000);
    await driver.page.waitForTimeout(850);
  } finally {
    await driver.page.keyboard.up("c").catch(() => undefined);
  }
  await driver.waitFor(before => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.abilities.getGemPowerExact() < before.gemPower
  ), "Thunder Strike paid impact", 20_000, thunderBefore);
  await driver.page.waitForTimeout(800);
  const state = await readCampaignState(driver);
  const gemPowerAudit = await driver.page.evaluate(() => ({
    restores: globalThis.__roboplaytestGemPowerRestores || [],
    specialBlocks: globalThis.__roboplaytestSpecialBlocks || [],
  }));
  return { target, rechargeTargets, thunderBefore, state, gemPowerAudit };
}

async function seedFocusedAbilityContinuation(driver) {
  return driver.page.evaluate(async () => {
    const { LEVEL_CONFIG } = await import("/values/levelConfig.js");
    const { UPGRADES } = await import("/values/upgradeDefinitions.js");
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    scene.upgradeSystem.setUpgradeLevels({
      ...scene.upgradeSystem.getUpgradeLevels(),
      gemPowerUnlock: 1,
      quickslashAbility: 1,
      thunderStrikeAbility: 1,
    });
    scene.playerLevelSystem.fromJSON({
      progressionVersion: LEVEL_CONFIG.PROGRESSION_VERSION,
      level: UPGRADES.thunderStrikeAbility.requiresLevel,
      currentXP: 0,
      totalXP: 0,
      choiceSelections: {},
      automaticMilestoneRewards: 0,
    });
    scene.playerController.setProgressionGemPowerMaxBonus(
      scene.playerLevelSystem.getGemPowerMaxBonus(),
    );
    scene.playerController.abilities.setGemPowerExact(20, {
      silent: false,
      source: "roboplaytest-focused-ability-setup",
    });
    scene.systemIntroductionSystem?.refresh?.();
    return {
      upgrades: scene.upgradeSystem.getUpgradeLevels(),
      gemPower: scene.playerController.abilities.getGemPowerExact(),
      thunderCost: scene.playerController.abilities.getThunderStrikeCost(),
    };
  });
}

export async function runHumanCampaignScenarios(driver) {
  await installHumanPointer(driver);
  if (driver.config.humanStage === "abilities") {
    const setup = await seedFocusedAbilityContinuation(driver);
    await driver.runPhase({
      id: "human-abilities-focused",
      title: "Focused continuation: Gem Power block, Quick Slash, and Thunder Strike through F/Q/C input",
      accelerated: true,
      fatal: true,
    }, async () => ({ setup, ...(await exerciseAbilities(driver)) }));
    return;
  }
  const purchases = [];
  let nextEarlyUpgrade = 0;
  await driver.runPhase({
    id: "human-core-loop",
    title: `Human-paced mine, return, sell, and upgrade loop to ${driver.config.goalMoney}M`,
    accelerated: true,
    fatal: true,
  }, async () => {
    let state = await readCampaignState(driver);
    const prePenaltyCargoGoal = driver.config.goalMoney + 400;
    for (let cycle = 0; cycle < driver.config.humanCycles; cycle += 1) {
      const depth = DEPTH_ROUTE[Math.min(DEPTH_ROUTE.length - 1, cycle)];
      for (let block = 0; block < 4; block += 1) {
        const target = await prepareValuableTarget(driver, depth);
        state = await breakTargetWithHumanInput(driver, target);
      }
      console.log(`[roboplaytest:human] cycle=${cycle + 1} depth=${state.depth}m cargo=${state.cargoValue}M wallet=${state.money}M`);
      if (
        state.cargoValue >= prePenaltyCargoGoal
        && state.bestDepth >= 500
        && state.level >= 3
      ) break;
    }
    state = await readCampaignState(driver);
    if (state.cargoValue < prePenaltyCargoGoal) {
      throw new Error(`Expedition cargo reached ${state.cargoValue}M; needed ${prePenaltyCargoGoal}M before the safety penalty.`);
    }
    if (state.level < 3) {
      throw new Error(`Human campaign reached level ${state.level}; Thunder Strike requires level 3.`);
    }
    state = await sellCargo(driver);
    while (nextEarlyUpgrade < EARLY_UPGRADES.length) {
      const [merchant, upgrade] = EARLY_UPGRADES[nextEarlyUpgrade];
      const nextMerchant = EARLY_UPGRADES[nextEarlyUpgrade + 1]?.[0] || null;
      const result = await buyUpgrade(driver, merchant, upgrade, {
        closeAfter: nextMerchant !== merchant,
      });
      if (result.purchased) purchases.push(result);
      nextEarlyUpgrade += 1;
    }
    const abilityUpgrades = ["quickslashAbility", "thunderStrikeAbility"];
    for (let index = 0; index < abilityUpgrades.length; index += 1) {
      const upgrade = abilityUpgrades[index];
      const result = await buyUpgrade(driver, "boboMerchant", upgrade, {
        closeAfter: index === abilityUpgrades.length - 1,
      });
      if (!result.purchased) throw new Error(`${upgrade} was not purchasable: ${result.reason}`);
      purchases.push(result);
    }
    state = await readCampaignState(driver);
    if (state.money < driver.config.goalMoney) {
      throw new Error(`Human campaign ended at ${state.money}M, below ${driver.config.goalMoney}M.`);
    }
    if (!purchases.length) throw new Error("Human campaign bought no upgrades.");
    if (state.resourcesSold < 1 || state.tilesBroken < 1) {
      throw new Error("Human campaign did not record both mining and sales.");
    }
    return { state, purchases };
  });
  await driver.runPhase({
    id: "human-abilities",
    title: "Purchased Quick Slash and Thunder Strike activate through Q/C input",
    accelerated: true,
    fatal: true,
  }, () => exerciseAbilities(driver));
  await driver.runPhase({
    id: "human-goal-proof",
    title: `Final authoritative wallet remains at or above ${driver.config.goalMoney}M`,
    fatal: true,
  }, async () => {
    const state = await readCampaignState(driver);
    if (state.money < driver.config.goalMoney) throw new Error("Final wallet goal regressed.");
    return { state, purchases };
  });
}
