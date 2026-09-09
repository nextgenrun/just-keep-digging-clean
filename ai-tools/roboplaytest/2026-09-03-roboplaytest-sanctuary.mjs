import assert from "node:assert/strict";
import { sanctuaryState, returnToSanctuary, walkSanctuary, prepareActualStar,
  mineActualStar, revealActualRegions, clickTreeObject, upgradeActualCampfire }
  from "./2026-09-03-roboplaytest-sanctuary-actions.mjs";
import { mineGeneratedEmber, dismissEmberAndIgnite }
  from "./2026-09-03-roboplaytest-hearth-evolution.mjs";

/** Real-input sanctuary regression with an unedited screenshot after each phase. */
export async function runSanctuaryScenarios(driver) {
  const phase = (id, title, action, accelerated = false) => driver.runPhase({
    id: "sanctuary-" + id, title, category: "sanctuary", accelerated,
    fatal: ["dormant", "star-visit", "star-mined"].includes(id)
      || id.startsWith("campfire-") || id.startsWith("ember-"),
  }, action);
  const initial = await phase("dormant", "Actual starting tree on the real town ground", async () => {
    const state = await returnToSanctuary(driver);
    assert.equal(state.previewActive, false);
    assert.equal(state.campfire.level, 1);
    return state;
  }, true);
  await phase("walk-right", "Real D walk across the decorative tree", () => walkSanctuary(driver, "d", 25));
  await phase("walk-left", "Real A return to the Campfire", () => walkSanctuary(driver, "a", 20));
  await phase("blessing", "Real E opens Campfire and consumes a blessing", async () => {
    await driver.page.keyboard.press("e", { delay: 80 });
    await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem.isSelecting(), "real Campfire E");
    await driver.waitFor(() => !globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem._justOpenedFrame,
      "Campfire opening input guard has cleared");
    await driver.page.keyboard.press("e", { delay: 80 });
    await driver.waitFor(() => {
      const fire = globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem;
      return !fire.isSelecting() && fire._activeBuff?.remainingMs > 0;
    }, "real E blessing confirmation");
    return driver.page.evaluate(() => {
      const fire = globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem;
      return { save: fire.getSaveData(), buff: fire._activeBuff };
    });
  });
  await phase("ember-first", "Mine a generated Ember: the refill evolves from one use to two",
    () => mineGeneratedEmber(driver, true), true);
  await phase("ember-return", "Dismiss Ember, ignite slot 6, and return to the living tree", async () => {
    const input = await dismissEmberAndIgnite(driver);
    const state = await returnToSanctuary(driver);
    assert.equal(state.campfire.refillCapacity, 2);
    assert.equal(state.campfire.charges, 2);
    return { input, state };
  }, true);
  const star = await phase("star-visit", "Visit a real generated Star; accelerated access tunnel only",
    () => prepareActualStar(driver), true);
  await phase("first-growth", "Return after discovery: live resolver grows the tree", async () => {
    const state = await returnToSanctuary(driver);
    assert.equal(state.previewActive, false);
    assert.ok(state.knownStars >= initial.knownStars);
    assert.ok(state.starTextures.some(entry => entry.key === star.key && entry.identity === star.identityId));
    return state;
  }, true);
  await phase("star-mined", "Destroy that actual Star with held S + F", async () => {
    await prepareActualStar(driver, star);
    return mineActualStar(driver, star);
  }, true);
  await phase("first-scar", "Return after mining: the matching living Star becomes a scar", async () => {
    const state = await returnToSanctuary(driver);
    assert.ok(state.consumedStars > initial.consumedStars);
    assert.equal(state.starTextures.find(entry => entry.key === star.key)?.state, "consumed");
    assert.equal(state.previewActive, false);
    assert.equal(state.arrivals, 0);
    return state;
  }, true);
  await phase("cobalt-growth", "Explore actual Cobalt sites through discovery authority", async () => {
    const discovery = await revealActualRegions(driver, ["surface-entry", "level1-blue"]);
    return { discovery, state: await returnToSanctuary(driver) };
  }, true);
  await phase("full-growth", "Discover actual Stars in all five regions; no visual snapshot injection", async () => {
    const discovery = await revealActualRegions(driver, ["surface-entry", "level1-blue", "level1-amber", "level1-silver", "level1-magma"]);
    const state = await returnToSanctuary(driver);
    assert.equal(state.awakeRegions, 5);
    assert.equal(state.previewActive, false);
    assert.ok(state.sanctuary.growth.regions.every(entry => entry.targetScale > 0.4));
    assert.ok(state.starTextures.every(entry => !entry.texture.includes("crystal")));
    return { discovery, state };
  }, true);
  await phase("living-motion", "Living vines sway while ground and Star identities stay fixed", async () => {
    const before = await sanctuaryState(driver);
    await driver.page.waitForTimeout(1200);
    const after = await sanctuaryState(driver);
    assert.ok(after.plantAngles.some((angle, index) => Math.abs(angle - before.plantAngles[index]) > 0.001));
    assert.deepEqual(after.sanctuary.hearth, before.sanctuary.hearth);
    assert.deepEqual(after.starTextures, before.starTextures);
    return { before: before.plantAngles, after };
  });
  await driver.page.evaluate(async () => {
    const { CAMPFIRE_TIERS } = await import("/values/campfireConfig.js");
    globalThis.__phaserGame.scene.getScene("PlayScene").upgradeSystem.setMoney(
      CAMPFIRE_TIERS.reduce((total, tier) => total + (tier.cost || 0), 0));
  });
  for (let tier = 2; tier <= 10; tier++) await phase("campfire-" + tier,
    "Actual Campfire upgrade and evolution to form " + tier,
    () => upgradeActualCampfire(driver, tier), true);
  await phase("ember-repeat", "A second generated Ember charges the evolved hearth without another refill upgrade",
    () => mineGeneratedEmber(driver, false), true);
  await phase("ember-return-again", "Repeat reveal restores controls and the real tier-ten Campfire", async () => {
    const input = await dismissEmberAndIgnite(driver);
    return { input, state: await returnToSanctuary(driver) };
  }, true);
  await phase("talents", "Ground-level Talent Star accepts real E", async () => {
    await returnToSanctuary(driver, 24);
    await driver.page.keyboard.press("e", { delay: 80 });
    await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene").starPillarSystem._isViewOpen, "Talent route");
    return { input: "E", route: "Celestial Talents" };
  }, true);
  await phase("star-map", "Actual canopy Star click opens its existing World Map route", async () => {
    await returnToSanctuary(driver);
    const point = await clickTreeObject(driver, "star");
    await driver.waitFor(() => globalThis.__phaserGame.scene.getScene("PlayScene").worldMapOverlay?.isOpen, "Star map route", driver.config.loadTimeoutMs);
    return { input: "pointer", point, route: "World Map" };
  }, true);
  await phase("titan-archive", "Actual Titan discovery lights the Archive; pointer opens its existing tab", async () => {
    const discovered = await driver.page.evaluate(() => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      const titan = scene.starPillarSystem._worldrootSnapshot.titanMemories[0];
      scene.retentionProgressSystem.discoverTitan(titan.id);
      return titan.id;
    });
    const state = await returnToSanctuary(driver);
    assert.ok(state.titanCount > 0);
    const point = await clickTreeObject(driver, "archive");
    await driver.waitFor(() => {
      const panel = globalThis.__phaserGame.scene.getScene("PlayScene")._pausePanel?.state;
      return panel?.tabKeys?.[panel.activeTab] === "titans";
    }, "Titan Archive pointer route", driver.config.loadTimeoutMs);
    return { accelerated: "One Titan discovered through retention authority", discovered, point, route: "Titans" };
  }, true);
  await phase("dormant-crown", "Unready Crown cannot start endgame via real E", async () => {
    await returnToSanctuary(driver, 25);
    await driver.page.keyboard.press("e", { delay: 80 });
    await driver.page.waitForTimeout(400);
    const state = await sanctuaryState(driver);
    assert.equal(state.endgameStarted, false);
    assert.ok(state.missingCurrents.length > 0);
    return state;
  }, true);
  for (const region of ["level1-blue", "all"]) await phase("killed-" + region,
    region === "all" ? "All known Stars consumed: leafless ruin and no living fluff" : "Cobalt dies independently; other regions stay alive",
    async () => {
      await driver.closeTransientUi();
      const changes = await driver.page.evaluate(async region => {
        const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
        const { resolveWorldrootSnapshot } = await import("/systems/visual/WorldrootStateResolver.js");
        const snapshot = resolveWorldrootSnapshot(scene);
        // Exploration can reveal Stars beyond the biome field. Use the same
        // projected assignment as the tree, not a second partial region rule.
        const regions = new Map(snapshot.starMemories.map(star => [star.key, star.regionId]));
        const known = snapshot.map.knownSites;
        const changes = [];
        for (const site of known) {
          if (site.state !== "intact" || (region !== "all" && regions.get(site.key) !== region)) continue;
          // Accelerate only the real hold clock, never disable the damage guard.
          const refuge = scene._starSanctuaryRuntime;
          const hold = refuge.config.consumption;
          const context = { tileX: site.tx, tileY: site.ty,
            type: scene.worldModel.getTileType(site.tx, site.ty) };
          const step = Math.max(1, hold.maximumAttemptGapMs / 2);
          for (let elapsed = 0; elapsed <= hold.confirmationHoldMs + step; elapsed += step) {
            if (!refuge.system.shouldBlockDamage(context, scene.time.now + elapsed)) break;
          }
          const result = scene.worldModel.damageTile(site.tx, site.ty, scene.worldModel.getTileHp(site.tx, site.ty));
          if (!result.destroyed) throw new Error("Authoritative Star destruction failed: " + site.key);
          changes.push(site.key);
        }
        return changes;
      }, region);
      const arrival = await returnToSanctuary(driver);
      const fadeStarted = Date.now();
      await driver.waitFor(region => {
        const view = globalThis.__phaserGame.scene.getScene("PlayScene")
          .starPillarSystem._townWorldVisual.sanctuaryView;
        const dead = view.growth.getDebugSnapshot().regions
          .filter(entry => region === "all" || entry.id === region);
        return dead.length > 0 && dead.every(entry => entry.targetScale === 0 && entry.alpha < 0.01);
      }, "the actual dead-region growth tween has settled", 10000, region);
      const fadeWaitMs = Date.now() - fadeStarted;
      const state = await sanctuaryState(driver);
      assert.equal(state.previewActive, false);
      const dead = state.sanctuary.growth.regions.filter(entry => region === "all" || entry.id === region);
      assert.ok(dead.every(entry => entry.targetScale === 0 && entry.alpha < 0.01));
      if (region === "all") assert.equal(state.sanctuary.growth.driftingLeaves, 0);
      assert.ok(state.sanctuary.regions.filter(entry => region === "all" || entry.id === region)
        .every(entry => entry.livingAlpha === 0 && entry.scarAlpha === 1));
      return { accelerated: "Bulk destruction through the real confirmation-hold guard and WorldModel.damageTile; only the hold clock is accelerated. The earlier single-Star test uses real mining input.",
        changes, arrivalGrowth: arrival.sanctuary.growth, fadeWaitMs, state };
    }, true);
  await phase("crown-ready", "Accelerated Crown readiness fixture; actual E must fire only once", async () => {
    await returnToSanctuary(driver, 25);
    await driver.page.evaluate(() => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      scene.starPillarSystem.previewWorldrootProgress(6);
      scene.__sanctuaryCrownEvents = 0;
      scene.__sanctuaryCrownListener = () => { scene.__sanctuaryCrownEvents++; };
      scene.events.on("worldroot-endgame-ready", scene.__sanctuaryCrownListener);
    });
    await driver.page.keyboard.press("e", { delay: 100 });
    await driver.page.waitForTimeout(500);
    await driver.page.keyboard.press("e", { delay: 100 });
    await driver.page.waitForTimeout(500);
    const count = await driver.page.evaluate(() => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      scene.events.off("worldroot-endgame-ready", scene.__sanctuaryCrownListener);
      return scene.__sanctuaryCrownEvents;
    });
    assert.equal(count, 1);
    return { readiness: "explicit preview fixture only for endgame requirements", realEPresses: 2, events: count };
  }, true);
  await phase("restored", "Restore actual bot progression and leave no visual preview or arrival objects", async () => {
    await driver.page.evaluate(() => globalThis.__phaserGame.scene.getScene("PlayScene").starPillarSystem.restoreWorldrootPreview());
    const state = await returnToSanctuary(driver);
    assert.equal(state.previewActive, false);
    assert.equal(state.arrivals, 0);
    return state;
  }, true);
}
