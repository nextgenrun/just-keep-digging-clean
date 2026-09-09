async function closeUi(driver) {
  await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    scene?.hideWorldMap?.();
    scene?.starPillarSystem?.closeConstellationView?.();
    scene?.hidePauseMenu?.();
    globalThis.__jkdE2E?.closeAll?.();
  });
  await driver.page.waitForTimeout(120);
}

async function auditStructure(driver) {
  await closeUi(driver);
  const result = await driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    const { WORLDROOT_WHITEBOX_CONFIG: config } = await import("/values/worldrootWhitebox.js");
    const { TITAN_DISCOVERY_CONFIG } = await import("/values/titanDiscoveries.js");
    const visual = system._townWorldVisual;
    const view = visual.whiteboxView;
    const gallery = scene.worldRenderer?.titanDiscoverySystem?.surfaceGallery
      || scene.worldVisualRuntime?.titanDiscoverySystem?.surfaceGallery;
    if (!view?.enabled || !gallery) throw new Error("Gate A whitebox or Titan gallery is unavailable.");
    system.previewWorldrootProgress(6);
    gallery.sync(new Set(TITAN_DISCOVERY_CONFIG.definitions.map(entry => entry.id)), true);
    const tileSize = scene.config.tileSize;
    const liveTitanViews = [...gallery.views.values()].filter(entry => entry.discovered && entry.sprite?.getBounds);
    const firstTitanLeftTile = Math.min(...liveTitanViews.map(entry => entry.sprite.getBounds().left / tileSize));
    const titanTopTile = Math.min(...liveTitanViews.map(entry => entry.sprite.getBounds().top / tileSize));
    const rootRightTile = Math.max(...config.silhouettes
      .filter(entry => entry.moduleId === "rootways")
      .flatMap(entry => entry.points.map(point => point.x)));
    const horizontalGapTiles = firstTitanLeftTile - rootRightTile;
    const verticalGapTiles = titanTopTile - config.clearance.lowestCanopyBottomTile;
    const debug = system.getWorldrootDebugSnapshot();
    const errors = [];
    if (!["collision-whitebox", "gate-b-art-sample", "gate-c-art-sample"].includes(debug?.reviewMode)) errors.push("wrong review mode");
    if (debug?.platformCount !== 12) errors.push("wrong platform count");
    if (debug?.whitebox?.starSocketCount !== 50) errors.push("not all Star sockets exist");
    if (debug?.sourceScale !== 1) errors.push("whitebox is not at 1:1 scale");
    if (!(horizontalGapTiles >= config.clearance.titanGroundGapTiles)) errors.push("roots overlap Titan #1");
    if (!(verticalGapTiles >= config.clearance.titanCanopyAirGapTiles)) errors.push("canopy crowds Titans");
    if (!view.silhouetteGraphics?.active || !view.contactGraphics?.active) errors.push("collision silhouettes are missing");
    if (visual.livingBody || visual.livingCrown || visual.memoryLayer) errors.push("rejected composite art leaked into Gate A");
    if (["gate-b-art-sample", "gate-c-art-sample"].includes(debug.reviewMode)) {
      if (debug.gateB?.moduleCount !== 3) errors.push("Gate B does not contain the two countries and alignment seat");
      if (debug.gateB?.runtimeScale !== 1) errors.push("Gate B art is not native scale");
      if (debug.gateB?.moduleIds?.join(",") !== "rootways,cobalt,root-cobalt-seat") errors.push("Gate B module set changed");
      if (debug.gateB?.modules?.some(entry => entry.scaleX !== 1 || entry.scaleY !== 1)) errors.push("Gate B module was stretched");
    }
    if (debug.reviewMode === "gate-c-art-sample") {
      if (debug.gateC?.moduleCount !== 4) errors.push("Gate C does not contain its two countries and two alignment pieces");
      if (debug.gateC?.runtimeScale !== 1) errors.push("Gate C art is not native scale");
      if (debug.gateC?.moduleIds?.join(",") !== "amber,amber-temple-cap,mirror,mirror-reflection") errors.push("wrong Gate C module set");
      if (debug.gateC?.modules?.some(entry => entry.scaleX !== 1 || entry.scaleY !== 1)) errors.push("Gate C module was stretched");
    }
    if (errors.length) throw new Error(errors.join("; "));
    scene.cameras.main.setZoom(0.25);
    globalThis.__jkdE2E.forcePlayerState({ tx: 44.4, ty: 54.2 });
    return {
      bounds: debug.whitebox.bounds,
      platformCount: debug.platformCount,
      starSocketCount: debug.whitebox.starSocketCount,
      horizontalGapTiles,
      verticalGapTiles,
      firstTitanLeftTile,
      titanTopTile,
      gateB: debug.gateB,
      gateC: debug.gateC,
    };
  });
  await driver.page.waitForTimeout(520);
  return result;
}

async function inspectRootCobaltAlignment(driver) {
  await closeUi(driver);
  const result = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    system.previewWorldrootProgress(6);
    const debug = system.getWorldrootDebugSnapshot();
    const gateB = debug?.gateB;
    if (!gateB?.enabled) throw new Error("Gate B art is unavailable at the repaired seam.");
    if (gateB.moduleIds?.join(",") !== "rootways,cobalt,root-cobalt-seat") {
      throw new Error("Rootways-Cobalt alignment seat is not live.");
    }
    if (gateB.modules?.some(entry => entry.scaleX !== 1 || entry.scaleY !== 1)) {
      throw new Error("A Gate B seam module was stretched.");
    }
    scene.cameras.main.setZoom(1);
    globalThis.__jkdE2E.forcePlayerState({ tx: 25.15, ty: 57.85 });
    return {
      reviewMode: debug.reviewMode,
      seamTile: { x: 25.15, y: 59.32 },
      moduleIds: gateB.moduleIds,
      scale: gateB.runtimeScale,
    };
  });
  await driver.page.waitForTimeout(420);
  return result;
}

async function landOn(driver, platformId, fraction = 0.5) {
  await closeUi(driver);
  const setup = await driver.page.evaluate(({ id, fraction: authoredFraction }) => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    scene.cameras.main.setZoom(1);
    scene.starPillarSystem.previewWorldrootProgress(6);
    const platform = scene.starPillarSystem.getTownOneWayPlatforms().find(entry => entry.id === id);
    if (!platform) throw new Error(`${id} is unavailable.`);
    const tileSize = scene.config.tileSize;
    globalThis.__jkdE2E.forcePlayerState({
      tx: (platform.leftX + (platform.rightX - platform.leftX) * authoredFraction) / tileSize - 0.5,
      ty: platform.y / tileSize - 1.55,
    });
    scene.playerController.physicsBody.clearOneWayPlatformDropThrough?.();
    return { id, y: platform.y, leftX: platform.leftX, rightX: platform.rightX };
  }, { id: platformId, fraction });
  await driver.waitFor(({ id, y }) => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const body = scene.playerController.physicsBody;
    return body.onGround === true && Math.abs(body.y + body.h - y) < 2
      && scene.starPillarSystem.getTownOneWayPlatforms().some(entry => entry.id === id);
  }, `player to land on ${platformId}`, 12_000, setup);
  await driver.page.waitForTimeout(240);
  return setup;
}

async function walkOn(driver, platformId) {
  const platform = await landOn(driver, platformId);
  const before = await driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return { x: body.x, feetY: body.y + body.h };
  });
  await driver.page.keyboard.down("d");
  try {
    await driver.waitFor(x => {
      const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
      return body.x >= x + 47;
    }, `real D movement across ${platformId}`, 15_000, before.x);
  } finally {
    await driver.page.keyboard.up("d");
  }
  await driver.waitFor(y => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return body.onGround && Math.abs(body.y + body.h - y) < 2;
  }, `player to remain planted on ${platformId}`, 10_000, platform.y);
  const after = await driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return { x: body.x, feetY: body.y + body.h, onGround: body.onGround };
  });
  return { platform, before, after, distancePx: after.x - before.x };
}

async function dropThrough(driver, platformId) {
  const platform = await landOn(driver, platformId);
  const before = await driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return { y: body.y, feetY: body.y + body.h };
  });
  await driver.page.keyboard.down("s");
  try {
    await driver.waitFor(({ id, y }) => {
      const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
      return body.oneWayPlatformDropId === id || body.y > y;
    }, `real Down drop through ${platformId}`, 8_000, { id: platform.id, y: platform.y });
  } finally {
    await driver.page.keyboard.up("s");
  }
  await driver.waitFor(y => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return body.y > y && body.oneWayPlatformDropId == null;
  }, `body to clear ${platformId}`, 12_000, platform.y);
  return { platform, before, after: await driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return { y: body.y, feetY: body.y + body.h, dropId: body.oneWayPlatformDropId };
  }) };
}

async function flyCobaltToAmber(driver) {
  await landOn(driver, "worldroot-cobalt-road", 0.84);
  const target = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const body = scene.playerController.physicsBody;
    const platform = scene.starPillarSystem.getTownOneWayPlatforms()
      .find(entry => entry.id === "worldroot-amber-road");
    return { startX: body.x, targetY: platform.y, tileSize: scene.config.tileSize };
  });
  await driver.page.keyboard.down("Shift");
  await driver.page.keyboard.down("w");
  try {
    await driver.waitFor(({ targetY, tileSize }) => {
      const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
      return body.y + body.h < targetY - tileSize * 0.1;
    }, "real Flight to pass upward through Amber Road", 16_000, target);
  } finally {
    await driver.page.keyboard.up("w");
    await driver.page.keyboard.up("Shift");
  }
  await driver.waitFor(targetY => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return body.onGround && Math.abs(body.y + body.h - targetY) < 2;
  }, "player to settle onto Amber Road after Flight", 30_000, target.targetY);
  return driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene").playerController.physicsBody;
    return { x: body.x, y: body.y, feetY: body.y + body.h, onGround: body.onGround };
  });
}

async function openTalents(driver) {
  await closeUi(driver);
  await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    scene.starPillarSystem.previewWorldrootProgress(6);
    const hotspot = scene.starPillarSystem._townWorldVisual.hotspots.find(entry => entry.kind === "root");
    globalThis.__jkdE2E.forcePlayerState({
      tx: hotspot.world.x / scene.config.tileSize,
      ty: hotspot.world.y / scene.config.tileSize,
    });
  });
  await driver.page.waitForTimeout(320);
  await driver.page.keyboard.press("e");
  await driver.waitFor(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    return scene.starPillarSystem?._isViewOpen === true && scene.campfireSystem?.isSelecting?.() !== true;
  }, "whitebox Talent socket to open Celestial Talents", 10_000);
  return { talentOpen: true, campfireOpen: false };
}

async function walkStarfireWithTitans(driver) {
  const walked = await walkOn(driver, "worldroot-starfire-overlook");
  const titans = await driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { TITAN_DISCOVERY_CONFIG } = await import("/values/titanDiscoveries.js");
    const gallery = scene.worldRenderer?.titanDiscoverySystem?.surfaceGallery
      || scene.worldVisualRuntime?.titanDiscoverySystem?.surfaceGallery;
    gallery.sync(new Set(TITAN_DISCOVERY_CONFIG.definitions.map(entry => entry.id)), true);
    const tileSize = scene.config.tileSize;
    return [...gallery.views.entries()].filter(([, entry]) => entry.discovered && entry.sprite?.visible).map(([id, entry]) => ({
      id,
      topTile: entry.sprite.getBounds().top / tileSize,
      centerTile: entry.sprite.x / tileSize,
    }));
  });
  if (titans.length !== 25) throw new Error("all 25 Titan statues were not live beneath Starfire");
  return { ...walked, titanCount: titans.length, nearbyTitans: titans.filter(entry => entry.centerTile >= 57 && entry.centerTile <= 70) };
}

export async function runWorldrootWhiteboxScenarios(driver) {
  const reviewMode = await driver.page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .starPillarSystem?.getWorldrootDebugSnapshot?.()?.reviewMode
  ));
  await driver.runPhase({ id: "worldroot-gate-a-structure", title: "Gate A structure, scale, sockets, and live clearances", category: "worldroot" }, () => auditStructure(driver));
  await driver.runPhase({ id: "worldroot-alignment-root-cobalt", title: "Rootways and Cobalt meet through the native alignment seat", category: "worldroot" }, () => inspectRootCobaltAlignment(driver));
  await driver.runPhase({ id: "worldroot-gate-a-root-walk", title: "Real player stands and walks on the grounded Talent bough", category: "worldroot" }, () => walkOn(driver, "worldroot-root-talent"));
  await driver.runPhase({ id: "worldroot-gate-a-cobalt-amber-flight", title: "Real Flight passes upward through Cobalt into Amber", category: "worldroot" }, () => flyCobaltToAmber(driver));
  if (reviewMode === "gate-c-art-sample") {
    await driver.runPhase({ id: "worldroot-gate-c-amber-walk", title: "Real player walks the painted Amber Fault country", category: "worldroot" }, () => walkOn(driver, "worldroot-amber-road"));
  }
  await driver.runPhase({ id: "worldroot-gate-a-mirror-walk", title: "Real player walks the long Mirrorstone branch", category: "worldroot" }, () => walkOn(driver, "worldroot-mirror-road"));
  await driver.runPhase({ id: "worldroot-gate-a-starfire-titans", title: "Starfire overlook remains playable above live Titans", category: "worldroot" }, () => walkStarfireWithTitans(driver));
  await driver.runPhase({ id: "worldroot-gate-a-crown-drop", title: "Crown layer accepts ascent and real Down drop-through", category: "worldroot" }, () => dropThrough(driver, "worldroot-crown-approach"));
  await driver.runPhase({ id: "worldroot-gate-a-talents", title: "Root socket still opens the existing Celestial Talents", category: "worldroot" }, () => openTalents(driver));
}
