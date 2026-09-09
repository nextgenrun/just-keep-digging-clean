import { closeWorldrootUi } from "./2026-08-30-roboplaytest-worldroot-motion.mjs";

export async function exerciseInteraction(driver, testCase) {
  await closeWorldrootUi(driver);
  const setup = await driver.page.evaluate(test => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    const visual = system._townWorldVisual;
    system.previewWorldrootProgress(test.stage, { consumed: test.consumed === true });
    const candidates = visual.hotspots.filter(hotspot => hotspot.kind === test.kind);
    const target = candidates.map(hotspot => ({
      hotspot,
      tile: { tx: hotspot.world.x / scene.config.tileSize, ty: hotspot.world.y / scene.config.tileSize },
    })).find(candidate => visual._findHotspot(candidate.tile)?.kind === test.kind);
    if (!target) throw new Error(`No reachable ${test.kind} hotspot exists at stage ${test.stage}.`);
    globalThis.__jkdE2E.forcePlayerState(target.tile);
    scene._teleportInAnimating = false;
    scene.player?.anims?.stop?.();
    scene.updatePlayerVisualState?.(true);
    const source = target.hotspot.source || {};
    const focusTile = test.kind === "star" ? source.tile : source.focusTile;
    const probe = {
      calls: 0,
      crownEvents: 0,
      originalHandle: visual.handleInteract,
      visual,
    };
    const wrappedHandle = function wrappedWorldrootInteraction(...args) {
      probe.calls += 1;
      return probe.originalHandle.apply(this, args);
    };
    const onCrown = () => { probe.crownEvents += 1; };
    probe.wrappedHandle = wrappedHandle;
    probe.onCrown = onCrown;
    visual.handleInteract = wrappedHandle;
    scene.events.on("worldroot-endgame-ready", onCrown);
    scene.__worldrootInteractionProbe = probe;
    const prompt = visual.getPromptState(target.tile);
    return {
      resolvedKind: visual._findHotspot(target.tile)?.kind || null,
      promptKind: prompt?.hotspot?.kind || null,
      promptText: prompt?.text || "",
      focusTile,
    };
  }, testCase);

  const cleanProbe = () => driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    const probe = scene?.__worldrootInteractionProbe;
    if (!probe) return null;
    if (probe.visual?.handleInteract === probe.wrappedHandle) {
      probe.visual.handleInteract = probe.originalHandle;
    }
    scene.events?.off?.("worldroot-endgame-ready", probe.onCrown);
    const result = { calls: probe.calls, crownEvents: probe.crownEvents };
    delete scene.__worldrootInteractionProbe;
    return result;
  });

  if (setup.resolvedKind !== testCase.kind || setup.promptKind !== testCase.kind) {
    await cleanProbe();
    throw new Error(`${testCase.id} did not expose the expected live interaction prompt.`);
  }

  let ui;
  let interaction;
  try {
    // Accelerated placement happens between frames. Let the ordinary scene
    // update refresh every competing proximity owner before using real input.
    await driver.page.waitForTimeout(320);
    await driver.page.keyboard.press("e");
    if (testCase.route === "talents") {
      await driver.waitFor(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene").starPillarSystem?._isViewOpen === true
        && globalThis.__phaserGame.scene.getScene("PlayScene").campfireSystem?.isSelecting?.() !== true
      ), "real E at the Worldroot Hearth to open Celestial Talents instead of the Campfire", driver.config.loadTimeoutMs);
    } else if (testCase.route === "map") {
      await driver.waitFor(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene").worldMapOverlay?.isOpen === true
      ), `${testCase.id} real E input to open the world map`, driver.config.loadTimeoutMs);
    } else if (testCase.route === "titans") {
      await driver.waitFor(() => {
        const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
        const state = scene._pausePanel?.state;
        return state?.tabKeys?.[state.activeTab] === "titans";
      }, "real E at a Worldroot Titan memory to open the Titan Archive", driver.config.loadTimeoutMs);
    } else if (testCase.route === "crown-ready") {
      await driver.waitFor(() => {
        const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
        return scene._worldrootEndgameStarted === true
          && scene.__worldrootInteractionProbe?.crownEvents === 1;
      }, "real E at the ready Crown to emit the endgame event", driver.config.loadTimeoutMs);
      await driver.page.waitForTimeout(160);
      await driver.page.keyboard.press("e");
      await driver.waitFor(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene")
          .__worldrootInteractionProbe?.calls === 2
      ), "the second real Crown E input to reach the single-fire guard", driver.config.loadTimeoutMs);
    } else if (testCase.route === "crown-dormant") {
      await driver.waitFor(() => (
        globalThis.__phaserGame.scene.getScene("PlayScene")
          .__worldrootInteractionProbe?.calls === 1
      ), "real E at the dormant Crown to reach its gated feedback", driver.config.loadTimeoutMs);
    } else {
      await driver.page.waitForTimeout(240);
    }

    ui = await driver.page.evaluate(({ route, focusTile }) => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      const map = scene.worldMapOverlay;
      const pause = scene._pausePanel?.state;
      const probe = scene.__worldrootInteractionProbe;
      return {
        route,
        calls: probe?.calls || 0,
        crownEvents: probe?.crownEvents || 0,
        crownStarted: scene._worldrootEndgameStarted === true,
        missingCurrents: scene.starPillarSystem?.getWorldrootDebugSnapshot?.()?.missingCurrents || [],
        talentOpen: scene.starPillarSystem?._isViewOpen === true,
        campfireOpen: scene.campfireSystem?.isSelecting?.() === true,
        mapOpen: map?.isOpen === true,
        mapCenter: map ? { tx: map.viewState.centerTileX, ty: map.viewState.centerTileY } : null,
        mapFocused: route !== "map" || (
          Math.abs(map.viewState.centerTileX - focusTile.tx) < 0.01
          && Math.abs(map.viewState.centerTileY - focusTile.ty) < 0.01
        ),
        pauseTab: pause?.tabKeys?.[pause.activeTab] || null,
      };
    }, { route: testCase.route, focusTile: setup.focusTile });
    interaction = await cleanProbe();
  } catch (error) {
    await cleanProbe().catch(() => null);
    throw error;
  }

  const expectedCalls = testCase.route === "crown-ready" ? 2 : 1;
  if (interaction?.calls !== expectedCalls || ui.calls !== expectedCalls) {
    throw new Error(`${testCase.id} did not travel through the real Worldroot interaction path.`);
  }
  if (testCase.route === "talents" && (!ui.talentOpen || ui.campfireOpen)) {
    throw new Error("Worldroot Hearth did not own the real E interaction over the nearby Campfire.");
  }
  if (testCase.route === "map" && !ui.mapFocused) throw new Error(`${testCase.id} opened at the wrong map tile.`);
  if (testCase.route === "titans" && ui.pauseTab !== "titans") throw new Error("Titan Archive route selected the wrong tab.");
  if (testCase.route === "crown-dormant" && (
    ui.crownEvents !== 0 || ui.crownStarted || ui.missingCurrents.length === 0
  )) {
    throw new Error("Dormant Crown began endgame.");
  }
  if (testCase.route === "crown-ready" && (
    ui.crownEvents !== 1 || !ui.crownStarted
  )) throw new Error("Ready Crown did not emit exactly once.");
  await driver.page.waitForTimeout(220);
  return { ...setup, interaction, ui };
}

