import assert from "node:assert/strict";
import { join } from "node:path";

export async function captureCampfireEvolution(driver, tier) {
  await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .campfireSystem._evolution?.phase === "ignite", "visible Campfire evolution ignite");
  await driver.page.waitForTimeout(140);
  const state = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return { ...scene.campfireSystem._evolution.getSnapshot(),
      menuOpen: scene.campfireSystem.isSelecting(),
      controlsEnabled: scene.playerController.input.controlsEnabled };
  });
  assert.equal(state.active, true);
  assert.equal(state.fromLevel, tier - 1);
  assert.equal(state.menuOpen, false, "the menu must not hide the upgrade view");
  assert.equal(state.controlsEnabled, true, "the world evolution is non-blocking");
  const screenshot = await driver.session.capture(join(driver.config.output,
    `campfire-${String(tier).padStart(2, "0")}-evolving.png`));
  await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .campfireSystem._evolution?.phase === "idle", "Campfire evolution cleanup");
  return { state, screenshot };
}

/** Access and equipment are accelerated; the generated ore and its HP are intact. */
export async function mineGeneratedEmber(driver, expectedUpgrade) {
  await driver.closeTransientUi();
  const target = await driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const model = scene.worldModel;
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const { UPGRADES } = await import("/values/upgradeFormulas.js");
    scene.__emberEquipmentBaseline = { levels: scene.upgradeSystem.getUpgradeLevels(),
      pickaxe: scene.upgradeSystem.ownedPickaxe };
    for (const id of ["dragonPickaxe", "strength", "quickReflexes"]) {
      const result = scene.upgradeSystem.grantUpgrade(id, UPGRADES[id].maxLevel || 1);
      if (!result.success) throw new Error("Ember equipment fixture failed: " + id);
    }
    const find = [...model.rareEmberFinds].filter(site => site.tx < scene.config.levelTwoLeftTile
      && model.getTileType(site.tx, site.ty) === TILE_TYPES.EMBER_ORE)
      .sort((a, b) => a.ty - b.ty)[0];
    if (!find) throw new Error("No accessible, unmined generated Ember find");
    for (let y = find.ty - 3; y < find.ty; y++) for (let x = find.tx - 1; x <= find.tx + 1; x++) {
      if ([TILE_TYPES.SKY_TILE, TILE_TYPES.EMBER_ORE].includes(model.getTileType(x, y))) continue;
      model.setTile(x, y, TILE_TYPES.AIR, 0);
      scene.worldRenderer?.applyTileUpdate?.(x, y);
    }
    globalThis.__jkdE2E.forcePlayerState({ tx: find.tx, ty: find.ty - 1 });
    return { ...find, hp: model.getTileHp(find.tx, find.ty), type: TILE_TYPES.EMBER_ORE,
      before: scene.campfireSystem.getSaveData(),
      equipmentFixture: ["Dragon Pickaxe", "maximum Strength", "maximum Quick Reflexes"],
      damage: scene.digSystem._getDamage(scene.digSystem._getBaseDamageForTile(TILE_TYPES.EMBER_ORE), TILE_TYPES.EMBER_ORE) };
  });
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return !scene._teleportInAnimating && scene.playerController.input.controlsEnabled;
  }, "Ember access teleport recovery", driver.config.loadTimeoutMs);
  await driver.page.waitForTimeout(600);
  const aim = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .inputHandler.resolveAimTargetTileForVector({ x: 0, y: 1 }));
  assert.deepEqual({ tx: aim?.tx, ty: aim?.ty }, { tx: target.tx, ty: target.ty });
  await driver.page.keyboard.down("s");
  await driver.page.keyboard.down("f");
  try {
    await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene")
      .emberDiscoveryEventSystem?.active, "actual Ember mining reveal", driver.config.naturalDigMs);
  } catch (error) {
    const hp = await driver.page.evaluate(({ tx, ty }) => globalThis.__phaserGame.scene
      .getScene("PlayScene").worldModel.getTileHp(tx, ty), target);
    throw new Error(error.message + " | " + JSON.stringify({ target, remainingHp: hp }));
  } finally {
    await driver.page.keyboard.up("f");
    await driver.page.keyboard.up("s");
  }
  const during = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return { event: scene.emberDiscoveryEventSystem.getSnapshot(), fire: scene.campfireSystem.getSaveData() };
  });
  assert.equal(during.fire.refillCapacity, 2);
  assert.equal(during.fire.charges, target.before.charges + 1);
  assert.equal(during.event.evolution.hearthKey, "campfire-tier-" + String(during.fire.level).padStart(2, "0"));
  assert.equal(during.event.evolution.hearthVisible, true);
  if (expectedUpgrade) assert.match(during.event.reward, /1 → 2/);
  else {
    assert.match(during.event.reward, /\+1 EMBER CHARGE/);
    assert.doesNotMatch(during.event.reward, /REFILL|→/);
  }
  const stem = expectedUpgrade ? "ember-first" : "ember-repeat";
  const evolving = await driver.session.capture(join(driver.config.output, `${stem}-evolving.png`));
  await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .emberDiscoveryEventSystem.evolution.phase === "settled", "Ember enters current hearth");
  const settled = await driver.session.capture(join(driver.config.output, `${stem}-settled.png`));
  const destroyed = await driver.page.evaluate(({ tx, ty, type }) => globalThis.__phaserGame
    .scene.getScene("PlayScene").worldModel.getTileType(tx, ty) !== type, target);
  assert.equal(destroyed, true);
  return { accelerated: "Access tunnel, positioning and temporary real equipment grants; normal S + F mines the generated seam at unchanged full health",
    target, during, evolving, settled };
}

export async function dismissEmberAndIgnite(driver) {
  const active = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .emberDiscoveryEventSystem.active);
  if (active) await driver.page.keyboard.press("e", { delay: 100 });
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return !scene.emberDiscoveryEventSystem.active && scene.playerController.input.controlsEnabled
      && scene.gameState === "playing";
  }, "Ember dismissal restores real gameplay");
  const before = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .campfireSystem.getEmberCharges());
  await driver.page.keyboard.press("6", { delay: 100 });
  await driver.waitFor(before => {
    const fire = globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem;
    return fire.getEmberCharges() === before - 1 && fire.getActiveBuff()?.remainingMs > 0;
  }, "real slot 6 consumes exactly one Ember", driver.config.phaseTimeoutMs, before);
  await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const original = scene.__emberEquipmentBaseline;
    if (!original) throw new Error("Missing Ember equipment baseline");
    scene.upgradeSystem.setUpgradeLevels(original.levels);
    scene.upgradeSystem.ownedPickaxe = original.pickaxe;
    delete scene.__emberEquipmentBaseline;
  });
  return { input: "E to dismiss, 6 to ignite", chargesBefore: before, chargesAfter: before - 1 };
}
