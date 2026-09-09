// RoboPlaytest helpers: accelerated placement is explicit; actions use real input.
import assert from "node:assert/strict";
import { join } from "node:path";
import { captureCampfireEvolution } from "./2026-09-03-roboplaytest-hearth-evolution.mjs";

export async function sanctuaryState(driver) {
  return driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const debug = scene.starPillarSystem.getWorldrootDebugSnapshot();
    const view = scene.starPillarSystem._townWorldVisual.sanctuaryView;
    const fire = scene.campfireSystem._campfireSprite;
    const camera = scene.cameras.main;
    return { ...debug, saveBlocked: scene._saveWritesBlocked === true,
      treeTexture: view.base.texture.key,
      camera: { height: camera.height, zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY,
        groundScreenY: (view.transform.surfaceY - camera.scrollY) * camera.zoom,
        followOffsetY: camera.followOffset.y,
        highestStarY: view.stars.entries.length ? Math.min(...view.stars.entries.map(entry =>
          (entry.image.y - camera.scrollY) * camera.zoom)) : null },
      previewActive: Boolean(scene.starPillarSystem._worldrootPreviewBaseline),
      playerTile: scene.playerController.getPlayerTile(),
      arrivals: view.stars.arrivals.size,
      starTextures: view.stars.entries.map(entry => ({ key: entry.star.key, state: entry.star.state,
        identity: entry.star.discovered ? entry.star.identityId : null,
        texture: entry.image.texture.key, frame: entry.image.frame.name })),
      campfire: { ...scene.campfireSystem.getSaveData(), texture: fire.texture.key,
        x: fire.x, y: fire.y, width: fire.displayWidth, height: fire.displayHeight,
        originX: fire.originX, originY: fire.originY,
        evolution: scene.campfireSystem._evolution?.getSnapshot() },
      plantAngles: view.growth.entries.flatMap(entry => entry.parts.map(part => part.image.rotation)) };
  });
}

export async function returnToSanctuary(driver, tx = 20) {
  await driver.closeTransientUi();
  await driver.page.evaluate(tx => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    globalThis.__jkdE2E.forcePlayerState({ tx, ty: scene.config.topAirRows - 1 });
  }, tx);
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return !scene._teleportInAnimating && scene.gameState === "playing";
  }, "return to the ground sanctuary", driver.config.loadTimeoutMs);
  await driver.page.waitForTimeout(2100);
  const state = await sanctuaryState(driver);
  assert.equal(state.reviewMode, "root-sanctuary");
  assert.equal(state.platformCount, 0);
  assert.equal(state.saveBlocked, true);
  assert.equal(state.sanctuary.growth.spriteCount, 10);
  assert.equal(state.treeTexture, "worldroot-sanctuary-trunk-v3");
  assert.equal(state.sanctuary.livingBushes, 15);
  assert.equal(state.sanctuary.extraStarLights, 0);
  assert.ok(state.camera.groundScreenY > state.camera.height * 0.68,
    "the surface camera must leave real canopy headroom");
  if (tx === 20 && state.camera.highestStarY !== null)
    assert.ok(state.camera.highestStarY > 12, "the grown Star canopy must not be clipped above the screen");
  return state;
}

export async function walkSanctuary(driver, key, targetX) {
  const before = await sanctuaryState(driver);
  await driver.page.keyboard.down(key);
  try {
    await driver.waitFor(({ key, targetX }) => {
      const tile = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.getPlayerTile();
      return key === "d" ? tile.tx >= targetX : tile.tx <= targetX;
    }, "real ground walk across the tree", driver.config.phaseTimeoutMs, { key, targetX });
  } finally { await driver.page.keyboard.up(key); }
  await driver.page.waitForTimeout(350);
  const after = await sanctuaryState(driver);
  assert.ok(Math.abs(after.playerTile.ty - before.playerTile.ty) < 0.3, "feet left the real town ground");
  assert.equal(after.platformCount, 0);
  return { input: key, before: before.playerTile, after };
}

export async function prepareActualStar(driver, previous = null) {
  await driver.closeTransientUi();
  const target = await driver.page.evaluate(async previous => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const model = scene.worldModel;
    const territory = scene.worldMapStarTerritorySystem;
    territory.getStateSummary();
    const site = previous || territory.sites.filter(entry => entry.state === "intact"
      && entry.tx > 3 && entry.tx < scene.config.levelTwoLeftTile - 3
      && entry.ty > scene.config.topAirRows + 12).sort((a, b) => a.ty - b.ty)[0];
    if (!site) throw new Error("No actual generated Star is available");
    // Accelerated access tunnel only: never replace the target or its identity/HP.
    for (let y = site.ty - 3; y < site.ty; y++) for (let x = site.tx - 1; x <= site.tx + 1; x++) {
      if (model.getTileType(x, y) === TILE_TYPES.SKY_TILE) continue;
      model.setTile(x, y, TILE_TYPES.AIR, 0);
      scene.worldRenderer?.applyTileUpdate?.(x, y);
    }
    globalThis.__jkdE2E.forcePlayerState({ tx: site.tx, ty: site.ty - 1 });
    return { ...site, hp: model.getTileHp(site.tx, site.ty), type: model.getTileType(site.tx, site.ty) };
  }, previous);
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return !scene._teleportInAnimating && scene.playerController.input.controlsEnabled;
  }, "Star access teleport recovery", driver.config.loadTimeoutMs);
  await driver.page.waitForTimeout(1500);
  const aim = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .inputHandler.resolveAimTargetTileForVector({ x: 0, y: 1 }));
  assert.deepEqual({ tx: aim?.tx, ty: aim?.ty }, { tx: target.tx, ty: target.ty });
  return target;
}

export async function mineActualStar(driver, target) {
  await driver.page.keyboard.down("s");
  await driver.page.keyboard.down("f");
  let confirmation = null;
  try {
    await driver.waitFor(({ tx, ty, type }) => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      return scene._hardcoreRuntime?.modal?.isVisible || scene.worldModel.getTileType(tx, ty) !== type;
    }, "the real Star destruction acknowledgement", driver.config.naturalDigMs, target);
  } finally {
    await driver.page.keyboard.up("f");
    await driver.page.keyboard.up("s");
  }
  const word = await driver.page.evaluate(() => {
    const modal = globalThis.__phaserGame.scene.getScene("PlayScene")._hardcoreRuntime?.modal;
    return modal?.isVisible ? modal.confirmationWord : null;
  });
  if (word) {
    confirmation = await driver.session.capture(join(driver.config.output, "star-consumption-confirmation.png"));
    await driver.page.keyboard.type(word, { delay: 90 });
    await driver.page.keyboard.press("Enter", { delay: 120 });
    await driver.waitFor(() => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      return !scene._hardcoreRuntime?.modal?.isVisible && scene.gameState === "playing"
        && scene.playerController.input.controlsEnabled && !scene._hardcoreModalSuspension;
    }, "typed acknowledgement to return to gameplay");
    // Match the normal mining driver's post-resume settle before a fresh hold.
    await driver.page.waitForTimeout(500);
    await driver.page.keyboard.down("s");
    await driver.page.keyboard.down("f");
    try {
      await driver.waitFor(({ tx, ty, type }) => {
        const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
        const log = scene.__sanctuaryMiningProbe ||= [];
        const probe = { time: scene.time.now, hp: scene.worldModel.getTileHp(tx, ty),
          mineDown: scene.inputHandler.keys.mine.isDown,
          target: scene.inputHandler.resolveAimTargetTile(),
          guard: scene.starSanctuarySnapshot?.pendingConsumption,
          animating: scene.isDigAnimating, contact: scene.ualActionContactTimeline?.contactFired };
        if (!log.length || probe.time - log.at(-1).time >= 500) {
          log.push(probe);
          if (log.length > 24) log.shift();
        }
        return scene.worldModel.getTileType(tx, ty) !== type;
      }, "real held mining after acknowledged Star warning", driver.config.naturalDigMs, target);
    } catch (error) {
      const probe = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene").__sanctuaryMiningProbe);
      throw new Error(error.message + " | Mining handoff trace: " + JSON.stringify(probe));
    } finally {
      await driver.page.keyboard.up("f");
      await driver.page.keyboard.up("s");
    }
  }
  await driver.page.waitForTimeout(1800);
  const result = await driver.page.evaluate(target => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const site = scene.worldMapStarTerritorySystem.resolveMap(scene.worldMapDiscoverySystem)
      .knownSites.find(entry => entry.key === target.key);
    if (site?.state !== "consumed") throw new Error("Destroyed Star did not reach territory authority");
    return { input: "S + F", original: target, state: site.state,
      destroyed: !scene.worldModel.isSolid(target.tx, target.ty),
      actualType: scene.worldModel.getTileType(target.tx, target.ty),
      tree: scene.starPillarSystem.getWorldrootDebugSnapshot() };
  }, target);
  return { ...result, typedConfirmation: word, confirmation };
}

export async function revealActualRegions(driver, regionIds) {
  return driver.page.evaluate(async regionIds => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { LEVEL_ONE_BIOME_FIELD, resolveLevelOneBiomeFieldAtTile } = await import("/values/levelOneBiomeField.js");
    const map = scene.worldMapStarTerritorySystem;
    map.getStateSummary();
    const selected = new Map();
    for (const site of map.sites) {
      if (site.state !== "intact") continue;
      const profile = resolveLevelOneBiomeFieldAtTile(site.tx, site.ty, LEVEL_ONE_BIOME_FIELD);
      if (!profile || !regionIds.includes(profile.sourceRegionId) || selected.has(profile.id)) continue;
      selected.set(profile.id, site);
      scene.worldMapDiscoverySystem.revealAroundTile(site.tx, site.ty);
    }
    return { accelerated: "Map discovery through the real discovery system, one actual Star per biome profile",
      sites: [...selected.values()].map(site => ({ key: site.key, identity: site.identityId })) };
  }, regionIds);
}

export async function clickTreeObject(driver, kind) {
  const point = await driver.page.evaluate(kind => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const view = scene.starPillarSystem._townWorldVisual.sanctuaryView;
    const image = kind === "star" ? view.stars.entries.find(entry => !entry.consumed)?.image : view[kind];
    if (!image?.visible) throw new Error("Missing visible tree object: " + kind);
    const camera = scene.cameras.main;
    return { x: (image.x - camera.scrollX) * camera.zoom + camera.x,
      y: (image.y - camera.scrollY) * camera.zoom + camera.y };
  }, kind);
  await driver.page.mouse.click(point.x, point.y);
  return point;
}

export async function upgradeActualCampfire(driver, tier) {
  const beforeState = await returnToSanctuary(driver);
  const before = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene")
    .upgradeSystem.getMoney());
  await driver.page.keyboard.press("e", { delay: 80 });
  await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem.isSelecting(), "Campfire E menu");
  const button = await driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { CAMPFIRE_TIERS } = await import("/values/campfireConfig.js");
    const fire = scene.campfireSystem;
    const shell = fire._selectionObjects[0];
    const rect = shell.getContentRect();
    const leftWidth = Math.min(330, rect.width * 0.41);
    const rightX = rect.left + leftWidth + 16;
    const point = shell.content.getWorldTransformMatrix().transformPoint(
      rightX + (rect.width - leftWidth - 16) / 2, rect.bottom - 88);
    return { x: point.x, y: point.y,
      cost: CAMPFIRE_TIERS[fire.getSaveData().level].cost };
  });
  await driver.page.mouse.click(button.x, button.y);
  await driver.waitFor(tier => {
    const fire = globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem;
    return fire.getSaveData().level === tier && fire._campfireSprite.texture.key
      === "campfire-tier-" + String(tier).padStart(2, "0");
  }, "real upgrade click loads Campfire form " + tier, driver.config.loadTimeoutMs, tier);
  const evolution = await captureCampfireEvolution(driver, tier);
  const money = await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene").upgradeSystem.getMoney());
  assert.equal(before - money, button.cost, "upgrade must charge once, only after the asset is ready");
  const state = await returnToSanctuary(driver);
  assert.equal(state.campfire.level, tier);
  assert.equal(state.campfire.y, state.sanctuary.hearth.y + 1);
  assert.equal(state.campfire.originY, 1);
  assert.ok(state.sanctuary.treeScale.height > beforeState.sanctuary.treeScale.height,
    "every paid Campfire upgrade also grows the main tree silhouette");
  assert.deepEqual(state.sanctuary.groundHotspots, beforeState.sanctuary.groundHotspots,
    "growing the tree must not move any ground-level interaction");
  return { input: "E, then actual upgrade button", paid: button.cost, evolution, state };
}
