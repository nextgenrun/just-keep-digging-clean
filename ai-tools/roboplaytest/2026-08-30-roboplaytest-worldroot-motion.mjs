export async function closeWorldrootUi(driver) {
  await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    scene?.hideWorldMap?.();
    scene?.starPillarSystem?.closeConstellationView?.();
    scene?.hidePauseMenu?.();
    globalThis.__jkdE2E?.closeAll?.();
  });
  await driver.page.waitForTimeout(120);
}

export async function auditTitanClearance(driver) {
  await closeWorldrootUi(driver);
  const result = await driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    const pillar = scene?.starPillarSystem;
    const harness = globalThis.__jkdE2E;
    const { WORLDROOT_CONFIG } = await import("/values/worldroot.js");
    const { WORLDROOT_WHITEBOX_CONFIG } = await import("/values/worldrootWhitebox.js");
    const { TITAN_DISCOVERY_CONFIG } = await import("/values/titanDiscoveries.js");
    const titanSystem = scene?.worldRenderer?.titanDiscoverySystem
      || scene?.worldVisualRuntime?.titanDiscoverySystem;
    const gallery = titanSystem?.surfaceGallery;
    if (!scene || !pillar || !harness || !gallery) {
      throw new Error("Worldroot or Titan surface gallery is unavailable.");
    }

    pillar.previewWorldrootProgress(6);
    gallery.sync(new Set(TITAN_DISCOVERY_CONFIG.definitions.map(entry => entry.id)), true);
    const transform = pillar._townWorldVisual?.transform;
    const firstDefinition = TITAN_DISCOVERY_CONFIG.definitions[0];
    const firstView = gallery.views.get(firstDefinition.id);
    const tileSize = scene.config.tileSize;
    const reviewMode = pillar.getWorldrootDebugSnapshot?.()?.reviewMode;
    const usesModularGeometry = reviewMode === "worldroot-modular-v4";
    const firstCenterTile = TITAN_DISCOVERY_CONFIG.surfaceGallery.startTileX;
    const firstVisibleLeftTile = firstView?.sprite?.getBounds?.().left / tileSize;
    const groundedRightTile = usesModularGeometry
      ? Math.max(...WORLDROOT_WHITEBOX_CONFIG.silhouettes
        .filter(entry => entry.moduleId === "rootways")
        .flatMap(entry => entry.points.map(point => point.x)))
      : (
        transform.left
        + transform.width * WORLDROOT_CONFIG.clearance.groundedFootprintRightSourceX
      ) / tileSize;
    const horizontalGapTiles = firstVisibleLeftTile - groundedRightTile;
    const elevatedBottomTile = usesModularGeometry
      ? WORLDROOT_WHITEBOX_CONFIG.clearance.lowestCanopyBottomTile
      : (
        transform.top
        + transform.height * WORLDROOT_CONFIG.clearance.lowestElevatedDetailSourceY
      ) / tileSize;
    const titanTopTile = Math.min(...[...gallery.views.values()]
      .filter(view => view.discovered && view.sprite?.getBounds)
      .map(view => view.sprite.getBounds().top / tileSize));
    const verticalGapTiles = titanTopTile - elevatedBottomTile;
    const errors = [];
    if (!(horizontalGapTiles >= 0.5)) errors.push("grounded tree overlaps the first Titan");
    if (!(verticalGapTiles >= WORLDROOT_CONFIG.clearance.minimumTitanAirGapTiles)) {
      errors.push("elevated canopy crowds the Titan headroom");
    }
    if (!(firstView?.discovered && firstView.sprite?.alpha > 0.9)) {
      errors.push("first Titan statue was not visible for the clearance review");
    }
    if (!(WORLDROOT_CONFIG.placement.depth < TITAN_DISCOVERY_CONFIG.surfaceGallery.spriteDepth)) {
      errors.push("Titan statue does not render in front of the Worldroot");
    }
    if (errors.length) throw new Error(errors.join("; "));

    harness.forcePlayerState({ tx: firstCenterTile, ty: scene.config.topAirRows - 1 });
    return {
      firstTitan: firstDefinition.id,
      firstCenterTile,
      groundedRightTile,
      horizontalGapTiles,
      elevatedBottomTile,
      titanTopTile,
      verticalGapTiles,
      treeDepth: WORLDROOT_CONFIG.placement.depth,
      titanDepth: TITAN_DISCOVERY_CONFIG.surfaceGallery.spriteDepth,
    };
  });
  await driver.page.waitForTimeout(420);
  return result;
}

export async function auditModularPlatformContacts(driver) {
  await closeWorldrootUi(driver);
  const platformIds = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    system.previewWorldrootProgress(6);
    const platforms = system.getTownOneWayPlatforms();
    if (system.getWorldrootDebugSnapshot?.()?.reviewMode !== "worldroot-modular-v4") {
      return [];
    }
    if (!platforms.length) throw new Error("Worldroot V4 exposes no walkable sprite contacts.");
    return platforms.map(platform => platform.id);
  });
  if (!platformIds.length) return { skipped: true, reason: "not-worldroot-modular-v4" };

  const contacts = [];
  for (const platformId of platformIds) {
    const target = await driver.page.evaluate(id => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      const platform = scene.starPillarSystem.getTownOneWayPlatforms()
        .find(candidate => candidate.id === id);
      if (!platform) throw new Error(`${id} disappeared before contact testing.`);
      const tileSize = scene.config.tileSize;
      globalThis.__jkdE2E.forcePlayerState({
        tx: ((platform.leftX + platform.rightX) / 2) / tileSize - 0.5,
        ty: (platform.y - 12) / tileSize - 1,
      });
      scene._teleportInAnimating = false;
      scene.player?.anims?.stop?.();
      scene.updatePlayerVisualState?.(true);
      scene.playerController.physicsBody.clearOneWayPlatformDropThrough?.();
      return {
        id,
        leftX: platform.leftX,
        rightX: platform.rightX,
        y: platform.y,
        source: platform.source,
      };
    }, platformId);
    await driver.waitFor(({ id, leftX, rightX, y }) => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      const body = scene.playerController.physicsBody;
      const centerX = body.x + body.w / 2;
      return body.onGround === true
        && Math.abs(body.y + body.h - y) < 2
        && centerX >= leftX
        && centerX <= rightX
        && scene.starPillarSystem.getTownOneWayPlatforms().some(platform => platform.id === id);
    }, `${platformId} to receive a real falling-body contact`, 8_000, target);
    const body = await driver.page.evaluate(() => {
      const physicsBody = globalThis.__phaserGame.scene.getScene("PlayScene")
        .playerController.physicsBody;
      return {
        centerX: physicsBody.x + physicsBody.w / 2,
        feetY: physicsBody.y + physicsBody.h,
        onGround: physicsBody.onGround,
      };
    });
    contacts.push({ ...target, body });
  }
  if (contacts.some(contact => contact.source !== "worldroot-modular-v4-sprite-alpha")) {
    throw new Error("A Worldroot V4 contact came from legacy collision geometry.");
  }
  return { platformCount: contacts.length, contacts };
}

export async function landOnCrownTerrace(driver) {
  await closeWorldrootUi(driver);
  const setup = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    system.previewWorldrootProgress(6);
    const platform = system.getTownOneWayPlatforms()
      .find(entry => entry.id === "worldroot-crown-approach");
    if (!platform) throw new Error("Crown terrace is unavailable.");
    const tileSize = scene.config.tileSize;
    globalThis.__jkdE2E.forcePlayerState({
      tx: ((platform.leftX + platform.rightX) / 2) / tileSize - 0.5,
      ty: (platform.y - 12) / tileSize - 1,
    });
    // This phase audits real traversal after accelerated placement, not the
    // presentation-only teleport entrance. Headless deferred animation can
    // remain latched even after the body has landed, which correctly blocks D.
    scene._teleportInAnimating = false;
    scene.player?.anims?.stop?.();
    scene.updatePlayerVisualState?.(true);
    scene.playerController.physicsBody.clearOneWayPlatformDropThrough?.();
    return { id: platform.id, y: platform.y };
  });
  await driver.waitFor(({ id, y }) => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const body = scene.playerController.physicsBody;
    return body.onGround === true && Math.abs(body.y + body.h - y) < 2
      && scene.starPillarSystem.getTownOneWayPlatforms()
        .some(platform => platform.id === id);
  }, "the player to land on the Crown terrace", 12_000, setup);
  return driver.page.evaluate(platform => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.physicsBody;
    return {
      platform,
      body: { x: body.x, y: body.y, feetY: body.y + body.h, onGround: body.onGround },
    };
  }, setup);
}

export async function dropThroughCrownTerrace(driver) {
  const before = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const body = scene.playerController.physicsBody;
    const platform = scene.starPillarSystem.getTownOneWayPlatforms().find(entry => (
      entry.id === "worldroot-crown-approach"
      && body.x + body.w >= entry.leftX
      && body.x <= entry.rightX
      && Math.abs(body.y + body.h - entry.y) < 2
    ));
    if (!platform) throw new Error("The player is not standing on the Crown terrace.");
    return { y: body.y, feetY: body.y + body.h, platformId: platform.id, platformY: platform.y };
  });
  await driver.page.keyboard.down("s");
  try {
    await driver.waitFor(({ platformId, platformY }) => {
      const body = globalThis.__phaserGame.scene.getScene("PlayScene")
        .playerController.physicsBody;
      return body.oneWayPlatformDropId === platformId || body.y > platformY;
    }, "the held DOWN action to engage the Crown terrace", 8_000, before);
  } finally {
    await driver.page.keyboard.up("s");
  }
  await driver.waitFor(({ platformY }) => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.physicsBody;
    return body.y > platformY && body.oneWayPlatformDropId == null;
  }, "the player body to clear the Crown terrace", 12_000, before);
  const after = await driver.page.evaluate(() => {
    const body = globalThis.__phaserGame.scene.getScene("PlayScene")
      .playerController.physicsBody;
    return { y: body.y, feetY: body.y + body.h, dropId: body.oneWayPlatformDropId };
  });
  return { before, after };
}

export async function walkCrownTerrace(driver) {
  const before = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const body = scene.playerController.physicsBody;
    const platform = scene.starPillarSystem.getTownOneWayPlatforms().find(entry => (
      entry.id === "worldroot-crown-approach"
      && body.x + body.w >= entry.leftX
      && body.x <= entry.rightX
      && Math.abs(body.y + body.h - entry.y) < 2
    ));
    if (!platform) throw new Error("The player is not standing on the Crown approach.");
    return {
      x: body.x,
      platformId: platform.id,
      platformY: platform.y,
      requiredDistancePx: scene.config.tileSize * 0.75,
    };
  });
  const samples = [];
  let after = null;
  await driver.page.keyboard.down("d");
  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 18_000) {
      await driver.page.waitForTimeout(600);
      after = await driver.page.evaluate(({ x, platformId, platformY }) => {
        const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
        const controller = scene.playerController;
        const body = controller.physicsBody;
        const tileSize = scene.config.tileSize;
        const leadingTileX = Math.floor((body.x + body.w) / tileSize);
        const topTileY = Math.floor(body.y / tileSize);
        const bottomTileY = Math.floor((body.y + body.h - 1) / tileSize);
        return {
          x: body.x,
          y: body.y,
          feetY: body.y + body.h,
          vx: body.vx,
          vy: body.vy,
          onGround: body.onGround,
          rightInput: controller.input?.keys?.right?.isDown === true,
          controlsEnabled: controller.input?.controlsEnabled === true,
          ledge: controller.ledgeAssist?.getSnapshot?.() || null,
          flight: controller.flightMotion?.getSnapshot?.() || null,
          overlaps: scene.tileCollisionSystem?.getOverlappingSolidTiles?.(body) || [],
          leadingSolids: Array.from(
            { length: Math.max(0, bottomTileY - topTileY + 1) },
            (_unused, index) => topTileY + index,
          ).filter(tileY => scene.worldModel?.isSolid?.(leadingTileX, tileY)),
          platformPresent: scene.starPillarSystem.getTownOneWayPlatforms()
            .some(platform => platform.id === platformId),
          onExpectedY: Math.abs(body.y + body.h - platformY) < 2,
          distancePx: body.x - x,
        };
      }, before);
      samples.push(after);
      if (
        after.distancePx >= before.requiredDistancePx
        && after.onGround
        && after.onExpectedY
        && after.platformPresent
      ) break;
    }
  } finally {
    await driver.page.keyboard.up("d");
  }
  if (
    !after
    || after.distancePx < before.requiredDistancePx
    || !after.onGround
    || !after.onExpectedY
    || !after.platformPresent
  ) {
    throw new Error(
      `Crown branch movement stalled: ${JSON.stringify(samples.slice(-5))}`,
    );
  }
  return { before, after, distancePx: after.x - before.x };
}

export async function exerciseStarArrivals(driver) {
  await closeWorldrootUi(driver);
  const queued = await driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    system.previewWorldrootProgress(5);
    const stars = system._worldrootSnapshot.starMemories.slice(0, 2);
    const accepted = stars.map(star => system._townWorldVisual.queueStarArrival({
      originTileX: star.tile.tx,
      originTileY: star.tile.ty,
      identityPrimary: "#83ecff",
    }));
    return {
      accepted,
      count: system._townWorldVisual.memoryLayer.arrivals.size,
      waitMs: system._townWorldVisual.config.markers.arrivalDurationMs
        + system._townWorldVisual.config.markers.arrivalStaggerMs + 400,
    };
  });
  if (queued.accepted.some(accepted => !accepted) || queued.count !== 2) {
    throw new Error("Consecutive Star arrivals were not queued.");
  }
  await driver.waitFor(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .starPillarSystem._townWorldVisual.memoryLayer.arrivals.size === 0
  ), "both Worldroot Star arrivals to complete", 20_000);
  const remaining = await driver.page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .starPillarSystem._townWorldVisual.memoryLayer.arrivals.size
  ));
  if (remaining !== 0) throw new Error("Completed Star arrivals leaked live objects.");
  return { ...queued, remaining };
}
