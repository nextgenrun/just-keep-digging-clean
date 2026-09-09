const CORE_SYSTEMS = Object.freeze([
  "worldModel", "worldRenderer", "playerController", "inputHandler",
  "digSystem", "upgradeSystem", "playerLevelSystem", "retentionProgressSystem",
  "ancientRelicSystem", "craftingSystem", "heavenblocksProgressionSystem",
  "depthGateSystem", "journeySystem", "specialTileSystem", "weatherSystem",
  "lightSystem", "soundSystem", "hudSystem", "caveHazardSystem",
  "caveAtmosphereSystem", "worldMapDiscoverySystem", "starHeartProgressionSystem",
  "starPillarSystem", "celestialEngineController", "systemIntroductionSystem",
  "townSquareTutorialSystem", "firstSessionPortalSystem", "openingFlightArtifactSystem",
  "randomEventBridge", "campfireSystem", "milestoneBoardSystem", "biomeSystem",
  "comboSystem", "tileCollisionSystem", "shakeSystem", "surfaceTunnelDoorSystem",
  "arcCoreVehicleSystem", "runtimeFeatureAssetManager",
]);

async function auditRuntimeCollaborators(driver) {
  return driver.page.evaluate((required) => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    if (!scene) throw new Error("PlayScene is unavailable during collaborator audit.");
    const missing = required.filter(key => scene[key] == null);
    const discovered = Object.keys(scene)
      .filter(key => /(System|Controller|Manager|Bridge|Renderer|Overlay|View)$/.test(key))
      .filter(key => scene[key] != null)
      .sort();
    if (missing.length) throw new Error(`Missing live collaborators: ${missing.join(", ")}`);
    return {
      requiredCount: required.length,
      discoveredCount: discovered.length,
      required,
      discovered,
      activeScenes: globalThis.__phaserGame.scene.getScenes(true)
        .map(active => active.scene?.key).filter(Boolean),
    };
  }, CORE_SYSTEMS);
}

async function auditWorldModel(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const model = scene.worldModel;
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const { RESOURCE_BY_TILE_TYPE, RESOURCE_KEYS } = await import("/values/resourceTypes.js");
    const typeEntries = Object.entries(TILE_TYPES);
    const validTypes = new Set(typeEntries.map(([, value]) => value));
    const typeNames = new Map(typeEntries.map(([name, value]) => [value, name]));
    const expectedCells = model.width * model.depth;
    if (model._types?.length !== expectedCells || model._hp?.length !== expectedCells) {
      throw new Error(`World storage size mismatch: expected ${expectedCells} cells.`);
    }
    const histogram = {};
    const resourceTiles = Object.fromEntries(RESOURCE_KEYS.map(key => [key, 0]));
    let invalidTypes = 0;
    let invalidHp = 0;
    let solidTiles = 0;
    for (let index = 0; index < expectedCells; index += 1) {
      const type = model._types[index];
      const hp = model._hp[index];
      if (!validTypes.has(type)) invalidTypes += 1;
      if (!Number.isFinite(hp) || hp < 0) invalidHp += 1;
      if (type !== TILE_TYPES.AIR) solidTiles += 1;
      const name = typeNames.get(type) || `UNKNOWN_${type}`;
      histogram[name] = (histogram[name] || 0) + 1;
      const resource = RESOURCE_BY_TILE_TYPE[type];
      if (resource) resourceTiles[resource] = (resourceTiles[resource] || 0) + 1;
    }
    const hazardKinds = Object.fromEntries(
      (model.caveHazardZones || []).reduce((entries, hazard) => {
        entries.set(hazard.kind, (entries.get(hazard.kind) || 0) + 1);
        return entries;
      }, new Map()),
    );
    const missingHazardKinds = ["timed-gate", "spike-run", "ember-vent"]
      .filter(kind => !hazardKinds[kind]);
    const missingResources = RESOURCE_KEYS.filter(key => !resourceTiles[key]);
    const failures = [];
    if (invalidTypes) failures.push(`${invalidTypes} invalid tile types`);
    if (invalidHp) failures.push(`${invalidHp} invalid HP values`);
    if (!model.caveZones?.length) failures.push("no caves");
    if (!model.caveResourceSeams?.length) failures.push("no cave resource seams");
    if (missingHazardKinds.length) failures.push(`missing hazards: ${missingHazardKinds.join(", ")}`);
    if (missingResources.length) failures.push(`missing resources: ${missingResources.join(", ")}`);
    if (failures.length) throw new Error(`WorldModel audit failed: ${failures.join("; ")}`);
    return {
      dimensions: { width: model.width, depth: model.depth, cells: expectedCells },
      solidTiles,
      histogram,
      resourceTiles,
      caves: model.caveZones.length,
      caveResourceSeams: model.caveResourceSeams.length,
      caveLightZones: model.caveLightZones?.length || 0,
      caveHazards: model.caveHazardZones.length,
      hazardKinds,
      heavenblocks: model.getHeavenblocksLayoutHealth?.() || null,
      worldTwo: model.getSecondWorldLayoutHealth?.() || null,
    };
  });
}

async function exerciseMovementAndFlight(driver) {
  await driver.closeTransientUi();
  const setup = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const previous = {
      upgradeGodMode: scene.upgradeSystem.godModeActive === true,
      abilityGodMode: scene.playerController.abilities?._godMode === true,
    };
    let runway = null;
    for (let ty = scene.config.topAirRows - 1; ty < scene.config.topAirRows + 800 && !runway; ty += 1) {
      for (let tx = 3; tx < scene.config.levelTwoLeftTile - 8; tx += 1) {
        const clear = [0, 1, 2, 3, 4].every(offset => (
          !scene.worldModel.isSolid(tx + offset, ty)
          && !scene.worldModel.isSolid(tx + offset, ty - 1)
          && scene.worldModel.isSolid(tx + offset, ty + 1)
        ));
        if (clear) { runway = { tx, ty }; break; }
      }
    }
    if (!runway) throw new Error("No five-tile traversable runway was found.");
    globalThis.__jkdE2E.forcePlayerState(runway);
    scene.upgradeSystem.setGodMode(true);
    scene.playerController.abilities?.setGodMode?.(true);
    const body = scene.playerController.physicsBody;
    return { previous, runway, before: { x: body.x, y: body.y } };
  });
  await driver.page.keyboard.down("d");
  await driver.page.waitForTimeout(900);
  await driver.page.keyboard.up("d");
  const walked = await driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return { x: body.x, y: body.y };
  });
  await driver.page.keyboard.down("Shift");
  let flight = null;
  try {
    await driver.waitFor(({ baselineY }) => {
      const controller = globalThis.__phaserGame?.scene?.getScene?.("PlayScene")
        ?.playerController;
      return controller?.abilities?.isFlying?.() === true
        && controller.physicsBody.y < baselineY - 3;
    }, "real Shift input to activate upward Flight", 15_000, { baselineY: walked.y });
    flight = await driver.page.evaluate(() => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      return {
        flying: scene.playerController.abilities?.isFlying?.() === true,
        x: scene.playerController.physicsBody.x,
        y: scene.playerController.physicsBody.y,
      };
    });
  } finally {
    await driver.page.keyboard.up("Shift");
    await driver.page.evaluate((previous) => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      scene.upgradeSystem.setGodMode(previous.upgradeGodMode);
      scene.playerController.abilities?.setGodMode?.(previous.abilityGodMode);
    }, setup.previous);
  }
  const walkedPixels = Math.abs(walked.x - setup.before.x);
  const rosePixels = walked.y - flight.y;
  if (walkedPixels < 3) throw new Error(`Real horizontal input moved only ${walkedPixels.toFixed(1)} px.`);
  if (!flight.flying || rosePixels < 3) throw new Error("Real Shift input did not activate upward Flight.");
  return { before: setup.before, walked, flight, walkedPixels, rosePixels };
}

async function auditEconomyAndRoundTrips(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { RESOURCE_KEYS, RESOURCE_BY_TILE_TYPE } = await import("/values/resourceTypes.js");
    const { RESOURCE_PRICES_CONFIG } = await import("/values/resourcePrices.js");
    const { UPGRADES } = await import("/values/upgradeDefinitions.js");
    const resources = scene.digSystem.getResourceTotals();
    const missingPrices = RESOURCE_KEYS.filter(key => !(RESOURCE_PRICES_CONFIG.basePrices[key] > 0));
    const invalidCargo = RESOURCE_KEYS.filter(key => !Number.isFinite(resources[key]) || resources[key] < 0);
    const idMismatches = Object.entries(UPGRADES)
      .filter(([id, upgrade]) => upgrade.id !== id).map(([id]) => id);
    const missingLevels = Object.keys(UPGRADES)
      .filter(id => !Object.hasOwn(scene.upgradeSystem.getUpgradeLevels(), id));
    const mappedResources = new Set(Object.values(RESOURCE_BY_TILE_TYPE));
    const unmappedResources = RESOURCE_KEYS.filter(key => !mappedResources.has(key));
    const failures = { missingPrices, invalidCargo, idMismatches, missingLevels, unmappedResources };
    if (Object.values(failures).some(items => items.length)) {
      throw new Error(`Economy catalog mismatch: ${JSON.stringify(failures)}`);
    }

    const roundTrips = [];
    const candidates = [
      ["upgradeSystem", "toJSON", "fromJSON"],
      ["playerLevelSystem", "toJSON", "fromJSON"],
      ["retentionProgressSystem", "getSaveData", "loadSaveData"],
      ["heavenblocksProgressionSystem", "getSaveData", "loadSaveData"],
      ["specialTileSystem", "getSaveData", "loadSaveData"],
      ["journeySystem", "getSaveData", "loadSaveData"],
    ];
    for (const [name, readMethod, writeMethod] of candidates) {
      const system = scene[name];
      if (typeof system?.[readMethod] !== "function" || typeof system?.[writeMethod] !== "function") continue;
      const source = JSON.parse(JSON.stringify(system[readMethod]()));
      await system[writeMethod](JSON.parse(JSON.stringify(source)));
      const canonical = JSON.parse(JSON.stringify(system[readMethod]()));
      await system[writeMethod](JSON.parse(JSON.stringify(canonical)));
      const after = JSON.parse(JSON.stringify(system[readMethod]()));
      const stable = JSON.stringify(canonical) === JSON.stringify(after);
      roundTrips.push({
        name,
        stable,
        normalized: JSON.stringify(source) !== JSON.stringify(canonical),
        bytes: JSON.stringify(after).length,
      });
      if (!stable) throw new Error(`${name} serialization was not idempotent after normalization.`);
    }
    if (roundTrips.length < 3) throw new Error("Fewer than three save-state round trips were available.");
    return {
      resourceCount: RESOURCE_KEYS.length,
      upgradeCount: Object.keys(UPGRADES).length,
      merchantCounts: Object.values(UPGRADES).reduce((counts, item) => {
        counts[item.merchant || "none"] = (counts[item.merchant || "none"] || 0) + 1;
        return counts;
      }, {}),
      roundTrips,
    };
  });
}

export async function runDeepCoreScenarios(driver) {
  await driver.runPhase(
    { id: "runtime-inventory", title: "Live PlayScene collaborator inventory", category: "runtime" },
    () => auditRuntimeCollaborators(driver),
  );
  await driver.runPhase(
    { id: "world-model", title: "Full-grid world, resource, cave, and hazard audit", category: "world" },
    () => auditWorldModel(driver),
  );
  await driver.runPhase(
    { id: "movement-flight", title: "Real keyboard walk and Flight controls", category: "controls" },
    () => exerciseMovementAndFlight(driver),
  );
  await driver.runPhase(
    { id: "economy-save", title: "Economy catalogs and in-memory save round trips", category: "progression" },
    () => auditEconomyAndRoundTrips(driver),
  );
}
